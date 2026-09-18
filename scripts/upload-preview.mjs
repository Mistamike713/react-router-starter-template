import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
// Only non-production branch builds invoke this script. Never deploy traffic.
if (process.env.CF_PAGES_BRANCH === 'main' || process.env.WORKERS_CI_BRANCH === 'main') throw new Error('Preview uploads cannot run on main.');
const secrets = {};
for (const name of ['RESEND_API_KEY','MAILING_TOKEN_SECRET']) {
 if (process.env[name]) secrets[name] = process.env[name];
}
const dir = mkdtempSync(join(tmpdir(),'mnh-preview-'));
try {
 const file = join(dir,'secrets.json');
 writeFileSync(file,JSON.stringify(secrets),{mode:0o600});
 const args = ['node_modules/wrangler/bin/wrangler.js','versions','upload'];
 if (Object.keys(secrets).length) args.push('--secrets-file',file);
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
 if (result.error) throw result.error;
 process.exitCode=result.status ?? 1;
} finally {rmSync(dir,{recursive:true,force:true});}
