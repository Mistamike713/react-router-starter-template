import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const branch = process.env.WORKERS_CI_BRANCH || process.env.CF_PAGES_BRANCH;
if (branch && branch !== 'main') throw new Error('Only main may deploy production.');
const config = JSON.parse(readFileSync('build/server/wrangler.json','utf8'));
if (config.vars?.MAILING_ORIGIN !== 'https://mnhcreations.com' ||
    config.d1_databases?.find(db => db.binding === 'ORDERS_DB')?.database_id !== '18a3f502-d2bd-422f-bcf8-9378098839a8') {
  throw new Error('Production deployment requires production origin and database bindings. Rebuild for main.');
}
const secrets = {};
for (const name of ['RESEND_API_KEY','MAILING_TOKEN_SECRET']) {
  if (!process.env[name]) throw new Error(`Missing encrypted build secret: ${name}`);
  secrets[name] = process.env[name];
}
const dir = mkdtempSync(join(tmpdir(),'mnh-production-'));
try {
  const file = join(dir,'secrets.json');
  writeFileSync(file,JSON.stringify(secrets),{mode:0o600});
  // Existing live Stripe secrets remain managed by Cloudflare, never copied here.
  const result = spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--secrets-file',file],{stdio:'inherit',env:{...process.env,CLOUDFLARE_ENV:''}});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {rmSync(dir,{recursive:true,force:true});}
