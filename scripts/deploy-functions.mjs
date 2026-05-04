import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export const PROJECT_REFS = {
  dev: 'locxfzyhfugetawadghu',
  prod: 'chikljxwgiskyjsnjelf',
};

export function getProjectRef(env) {
  if (!env) {
    throw new Error('getProjectRef requires an env argument (use "dev" or "prod")');
  }
  const ref = PROJECT_REFS[env];
  if (!ref) {
    throw new Error(`Unknown env "${env}". Use --env dev or --env prod`);
  }
  return ref;
}

export function parseConfigToml(content) {
  const match = content.match(/^project_id\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error('project_id not found in config.toml');
  }
  return match[1];
}

export function getChangedFunctions(gitDiffOutput) {
  if (!gitDiffOutput.trim()) return [];
  const names = new Set();
  for (const line of gitDiffOutput.split('\n')) {
    const match = line.match(/^supabase\/functions\/([^/]+)\//);
    if (match && match[1] !== '_shared') {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

export function detectSharedChanges(gitDiffOutput) {
  return gitDiffOutput.split('\n').some(line =>
    line.startsWith('supabase/functions/_shared/')
  );
}

export function buildDeployList({ repoFunctions, remoteFunctions, changedFunctions, sharedChanged }) {
  const remoteSet = new Set(remoteFunctions);
  const repoSet = new Set(repoFunctions);

  if (sharedChanged) {
    return {
      toDeploy: [...repoFunctions].sort(),
      orphaned: remoteFunctions.filter(f => !repoSet.has(f)).sort(),
      sharedWarning: true,
    };
  }

  const missing = repoFunctions.filter(f => !remoteSet.has(f));
  const changed = changedFunctions.filter(f => repoSet.has(f));
  const toDeploySet = new Set([...missing, ...changed]);

  return {
    toDeploy: [...toDeploySet].sort(),
    orphaned: remoteFunctions.filter(f => !repoSet.has(f)).sort(),
    sharedWarning: false,
  };
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    status: args.includes('--status'),
    diff: args.includes('--diff'),
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes'),
    function: null,
    env: 'dev',
  };
  const fnIdx = args.indexOf('--function');
  if (fnIdx !== -1 && args[fnIdx + 1]) {
    flags.function = args[fnIdx + 1];
  }
  const envIdx = args.indexOf('--env');
  if (envIdx !== -1 && args[envIdx + 1]) {
    flags.env = args[envIdx + 1];
  } else {
    const envEq = args.find(a => a.startsWith('--env='));
    if (envEq) {
      flags.env = envEq.slice('--env='.length);
    }
  }
  return flags;
}

function getRepoFunctions() {
  const functionsDir = join(ROOT, 'supabase', 'functions');
  return readdirSync(functionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_shared')
    .map(d => d.name)
    .sort();
}

function getRemoteFunctions(projectRef) {
  try {
    const output = execSync(
      `npx supabase functions list --project-ref ${projectRef}`,
      { encoding: 'utf-8', cwd: ROOT }
    );
    return output
      .split('\n')
      .filter(line => line.trim() && !line.includes('─') && !line.toLowerCase().includes('name'))
      .map(line => line.split('│')[1]?.trim() || line.split('|')[1]?.trim() || line.trim())
      .filter(name => name && !name.includes(' '))
      .sort();
  } catch (err) {
    console.error('Failed to list remote functions. Is SUPABASE_ACCESS_TOKEN set?');
    console.error(err.message);
    process.exit(1);
  }
}

function getGitDiff() {
  try {
    return execSync(
      'git diff --name-only origin/main...HEAD -- supabase/functions/',
      { encoding: 'utf-8', cwd: ROOT }
    );
  } catch {
    return '';
  }
}

function deployFunction(name, projectRef, dryRun) {
  if (dryRun) {
    console.log(`  [dry-run] would deploy: ${name}`);
    return true;
  }
  try {
    console.log(`  deploying: ${name}...`);
    execSync(
      `npx supabase functions deploy ${name} --project-ref ${projectRef}`,
      { encoding: 'utf-8', cwd: ROOT, stdio: 'inherit' }
    );
    return true;
  } catch (err) {
    console.error(`  FAILED: ${name} — ${err.message}`);
    return false;
  }
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN env var is required.');
    console.error('Get one at: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const flags = parseArgs(process.argv);
  const projectRef = getProjectRef(flags.env);
  console.log(`▸ Environment: ${flags.env}`);

  if (flags.function) {
    const repoFns = getRepoFunctions();
    if (!repoFns.includes(flags.function)) {
      console.error(`Error: Function "${flags.function}" not found in supabase/functions/`);
      process.exit(1);
    }
    const ok = deployFunction(flags.function, projectRef, flags.dryRun);
    process.exit(ok ? 0 : 1);
  }

  console.log(`▸ Project: ${projectRef}`);
  const repoFunctions = getRepoFunctions();
  console.log(`▸ Repo functions: ${repoFunctions.length}`);

  const remoteFunctions = getRemoteFunctions(projectRef);
  console.log(`▸ Remote functions: ${remoteFunctions.length}`);

  const gitDiff = getGitDiff();
  const changedFunctions = getChangedFunctions(gitDiff);
  const sharedChanged = detectSharedChanges(gitDiff);

  const { toDeploy, orphaned, sharedWarning } = buildDeployList({
    repoFunctions,
    remoteFunctions,
    changedFunctions,
    sharedChanged,
  });

  const deployList = flags.diff
    ? changedFunctions.filter(f => repoFunctions.includes(f))
    : flags.all
      ? repoFunctions
      : toDeploy;

  console.log('');
  if (sharedWarning) {
    console.log('⚠ _shared/ changed — all functions should be redeployed');
  }
  if (orphaned.length > 0) {
    console.log(`⚠ Deployed but not in repo (review manually): ${orphaned.join(', ')}`);
  }
  console.log(`▸ Functions to deploy: ${deployList.length}`);
  if (deployList.length > 0) {
    deployList.forEach(f => console.log(`  - ${f}`));
  }

  if (flags.status || deployList.length === 0) {
    if (deployList.length === 0) console.log('✓ Nothing to deploy');
    process.exit(0);
  }

  if (!flags.yes) {
    const answer = await prompt(`\n▸ Deploy ${deployList.length} function(s)? (y/N): `);
    if (answer !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log('');
  let failures = 0;
  for (const fn of deployList) {
    const ok = deployFunction(fn, projectRef, flags.dryRun);
    if (!ok) failures++;
  }

  console.log('');
  if (failures > 0) {
    console.error(`✗ ${failures} function(s) failed to deploy`);
    process.exit(1);
  }
  console.log(`✓ ${deployList.length} function(s) deployed successfully`);
}

if (process.argv[1] && process.argv[1].includes('deploy-functions')) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
