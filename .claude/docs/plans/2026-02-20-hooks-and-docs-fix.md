# Hooks & Docs Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Make hooks actually fire in this repo, auto-generate CLAUDE.md from skills.json, and clean up the broken plugin registration.

**Architecture:** Move hooks from plugin format (hooks/hooks.json with ${CLAUDE_PLUGIN_ROOT}) to standalone format in .claude/settings.json. Keep plugin directory structure for code organization. Create build-claude-md.js to auto-generate CLAUDE.md. Wire everything into the pre-push pipeline.

**Tech Stack:** Node.js scripts, bash hooks, Claude Code settings.json

---

### Task 1: Fix hooks — add standalone hooks to settings.json

**Files:**
- Modify: `.claude/settings.json`
- Modify: `.claude/settings.local.json`

**Step 1: Write test for hooks in settings.json**

Create `tests/settings-hooks.test.js`:
```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('settings.json hooks', () => {
  const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));

  test('has hooks key', () => {
    assert.ok(settings.hooks, 'settings.json must have a hooks key');
  });

  test('has PreToolUse hooks', () => {
    assert.ok(settings.hooks.PreToolUse, 'must have PreToolUse hooks');
    assert.ok(settings.hooks.PreToolUse.length > 0);
  });

  test('has UserPromptSubmit hooks', () => {
    assert.ok(settings.hooks.UserPromptSubmit, 'must have UserPromptSubmit hooks');
  });

  test('has SessionStart hooks', () => {
    assert.ok(settings.hooks.SessionStart, 'must have SessionStart hooks');
  });

  test('has PostToolUse hooks', () => {
    assert.ok(settings.hooks.PostToolUse, 'must have PostToolUse hooks');
  });

  test('no ${CLAUDE_PLUGIN_ROOT} in any hook command', () => {
    const json = JSON.stringify(settings.hooks);
    assert.ok(!json.includes('${CLAUDE_PLUGIN_ROOT}'), 'must not use plugin root paths');
  });

  test('all hook commands reference hooks/ directory', () => {
    const commands = [];
    for (const [event, matchers] of Object.entries(settings.hooks)) {
      for (const group of matchers) {
        for (const hook of (group.hooks || [])) {
          if (hook.command && !hook.command.startsWith('echo')) {
            commands.push(hook.command);
          }
        }
      }
    }
    for (const cmd of commands) {
      assert.ok(cmd.includes('hooks/'), `command should reference hooks/: ${cmd}`);
    }
  });
});

describe('settings.local.json cleanup', () => {
  const local = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.local.json'), 'utf8'));

  test('no enabledPlugins', () => {
    assert.ok(!local.enabledPlugins, 'broken enabledPlugins must be removed');
  });

  test('no extraKnownMarketplaces', () => {
    assert.ok(!local.extraKnownMarketplaces, 'broken marketplace config must be removed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/settings-hooks.test.js`
Expected: FAIL — settings.json has no hooks key

**Step 3: Add hooks to settings.json and clean up settings.local.json**

Add the full hooks config to `.claude/settings.json` under the `hooks` key. All commands use `hooks/script.sh` (relative path — works because hooks/ symlinks to plugins/core/hooks/).

