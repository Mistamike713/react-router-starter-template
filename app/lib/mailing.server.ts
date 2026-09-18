import {ADDRESS} from './mailing';
export type MailingEnv = {
 ORDERS_DB: D1Database;
 RESEND_API_KEY?: string;
 MAILING_TOKEN_SECRET?: string;
 MAILING_ENABLED?: string;
 MAILING_ORIGIN?: string;
 RESEND_SEGMENT_ID?: string;
 STRIPE_SECRET_KEY?: string;
};
export type Subscriber = {
 id: string; email: string; status: string; requested_at: number;
 confirmed_at: number | null; confirmation_sent_at: number | null; welcome_sent_at: number | null;
 stripe_customer_id: string | null; stripe_promotion_id: string | null;
 coupon_code: string; resend_contact_id: string | null;
};
const encoder = new TextEncoder();
export function normalizeEmail(value: unknown) {
 if (typeof value !== 'string') return null;
 const email = value.trim().toLowerCase();
 return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export function mailingReady(env: MailingEnv) {
 return env.MAILING_ENABLED === 'true' && !!env.RESEND_API_KEY && !!env.MAILING_TOKEN_SECRET && !!env.MAILING_ORIGIN && !!env.RESEND_SEGMENT_ID && !!env.STRIPE_SECRET_KEY;
}
export async function tokenFor(env: MailingEnv, row: Subscriber, purpose: 'confirm' | 'unsubscribe') {
 const payload = `${purpose}.${row.id}.${purpose === 'confirm' ? row.requested_at : 0}`;
 const key = await crypto.subtle.importKey('raw', encoder.encode(env.MAILING_TOKEN_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
 const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
 return `${payload}.${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')}`;
}
export async function subscriberFromToken(env: MailingEnv, token: string, purpose: 'confirm' | 'unsubscribe', now = Date.now()) {
 if (token.length > 200) return null;
 const [kind, id, timestamp, hex, extra] = token.split('.');
 if (kind !== purpose || !id || !/^\d+$/.test(timestamp || '') || !/^[a-f0-9]{64}$/.test(hex || '') || extra) return null;
 const key = await crypto.subtle.importKey('raw', encoder.encode(env.MAILING_TOKEN_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
 const bytes = Uint8Array.from(hex.match(/../g)!, v => parseInt(v, 16));
 if (!await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${kind}.${id}.${timestamp}`))) return null;
 const row = await env.ORDERS_DB.prepare('SELECT * FROM mailing_subscribers WHERE id=?').bind(id).first<Subscriber>();
 if (!row) return null;
 if (purpose === 'confirm' && (Number(timestamp) !== row.requested_at || now < row.requested_at || (!row.confirmed_at && now - row.requested_at > 86400000))) return null;
 return row;
}
async function api(url: string, init: RequestInit, allow404 = false) {
 for (let attempt = 0; attempt < 3; attempt++) {
  let response: Response;
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) }); }
  catch { if (attempt === 2) throw new Error('Service temporarily unavailable. Please try again.'); await new Promise(r => setTimeout(r, 500 * 2 ** attempt)); continue; }
  if (allow404 && response.status === 404) return null;
  if (response.ok) return await response.json() as any;
  if ((response.status === 429 || response.status >= 500) && attempt < 2) { await new Promise(r => setTimeout(r, 500 * 2 ** attempt)); continue; }
  // Provider payloads may contain personal data. Never return or log them.
  throw new Error('Service temporarily unavailable. Please try again.');
 }
 throw new Error('Service temporarily unavailable. Please try again.');
}
export function resendApi(env: MailingEnv, path: string, method: string, body?: unknown, idempotency?: string, allow404 = false) {
 return api(`https://api.resend.com${path}`, { method, headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(idempotency ? { 'Idempotency-Key': idempotency } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }, allow404);
}
export function stripeApi(env: MailingEnv, path: string, body: Record<string, string>, idempotency: string) {
 return api(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-02-24.acacia', 'Idempotency-Key': idempotency }, body: new URLSearchParams(body) });
}
export async function rateLimit(env: MailingEnv, ip: string, now = Date.now()) {
 const key = await crypto.subtle.importKey('raw', encoder.encode(env.MAILING_TOKEN_SECRET!), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
 const hash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(ip))), b => b.toString(16).padStart(2,'0')).join('');
 const hour = Math.floor(now / 3600000);
 const row = await env.ORDERS_DB.prepare(`INSERT INTO mailing_rate_limits(bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts`).bind(`${hour}:${hash}`, (hour + 2) * 3600000).first<{attempts:number}>();
 await env.ORDERS_DB.prepare('DELETE FROM mailing_rate_limits WHERE expires_at<=?').bind(now).run();
 return !!row && row.attempts <= 5;
}
export async function sendConfirmation(env: MailingEnv, row: Subscriber) {
 if (row.status !== 'pending' || row.confirmation_sent_at) return;
 if (await providerSuppressed(env,row)) return;
 const contact = await resendApi(env,`/contacts/${encodeURIComponent(row.email)}`,'GET',undefined,undefined,true);
 if (contact?.unsubscribed) {
  await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET status='unsubscribed',unsubscribed_at=? WHERE id=?").bind(Date.now(),row.id).run();
  return;
 }
 const url = `${env.MAILING_ORIGIN}/mailing-list/confirm?token=${await tokenFor(env,row,'confirm')}`;
 await resendApi(env, '/emails', 'POST', { from: 'MNH Creations <info@mnhcreations.com>', reply_to: 'info@mnhcreations.com', to: [row.email], template: { id:'mnh-preview-confirm', variables:{CONFIRM_URL:url, MAILING_ADDRESS:ADDRESS} } }, `confirm/${row.id}/${row.requested_at}`);
 await env.ORDERS_DB.prepare('UPDATE mailing_subscribers SET confirmation_sent_at=? WHERE id=? AND requested_at=?').bind(Date.now(), row.id, row.requested_at).run();
}
export async function completeConfirmation(env: MailingEnv, row: Subscriber) {
 if (row.status === 'unsubscribed' || row.status === 'suppressed') throw new Error('This address is unsubscribed. Contact info@mnhcreations.com if you want to join again.');
 if (await providerSuppressed(env,row)) throw new Error('Email delivery is unavailable for this address. Contact info@mnhcreations.com for help.');
 const path = `/contacts/${encodeURIComponent(row.email)}`;
 let contact = await resendApi(env,path,'GET',undefined,undefined,true);
 if (contact?.unsubscribed) {
  await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET status='unsubscribed',unsubscribed_at=? WHERE id=?").bind(Date.now(),row.id).run();
  throw new Error('This address is unsubscribed. Contact info@mnhcreations.com if you want to join again.');
 }
 await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET status='confirmed',confirmed_at=COALESCE(confirmed_at,?) WHERE id=? AND status IN ('pending','confirmed')").bind(Date.now(),row.id).run();
 if (!contact) contact = await resendApi(env,'/contacts','POST',{email:row.email,unsubscribed:false},`contact/${row.id}`);
 await resendApi(env,`/contacts/${contact.id}/segments/${env.RESEND_SEGMENT_ID}`,'POST',{});
 await env.ORDERS_DB.prepare('UPDATE mailing_subscribers SET resend_contact_id=? WHERE id=?').bind(contact.id,row.id).run();
 if (row.welcome_sent_at) return;
 // Existing purchasers may join the list, but never receive a first-order code.
 const paid = await env.ORDERS_DB.prepare("SELECT id FROM orders WHERE lower(trim(customer_email))=? AND status='paid' LIMIT 1").bind(row.email).first();
 if (paid) return;
 let customerId = row.stripe_customer_id;
 if (!customerId) {
  const customer = await stripeApi(env,'customers',{email:row.email,'metadata[mailing_subscriber_id]':row.id},`mailing-customer/${row.id}`);
  customerId = customer.id;
  await env.ORDERS_DB.prepare('UPDATE mailing_subscribers SET stripe_customer_id=? WHERE id=?').bind(customerId,row.id).run();
 }
 if (!row.stripe_promotion_id) {
  // Stable coupon IDs prevent duplicate benefits even after provider idempotency expires.
  const couponId = `welcome15_${row.id}`;
  let coupon = await api(`https://api.stripe.com/v1/coupons/${couponId}`,{headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}},true);
  if (!coupon) coupon = await stripeApi(env,'coupons',{id:couponId,percent_off:'15',duration:'once',max_redemptions:'1',name:'15% off your first MNH Creations order'},`mailing-coupon/${row.id}`);
  const promotion = await stripeApi(env,'promotion_codes',{coupon:coupon.id,code:row.coupon_code,customer:customerId!,max_redemptions:'1','restrictions[first_time_transaction]':'true'},`mailing-promotion/${row.id}`);
  await env.ORDERS_DB.prepare('UPDATE mailing_subscribers SET stripe_promotion_id=? WHERE id=?').bind(promotion.id,row.id).run();
 }
 // Recheck local and provider suppression immediately before the marketing send.
 const current = await env.ORDERS_DB.prepare('SELECT status,welcome_sent_at FROM mailing_subscribers WHERE id=?').bind(row.id).first<Subscriber>();
 contact = await resendApi(env,path,'GET');
 if (current?.status !== 'confirmed' || current.welcome_sent_at || contact.unsubscribed || await providerSuppressed(env,row)) return;
 const unsubscribe = `${env.MAILING_ORIGIN}/mailing-list/unsubscribe?token=${await tokenFor(env,row,'unsubscribe')}`;
 await resendApi(env,'/emails','POST',{from:'MNH Creations <info@mnhcreations.com>',reply_to:'info@mnhcreations.com',to:[row.email],headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},template:{id:'mnh-preview-welcome',variables:{COUPON_CODE:row.coupon_code,SHOP_URL:env.MAILING_ORIGIN,MAILING_ADDRESS:ADDRESS,UNSUBSCRIBE_URL:unsubscribe}}},`welcome/${row.id}`);
 await env.ORDERS_DB.prepare('UPDATE mailing_subscribers SET welcome_sent_at=? WHERE id=?').bind(Date.now(),row.id).run();
}
export async function unsubscribe(env: MailingEnv, row: Subscriber) {
 // Local suppression is durable even if the provider is temporarily unavailable.
 await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET status='unsubscribed',unsubscribed_at=COALESCE(unsubscribed_at,?) WHERE id=?").bind(Date.now(),row.id).run();
 const contact = await resendApi(env,`/contacts/${encodeURIComponent(row.email)}`,'GET',undefined,undefined,true);
 if (contact) await resendApi(env,`/contacts/${contact.id}`,'PATCH',{unsubscribed:true});
}
async function providerSuppressed(env: MailingEnv,row: Subscriber) {
 const suppression = await resendApi(env,`/suppressions/${encodeURIComponent(row.email)}`,'GET',undefined,undefined,true);
 if (!suppression) return false;
 await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET status='suppressed' WHERE id=? AND status!='unsubscribed'").bind(row.id).run();
 return true;
}
