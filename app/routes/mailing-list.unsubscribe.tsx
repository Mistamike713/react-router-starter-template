import {data,Form,Link,useActionData,useLoaderData} from 'react-router';
import type {Route} from './+types/mailing-list.unsubscribe';
import {mailingReady,subscriberFromToken,unsubscribe,type MailingEnv} from '../lib/mailing.server';
export function headers() {return {'Referrer-Policy':'no-referrer','Cache-Control':'no-store'};}
export async function loader({request,context}:Route.LoaderArgs) {
 const env=context.cloudflare.env as MailingEnv; const token=new URL(request.url).searchParams.get('token')||'';
 return {valid:mailingReady(env) && !!await subscriberFromToken(env,token,'unsubscribe')};
}
export async function action({request,context}:Route.ActionArgs) {
 const env=context.cloudflare.env as MailingEnv;
 if (request.method!=='POST' || !mailingReady(env)) return {error:'Please try again shortly.'};
 // A signed URL also supports RFC 8058 one-click POSTs from email providers.
 const row=await subscriberFromToken(env,new URL(request.url).searchParams.get('token')||'','unsubscribe');
 if (!row) return {error:'This link is invalid. Email info@mnhcreations.com for help.'};
 try {await unsubscribe(env,row); return {success:true};}
 catch {return data({error:'Your opt-out is saved here. Please click again in a moment to finish syncing it with our email service.'},{status:503});}
}
export default function Unsubscribe(){const data=useLoaderData<typeof loader>();const result=useActionData<typeof action>();return <main className="min-h-screen bg-[#FFF7EC] p-8 text-[#4A3728]"><div className="mx-auto max-w-lg space-y-6 py-16"><h1 className="text-3xl font-bold">Email preferences</h1>{result && 'success' in result?<p>You’re unsubscribed from MNH Creations marketing emails. Order-related emails are unaffected.</p>:data.valid?<Form method="post"><button className="rounded-full bg-[#C9713D] px-6 py-3 font-bold text-white">Unsubscribe from marketing emails</button></Form>:<p>This link is invalid. Contact info@mnhcreations.com for help.</p>}{result && 'error' in result && <p role="alert">{result.error}</p>}<Link className="block underline" to="/">Back to the shop</Link></div></main>;}
