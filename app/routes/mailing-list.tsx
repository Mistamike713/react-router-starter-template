import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/mailing-list';
import { mailingReady, normalizeEmail, rateLimit, sendConfirmation, type MailingEnv, type Subscriber } from '../lib/mailing.server';
import {CONSENT,ADDRESS} from '../lib/mailing';

export function loader({context}: Route.LoaderArgs) {
 return {enabled:mailingReady(context.cloudflare.env as MailingEnv)};
}
export async function action({request,context}: Route.ActionArgs) {
 const env = context.cloudflare.env as MailingEnv;
 if (!mailingReady(env)) return {error:'Signup is not available yet. Please check back soon.'};
 if (request.method !== 'POST' || request.headers.get('Origin') !== new URL(request.url).origin) return {error:'Please submit the signup form from this website.'};
 if (Number(request.headers.get('content-length') || 0) > 4096) return {error:'Please check your email address.'};
 const form = await request.formData();
 const message = 'Check your inbox for a confirmation link. If you already joined, keep using your original welcome email.';
 if (form.get('website')) return {message};
 const email = normalizeEmail(form.get('email'));
 if (!email || form.get('consent') !== 'yes') return {error:'Enter a valid email address and agree to receive emails.'};
 try {
  if (!await rateLimit(env,request.headers.get('CF-Connecting-IP') || 'local')) return {error:'Too many attempts. Please try again in an hour.'};
  const now = Date.now();
  const id = crypto.randomUUID();
  await env.ORDERS_DB.prepare('INSERT OR IGNORE INTO mailing_subscribers(id,email,requested_at,coupon_code) VALUES(?,?,?,?)').bind(id,email,now,`MNH15${crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase()}`).run();
  let row = await env.ORDERS_DB.prepare('SELECT * FROM mailing_subscribers WHERE email=?').bind(email).first<Subscriber>();
  if (!row || row.status !== 'pending') return {message};
  if (now - row.requested_at > 86400000) {
   await env.ORDERS_DB.prepare("UPDATE mailing_subscribers SET requested_at=?,confirmation_sent_at=NULL WHERE id=? AND requested_at=? AND status='pending'").bind(now,row.id,row.requested_at).run();
   row = (await env.ORDERS_DB.prepare('SELECT * FROM mailing_subscribers WHERE id=?').bind(row.id).first<Subscriber>())!;
  }
  await sendConfirmation(env,row);
  return {message};
 } catch { return {error:'We could not send your confirmation right now. Please try again in a few minutes.'}; }
}
export default function MailingList() {
 const {enabled} = useLoaderData<typeof loader>();
 const result = useActionData<typeof action>();
 const pending = useNavigation().state !== 'idle';
 return <main className="min-h-screen bg-[#FFF7EC] px-6 py-16 text-[#4A3728]">
  <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-sm">
   <Link to="/" className="text-sm underline">MNH Creations</Link>
   <p className="mt-8 font-bold uppercase tracking-widest text-[#A85B2E]">A little welcome gift</p>
   <h1 className="my-4 text-4xl font-bold">Your first creation, 15% off.</h1>
   <p>Join our mailing list for new designs, shop updates, and offers. Confirm your email to receive your personal first-order code.</p>
   {enabled ? <Form method="post" className="mt-6 space-y-4">
    <label className="block font-bold">Email address<input type="email" name="email" required maxLength={254} autoComplete="email" className="mt-2 block w-full rounded-xl border p-3" /></label>
    <div hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="consent" value="yes" required />{CONSENT}</label>
    <button disabled={pending} className="w-full rounded-full bg-[#C9713D] p-3 font-bold text-white disabled:opacity-50">{pending ? 'Sending…' : 'Join & get 15% off'}</button>
   </Form> : <p className="mt-6 font-bold">Signup is coming soon.</p>}
   {result && ('error' in result ? <p role="alert" className="mt-4 text-red-700">{result.error}</p> : <p role="status" className="mt-4">{result.message}</p>)}
   <p className="mt-6 text-sm">New customers only. One use per customer, using the same email at checkout. Applies to products before tax; excludes shipping. Cannot be combined with other offers.</p>
   <p className="mt-4 text-xs">We use your email to send the updates you request. Resend delivers our emails; Stripe processes your discount at checkout. Unsubscribe using the link in any marketing email. For help or deletion requests, email info@mnhcreations.com.</p>
   <p className="mt-4 text-xs">MNH Creations · {ADDRESS}</p>
  </div>
 </main>;
}
