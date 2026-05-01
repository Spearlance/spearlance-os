# Edge Function Deploy Script — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create `scripts/deploy-functions.mjs` that detects drift between repo and deployed Supabase edge functions, and safely deploys missing/changed functions.

**Architecture:** A single Node.js ESM script with pure functions extracted for testability. Shell-outs to `npx supabase functions list` and `npx supabase functions deploy` for all Supabase operations. CLI flags parsed with `process.argv` (no deps). Interactive prompts via `readline`.

**Tech Stack:** Node.js (ESM), Vitest (existing), Supabase CLI (existing devDep ^2.98.0)

**Design doc:** `.claude/docs/plans/2026-05-01-edge-function-deploy-script-design.md`

---

### Task 1: Scaffold test file + expand vitest include

**Files:**
- Modify: `vitest.config.ts:12` — add `scripts/` to include pattern
- Create: `scripts/deploy-functions.test.ts`
- Create: `scripts/deploy-functions.mjs` (empty exports stub)

**Step 1: Update vitest config to include `scripts/` test files**

In `vitest.config.ts`, change the `include` line:

```ts
// before
include: ['src/**/*.{test,spec}.{ts,tsx}'],

// after
include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.{ts,tsx}'],
```

**Step 2: Create the empty script stub with exported function signatures**

Create `scripts/deploy-functions.mjs`:

```js
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function parseConfigToml(content) {
  // TODO: Task 2
}

export function getChangedFunctions(gitDiffOutput) {
  // TODO: Task 3
}

export function detectSharedChanges(gitDiffOutput) {
  // TODO: Task 4
}

export function buildDeployList({ repoFunctions, remoteFunctions, changedFunctions, sharedChanged }) {
  // TODO: Task 5
}
```

**Step 3: Create test file with a smoke test**

