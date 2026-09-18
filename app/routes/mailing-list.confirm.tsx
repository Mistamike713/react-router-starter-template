import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/mailing-list.confirm';
import {completeConfirmation,mailingReady,subscriberFromToken,type MailingEnv} from '../lib/mailing.server';
export function headers() { return {'Referrer-Policy':'no-referrer','Cache-Control':'no-store'}; }
export async function loader({request,context}:Route.LoaderArgs) {
 const env = context.cloudflare.env as MailingEnv;
 const token = new URL(request.url).searchParams.get('token') || '';
 const row = mailingReady(env) ? await subscriberFromToken(env,token,'confirm') : null;
 return {valid:!!row && ['pending','confirmed'].includes(row.status),token};
}
export async function action({request,context}:Route.ActionArgs) {
 const env = context.cloudflare.env as MailingEnv;
 if (!mailingReady(env) || request.method !== 'POST' || request.headers.get('Origin') !== new URL(request.url).origin) return {error:'Please reopen the confirmation link in your email.'};
 const token = String((await request.formData()).get('token') || '');
 const row = await subscriberFromToken(env,token,'confirm');
 if (!row) return {error:'This link has expired. Please sign up again for a fresh link.'};
 try { await completeConfirmation(env,row); return {success:true}; }
 catch (e) { return {error:e instanceof Error ? e.message : 'Please try again.'}; }
}
export default function Confirm() {
 const data = useLoaderData<typeof loader>(); const result = useActionData<typeof action>(); const pending = useNavigation().state !== 'idle';
 return <main className="min-h-screen bg-[#FFF7EC] p-8 text-[#4A3728]"><div className="mx-auto max-w-lg space-y-5 py-16">
  <h1 className="text-3xl font-bold">{result && 'success' in result ? 'You’re on the list!' : 'Confirm your email'}</h1>
  {result && 'success' in result ? <p>Thanks for joining MNH Creations. If you’re a first-time customer, your personal 15% code is on its way. Already received one? Keep using that same code.</p> : data.valid ? <><p>Confirm below to receive MNH Creations news and offers. You can unsubscribe anytime.</p><Form method="post"><input type="hidden" name="token" value={data.token}/><button disabled={pending} className="rounded-full bg-[#C9713D] px-6 py-3 font-bold text-white">{pending ? 'Confirming…' : 'Confirm my subscription'}</button></Form></> : <p>This confirmation link is invalid or expired. <Link className="underline" to="/mailing-list">Request a new link.</Link></p>}
  {result && 'error' in result && <p role="alert">{result.error}</p>}<Link className="block underline" to="/">Back to the shop</Link>
 </div></main>;
}
