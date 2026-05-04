import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROD_REF = 'chikljxwgiskyjsnjelf';
const DEV_BRANCH_REF = 'zlljsdaxsggkasvympku';

const linkedRefPath = join(ROOT, 'supabase', '.temp', 'project-ref');

if (!existsSync(linkedRefPath)) {
  console.log('');
  console.log('▸ No project linked. Run npm run db:link:dev or npm run db:link:prod');
  console.log('');
  process.exit(0);
}

const ref = readFileSync(linkedRefPath, 'utf-8').trim();

let tag;
let warning;

if (ref === PROD_REF) {
  tag = '\x1b[31m🔴 PRODUCTION\x1b[0m';
  warning = '\x1b[31m⚠ You are linked to PRODUCTION. Destructive commands will affect live data.\x1b[0m';
} else if (ref === DEV_BRANCH_REF) {
  tag = '\x1b[32m🟢 DEVELOPMENT (branch)\x1b[0m';
} else {
  tag = '\x1b[33m⚠ UNKNOWN PROJECT\x1b[0m';
  warning = `\x1b[33m⚠ Linked to unrecognized ref: ${ref}. Run npm run db:link:dev to point at the dev branch.\x1b[0m`;
}

console.log('');
console.log(`Current Supabase link: ${tag}`);
console.log(`  ref: ${ref}`);
console.log('');
if (warning) {
  console.log(warning);
  console.log('');
}