Remove `enabledPlugins` and `extraKnownMarketplaces` from `.claude/settings.local.json`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/settings-hooks.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/settings.json .claude/settings.local.json tests/settings-hooks.test.js
git commit -m "fix: move hooks to settings.json so they actually fire"
```

---

### Task 2: Create build-claude-md.js

**Files:**
- Create: `scripts/build-claude-md.js`
- Modify: `.claude/CLAUDE.md`

**Step 1: Write test**

Create `tests/build-claude-md.test.js`:
```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('build-claude-md.js', () => {
  test('runs without error', () => {
    execSync('node scripts/build-claude-md.js --dry-run', { cwd: ROOT });
  });

  test('dry-run output contains armadillo markers', () => {
    const output = execSync('node scripts/build-claude-md.js --dry-run', {
      cwd: ROOT, encoding: 'utf8'
    });
    assert.ok(output.includes('<!-- armadillo:start -->'));
    assert.ok(output.includes('<!-- armadillo:end -->'));
  });

  test('dry-run output lists all core skills', () => {
    const output = execSync('node scripts/build-claude-md.js --dry-run', {
      cwd: ROOT, encoding: 'utf8'
    });
    const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
    for (const skill of skillsJson.bundles.core.skills) {
      assert.ok(output.includes(skill), `should list core skill: ${skill}`);
    }
  });

  test('dry-run output lists plugin ecosystem table', () => {
    const output = execSync('node scripts/build-claude-md.js --dry-run', {
      cwd: ROOT, encoding: 'utf8'
    });
    assert.ok(output.includes('armadillo-core'));
    assert.ok(output.includes('armadillo-frontend'));
    assert.ok(output.includes('Plugin Ecosystem'));
  });

  test('dry-run output lists rules', () => {
    const output = execSync('node scripts/build-claude-md.js --dry-run', {
      cwd: ROOT, encoding: 'utf8'
    });
    assert.ok(output.includes('coding-standards'));
    assert.ok(output.includes('git-workflow'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-claude-md.test.js`
Expected: FAIL — script doesn't exist

**Step 3: Write build-claude-md.js**

Script reads skills.json, package.json. Generates the armadillo:start/end block with:
- Skills list organized by bundle category
- Plugin ecosystem table (from skills.json bundles)
- Rules table
- Model selection table
- Permissions section

Uses same `replaceBetweenMarkers` pattern as update-readme.js but with armadillo:start/end markers.

`--dry-run` flag prints to stdout without writing. Without flag, writes to `.claude/CLAUDE.md`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-claude-md.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build-claude-md.js tests/build-claude-md.test.js
git commit -m "feat: auto-generate CLAUDE.md from skills.json"
```

---

### Task 3: Wire build-claude-md.js into pre-push pipeline

**Files:**
- Modify: `scripts/version-bump.js` (add call to build-claude-md.js)
- Modify: `scripts/sync-all.js` (validate CLAUDE.md is in sync)
- Modify: `package.json` (add script)

**Step 1: Write test**

Add to `tests/build-claude-md.test.js`:
```js
test('package.json has build-claude-md script', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['build-claude-md'], 'should have build-claude-md script');
});
```

**Step 2: Run test, verify fail**

**Step 3: Add script to package.json, wire into version-bump.js**

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add scripts/version-bump.js scripts/sync-all.js package.json tests/build-claude-md.test.js
git commit -m "chore: wire CLAUDE.md generation into pre-push pipeline"
```

---

### Task 4: Update sync-all.js to validate settings.json hooks

**Files:**
- Modify: `scripts/sync-all.js`

**Step 1: Write test**

Create `tests/sync-all-hooks.test.js`:
```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('sync-all.js validates settings.json hooks', () => {
  test('sync-all passes with hooks in settings.json', () => {
    const result = execSync('node scripts/sync-all.js', {
      cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    });
    assert.ok(result.includes('settings.json hooks'));
  });
});
```

**Step 2: Run test, verify fail**

**Step 3: Update sync-all.js validateHooks() to check settings.json**

**Step 4: Run test, verify pass**

**Step 5: Commit**

```bash
git add scripts/sync-all.js tests/sync-all-hooks.test.js
git commit -m "fix: sync-all validates hooks in settings.json"
```

---

### Task 5: Run full test suite

**Step 1:** Run `npm test` to verify no regressions

**Step 2:** Fix any failures

**Step 3:** Final commit if needed

---

## Verification

1. `node --test tests/settings-hooks.test.js` — all pass
2. `node --test tests/build-claude-md.test.js` — all pass
3. `node --test tests/sync-all-hooks.test.js` — all pass
4. `npm test` — full suite passes
5. Start a new Claude Code session and verify hooks fire (check `/hooks` menu)
6. `.claude/CLAUDE.md` matches skills.json content exactly
