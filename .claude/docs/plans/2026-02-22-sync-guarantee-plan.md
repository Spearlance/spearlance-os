# Sync Guarantee System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Guarantee all armadillo artifacts stay in sync — one source of truth, one script, zero drift.

**Architecture:** armadillo.json + packs/ directory + skill frontmatter are the sources of truth. A single `scripts/sync-all.js` reads them, generates README.md and CLAUDE.md marked sections, and validates version consistency. Pre-push hook runs it in generate mode, CI runs it with `--check`.

**Tech Stack:** Node.js ESM, node:test, existing `parseFrontmatter()` lib, GitHub Actions

---

### Task 1: Clean npm from armadillo.json

**Files:**
- Modify: `armadillo.json:1-2`

**Step 1: Write the failing test**

Add to `tests/armadillo-json.test.js`:

```js
it('name does not include npm scope', () => {
  assert.ok(!manifest.name.includes('@'), 'name must not include npm scope');
  assert.equal(manifest.name, 'armadillo', 'name must be "armadillo"');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/armadillo-json.test.js`
Expected: FAIL — `name` is currently `@filenamedotexe/armadillo`

**Step 3: Write minimal implementation**

In `armadillo.json`, change line 2:
```json
"name": "armadillo",
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/armadillo-json.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add armadillo.json tests/armadillo-json.test.js
git commit -m "chore: remove npm scope from armadillo.json name"
```

---

### Task 2: Clean npm from package.json

**Files:**
- Modify: `package.json:2`

**Step 1: Write the failing test**

Create `tests/package-json.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

describe('package.json — git-only distribution', () => {
  it('name does not include npm scope', () => {
    assert.ok(!pkg.name.includes('@'), 'name must not include npm scope');
    assert.equal(pkg.name, 'armadillo');
  });

  it('has no publishConfig', () => {
    assert.equal(pkg.publishConfig, undefined, 'must not have publishConfig');
  });

  it('has no bin field', () => {
    assert.equal(pkg.bin, undefined, 'must not have bin');
  });

  it('keeps postinstall for git hooks', () => {
    assert.ok(pkg.scripts.postinstall, 'postinstall installs git hooks');
    assert.ok(pkg.scripts.postinstall.includes('install-hooks'), 'postinstall must reference install-hooks');
  });

  it('has type module', () => {
    assert.equal(pkg.type, 'module');
  });

  it('has test script', () => {
    assert.ok(pkg.scripts.test);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/package-json.test.js`
Expected: FAIL — `name` is currently `@filenamedotexe/armadillo`

**Step 3: Write minimal implementation**

