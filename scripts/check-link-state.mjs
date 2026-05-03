import { execSync } from 'node:child_process';

const PROD_REF = 'chikljxwgiskyjsnjelf';

try {
  const output = execSync('npx supabase projects list', { encoding: 'utf-8' });
  const lines = output.split('\n');
  const linked = lines.find(l => l.includes('●'));

  if (!linked) {
    console.log('▸ No project linked. Run npm run db:link:dev or npm run db:link:prod');
    process.exit(0);
  }

  const isProd = linked.includes(PROD_REF);
  const tag = isProd ? '\x1b[31m🔴 PRODUCTION\x1b[0m' : '\x1b[32m🟢 DEVELOPMENT\x1b[0m';
  console.log('');
  console.log(`Current Supabase link: ${tag}`);
  console.log(linked.trim());
  console.log('');
  if (isProd) {
    console.log('\x1b[31m⚠ You are linked to PRODUCTION. Destructive commands will affect live data.\x1b[0m');
    console.log('');
  }
} catch (err) {
  console.error('Error checking link state:', err.message);
  process.exit(1);
}
