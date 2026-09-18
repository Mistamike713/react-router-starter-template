/// <reference types="node" />
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {normalizeEmail,tokenFor,subscriberFromToken,completeConfirmation,unsubscribe,sendConfirmation,rateLimit,type MailingEnv,type Subscriber} from './mailing.server';
import {createStripeCheckoutSession} from './stripe/server';
let sqlite:DatabaseSync;let env:MailingEnv;let calls:Array<{url:string,body:any,headers:Headers}>;let contact:any;
function dbAdapter(db:DatabaseSync){return {prepare(sql:string){let args:any[]=[];return {bind(...values:any[]){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async run(){return db.prepare(sql).run(...args);},async all(){return {results:db.prepare(sql).all(...args)};}};}} as unknown as D1Database;}
function row(){return sqlite.prepare('SELECT * FROM mailing_subscribers').get() as Subscriber;}
beforeEach(()=>{
 sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('migrations/0001_orders.sql','utf8'));sqlite.exec(readFileSync('migrations/0003_mailing_list.sql','utf8'));
 env={ORDERS_DB:dbAdapter(sqlite),RESEND_API_KEY:'test',MAILING_TOKEN_SECRET:'unit-test-secret',MAILING_ENABLED:'true',MAILING_ORIGIN:'https://preview.example.com',RESEND_SEGMENT_ID:'seg_test',STRIPE_SECRET_KEY:'sk_test_unit'};
 sqlite.prepare('INSERT INTO mailing_subscribers(id,email,requested_at,coupon_code) VALUES(?,?,?,?)').run('sub123','test@example.com',Date.now(),'MNH15TEST');calls=[];contact=null;
 vi.stubGlobal('fetch',vi.fn(async (url:string,init:RequestInit={})=>{
  const headers=new Headers(init.headers);const body=typeof init.body==='string'?JSON.parse(init.body):init.body instanceof URLSearchParams?Object.fromEntries(init.body):null;
  calls.push({url,body,headers});
  if(url.includes('/suppressions/'))return Response.json({},{status:404});
  if(url.includes('api.resend.com/contacts/')&&(!init.method||init.method==='GET'))return Response.json(contact||{message:'missing'},{status:contact?200:404});
  if(url.endsWith('/contacts')&&init.method==='POST'){contact={id:'contact_test',unsubscribed:false};return Response.json(contact);}
  if(url.includes('/contacts/')&&init.method==='PATCH'){contact.unsubscribed=body.unsubscribed;return Response.json(contact);}
  if(url.includes('/coupons/')&&!init.method)return Response.json({},{status:404});
  if(url.endsWith('/customers'))return Response.json({id:'cus_test'});
  if(url.endsWith('/coupons'))return Response.json({id:body.id});
  if(url.endsWith('/promotion_codes'))return Response.json({id:'promo_test'});
  if(url.endsWith('/checkout/sessions'))return Response.json({id:'cs_test',url:'https://checkout.stripe.com/test'});
  return Response.json({id:'email_test'});
 }));
});
afterEach(()=>{sqlite.close();vi.unstubAllGlobals();});
describe('mailing list consent and discounts',()=>{
 it('normalizes addresses and rejects invalid inputs',()=>{expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com');expect(normalizeEmail('bad')).toBeNull();expect(normalizeEmail({})).toBeNull();});
 it('authenticates tokens, separates purposes, expires confirmation but not opt-out',async()=>{const r=row();const t=await tokenFor(env,r,'confirm');expect(await subscriberFromToken(env,t,'confirm')).toBeTruthy();expect(await subscriberFromToken(env,t+'a','confirm')).toBeNull();expect(await subscriberFromToken(env,t,'unsubscribe')).toBeNull();expect(await subscriberFromToken(env,t,'confirm',r.requested_at+86400001)).toBeNull();const u=await tokenFor(env,r,'unsubscribe');expect(await subscriberFromToken(env,u,'unsubscribe',r.requested_at+86400000000)).toBeTruthy();});
 it('sends confirmation once with stable idempotency and no premature contact creation',async()=>{await sendConfirmation(env,row());await sendConfirmation(env,row());const emails=calls.filter(c=>c.url.endsWith('/emails'));expect(emails).toHaveLength(1);expect(emails[0].headers.get('Idempotency-Key')).toContain('confirm/sub123/');expect(row().status).toBe('pending');expect(contact).toBeNull();});
 it('confirms once, creates a customer-bound one-use promotion, and does not reissue on repeat',async()=>{await completeConfirmation(env,row());await completeConfirmation(env,row());expect(row().status).toBe('confirmed');expect(row().confirmed_at).toBeTruthy();expect(row().welcome_sent_at).toBeTruthy();const promo=calls.filter(c=>c.url.endsWith('/promotion_codes'));expect(promo).toHaveLength(1);expect(promo[0].body).toMatchObject({customer:'cus_test',max_redemptions:'1','restrictions[first_time_transaction]':'true'});expect(calls.filter(c=>c.url.endsWith('/emails'))).toHaveLength(1);});
 it('does not silently resubscribe locally unsubscribed or provider-unsubscribed contacts',async()=>{contact={id:'contact_test',unsubscribed:true};await expect(completeConfirmation(env,row())).rejects.toThrow('unsubscribed');expect(row().status).toBe('unsubscribed');expect(calls.filter(c=>c.url.endsWith('/emails'))).toHaveLength(0);await expect(completeConfirmation(env,row())).rejects.toThrow('unsubscribed');});
 it('persists opt-out and propagates suppression to provider',async()=>{await completeConfirmation(env,row());await unsubscribe(env,row());expect(row().status).toBe('unsubscribed');expect(contact.unsubscribed).toBe(true);});
 it('limits requests per network and expires buckets',async()=>{for(let i=0;i<5;i++)expect(await rateLimit(env,'192.0.2.1',0)).toBe(true);expect(await rateLimit(env,'192.0.2.1',0)).toBe(false);expect(await rateLimit(env,'192.0.2.1',7200000)).toBe(true);expect(sqlite.prepare('SELECT COUNT(*) n FROM mailing_rate_limits').get()?.n).toBe(1);});
 it('does not grant a first-order discount to a previous paid buyer',async()=>{sqlite.prepare("INSERT INTO orders(id,status,customer_name,customer_email,fulfillment_method,subtotal_cents,created_at,updated_at) VALUES('paid','paid','Test','test@example.com','pickup',2000,'now','now')").run();await completeConfirmation(env,row());expect(row().status).toBe('confirmed');expect(row().stripe_promotion_id).toBeNull();expect(calls.some(c=>c.url.endsWith('/promotion_codes'))).toBe(false);});
 it('keeps quantity and shipping separate from the product discount',async()=>{await createStripeCheckoutSession({secretKey:'test',orderId:'order',customerEmail:'test@example.com',customerId:'cus_test',promotionId:'promo_test',lines:[{name:'T-shirt',unitPriceCents:2000,quantity:2},{name:'Tumbler',unitPriceCents:3500,quantity:1}],shippingCents:1000,fulfillmentMethod:'shipping',origin:'https://preview.example.com'});const c=calls[0];expect(c.body['line_items[0][quantity]']).toBe('2');expect(c.body['line_items[1][price_data][unit_amount]']).toBe('3500');expect(c.body['line_items[2][price_data][unit_amount]']).toBeUndefined();expect(c.body['shipping_options[0][shipping_rate_data][fixed_amount][amount]']).toBe('1000');expect(c.body['discounts[0][promotion_code]']).toBe('promo_test');expect(c.body.customer).toBe('cus_test');expect(c.headers.get('Idempotency-Key')).toBe('checkout/order');});
});