In `package.json`, change `"name"` from `"@filenamedotexe/armadillo"` to `"armadillo"`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/package-json.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tests/package-json.test.js
git commit -m "chore: remove npm scope from package.json"
```

---

### Task 3: Replace publish.yml with release.yml

**Files:**
- Delete: `.github/workflows/publish.yml`
- Create: `.github/workflows/release.yml`
- Modify: `tests/github-files.test.js`
- Modify: `tests/publish-workflow.test.js`

**Step 1: Write the failing tests**

Replace the `publish.yml` describe block in `tests/github-files.test.js` with a `release.yml` describe block:

```js
describe('release.yml', () => {
  const content = readFileSync('.github/workflows/release.yml', 'utf8');

  test('exists', () => assert.ok(existsSync('.github/workflows/release.yml')));
  test('triggers on push to main', () => assert.match(content, /push:/));
  test('watches main branch', () => assert.match(content, /branches:.*main/));
  test('does not reference npm', () => {
    assert.ok(!content.includes('npm publish'), 'must not npm publish');
    assert.ok(!content.includes('NPM_TOKEN'), 'must not use NPM_TOKEN');
    assert.ok(!content.includes('registry.npmjs.org'), 'must not reference npm registry');
  });
  test('creates GitHub release', () => assert.match(content, /gh release create/));
  test('runs sync-all --check', () => assert.match(content, /sync-all\.js --check/));
});
```

Replace `tests/publish-workflow.test.js` entirely:

```js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('.github/workflows/release.yml — git-only release', () => {
  it('release.yml exists', () => {
    assert.ok(existsSync(join(ROOT, '.github', 'workflows', 'release.yml')));
  });

  it('publish.yml does not exist', () => {
    assert.ok(!existsSync(join(ROOT, '.github', 'workflows', 'publish.yml')), 'publish.yml must be deleted');
  });

  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8');

  it('runs sync-all --check for validation', () => {
    assert.ok(workflow.includes('sync-all'), 'must run sync-all validation');
    assert.ok(workflow.includes('--check'), 'must use --check flag');
  });

  it('has fetch-depth 0 for tag creation', () => {
    assert.ok(workflow.includes('fetch-depth: 0'));
  });

  it('creates a GitHub release with version tag', () => {
    assert.ok(workflow.includes('gh release create'));
  });

  it('does not reference npm at all', () => {
    assert.ok(!workflow.includes('npm publish'));
    assert.ok(!workflow.includes('NPM_TOKEN'));
    assert.ok(!workflow.includes('registry'));
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/github-files.test.js tests/publish-workflow.test.js`
Expected: FAIL — `release.yml` doesn't exist yet, `publish.yml` still exists

**Step 3: Write minimal implementation**

Delete `.github/workflows/publish.yml`.

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci
      - run: npm test
      - run: node scripts/sync-all.js --check
        name: Validate all artifacts are in sync

  release:
    needs: validate
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get version
        id: version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

      - name: Check if tag exists
        id: check
        run: |
          if git tag -l "v${{ steps.version.outputs.version }}" | grep -q .; then
            echo "exists=true" >> $GITHUB_OUTPUT
          else
            echo "exists=false" >> $GITHUB_OUTPUT
          fi

      - name: Create GitHub release
        if: steps.check.outputs.exists == 'false'
        run: |
          VERSION=${{ steps.version.outputs.version }}
          gh release create "v${VERSION}" --title "v${VERSION}" --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 4: Run tests to verify they pass**

Run: `node --test tests/github-files.test.js tests/publish-workflow.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git rm .github/workflows/publish.yml
git add .github/workflows/release.yml tests/github-files.test.js tests/publish-workflow.test.js
git commit -m "chore: replace npm publish with GitHub Releases"
```

---

### Task 4: Clean "plugin" terminology from CI and README markers

**Files:**
- Modify: `.github/workflows/ci.yml:28` — remove "plugin validation" comment
- Modify: `README.md:95,130` — rename `plugin-ecosystem-table` markers to `pack-ecosystem-table`
- Modify: `README.md:132` — remove "Each skill pack lives in its own GitHub repo" line
- Modify: `README.md:268` — update "No npm install, no daemon, no plugin registry" text

**Step 1: Write the failing test**

Add to `tests/readme-content.test.js`:

```js
describe('README — no plugin or npm terminology', () => {
  it('does not have plugin-ecosystem-table markers', () => {
    assert.ok(!readme.includes('plugin-ecosystem-table'), 'must use pack-ecosystem-table');
  });

  it('has pack-ecosystem-table markers', () => {
    assert.ok(readme.includes('pack-ecosystem-table'), 'must have pack-ecosystem-table markers');
  });

  it('does not say "No npm install"', () => {
    assert.ok(!readme.includes('No npm install'), 'no npm references in distribution section');
  });

  it('does not say "plugin registry"', () => {
    assert.ok(!readme.includes('plugin registry'), 'must not reference plugin registry');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/readme-content.test.js`
Expected: FAIL

**Step 3: Write minimal implementation**

In `README.md`:
- Replace `<!-- BEGIN:plugin-ecosystem-table -->` with `<!-- BEGIN:pack-ecosystem-table -->`
- Replace `<!-- END:plugin-ecosystem-table -->` with `<!-- END:pack-ecosystem-table -->`
- Change line 132 to: `Each skill pack installs independently. Add only what your project uses.`
- Change line 268 to: `Armadillo is a single GitHub repo. Onboarding fetches files directly from GitHub and copies them into your project's \`.claude/\` directory. No daemon to run, no package registry.`

In `.github/workflows/ci.yml` line 28:
- Change `name: Install Claude Code CLI (for plugin validation)` to `name: Install Claude Code CLI`

**Step 4: Run test to verify it passes**

Run: `node --test tests/readme-content.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md .github/workflows/ci.yml tests/readme-content.test.js
git commit -m "chore: rename plugin→pack in README markers and CI"
```

---

### Task 5: Build `scripts/lib/read-descriptions.js` — frontmatter description reader

This is the core new lib that replaces all hardcoded `SKILL_DESCRIPTIONS` maps.

**Files:**
- Create: `scripts/lib/read-descriptions.js`
- Create: `tests/read-descriptions.test.js`

**Step 1: Write the failing test**

Create `tests/read-descriptions.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Will import after creation
let readCoreSkillDescriptions, readPackSkillDescriptions;

describe('read-descriptions module', () => {
  it('exports readCoreSkillDescriptions and readPackSkillDescriptions', async () => {
    const mod = await import('../scripts/lib/read-descriptions.js');
    readCoreSkillDescriptions = mod.readCoreSkillDescriptions;
    readPackSkillDescriptions = mod.readPackSkillDescriptions;
    assert.ok(typeof readCoreSkillDescriptions === 'function');
    assert.ok(typeof readPackSkillDescriptions === 'function');
  });

  it('readCoreSkillDescriptions returns descriptions for all core skills', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const descs = readCoreSkillDescriptions(ROOT, manifest.core.skills);
    // Every core skill should have a description
    for (const skill of manifest.core.skills) {
      assert.ok(descs[skill], `missing description for core skill: ${skill}`);
      assert.ok(descs[skill].length > 10, `description too short for: ${skill}`);
    }
  });

  it('readPackSkillDescriptions returns descriptions for all pack skills', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const descs = readPackSkillDescriptions(ROOT, manifest.packs);
    for (const [packName, pack] of Object.entries(manifest.packs)) {
      for (const skill of pack.skills) {
        assert.ok(descs[skill], `missing description for ${packName}/${skill}`);
      }
    }
  });

  it('descriptions come from frontmatter, not hardcoded', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const descs = readCoreSkillDescriptions(ROOT, manifest.core.skills);
    // Spot-check: brainstorming description should match its SKILL.md frontmatter
    const brainstormingSkill = readFileSync(join(ROOT, '.claude', 'skills', 'brainstorming', 'SKILL.md'), 'utf8');
    const fmMatch = brainstormingSkill.match(/description:\s*"?([^"\n]+)"?/);
    if (fmMatch) {
      assert.equal(descs['brainstorming'], fmMatch[1].trim());
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/read-descriptions.test.js`
Expected: FAIL — module doesn't exist

**Step 3: Write minimal implementation**

Create `scripts/lib/read-descriptions.js`:

```js
/**
 * Reads skill descriptions from SKILL.md frontmatter.
 * Single source of truth — replaces all hardcoded SKILL_DESCRIPTIONS maps.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter } from './parse-frontmatter.js';

/**
 * Read descriptions for core skills from .claude/skills/<name>/SKILL.md
 * @param {string} root - Repo root path
 * @param {string[]} skillNames - Array of core skill names
 * @returns {Record<string, string>} Map of skill name → description
 */
export function readCoreSkillDescriptions(root, skillNames) {
  const descriptions = {};
  for (const name of skillNames) {
    const skillPath = join(root, '.claude', 'skills', name, 'SKILL.md');
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, 'utf8');
      const { metadata } = parseFrontmatter(content);
      descriptions[name] = metadata.description || '';
    } else {
      descriptions[name] = '';
    }
  }
  return descriptions;
}

/**
 * Read descriptions for pack skills from packs/<pack>/skills/<skill>/SKILL.md
 * @param {string} root - Repo root path
 * @param {Record<string, {skills: string[]}>} packs - Packs from armadillo.json
 * @returns {Record<string, string>} Map of skill name → description
 */
export function readPackSkillDescriptions(root, packs) {
  const descriptions = {};
  for (const [packName, pack] of Object.entries(packs)) {
    for (const skill of pack.skills) {
      const skillPath = join(root, 'packs', packName, 'skills', skill, 'SKILL.md');
      if (existsSync(skillPath)) {
        const content = readFileSync(skillPath, 'utf8');
        const { metadata } = parseFrontmatter(content);
        descriptions[skill] = metadata.description || '';
      } else {
        descriptions[skill] = '';
      }
    }
  }
  return descriptions;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/read-descriptions.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/read-descriptions.js tests/read-descriptions.test.js
git commit -m "feat: add read-descriptions lib — frontmatter-sourced skill descriptions"
```

---

### Task 6: Rewrite sync-all.js — unified generate + validate

This is the big one. Replace the current validation-only sync-all.js with the unified generate+validate system.

**Files:**
- Rewrite: `scripts/sync-all.js`
- Rewrite: `tests/sync-all-v2.test.js`

**Step 1: Write the failing tests**

Replace `tests/sync-all-v2.test.js` entirely:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('sync-all.js — unified generate+validate', () => {
  const content = readFileSync(join(ROOT, 'scripts', 'sync-all.js'), 'utf8');

  it('imports read-descriptions lib', () => {
    assert.ok(content.includes('read-descriptions'), 'must use read-descriptions lib');
  });

  it('imports parseFrontmatter or read-descriptions (not hardcoded descriptions)', () => {
    assert.ok(!content.includes('SKILL_DESCRIPTIONS'), 'must not hardcode skill descriptions');
  });

  it('has --check flag support', () => {
    assert.ok(content.includes('--check'), 'must support --check flag for CI');
  });

  it('generates README.md sections', () => {
    assert.ok(content.includes('README.md'), 'must generate README content');
    assert.ok(content.includes('pack-ecosystem-table'), 'must use pack-ecosystem-table marker');
  });

  it('generates CLAUDE.md sections', () => {
    assert.ok(content.includes('CLAUDE.md'), 'must generate CLAUDE.md content');
    assert.ok(content.includes('armadillo:start'), 'must use armadillo markers');
  });

  it('validates bidirectional pack↔filesystem', () => {
    assert.ok(content.includes('packs/') || content.includes("'packs'"), 'must scan packs/ directory');
  });

  it('validates version consistency across 3 files', () => {
    assert.ok(content.includes('package.json'), 'must check package.json version');
    assert.ok(content.includes('CHANGELOG.json'), 'must check CHANGELOG.json version');
    assert.ok(content.includes('armadillo.json'), 'must check armadillo.json version');
  });

  it('does not reference plugins', () => {
    assert.ok(!content.includes('plugin'), 'must not reference plugins');
  });

  it('does not reference marketplace', () => {
    assert.ok(!content.includes('marketplace'));
  });

  it('does not reference skills.json', () => {
    assert.ok(!content.includes('skills.json'));
  });

  it('does not reference symlinks', () => {
    assert.ok(!content.includes('isSymbolicLink'));
  });

  it('references armadillo.json', () => {
    assert.ok(content.includes('armadillo.json'));
  });

  it('validates .claude/ subdirectories', () => {
    assert.ok(content.includes('.claude/skills'));
    assert.ok(content.includes('.claude/hooks'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/sync-all-v2.test.js`
Expected: FAIL — current sync-all.js doesn't have `--check`, doesn't import `read-descriptions`, still says `plugin` in comments

**Step 3: Write minimal implementation**

Rewrite `scripts/sync-all.js` entirely. This is the core of the refactor. The new script:

```js
#!/usr/bin/env node
/**
 * sync-all.js — Unified generate + validate for the armadillo repo.
 *
 * Default mode: Generate README.md + CLAUDE.md marked sections, validate everything.
 * --check mode: Validate only — compare generated content to current files. Exit 1 if stale.
 *
 * Sources of truth:
 *   - armadillo.json (version, core skills, pack registry)
 *   - packs/ directory (skill files)
 *   - .claude/skills/ directory (core skill files)
 *   - SKILL.md frontmatter (descriptions)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCoreSkillDescriptions, readPackSkillDescriptions } from './lib/read-descriptions.js';
import { generateClaudeMd } from './lib/generate-claude-md.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

let hasErrors = false;
let hasChanges = false;

function error(msg) { console.error(`✗ ${msg}`); hasErrors = true; }
function success(msg) { console.log(`✓ ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }

// ─── 1. Read sources of truth ────────────────────────────────────────────────

function readManifest() {
  const manifestPath = path.join(ROOT, 'armadillo.json');
  if (!fs.existsSync(manifestPath)) {
    error('Missing armadillo.json');
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

// ─── 2. Validate directories ─────────────────────────────────────────────────

function validateDirectories() {
  console.log('\n━━━ Validating .claude/ Directories ━━━');
  const required = [
    { dir: '.claude/skills', purpose: 'Core skill definitions' },
    { dir: '.claude/agents', purpose: 'Agent definitions' },
    { dir: '.claude/hooks', purpose: 'Hook scripts' },
    { dir: '.claude/rules', purpose: 'Rule definitions' },
    { dir: '.claude/context', purpose: 'Runtime state' },
  ];

  for (const { dir, purpose } of required) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      error(`Missing directory: ${dir}`);
      info(`  Purpose: ${purpose}`);
    } else if (!fs.statSync(dirPath).isDirectory()) {
      error(`Not a directory: ${dir}`);
    } else {
      success(`${dir}/ exists`);
    }
  }
}

// ─── 3. Validate bidirectional: armadillo.json ↔ filesystem ──────────────────

function validateBidirectional(manifest) {
  console.log('\n━━━ Validating Bidirectional Sync ━━━');

  // Core skills: armadillo.json ↔ .claude/skills/
  let coreOk = true;
  for (const skill of manifest.core.skills) {
    const skillDir = path.join(ROOT, '.claude', 'skills', skill);
    if (!fs.existsSync(skillDir)) {
      error(`Core skill in manifest but missing from filesystem: .claude/skills/${skill}`);
      coreOk = false;
    }
  }

  // Check for orphan core skills (on filesystem but not in manifest)
  const coreSkillDirs = fs.readdirSync(path.join(ROOT, '.claude', 'skills'))
    .filter(f => fs.statSync(path.join(ROOT, '.claude', 'skills', f)).isDirectory());
  for (const dir of coreSkillDirs) {
    if (!manifest.core.skills.includes(dir)) {
      error(`Core skill on filesystem but not in armadillo.json: .claude/skills/${dir}`);
      coreOk = false;
    }
  }
  if (coreOk) success(`All ${manifest.core.skills.length} core skills bidirectionally synced`);

  // Pack skills: armadillo.json ↔ packs/
  let packsOk = true;
  const packsDirEntries = fs.readdirSync(path.join(ROOT, 'packs'))
    .filter(f => f !== '.DS_Store' && fs.statSync(path.join(ROOT, 'packs', f)).isDirectory());

  // Check manifest packs → filesystem
  for (const [packName, pack] of Object.entries(manifest.packs)) {
    const packDir = path.join(ROOT, 'packs', packName);
    if (!fs.existsSync(packDir)) {
      error(`Pack in manifest but missing from filesystem: packs/${packName}`);
      packsOk = false;
      continue;
    }
    for (const skill of pack.skills) {
      const skillDir = path.join(ROOT, 'packs', packName, 'skills', skill);
      if (!fs.existsSync(skillDir)) {
        error(`Pack skill in manifest but missing: packs/${packName}/skills/${skill}`);
        packsOk = false;
      }
    }
  }

  // Check filesystem → manifest packs
  for (const dir of packsDirEntries) {
    if (!manifest.packs[dir]) {
      error(`Pack on filesystem but not in armadillo.json: packs/${dir}`);
      packsOk = false;
    }
  }

  if (packsOk) success(`All ${Object.keys(manifest.packs).length} packs bidirectionally synced`);
}

// ─── 4. Validate versions ────────────────────────────────────────────────────

function validateVersions(manifest) {
  console.log('\n━━━ Validating Version Consistency ━━━');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const changelog = JSON.parse(fs.readFileSync(path.join(ROOT, 'CHANGELOG.json'), 'utf8'));
  const changelogVersion = Object.keys(changelog)[0];

  const versions = {
    'package.json': pkg.version,
    'armadillo.json': manifest.version,
    'CHANGELOG.json': changelogVersion,
  };

  const allMatch = pkg.version === manifest.version && manifest.version === changelogVersion;
  if (allMatch) {
    success(`Version consistent: ${pkg.version}`);
  } else {
    error(`Version mismatch:`);
    for (const [file, ver] of Object.entries(versions)) {
      info(`  ${file}: ${ver}`);
    }
  }
}

// ─── 5. Validate hooks ──────────────────────────────────────────────────────

function validateHooks() {
  console.log('\n━━━ Validating Hooks Configuration ━━━');
  const hooksJsonPath = path.join(ROOT, '.claude', 'hooks', 'hooks.json');

  if (!fs.existsSync(hooksJsonPath)) {
    error('Missing .claude/hooks/hooks.json');
    return;
  }

  const hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));

  if (!hooksConfig.hooks) {
    error('hooks.json missing hooks object');
    return;
  }

  const requiredHooks = [
    { event: 'UserPromptSubmit', script: 'inject-skill-awareness.sh', critical: true },
    { event: 'PreToolUse', script: 'enforce-skills.sh', critical: true },
    { event: 'SessionStart', script: 'session-start.sh', critical: false },
    { event: 'SubagentStart', script: 'subagent-start.sh', critical: false },
    { event: 'PreCompact', script: 'pre-compact.sh', critical: false },
    { event: 'PostToolUse', script: 'async-lint.sh', critical: false },
    { event: 'PostToolUse', script: 'post-push-pr-check.sh', critical: false },
    { event: 'TaskCompleted', script: 'task-completed.sh', critical: false },
    { event: 'Stop', script: 'stop-verification.sh', critical: false },
    { event: 'SubagentStop', script: 'subagent-stop.sh', critical: false },
    { event: 'SessionEnd', script: 'session-end.sh', critical: false },
    { event: 'PostToolUseFailure', script: 'tool-failure-context.sh', critical: false }
  ];

  for (const { event, script, critical } of requiredHooks) {
    const hooks = hooksConfig.hooks[event];
    if (!hooks || hooks.length === 0) {
      if (critical) error(`Missing critical hook: ${event}`);
      else info(`Optional hook not configured: ${event} (${script})`);
      continue;
    }

    const hasScript = hooks.some(group =>
      group.hooks?.some(h => h.command?.includes(script))
    );

    if (!hasScript) {
      if (critical) error(`Missing ${script} in ${event}`);
      else info(`Optional: ${script} not in ${event}`);
    } else {
      success(`${event} → ${script}`);
    }
  }
}

// ─── 6. Validate settings.json hooks ─────────────────────────────────────────

function validateSettingsHooks() {
  console.log('\n━━━ Validating settings.json hooks ━━━');
  const settingsPath = path.join(ROOT, '.claude', 'settings.json');

  if (!fs.existsSync(settingsPath)) {
    error('Missing .claude/settings.json');
    return;
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

  if (!settings.hooks) {
    error('settings.json missing hooks key');
    return;
  }

  const requiredEvents = ['PreToolUse', 'UserPromptSubmit', 'SessionStart', 'PostToolUse'];
  for (const event of requiredEvents) {
    if (!settings.hooks[event]) {
      error(`settings.json hooks missing: ${event}`);
    } else {
      success(`settings.json hooks → ${event}`);
    }
  }
}

// ─── 7. Generate README.md marked sections ───────────────────────────────────

function generateReadmeSections(manifest, coreDescs, packDescs) {
  // Core skills table
  const coreSkillsTable = [
    '| Skill | What it does |',
    '|-------|-------------|',
    ...manifest.core.skills.map(name => {
      const desc = coreDescs[name] || '';
      return `| **${name}** | ${desc} |`;
    })
  ].join('\n');

  // Rules table
  const rulesDescs = {};
  for (const ruleFile of manifest.core.rules) {
    const ruleName = ruleFile.replace('.md', '');
    const rulePath = path.join(ROOT, '.claude', 'rules', ruleFile);
    if (fs.existsSync(rulePath)) {
      const content = fs.readFileSync(rulePath, 'utf8');
      // Extract first paragraph after the # heading as description
      const lines = content.split('\n');
      const headingIdx = lines.findIndex(l => l.startsWith('# '));
      if (headingIdx !== -1) {
        // Find next non-empty line after heading
        let descLine = '';
        for (let i = headingIdx + 1; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed && !trimmed.startsWith('#')) {
            descLine = trimmed;
            break;
          }
        }
        rulesDescs[ruleName] = descLine;
      }
    }
  }

  const rulesTable = [
    '| Rule | What it enforces |',
    '|------|-----------------|',
    ...manifest.core.rules.map(file => {
      const name = file.replace('.md', '');
      const desc = rulesDescs[name] || '';
      return `| **${name}** | ${desc} |`;
    })
  ].join('\n');

  // Pack ecosystem table
  const packEcosystemTable = [
    '| Skill Pack | Skills | Description |',
    '|------------|--------|-------------|',
    `| **armadillo-core** | ${manifest.core.skills.length} | Workflow, testing, git, debugging, and meta skills — always required |`,
    ...Object.entries(manifest.packs).map(([packName, pack]) => {
      const count = pack.skills.length;
      return `| **armadillo-${packName}** | ${count} | ${pack.description} |`;
    })
  ].join('\n');

  return {
    'core-skills-count': String(manifest.core.skills.length),
    'core-skills-table': `\n${coreSkillsTable}\n`,
    'rules-count': String(manifest.core.rules.length),
    'rules-table': `\n${rulesTable}\n`,
    'pack-ecosystem-table': `\n${packEcosystemTable}\n`,
  };
}

function applyReadmeSections(sections) {
  const readmePath = path.join(ROOT, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');

  for (const [marker, content] of Object.entries(sections)) {
    const begin = `<!-- BEGIN:${marker} -->`;
    const end = `<!-- END:${marker} -->`;
    const regex = new RegExp(`${begin}[\\s\\S]*?${end}`, 'g');
    if (readme.match(regex)) {
      readme = readme.replace(regex, `${begin}${content}${end}`);
    } else {
      error(`README.md missing markers: ${begin} ... ${end}`);
    }
  }

  return readme;
}

// ─── 8. Generate CLAUDE.md ───────────────────────────────────────────────────

function generateClaudeMdContent(manifest) {
  const claudeMdPath = path.join(ROOT, '.claude', 'CLAUDE.md');
  let existingBelow = '';

  if (fs.existsSync(claudeMdPath)) {
    const current = fs.readFileSync(claudeMdPath, 'utf8');
    const END_MARKER = '<!-- armadillo:end -->';
    const ADD_COMMENT = '<!-- Add your project-specific instructions below this line -->';
    const endIdx = current.indexOf(END_MARKER);
    if (endIdx !== -1) {
      const afterEnd = current.slice(endIdx + END_MARKER.length);
      const addIdx = afterEnd.indexOf(ADD_COMMENT);
      existingBelow = addIdx !== -1
        ? afterEnd.slice(addIdx + ADD_COMMENT.length)
        : afterEnd;
    }
  }

  return generateClaudeMd(manifest, existingBelow);
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`sync-all.js — ${CHECK_MODE ? 'Validate' : 'Generate + Validate'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const manifest = readManifest();
if (!manifest) process.exit(1);

// Read descriptions from frontmatter
const coreDescs = readCoreSkillDescriptions(ROOT, manifest.core.skills);
const packDescs = readPackSkillDescriptions(ROOT, manifest.packs);

// Validate structure
validateDirectories();
validateBidirectional(manifest);
validateVersions(manifest);
validateHooks();
validateSettingsHooks();

// Generate content
console.log('\n━━━ Generating Content ━━━');

const readmeSections = generateReadmeSections(manifest, coreDescs, packDescs);
const newReadme = applyReadmeSections(readmeSections);
const readmePath = path.join(ROOT, 'README.md');
const currentReadme = fs.readFileSync(readmePath, 'utf8');

const newClaudeMd = generateClaudeMdContent(manifest);
const claudeMdPath = path.join(ROOT, '.claude', 'CLAUDE.md');
const currentClaudeMd = fs.readFileSync(claudeMdPath, 'utf8');

if (CHECK_MODE) {
  // Validate-only: compare generated to current
  if (newReadme !== currentReadme) {
    error('README.md is stale — run: node scripts/sync-all.js');
    hasChanges = true;
  } else {
    success('README.md is up to date');
  }

  if (newClaudeMd !== currentClaudeMd) {
    error('.claude/CLAUDE.md is stale — run: node scripts/sync-all.js');
    hasChanges = true;
  } else {
    success('.claude/CLAUDE.md is up to date');
  }
} else {
  // Generate mode: write files
  if (newReadme !== currentReadme) {
    fs.writeFileSync(readmePath, newReadme, 'utf8');
    success('README.md updated');
    hasChanges = true;
  } else {
    success('README.md already up to date');
  }

  if (newClaudeMd !== currentClaudeMd) {
    fs.writeFileSync(claudeMdPath, newClaudeMd, 'utf8');
    success('.claude/CLAUDE.md updated');
    hasChanges = true;
  } else {
    success('.claude/CLAUDE.md already up to date');
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (hasErrors) {
  console.error('✗ Sync validation failed');
  process.exit(1);
} else {
  console.log('✓ All systems in sync');
  process.exit(0);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/sync-all-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/sync-all.js tests/sync-all-v2.test.js
git commit -m "feat: rewrite sync-all.js as unified generate+validate system"
```

---

### Task 7: Extract generateClaudeMd to `scripts/lib/generate-claude-md.js`

The sync-all.js from Task 6 imports `generateClaudeMd` from `./lib/generate-claude-md.js`. Extract it from `scripts/build-claude-md.js`, making it use `readCoreSkillDescriptions` + `readPackSkillDescriptions` instead of hardcoded maps.

**Files:**
- Create: `scripts/lib/generate-claude-md.js`
- Modify: `tests/build-claude-md-v2.test.js`

**Step 1: Write the failing test**

Update `tests/build-claude-md-v2.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let generateClaudeMd;

describe('generate-claude-md lib', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));

  it('exports generateClaudeMd from lib', async () => {
    const mod = await import('../scripts/lib/generate-claude-md.js');
    generateClaudeMd = mod.generateClaudeMd;
    assert.ok(typeof generateClaudeMd === 'function');
  });

  it('generates content without plugin references', () => {
    const content = generateClaudeMd(manifest, '');
    assert.ok(!content.includes('enabledPlugin'), 'no enabledPlugins');
    assert.ok(!content.includes('extraKnownMarketplace'), 'no marketplaces');
    assert.ok(!content.includes('Plugin Ecosystem'), 'no Plugin Ecosystem section');
  });

  it('has Skill Packs section', () => {
    const content = generateClaudeMd(manifest, '');
    assert.ok(content.includes('Skill Packs'));
  });

  it('lists all core skills', () => {
    const content = generateClaudeMd(manifest, '');
    for (const skill of manifest.core.skills) {
      assert.ok(content.includes(skill), `missing core skill: ${skill}`);
    }
  });

  it('lists all packs', () => {
    const content = generateClaudeMd(manifest, '');
    for (const packName of Object.keys(manifest.packs)) {
      assert.ok(content.includes(packName), `missing pack: ${packName}`);
    }
  });

  it('preserves user content', () => {
    const userContent = '# My Project Notes\nThis is custom content.';
    const content = generateClaudeMd(manifest, userContent);
    assert.ok(content.includes(userContent));
  });

  it('has armadillo markers', () => {
    const content = generateClaudeMd(manifest, '');
    assert.ok(content.includes('<!-- armadillo:start -->'));
    assert.ok(content.includes('<!-- armadillo:end -->'));
  });

  it('does not contain hardcoded SKILL_DESCRIPTIONS', () => {
    const libContent = readFileSync(join(ROOT, 'scripts', 'lib', 'generate-claude-md.js'), 'utf8');
    assert.ok(!libContent.includes('SKILL_DESCRIPTIONS'), 'must not hardcode descriptions');
  });

  it('reads descriptions from frontmatter via read-descriptions', () => {
    const libContent = readFileSync(join(ROOT, 'scripts', 'lib', 'generate-claude-md.js'), 'utf8');
    assert.ok(libContent.includes('read-descriptions') || libContent.includes('readCoreSkillDescriptions'),
      'must use read-descriptions lib');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-claude-md-v2.test.js`
Expected: FAIL — `scripts/lib/generate-claude-md.js` doesn't exist

**Step 3: Write minimal implementation**

Create `scripts/lib/generate-claude-md.js` — extract from `scripts/build-claude-md.js` but replace hardcoded `SKILL_DESCRIPTIONS` with `readCoreSkillDescriptions()`:

```js
/**
 * Generates .claude/CLAUDE.md content from armadillo.json.
 * Descriptions sourced from skill frontmatter via read-descriptions lib.
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readCoreSkillDescriptions } from './read-descriptions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// Category groupings for core skills
const CORE_CATEGORIES = {
  'Workflow': [
    'brainstorming', 'writing-plans', 'executing-plans', 'test-driven-development',
    'systematic-debugging', 'verification-before-completion',
  ],
  'Collaboration': [
    'requesting-code-review', 'receiving-code-review',
    'subagent-driven-development', 'dispatching-parallel-agents',
  ],
  'Git': [
    'using-git-worktrees', 'finishing-a-development-branch', 'writing-prs',
  ],
  'Testing': [
    'playwright', 'puppeteer', 'cypress', 'vitest',
  ],
  'Meta': [
    'armadillo-shepherd', 'onboarding', 'updating-armadillo',
    'writing-skills', 'writing-reference-skills',
  ],
  'Data Quality': [
    'nap-ninja', 'env-ninja',
  ],
};

const RULES_DESCRIPTIONS = {
  'coding-standards': 'DRY, YAGNI, TDD, smart backgrounding, skill-first workflow',
  'git-workflow': '`env -u GITHUB_TOKEN` auth, conventional commits, atomic changes',
  'output-style': 'Consistent formatting, status markers, brand voice',
  'pr-format': 'Conventional commits PR titles, hybrid template, anti-patterns',
  'project-context': 'Stack-aware behavior — reads stack.json, PROJECT.md, fresh-project.json',
  'security': 'Secrets handling, env var safety, OWASP awareness',
  'testing': 'Test quality standards, coverage expectations, TDD enforcement',
  'facebook-capi': 'Meta Conversions API event schema, dedup, and server-side tracking rules',
  'meta-api-versioning': 'Meta Graph API version lifecycle, upgrade cadence, deprecation handling',
  'pinterest': 'Pinterest API conventions, OAuth refresh, rate limit patterns',
  'nap-enforcement': 'Always reference business.json — never hardcode NAP data in source files',
  'env-enforcement': 'Never hardcode secrets — always use environment variables and .env files',
  'release-checklist': 'Automatic versioning, conventional commits, CHANGELOG, pre-push hook workflow',
};

function buildSkillsSection(manifest, skillDescriptions) {
  const coreSkills = manifest.core.skills;
  const lines = [
    '## Skills',
    '',
    'This project uses [Armadillo](https://github.com/filenamedotexe/armadillo) skills. Use the Skill tool to invoke them.',
  ];

  const categorized = new Set(Object.values(CORE_CATEGORIES).flat());
  const uncategorized = coreSkills.filter(s => !categorized.has(s));

  for (const [category, categorySkills] of Object.entries(CORE_CATEGORIES)) {
    const present = categorySkills.filter(s => coreSkills.includes(s));
    if (present.length === 0) continue;

    lines.push('', `### ${category}`);
    for (const skill of present) {
      const desc = skillDescriptions[skill] || '';
      lines.push(`- **${skill}** — ${desc}`);
    }
  }

  if (uncategorized.length > 0) {
    lines.push('', '### Other');
    for (const skill of uncategorized) {
      const desc = skillDescriptions[skill] || '';
      lines.push(`- **${skill}** — ${desc}`);
    }
  }

  return lines.join('\n');
}

function buildPacksTable(manifest) {
  const packs = manifest.packs || {};
  const rows = [
    '## Skill Packs',
    '',
    'armadillo is modular. The **core** (always installed) provides workflow skills, agents, hooks, and rules. Optional **skill packs** add domain-specific expertise:',
    '',
    '| Pack | Skills | Focus |',
    '|------|--------|-------|',
  ];

  const coreCount = manifest.core.skills.length;
  rows.push(`| core | ${coreCount} | Workflow, testing, git, debugging, and meta skills — always required |`);

  for (const [packName, pack] of Object.entries(packs)) {
    const count = pack.skills.length;
    const focus = pack.description || '';
    rows.push(`| ${packName} | ${count} | ${focus} |`);
  }

  rows.push('', 'Use `/updating-armadillo` to add or remove skill packs.');
  return rows.join('\n');
}

function buildRulesSection(manifest) {
  const rules = manifest.core.rules || [];
  const lines = [
    '## Rules',
    '',
    'Rules auto-load from `.claude/rules/`:',
    '',
    '| Rule | What it enforces |',
    '|------|-----------------|',
  ];

  for (const ruleFile of rules) {
    const name = ruleFile.replace('.md', '');
    const desc = RULES_DESCRIPTIONS[name] || '';
    lines.push(`| **${name}** | ${desc} |`);
  }

  return lines.join('\n');
}

function buildModelSection() {
  return `## Model Selection

Agents and skills specify their own \`model:\` field. Never override via Task tool \`model\` parameter.

| Tier | Model ID | Use Cases |
|------|----------|-----------|
| **Opus 4.6** | \`claude-opus-4-6\` | Onboarding, updating-armadillo, writing-plans, executing-plans, subagent-driven-development, systematic-debugging, writing-skills, writing-reference-skills, dispatching-parallel-agents, receiving-code-review, fresh-project, stack-recommender, code-reviewer, brand-strategist, fullstack-architect |
| **Sonnet 4.6** | \`claude-sonnet-4-6\` | Implementation, content creation, API work, domain experts (ascii-art-creator, duda-migration-agent, remotion-creator, frontend-testing-guide, frontend-dev-guide, project-scaffolder, armadillo-shepherd) |
| **Haiku 4.5** | \`claude-haiku-4-5-20251001\` | Mechanical tasks, batch scanning, rendering |
| **Inherit** | \`inherit\` | Reference/knowledge agents that follow the invoking agent's model (claude-code-guide, google-api-guide, backend-guide, database-guide, infra-guide) |`;
}

function buildPermissionsSection() {
  return `## Permissions

Default mode: \`acceptEdits\` — Claude can read, search, and edit files without prompting. Bash commands use an allow-list.

**Recommended:** Switch to \`bypassPermissions\` for faster iteration. Run \`/updating-armadillo\` to toggle.

| Mode | Behavior | Risk |
|------|----------|------|
| \`acceptEdits\` | Auto-approves reads + edits, prompts for unknown Bash | Low — you see Bash prompts |
| \`bypassPermissions\` | Auto-approves everything except deny-list **(Recommended)** | Low — deny-list blocks catastrophic commands |
| \`plan\` | Read-only, no writes | Zero — exploration only |

Deny-list always active regardless of mode (catastrophic commands blocked).`;
}

/**
 * Generate the full CLAUDE.md content.
 *
 * @param {object} manifest       — parsed armadillo.json
 * @param {string} existingBelow  — any user content below <!-- armadillo:end -->
 * @returns {string}
 */
export function generateClaudeMd(manifest, existingBelow = '') {
  // Read descriptions from frontmatter
  const skillDescriptions = readCoreSkillDescriptions(ROOT, manifest.core.skills);

  const parts = [
    '<!-- armadillo:start -->',
    '# Claude Code Configuration',
    '',
    buildSkillsSection(manifest, skillDescriptions),
    '',
    buildPacksTable(manifest),
    '',
    buildRulesSection(manifest),
    '',
    buildModelSection(),
    buildPermissionsSection(),
    '<!-- armadillo:end -->',
    '',
    '<!-- Add your project-specific instructions below this line -->',
  ];

  if (existingBelow.trim()) {
    parts.push('', existingBelow.trim(), '');
  }

  return parts.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-claude-md-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/generate-claude-md.js tests/build-claude-md-v2.test.js
git commit -m "feat: extract generateClaudeMd to lib with frontmatter descriptions"
```

---

### Task 8: Update version-bump.js — use sync-all.js, drop npm references

**Files:**
- Modify: `scripts/version-bump.js:166-178`
- Modify: `tests/version-bump-v2.test.js`

**Step 1: Write the failing test**

Add to `tests/version-bump-v2.test.js`:

```js
it('calls sync-all.js instead of update-readme and build-claude-md separately', () => {
  // Should NOT call update-readme or build-claude-md directly
  assert.ok(!content.includes('update-readme'), 'should not call update-readme separately');
  assert.ok(!content.includes('build-claude-md'), 'should not call build-claude-md separately');
  // Should call sync-all.js
  assert.ok(content.includes('sync-all.js'), 'should call sync-all.js');
});

it('does not reference plugin manifests', () => {
  assert.ok(!content.includes('plugin manifest'), 'should not mention plugin manifests');
  assert.ok(!content.includes('Syncing plugin'), 'should not say Syncing plugin');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/version-bump-v2.test.js`
Expected: FAIL — version-bump.js still calls update-readme, build-claude-md, and says "plugin manifests"

**Step 3: Write minimal implementation**

In `scripts/version-bump.js`, replace lines 165-175:

```js
  // OLD:
  // console.log('→ Running update-readme...');
  // await exec('npm run update-readme', { cwd: ROOT });
  // console.log('→ Regenerating CLAUDE.md...');
  // await exec('npm run build-claude-md', { cwd: ROOT });
  // console.log('→ Syncing plugin manifests...');
  // await exec(`node "${join(ROOT, 'scripts', 'sync-all.js')}"`, { cwd: ROOT });

  // NEW:
  console.log('→ Running sync-all (generate + validate)...');
  await exec(`node "${join(ROOT, 'scripts', 'sync-all.js')}"`, { cwd: ROOT });
```

Also update the git add line (line 178) to include all generated files:

```js
  await exec('git add package.json CHANGELOG.json README.md .claude/CLAUDE.md armadillo.json', { cwd: ROOT });
```

(This line already includes the right files — no change needed.)

**Step 4: Run test to verify it passes**

Run: `node --test tests/version-bump-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/version-bump.js tests/version-bump-v2.test.js
git commit -m "refactor: version-bump uses sync-all.js instead of separate scripts"
```

---

### Task 9: Delete old standalone scripts

Now that sync-all.js does everything, the standalone scripts are dead code.

**Files:**
- Delete: `scripts/update-readme.js`
- Delete: `scripts/build-claude-md.js`
- Modify: `package.json` — remove `update-readme` and `build-claude-md` scripts

**Step 1: Write the failing test**

Add to `tests/package-json.test.js`:

```js
it('has no update-readme script (absorbed into sync-all)', () => {
  assert.equal(pkg.scripts['update-readme'], undefined);
});

it('has no build-claude-md script (absorbed into sync-all)', () => {
  assert.equal(pkg.scripts['build-claude-md'], undefined);
});

it('has sync-all script', () => {
  assert.ok(pkg.scripts['sync-all'] || pkg.scripts.test, 'must have a way to run sync');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/package-json.test.js`
Expected: FAIL — `update-readme` and `build-claude-md` scripts still exist

**Step 3: Write minimal implementation**

Remove `update-readme` and `build-claude-md` from `package.json` scripts. Add `sync-all`:

```json
"scripts": {
  "test": "node --test tests/*.test.js",
  "sync": "node scripts/sync-all.js",
  "sync:check": "node scripts/sync-all.js --check",
  "postinstall": "node scripts/install-hooks.js"
}
```

Delete `scripts/update-readme.js` and `scripts/build-claude-md.js`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/package-json.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: All tests pass. Some tests that previously imported `build-claude-md.js` need to be updated (already handled in Task 7).

**Step 6: Commit**

```bash
git rm scripts/update-readme.js scripts/build-claude-md.js
git add package.json tests/package-json.test.js
git commit -m "chore: delete absorbed scripts, add sync commands to package.json"
```

---

### Task 10: Update CI workflow to use sync:check

**Files:**
- Modify: `.github/workflows/ci.yml:31`

**Step 1: Write the failing test**

Add to `tests/github-files.test.js` in the `ci.yml` describe block:

```js
test('runs sync-all in check mode', () => assert.match(content, /sync-all\.js --check/));
test('does not reference plugin validation', () => {
  assert.ok(!content.includes('plugin validation'), 'must not mention plugin validation');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/github-files.test.js`
Expected: FAIL — ci.yml runs `sync-all.js` without `--check` and has "plugin validation" comment

**Step 3: Write minimal implementation**

In `.github/workflows/ci.yml`, update:

```yaml
      - run: node scripts/sync-all.js --check
        name: Validate all artifacts are in sync
```

Remove the line:
```yaml
      - run: npm install -g @anthropic-ai/claude-code
        name: Install Claude Code CLI
```

(This was only for "plugin validation" which no longer exists.)

**Step 4: Run test to verify it passes**

Run: `node --test tests/github-files.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml tests/github-files.test.js
git commit -m "chore: CI runs sync-all --check, drop Claude Code CLI install"
```

---

### Task 11: Run full test suite and fix any breakage

**Files:**
- Various — depends on what breaks

**Step 1: Run full test suite**

Run: `node --test tests/*.test.js`

**Step 2: Fix any failures**

Common expected issues:
- Tests that import `build-claude-md.js` → update to import from `scripts/lib/generate-claude-md.js`
- Tests checking for `npm run update-readme` or `npm run build-claude-md` → update
- Tests checking `publish.yml` content → already handled in Task 3

**Step 3: Run again and verify all pass**

Run: `node --test tests/*.test.js`
Expected: All PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve test breakage from sync refactor"
```

---

### Task 12: Run sync-all.js and verify generated output

**Step 1: Run sync-all in generate mode**

Run: `node scripts/sync-all.js`
Expected: All checks pass, README.md and CLAUDE.md updated

**Step 2: Run sync-all in check mode**

Run: `node scripts/sync-all.js --check`
Expected: All checks pass (no stale content since we just generated)

**Step 3: Verify README skill descriptions come from frontmatter**

Check that README now has descriptions for `env-ninja`, `nap-ninja`, `cleanup`, `deps`, `safe-merge`, `test-debug` (which were previously empty because they weren't in the hardcoded map).

**Step 4: Commit any generated changes**

```bash
git add README.md .claude/CLAUDE.md
git commit -m "chore: regenerate README and CLAUDE.md with frontmatter descriptions"
```

---

### Task 13: Final verification — clean test run

**Step 1: Run full test suite one more time**

Run: `node --test tests/*.test.js`
Expected: All PASS

**Step 2: Run sync-all --check one more time**

Run: `node scripts/sync-all.js --check`
Expected: All pass, exit 0

**Step 3: Verify git status is clean**

Run: `git status`
Expected: No unstaged changes

**Step 4: Verify no stale "plugin" or "npm publish" references**

Run: `grep -r "plugin" scripts/ --include="*.js" | grep -v node_modules`
Expected: No results

Run: `grep -r "npm publish" . --include="*.yml" --include="*.yaml" | grep -v node_modules`
Expected: No results

---

## Summary

| Task | What | Depends On |
|------|------|------------|
| 1 | Clean npm scope from armadillo.json | — |
| 2 | Clean npm scope from package.json | — |
| 3 | Replace publish.yml with release.yml | — |
| 4 | Clean "plugin" terminology from CI + README | — |
| 5 | Build read-descriptions lib (frontmatter reader) | — |
| 6 | Rewrite sync-all.js (unified generate+validate) | 5, 7 |
| 7 | Extract generateClaudeMd to lib | 5 |
| 8 | Update version-bump.js to use sync-all.js | 6 |
| 9 | Delete old standalone scripts | 6, 7, 8 |
| 10 | Update CI to use sync-all --check | 6, 9 |
| 11 | Fix any test breakage | 1-10 |
| 12 | Run sync-all and verify output | 11 |
| 13 | Final verification | 12 |

**Parallelizable:** Tasks 1-5 can all run in parallel (no dependencies). Tasks 6+7 can run in parallel (both depend on 5). Task 8 depends on 6. Tasks 9+ are sequential.