Create `scripts/deploy-functions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseConfigToml, getChangedFunctions, detectSharedChanges, buildDeployList } from './deploy-functions.mjs';

describe('deploy-functions', () => {
  it('module exports all expected functions', () => {
    expect(typeof parseConfigToml).toBe('function');
    expect(typeof getChangedFunctions).toBe('function');
    expect(typeof detectSharedChanges).toBe('function');
    expect(typeof buildDeployList).toBe('function');
  });
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — 1 test passes (module exports exist)

**Step 5: Commit**

```bash
git add vitest.config.ts scripts/deploy-functions.mjs scripts/deploy-functions.test.ts
git commit -m "test: scaffold deploy-functions with vitest include"
```

---

### Task 2: parseConfigToml()

**Files:**
- Modify: `scripts/deploy-functions.mjs` — implement `parseConfigToml()`
- Modify: `scripts/deploy-functions.test.ts` — add tests

**Step 1: Write the failing tests**

Add to `scripts/deploy-functions.test.ts`:

```ts
describe('parseConfigToml', () => {
  it('extracts project_id from valid config.toml', () => {
    const content = 'project_id = "chikljxwgiskyjsnjelf"\n\n[functions.foo]\nverify_jwt = true';
    expect(parseConfigToml(content)).toBe('chikljxwgiskyjsnjelf');
  });

  it('throws on missing project_id', () => {
    const content = '[functions.foo]\nverify_jwt = true';
    expect(() => parseConfigToml(content)).toThrow('project_id');
  });

  it('handles project_id with single quotes', () => {
    const content = "project_id = 'abc123'";
    expect(parseConfigToml(content)).toBe('abc123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: FAIL — `parseConfigToml` returns undefined

**Step 3: Implement parseConfigToml**

In `scripts/deploy-functions.mjs`:

```js
export function parseConfigToml(content) {
  const match = content.match(/^project_id\s*=\s*["']([^"']+)["']/m);
  if (!match) {
    throw new Error('project_id not found in config.toml');
  }
  return match[1];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — all 3 parseConfigToml tests pass

**Step 5: Commit**

```bash
git add scripts/deploy-functions.mjs scripts/deploy-functions.test.ts
git commit -m "feat: implement parseConfigToml for deploy script"
```

---

### Task 3: getChangedFunctions()

**Files:**
- Modify: `scripts/deploy-functions.mjs` — implement `getChangedFunctions()`
- Modify: `scripts/deploy-functions.test.ts` — add tests

**Step 1: Write the failing tests**

Add to `scripts/deploy-functions.test.ts`:

```ts
describe('getChangedFunctions', () => {
  it('extracts unique function names from git diff output', () => {
    const diff = [
      'supabase/functions/admin-create-client/index.ts',
      'supabase/functions/admin-create-client/utils.ts',
      'supabase/functions/stripe-webhook/index.ts',
    ].join('\n');
    expect(getChangedFunctions(diff)).toEqual(['admin-create-client', 'stripe-webhook']);
  });

  it('ignores _shared directory entries', () => {
    const diff = [
      'supabase/functions/_shared/embeddings.ts',
      'supabase/functions/foo/index.ts',
    ].join('\n');
    expect(getChangedFunctions(diff)).toEqual(['foo']);
  });

  it('returns empty array for no function changes', () => {
    const diff = 'src/App.tsx\npackage.json';
    expect(getChangedFunctions(diff)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(getChangedFunctions('')).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: FAIL — `getChangedFunctions` returns undefined

**Step 3: Implement getChangedFunctions**

In `scripts/deploy-functions.mjs`:

```js
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — all 4 getChangedFunctions tests pass

**Step 5: Commit**

```bash
git add scripts/deploy-functions.mjs scripts/deploy-functions.test.ts
git commit -m "feat: implement getChangedFunctions for deploy script"
```

---

### Task 4: detectSharedChanges()

**Files:**
- Modify: `scripts/deploy-functions.mjs` — implement `detectSharedChanges()`
- Modify: `scripts/deploy-functions.test.ts` — add tests

**Step 1: Write the failing tests**

Add to `scripts/deploy-functions.test.ts`:

```ts
describe('detectSharedChanges', () => {
  it('returns true when _shared files are in diff', () => {
    const diff = [
      'supabase/functions/_shared/embeddings.ts',
      'supabase/functions/foo/index.ts',
    ].join('\n');
    expect(detectSharedChanges(diff)).toBe(true);
  });

  it('returns false when no _shared files in diff', () => {
    const diff = 'supabase/functions/foo/index.ts\nsupabase/functions/bar/index.ts';
    expect(detectSharedChanges(diff)).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(detectSharedChanges('')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: FAIL — `detectSharedChanges` returns undefined

**Step 3: Implement detectSharedChanges**

In `scripts/deploy-functions.mjs`:

```js
export function detectSharedChanges(gitDiffOutput) {
  return gitDiffOutput.split('\n').some(line =>
    line.startsWith('supabase/functions/_shared/')
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — all 3 detectSharedChanges tests pass

**Step 5: Commit**

```bash
git add scripts/deploy-functions.mjs scripts/deploy-functions.test.ts
git commit -m "feat: implement detectSharedChanges for deploy script"
```

---

### Task 5: buildDeployList()

**Files:**
- Modify: `scripts/deploy-functions.mjs` — implement `buildDeployList()`
- Modify: `scripts/deploy-functions.test.ts` — add tests

**Step 1: Write the failing tests**

Add to `scripts/deploy-functions.test.ts`:

```ts
describe('buildDeployList', () => {
  it('returns missing functions (in repo, not deployed)', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a'],
      changedFunctions: [],
      sharedChanged: false,
    });
    expect(result.toDeploy).toEqual(['b', 'c']);
    expect(result.orphaned).toEqual([]);
  });

  it('includes changed functions even if already deployed', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b'],
      remoteFunctions: ['a', 'b'],
      changedFunctions: ['a'],
      sharedChanged: false,
    });
    expect(result.toDeploy).toEqual(['a']);
  });

  it('returns all repo functions when sharedChanged is true', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a', 'b', 'c'],
      changedFunctions: [],
      sharedChanged: true,
    });
    expect(result.toDeploy).toEqual(['a', 'b', 'c']);
    expect(result.sharedWarning).toBe(true);
  });

  it('flags orphaned functions (deployed but not in repo)', () => {
    const result = buildDeployList({
      repoFunctions: ['a'],
      remoteFunctions: ['a', 'gone'],
      changedFunctions: [],
      sharedChanged: false,
    });
    expect(result.orphaned).toEqual(['gone']);
  });

  it('deduplicates missing + changed', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a'],
      changedFunctions: ['b'],
      sharedChanged: false,
    });
    // b and c are missing; b is also changed — should appear once
    expect(result.toDeploy).toEqual(['b', 'c']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: FAIL — `buildDeployList` returns undefined

**Step 3: Implement buildDeployList**

In `scripts/deploy-functions.mjs`:

```js
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — all 5 buildDeployList tests pass

**Step 5: Commit**

```bash
git add scripts/deploy-functions.mjs scripts/deploy-functions.test.ts
git commit -m "feat: implement buildDeployList for deploy script"
```

---

### Task 6: Wire up CLI entry point + error handling

**Files:**
- Modify: `scripts/deploy-functions.mjs` — add CLI entry point with flag parsing, interactive prompt, deploy orchestration, and error handling

This task is not TDD — it's glue code that shells out to `supabase` CLI and handles user interaction. Testing the CLI entry point would require mocking child_process, readline, and fs, which is lower value than the unit-tested pure functions.

**Step 1: Add CLI helpers and main function**

Add to `scripts/deploy-functions.mjs` after the exported functions:

```js
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    status: args.includes('--status'),
    diff: args.includes('--diff'),
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes'),
    function: null,
  };
  const fnIdx = args.indexOf('--function');
  if (fnIdx !== -1 && args[fnIdx + 1]) {
    flags.function = args[fnIdx + 1];
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
    // supabase functions list outputs a table; extract function names from first column
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
  // Validate env
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN env var is required.');
    console.error('Get one at: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  // Read config
  const configPath = join(ROOT, 'supabase', 'config.toml');
  let configContent;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    console.error(`Error: Cannot read ${configPath}`);
    process.exit(1);
  }

  const projectRef = parseConfigToml(configContent);
  const flags = parseArgs(process.argv);

  // Single function mode
  if (flags.function) {
    const repoFns = getRepoFunctions();
    if (!repoFns.includes(flags.function)) {
      console.error(`Error: Function "${flags.function}" not found in supabase/functions/`);
      process.exit(1);
    }
    const ok = deployFunction(flags.function, projectRef, flags.dryRun);
    process.exit(ok ? 0 : 1);
  }

  // Gather data
  console.log(`▸ Project: ${projectRef}`);
  const repoFunctions = getRepoFunctions();
  console.log(`▸ Repo functions: ${repoFunctions.length}`);

  const remoteFunctions = getRemoteFunctions(projectRef);
  console.log(`▸ Remote functions: ${remoteFunctions.length}`);

  const gitDiff = getGitDiff();
  const changedFunctions = getChangedFunctions(gitDiff);
  const sharedChanged = detectSharedChanges(gitDiff);

  // Build deploy list
  const { toDeploy, orphaned, sharedWarning } = buildDeployList({
    repoFunctions,
    remoteFunctions,
    changedFunctions,
    sharedChanged,
  });

  // For --diff mode, only deploy changed (not all missing)
  const deployList = flags.diff
    ? changedFunctions.filter(f => repoFunctions.includes(f))
    : flags.all
      ? repoFunctions
      : toDeploy;

  // Report
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

  // Status mode — just report
  if (flags.status || deployList.length === 0) {
    if (deployList.length === 0) console.log('✓ Nothing to deploy');
    process.exit(0);
  }

  // Confirm
  if (!flags.yes) {
    const answer = await prompt(`\n▸ Deploy ${deployList.length} function(s)? (y/N): `);
    if (answer !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Deploy
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

// Only run main when executed directly (not imported by tests)
if (process.argv[1] && process.argv[1].includes('deploy-functions')) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
```

**Step 2: Run the full test suite to confirm no regressions**

Run: `npx vitest run scripts/deploy-functions.test.ts`
Expected: PASS — all existing pure function tests still pass (CLI code is not tested here)

**Step 3: Manually smoke-test with --status flag**

Run: `SUPABASE_ACCESS_TOKEN=<your-token> node scripts/deploy-functions.mjs --status`
Expected: prints repo count, remote count, and deploy/orphan list. Exits 0.

If `SUPABASE_ACCESS_TOKEN` is not available, run without it to confirm the error message:

Run: `node scripts/deploy-functions.mjs --status`
Expected: `Error: SUPABASE_ACCESS_TOKEN env var is required.` and exit 1.

**Step 4: Commit**

```bash
git add scripts/deploy-functions.mjs
git commit -m "feat: wire up deploy-functions CLI with flags and interactive prompt"
```

---

### Task 7: npm scripts + PR template

**Files:**
- Modify: `package.json:6-14` — add 3 deploy scripts
- Create: `.github/pull_request_template.md`

**Step 1: Add npm scripts to package.json**

In the `"scripts"` block, add after `"test:coverage"`:

```json
"deploy:functions": "node scripts/deploy-functions.mjs",
"deploy:functions:status": "node scripts/deploy-functions.mjs --status",
"deploy:functions:diff": "node scripts/deploy-functions.mjs --diff"
```

**Step 2: Create PR template**

Create `.github/pull_request_template.md`:

```markdown
## Why

## Changes

## Test plan

## Edge functions

- [ ] This PR does not touch `supabase/functions/`
- [ ] OR: After merge, run `npm run deploy:functions:diff`
- [ ] OR: Functions listed below need manual deploy:
  - `function-name`

---
Generated with [Claude Code](https://claude.com/claude-code)
```

**Step 3: Verify npm scripts work**

Run: `npm run deploy:functions:status`
Expected: Same output as direct `node scripts/deploy-functions.mjs --status`

**Step 4: Run full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests pass, including existing `src/` tests

**Step 5: Commit**

```bash
git add package.json .github/pull_request_template.md
git commit -m "chore: add deploy:functions npm scripts and PR template"
```

---

### Task 8: Final verification

**Files:** None — read-only verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass

**Step 2: Run deploy:functions:status**

Run: `npm run deploy:functions:status`
Expected: status report prints without errors (or clean SUPABASE_ACCESS_TOKEN error if not set)

**Step 3: Run deploy:functions with --dry-run**

Run: `node scripts/deploy-functions.mjs --all --dry-run --yes`
Expected: lists all 118 functions with `[dry-run] would deploy:` prefix, no actual deploys

**Step 4: Verify no existing tests broke**

Run: `npx vitest run src/`
Expected: all existing tests pass unchanged

**Step 5: Verify git status is clean**

Run: `git status`
Expected: no uncommitted changes
