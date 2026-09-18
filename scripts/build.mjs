import {spawnSync} from 'node:child_process';
const env = {...process.env};
const branch = env.WORKERS_CI_BRANCH || env.CF_PAGES_BRANCH;
if (branch) env.CLOUDFLARE_ENV = branch === 'main' ? '' : 'preview';
const result = spawnSync(process.execPath, ['node_modules/@react-router/dev/bin.js', 'build'], {stdio:'inherit', env});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
