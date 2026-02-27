# Git-Native Install Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the entire Claude Code plugin system from armadillo. Restructure the repo so install = clone + copy files, update = read repo + diff + merge. Claude Code is the installer. No terminal commands for users.

**Architecture:** Flatten `plugins/` into top-level `.claude/` (core) + `packs/` (optional skill packs). Replace skills.json + marketplace.json + plugin.json with a single `armadillo.json` manifest. Version tracking via commit SHA. Rewrite onboarding and updating-armadillo skills to use file-copy mechanics instead of plugin registration.

**Tech Stack:** Node.js (scripts), Bash (hooks), JSON (manifest/config)

---

## Current State Summary

```
armadillo-cli/
├── .claude-plugin/         ← ROOT marketplace.json + plugin.json (DELETE)
├── plugins/                ← 23 plugin dirs, each with .claude-plugin/ (FLATTEN)
│   ├── core/               ← agents, hooks, rules, skills (→ .claude/)
│   │   ├── .claude-plugin/ ← DELETE
│   │   ├── agents/         ← → .claude/agents/
│   │   ├── hooks/          ← → .claude/hooks/
│   │   ├── rules/          ← → .claude/rules/
│   │   └── skills/         ← → .claude/skills/ (core only)
│   ├── frontend/           ← → packs/frontend/
│   ├── backend/            ← → packs/backend/
│   └── ... (21 more)
├── skills/                 ← symlinks to plugins/*/skills/* (DELETE)
├── agents -> plugins/core/agents  ← symlink (DELETE)
├── hooks -> plugins/core/hooks    ← symlink (DELETE)
├── skills.json             ← 1283 lines, the plugin registry (DELETE)
├── .claude/
│   ├── skills -> ../skills ← symlink chain (REPLACE with real dir)
│   ├── agents -> ../agents ← symlink chain (REPLACE with real dir)
│   └── hooks -> ../hooks   ← symlink chain (REPLACE with real dir)
├── scripts/
│   ├── build-plugins.js    ← DELETE
│   ├── sync-all.js         ← REWRITE (remove plugin sync)
│   ├── build-claude-md.js  ← REWRITE (read from armadillo.json, not skills.json)
│   ├── install-hooks.js    ← KEEP (git hooks, not claude hooks)
│   └── version-bump.js     ← UPDATE (remove sync-all plugin call)
└── tests/                  ← 19 test files reference plugins (UPDATE/DELETE)
```

## Target State

```
armadillo/
├── armadillo.json          ← manifest: version, packs, file map
├── .claude/                ← REAL files, copies wholesale to user projects
│   ├── settings.json
│   ├── CLAUDE.md
│   ├── rules/              ← coding-standards, git-workflow, etc.
│   ├── skills/             ← CORE skills only (24 skills)
│   ├── agents/             ← 14 agent definitions
│   └── hooks/              ← all hook scripts + hooks.json + lib/
├── packs/                  ← optional skill packs (NOT .claude-plugin)
│   ├── frontend/
│   │   └── skills/         ← accessibility, astro, nextjs, etc.
│   ├── backend/
│   │   └── skills/         ← express, hono, trpc, rest-api-patterns
│   ├── database/
│   │   └── skills/         ← supabase, mongodb, neon, redis-upstash
│   └── ... (20 more packs)
├── scripts/                ← dev-only, never copied
│   ├── build-claude-md.js  ← reads armadillo.json
│   ├── install-hooks.js    ← git hooks for devs
│   ├── update-readme.js    ← reads armadillo.json
│   └── version-bump.js     ← SHA-based versioning
└── tests/                  ← dev-only, never copied
```

---

## Phase 1: Create armadillo.json & Move Core Files

### Task 1: Create armadillo.json manifest

**Files:**
- Create: `armadillo.json`
- Read: `skills.json` (source of truth for pack/skill mapping)
- Read: `plugins/core/.claude-plugin/marketplace.json` (source of descriptions)

**Step 1: Write the failing test**

Create `tests/armadillo-json.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('armadillo.json', () => {
  const manifestPath = join(ROOT, 'armadillo.json');

  it('exists at repo root', () => {
    assert.ok(existsSync(manifestPath), 'armadillo.json should exist');
  });

  it('has required top-level fields', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.name, 'missing name');
    assert.ok(manifest.version, 'missing version');
    assert.ok(manifest.repoUrl, 'missing repoUrl');
    assert.ok(manifest.core, 'missing core');
    assert.ok(manifest.packs, 'missing packs');
  });

  it('core lists skills, agents, hooks, and rules', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.core.skills), 'core.skills should be array');
    assert.ok(Array.isArray(manifest.core.agents), 'core.agents should be array');
    assert.ok(Array.isArray(manifest.core.hooks), 'core.hooks should be array');
    assert.ok(Array.isArray(manifest.core.rules), 'core.rules should be array');
    assert.ok(manifest.core.skills.length > 0, 'core.skills should not be empty');
  });

  it('packs map pack name to skill list', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.packs.frontend, 'missing frontend pack');
    assert.ok(manifest.packs.backend, 'missing backend pack');
    assert.ok(Array.isArray(manifest.packs.frontend.skills), 'frontend.skills should be array');
  });

  it('every pack skill directory exists under packs/', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const [packName, pack] of Object.entries(manifest.packs)) {
      for (const skill of pack.skills) {
        const skillDir = join(ROOT, 'packs', packName, 'skills', skill);
        assert.ok(existsSync(skillDir), `missing: packs/${packName}/skills/${skill}`);
      }
    }
  });

  it('every core skill directory exists under .claude/skills/', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const skill of manifest.core.skills) {
      const skillDir = join(ROOT, '.claude', 'skills', skill);
      assert.ok(existsSync(skillDir), `missing: .claude/skills/${skill}`);
    }
  });

  it('does not reference plugins, marketplace, or enabledPlugins', () => {
    const content = readFileSync(manifestPath, 'utf8');
    assert.ok(!content.includes('marketplace'), 'should not contain marketplace');
    assert.ok(!content.includes('enabledPlugin'), 'should not contain enabledPlugin');
    assert.ok(!content.includes('CLAUDE_PLUGIN_ROOT'), 'should not contain CLAUDE_PLUGIN_ROOT');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/armadillo-json.test.js`
Expected: FAIL — armadillo.json does not exist

**Step 3: Write armadillo.json**

Generate `armadillo.json` by reading `skills.json` to extract:
- Core skills: `skills.json → bundles.core.skills`
- Pack mapping: `skills.json → bundles[packName].skills` for each non-core bundle
- Bundle key `frontend-dev` maps to pack name `frontend`

Structure:
```json
{
  "name": "armadillo",
  "version": "<read from package.json>",
  "repoUrl": "https://github.com/filenamedotexe/armadillo",
  "core": {
    "skills": ["armadillo-shepherd", "brainstorming", "..."],
    "agents": ["ascii-art-creator.md", "backend-guide.md", "..."],
    "hooks": ["async-lint.sh", "detect-test-failure.sh", "..."],
    "rules": ["coding-standards.md", "git-workflow.md", "..."]
  },
  "packs": {
    "frontend": {
      "description": "React, Tailwind, Astro, accessibility, and animation skills",
      "skills": ["accessibility", "astro", "framer-motion", "..."]
    },
    "backend": { "..." },
    "...": "..."
  }
}
```

Write a script `scripts/build-armadillo-json.js` to auto-generate this from the directory structure (NOT from skills.json — we're killing that). For now, generate once from skills.json then the script reads directories.

**Step 4: Run test to verify it passes**

Run: `node --test tests/armadillo-json.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add armadillo.json tests/armadillo-json.test.js
git commit -m "feat: add armadillo.json manifest replacing skills.json"
```

---

### Task 2: Move core skills from plugins/core/skills/ to .claude/skills/

**Files:**
- Move: `plugins/core/skills/*` → `.claude/skills/`
- Delete: `skills/` symlink directory at root
- Delete: `.claude/skills` symlink

**Step 1: Write the failing test**

Add to `tests/armadillo-json.test.js` (or new file `tests/repo-structure.test.js`):

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('repo structure — core files in .claude/', () => {
  it('.claude/skills/ is a real directory (not a symlink)', () => {
    const p = join(ROOT, '.claude', 'skills');
    assert.ok(existsSync(p), '.claude/skills should exist');
    assert.ok(!lstatSync(p).isSymbolicLink(), '.claude/skills should not be a symlink');
  });

  it('.claude/agents/ is a real directory (not a symlink)', () => {
    const p = join(ROOT, '.claude', 'agents');
    assert.ok(existsSync(p), '.claude/agents should exist');
    assert.ok(!lstatSync(p).isSymbolicLink(), '.claude/agents should not be a symlink');
  });

  it('.claude/hooks/ is a real directory (not a symlink)', () => {
    const p = join(ROOT, '.claude', 'hooks');
    assert.ok(existsSync(p), '.claude/hooks should exist');
    assert.ok(!lstatSync(p).isSymbolicLink(), '.claude/hooks should not be a symlink');
  });

  it('.claude/rules/ is a real directory (not a symlink)', () => {
    const p = join(ROOT, '.claude', 'rules');
    assert.ok(existsSync(p), '.claude/rules should exist');
    assert.ok(!lstatSync(p).isSymbolicLink(), '.claude/rules should not be a symlink');
  });

  it('root-level skills/ directory does not exist', () => {
    assert.ok(!existsSync(join(ROOT, 'skills')), 'root skills/ should not exist');
  });

  it('root-level agents symlink does not exist', () => {
    assert.ok(!existsSync(join(ROOT, 'agents')), 'root agents symlink should not exist');
  });

  it('root-level hooks symlink does not exist', () => {
    assert.ok(!existsSync(join(ROOT, 'hooks')), 'root hooks symlink should not exist');
  });

  it('no .claude-plugin/ directories exist anywhere', () => {
    const check = (dir) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.claude-plugin') {
          assert.fail(`found .claude-plugin/ in ${dir}`);
        }
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.worktrees') {
          check(join(dir, entry.name));
        }
      }
    };
    check(ROOT);
  });

  it('no plugins/ directory exists', () => {
    assert.ok(!existsSync(join(ROOT, 'plugins')), 'plugins/ should not exist');
  });

  it('no skills.json exists', () => {
    assert.ok(!existsSync(join(ROOT, 'skills.json')), 'skills.json should not exist');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/repo-structure.test.js`
Expected: FAIL — symlinks still exist, .claude-plugin dirs still exist

**Step 3: Move files**

Execute in order:
1. Remove `.claude/skills` symlink, then `cp -R plugins/core/skills/* .claude/skills/`
2. Remove `.claude/agents` symlink, then `cp -R plugins/core/agents/* .claude/agents/`
3. Remove `.claude/hooks` symlink, then `cp -R plugins/core/hooks/* .claude/hooks/`
4. Remove `.claude/rules` symlink (if exists), then `cp -R plugins/core/rules/* .claude/rules/`
5. Remove root `skills/` symlink directory
6. Remove root `agents` symlink
7. Remove root `hooks` symlink

**Step 4: Run test to verify partial pass**

Run: `node --test tests/repo-structure.test.js`
Expected: Some pass (real dirs), some still fail (.claude-plugin dirs still exist, plugins/ still exists)

**Step 5: Commit**

```bash
git add .claude/skills/ .claude/agents/ .claude/hooks/ .claude/rules/
git rm skills agents hooks  # remove symlinks
git commit -m "refactor: move core files from plugins/core/ to .claude/"
```

---

### Task 3: Move pack skills from plugins/*/skills/ to packs/*/skills/

**Files:**
- Create: `packs/` directory
- Move: `plugins/frontend/skills/*` → `packs/frontend/skills/*` (for each of 22 non-core plugins)
- Delete: All `.claude-plugin/` directories
- Delete: `plugins/` directory
- Delete: `skills.json`

**Step 1: Write a migration script**

Create `scripts/migrate-plugins-to-packs.js` (temporary, delete after use):

```javascript
#!/usr/bin/env node
/**
 * One-time migration: plugins/*/skills/* → packs/*/skills/*
 * Also deletes all .claude-plugin/ directories, skills.json, and plugins/
 */
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PLUGIN_TO_PACK = { 'frontend-dev': 'frontend' };
const SKIP = ['core']; // already moved in Task 2

const pluginsDir = join(ROOT, 'plugins');
const packsDir = join(ROOT, 'packs');

for (const dir of readdirSync(pluginsDir)) {
  if (SKIP.includes(dir)) continue;
  const packName = PLUGIN_TO_PACK[dir] || dir;
  const srcSkills = join(pluginsDir, dir, 'skills');
  const destSkills = join(packsDir, packName, 'skills');

  if (existsSync(srcSkills)) {
    mkdirSync(destSkills, { recursive: true });
    cpSync(srcSkills, destSkills, { recursive: true });
    console.log(`✓ plugins/${dir}/skills/ → packs/${packName}/skills/`);
  }
}

// Delete .claude-plugin dirs
// Delete plugins/
// Delete skills.json
// Delete root .claude-plugin/
```

**Step 2: Run migration script**

Run: `node scripts/migrate-plugins-to-packs.js`

**Step 3: Delete old infrastructure**

```bash
rm -rf plugins/
rm -rf .claude-plugin/
rm skills.json
rm scripts/migrate-plugins-to-packs.js  # one-time script
```

**Step 4: Run structure tests**

Run: `node --test tests/repo-structure.test.js`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packs/
git rm -rf plugins/ .claude-plugin/ skills.json
git commit -m "feat!: restructure repo — plugins/ → .claude/ + packs/"
```

---

## Phase 2: Update Hooks & Settings

### Task 4: Update hooks to use $CLAUDE_PROJECT_DIR (no more CLAUDE_PLUGIN_ROOT)

**Files:**
- Modify: `.claude/hooks/session-start.sh`
- Modify: `.claude/hooks/hooks.json` — replace all `${CLAUDE_PLUGIN_ROOT}` with `"$CLAUDE_PROJECT_DIR"/.claude`
- Modify: All other hook .sh files that reference PLUGIN_ROOT

**Step 1: Write the failing test**

```javascript
// tests/hooks-no-plugin-root.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HOOKS_DIR = join(ROOT, '.claude', 'hooks');

describe('hooks — no plugin references', () => {
  it('hooks.json does not contain CLAUDE_PLUGIN_ROOT', () => {
    const content = readFileSync(join(HOOKS_DIR, 'hooks.json'), 'utf8');
    assert.ok(!content.includes('CLAUDE_PLUGIN_ROOT'), 'hooks.json still has CLAUDE_PLUGIN_ROOT');
  });

  it('hooks.json uses $CLAUDE_PROJECT_DIR/.claude/ paths', () => {
    const content = readFileSync(join(HOOKS_DIR, 'hooks.json'), 'utf8');
    // Every command that references a script should use $CLAUDE_PROJECT_DIR
    const config = JSON.parse(content);
    for (const [event, groups] of Object.entries(config.hooks)) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command && hook.command.includes('.sh')) {
            assert.ok(
              hook.command.includes('$CLAUDE_PROJECT_DIR') || hook.command.includes('rm -f'),
              `${event} hook should use $CLAUDE_PROJECT_DIR: ${hook.command}`
            );
          }
        }
      }
    }
  });

  it('no .sh file contains CLAUDE_PLUGIN_ROOT', () => {
    for (const file of readdirSync(HOOKS_DIR)) {
      if (!file.endsWith('.sh')) continue;
      const content = readFileSync(join(HOOKS_DIR, file), 'utf8');
      assert.ok(!content.includes('CLAUDE_PLUGIN_ROOT'), `${file} still has CLAUDE_PLUGIN_ROOT`);
    }
  });

  it('session-start.sh reads from .claude/ not plugin root', () => {
    const content = readFileSync(join(HOOKS_DIR, 'session-start.sh'), 'utf8');
    assert.ok(!content.includes('PLUGIN_ROOT'), 'session-start.sh still references PLUGIN_ROOT');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/hooks-no-plugin-root.test.js`
Expected: FAIL — CLAUDE_PLUGIN_ROOT still present

**Step 3: Update hooks**

In `hooks.json`: Replace every `"${CLAUDE_PLUGIN_ROOT}"` with `"$CLAUDE_PROJECT_DIR"/.claude`

In `session-start.sh`:
- Remove `PLUGIN_ROOT` variable computation
- Replace all `${PLUGIN_ROOT}/` with `"$CLAUDE_PROJECT_DIR"/.claude/`
- The script currently uses `SCRIPT_DIR` to find `PLUGIN_ROOT` — instead, just use `$CLAUDE_PROJECT_DIR/.claude`

In `.claude/settings.json`: Already uses `$CLAUDE_PROJECT_DIR` — but verify hooks point to `.claude/hooks/` not `hooks/`

**Step 4: Run test to verify it passes**

Run: `node --test tests/hooks-no-plugin-root.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/ .claude/settings.json
git commit -m "refactor: remove CLAUDE_PLUGIN_ROOT from all hooks"
```

---

### Task 5: Update .claude/settings.json hook paths

**Files:**
- Modify: `.claude/settings.json` — ensure all hook commands point to `.claude/hooks/` path

**Step 1: Write the failing test**

```javascript
// tests/settings-paths.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('settings.json — hook paths', () => {
  it('all hook commands use .claude/hooks/ path', () => {
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    for (const [event, groups] of Object.entries(settings.hooks || {})) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command && hook.command.includes('.sh') && !hook.command.startsWith('echo') && !hook.command.startsWith('rm')) {
            assert.ok(
              hook.command.includes('.claude/hooks/') || hook.command.includes('$CLAUDE_PROJECT_DIR'),
              `${event} hook should reference .claude/hooks/: ${hook.command}`
            );
          }
        }
      }
    }
  });

  it('does not contain plugin references', () => {
    const content = readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8');
    assert.ok(!content.includes('CLAUDE_PLUGIN_ROOT'), 'settings.json has CLAUDE_PLUGIN_ROOT');
    assert.ok(!content.includes('enabledPlugin'), 'settings.json has enabledPlugin');
    assert.ok(!content.includes('extraKnownMarketplace'), 'settings.json has extraKnownMarketplace');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/settings-paths.test.js`
Expected: FAIL or PASS (settings.json may already be correct from previous hook fix session)

**Step 3: Update settings.json if needed**

Ensure all paths reference `"$CLAUDE_PROJECT_DIR"/.claude/hooks/script.sh` pattern. Remove any `enabledPlugins` or `extraKnownMarketplaces` keys if present.

**Step 4: Run test to verify it passes**

Run: `node --test tests/settings-paths.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/settings.json
git commit -m "fix: settings.json hook paths use .claude/hooks/"
```

---

## Phase 3: Rewrite Build Scripts

### Task 6: Rewrite build-claude-md.js to use armadillo.json

**Files:**
- Modify: `scripts/build-claude-md.js` — read from `armadillo.json` instead of `skills.json` + `marketplace.json`

**Step 1: Write the failing test**

```javascript
// tests/build-claude-md-v2.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateClaudeMd } from '../scripts/build-claude-md.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('build-claude-md uses armadillo.json', () => {
  it('generates CLAUDE.md without plugin references', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const content = generateClaudeMd(manifest, '');
    assert.ok(!content.includes('enabledPlugin'), 'should not mention enabledPlugins');
    assert.ok(!content.includes('marketplace'), 'should not mention marketplace');
    assert.ok(!content.includes('Plugin Ecosystem'), 'should not have Plugin Ecosystem section');
    assert.ok(content.includes('Skill Packs'), 'should have Skill Packs section');
  });

  it('lists all core skills', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const content = generateClaudeMd(manifest, '');
    for (const skill of manifest.core.skills) {
      assert.ok(content.includes(skill), `missing core skill: ${skill}`);
    }
  });

  it('lists all packs with skill counts', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const content = generateClaudeMd(manifest, '');
    for (const packName of Object.keys(manifest.packs)) {
      assert.ok(content.includes(packName), `missing pack: ${packName}`);
    }
  });

  it('preserves user content below armadillo:end marker', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const userContent = '# My Project Notes\nThis is custom content.';
    const content = generateClaudeMd(manifest, userContent);
    assert.ok(content.includes(userContent), 'should preserve user content');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-claude-md-v2.test.js`
Expected: FAIL — generateClaudeMd still expects skillsJson + marketplaceJson args

**Step 3: Rewrite build-claude-md.js**

- Change `generateClaudeMd(skillsJson, marketplaceJson, existingBelow)` → `generateClaudeMd(manifest, existingBelow)`
- Read `armadillo.json` instead of `skills.json` + `.claude-plugin/marketplace.json`
- Replace "Plugin Ecosystem" section with "Skill Packs" section
- Remove all references to marketplace, enabledPlugins, CLAUDE_PLUGIN_ROOT
- Remove `claude-code-plugins` from the Meta skills category
- Update the install instructions to say `Tell Claude: "install armadillo from <URL>"`
- Keep the model selection, permissions, and rules sections

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-claude-md-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build-claude-md.js tests/build-claude-md-v2.test.js
git commit -m "refactor: build-claude-md reads armadillo.json, removes plugin refs"
```

---

### Task 7: Rewrite sync-all.js (remove plugin sync, keep useful validations)

**Files:**
- Modify: `scripts/sync-all.js` — remove `syncPluginVersions()`, update `validateSymlinks()`, update `validateClaudeMd()`

**Step 1: Write the failing test**

```javascript
// tests/sync-all-v2.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('sync-all.js — no plugin references', () => {
  it('does not reference .claude-plugin/', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'sync-all.js'), 'utf8');
    assert.ok(!content.includes('.claude-plugin'), 'should not reference .claude-plugin');
    assert.ok(!content.includes('marketplace'), 'should not reference marketplace');
    assert.ok(!content.includes('plugin.json'), 'should not reference plugin.json');
  });

  it('does not validate symlinks (real dirs now)', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'sync-all.js'), 'utf8');
    assert.ok(!content.includes('isSymbolicLink'), 'should not check for symlinks');
  });

  it('validates .claude/ subdirectories exist', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'sync-all.js'), 'utf8');
    assert.ok(content.includes('.claude/skills'), 'should validate .claude/skills');
    assert.ok(content.includes('.claude/hooks'), 'should validate .claude/hooks');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/sync-all-v2.test.js`
Expected: FAIL

**Step 3: Rewrite sync-all.js**

Remove:
- `syncPluginVersions()` entirely
- Symlink validation from `validateSymlinks()`
- Plugin references from `validateReadme()` and `validateClaudeMd()`

Replace with:
- `validateDirectories()` — check .claude/skills, .claude/hooks, .claude/agents, .claude/rules exist as real directories
- `validateArmadilloJson()` — check armadillo.json exists and packs match directory structure
- Keep `validateHooks()` and `validateSettingsHooks()` (updated to check for .claude/hooks/ paths)

**Step 4: Run test to verify it passes**

Run: `node --test tests/sync-all-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/sync-all.js tests/sync-all-v2.test.js
git commit -m "refactor: sync-all.js removes plugin sync, validates new structure"
```

---

### Task 8: Update version-bump.js (remove plugin sync call)

**Files:**
- Modify: `scripts/version-bump.js` — remove the `sync-all.js` call that syncs plugin manifests

**Step 1: Write the failing test**

```javascript
// tests/version-bump-v2.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('version-bump.js — no plugin references', () => {
  it('does not reference .claude-plugin/', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'version-bump.js'), 'utf8');
    assert.ok(!content.includes('.claude-plugin'), 'should not reference .claude-plugin');
    assert.ok(!content.includes('plugins/'), 'should not stage plugins/ directory');
  });

  it('stages armadillo.json in release commit', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'version-bump.js'), 'utf8');
    assert.ok(content.includes('armadillo.json'), 'should stage armadillo.json');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/version-bump-v2.test.js`
Expected: FAIL

**Step 3: Update version-bump.js**

- Remove the `sync-all.js` exec call (or keep it if sync-all still does useful validation)
- Update the `git add` command: replace `.claude-plugin/ plugins/` with `armadillo.json`
- Update version in armadillo.json too (read it, bump version field, write it)

**Step 4: Run test to verify it passes**

Run: `node --test tests/version-bump-v2.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/version-bump.js tests/version-bump-v2.test.js
git commit -m "fix: version-bump stages armadillo.json, removes plugin refs"
```

---

### Task 9: Delete build-plugins.js

**Files:**
- Delete: `scripts/build-plugins.js`

**Step 1: Verify no remaining references**

Search codebase for `build-plugins`:
```bash
grep -r "build-plugins" --include="*.js" --include="*.json" --include="*.sh" --include="*.md" .
```

Remove any references found (package.json scripts, test imports, etc.).

**Step 2: Delete the file**

```bash
rm scripts/build-plugins.js
```

**Step 3: Run all tests**

Run: `node --test tests/`
Expected: No test imports build-plugins (tests referencing it will be deleted in Task 14)

**Step 4: Commit**

```bash
git rm scripts/build-plugins.js
git commit -m "chore: delete build-plugins.js — plugin system removed"
```

---

## Phase 4: Rewrite Onboarding Skill

### Task 10: Rewrite onboarding SKILL.md — remove plugin machinery

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md`

This is the biggest single task. The current SKILL.md is ~894 lines. ~40% is plugin machinery.

**Step 1: Write the failing test**

```javascript
// tests/onboarding-no-plugins.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('onboarding skill — no plugin references', () => {
  const skillPath = join(ROOT, '.claude', 'skills', 'onboarding', 'SKILL.md');
  let content;

  it('loads without error', () => {
    content = readFileSync(skillPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('does not contain plugin terminology', () => {
    const banned = [
      'enabledPlugins', 'extraKnownMarketplaces', 'marketplace.json',
      'plugin.json', 'CLAUDE_PLUGIN_ROOT', 'claude plugin add',
      'claude plugin remove', 'multi-plugin', 'single-plugin',
      'legacy-file-copy'
    ];
    for (const term of banned) {
      assert.ok(!content.includes(term), `should not contain: ${term}`);
    }
  });

  it('references armadillo.json manifest', () => {
    assert.ok(content.includes('armadillo.json') || content.includes('.armadillo-manifest'), 'should reference the manifest');
  });

  it('describes git-based install flow', () => {
    assert.ok(
      content.includes('clone') || content.includes('GitHub') || content.includes('repo'),
      'should describe git-based install'
    );
  });

  it('keeps semantic classification (Bucket A/B/C/D)', () => {
    assert.ok(content.includes('Bucket A') || content.includes('bucket A'), 'should keep bucket classification');
  });

  it('keeps quality audit', () => {
    assert.ok(content.includes('quality') || content.includes('audit'), 'should keep quality audit');
  });

  it('describes pack selection', () => {
    assert.ok(content.includes('pack'), 'should describe pack selection');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/onboarding-no-plugins.test.js`
Expected: FAIL — plugin terminology still present

**Step 3: Rewrite onboarding SKILL.md**

Key changes:
- **Phase 1 (Scan)**: Keep unchanged — scans user's existing .claude/ directory
- **Phase 2 (Classify)**: Keep the semantic classification (Pass 1 path-based + Pass 2 LLM-assisted). Keep Buckets A/B/C/D. Remove all plugin selection logic.
- **Phase 3 (Walk-through)**: Keep dropped content processing, user decisions. Remove plugin registration steps.
- **Phase 4 (Install)**: Replace plugin installation with:
  1. Read armadillo repo (clone or API)
  2. Copy `.claude/` wholesale (skills, agents, hooks, rules, settings template)
  3. Offer pack selection based on detected stack
  4. Copy selected pack skills into `.claude/skills/`
  5. Write `.armadillo-manifest.json` with SHA, installed packs, file hashes
- **Phase 5 (Post-install)**: Keep quality audit. Remove "restart Claude Code" messaging.
- **Phase 6 (Project analysis)**: Keep unchanged — scans codebase and recommends custom content.

Remove entirely:
- All `installType` distinctions (legacy-file-copy, plugin, multi-plugin)
- All migration paths between install types
- All `enabledPlugins` / `extraKnownMarketplaces` manipulation
- All `claude plugin add/remove` commands
- All marketplace URL registration
- "Restart Claude Code" messaging

**Step 4: Run test to verify it passes**

Run: `node --test tests/onboarding-no-plugins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md tests/onboarding-no-plugins.test.js
git commit -m "feat!: rewrite onboarding skill — git-native install, no plugins"
```

---

## Phase 5: Rewrite Updating Skill

### Task 11: Rewrite updating-armadillo SKILL.md — remove plugin machinery

**Files:**
- Modify: `.claude/skills/updating-armadillo/SKILL.md`

Current SKILL.md is ~910 lines. ~60% is plugin machinery.

**Step 1: Write the failing test**

```javascript
// tests/updating-no-plugins.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('updating-armadillo skill — no plugin references', () => {
  const skillPath = join(ROOT, '.claude', 'skills', 'updating-armadillo', 'SKILL.md');
  let content;

  it('loads without error', () => {
    content = readFileSync(skillPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('does not contain plugin terminology', () => {
    const banned = [
      'enabledPlugins', 'extraKnownMarketplaces', 'marketplace.json',
      'plugin.json', 'CLAUDE_PLUGIN_ROOT', 'claude plugin',
      'multi-plugin', 'single-plugin', 'legacy-file-copy',
      'installType', 'migration path'
    ];
    for (const term of banned) {
      assert.ok(!content.includes(term), `should not contain: ${term}`);
    }
  });

  it('uses SHA-based version comparison', () => {
    assert.ok(
      content.includes('SHA') || content.includes('sha') || content.includes('commit'),
      'should use SHA-based versioning'
    );
  });

  it('describes hash-based file diffing', () => {
    assert.ok(
      content.includes('hash') || content.includes('diff'),
      'should describe hash-based file comparison'
    );
  });

  it('keeps semantic overlap detection', () => {
    assert.ok(content.includes('overlap') || content.includes('semantic'), 'should keep overlap detection');
  });

  it('keeps quality audit', () => {
    assert.ok(content.includes('quality') || content.includes('audit'), 'should keep quality audit');
  });

  it('keeps orphan resolution', () => {
    assert.ok(content.includes('orphan'), 'should keep orphan resolution');
  });

  it('describes pack management', () => {
    assert.ok(content.includes('pack'), 'should describe pack management');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/updating-no-plugins.test.js`
Expected: FAIL — plugin terminology still present

**Step 3: Rewrite updating-armadillo SKILL.md**

Key changes:
- **Step 1 (Check)**: Read `.armadillo-manifest.json` → get current SHA. Fetch latest SHA from repo.
- **Step 2 (Diff)**: Hash-compare each armadillo-owned file (manifest tracks `owner: armadillo` + `hash: sha256`). Auto-update unmodified files. Conflict-handle modified files.
- **Step 3 (Packs)**: Offer new packs/skills. Remove/add packs.
- **Step 4 (Intelligence)**: Keep Step 5.5 — semantic overlap detection, quality audit, orphan resolution.
- **Step 5 (Health check)**: Validate structure, run tests.
- **Step 6 (Manifest)**: Update `.armadillo-manifest.json` with new SHA, file hashes.

Remove entirely:
- Step 2.6 migration paths (legacy-file-copy → multi-plugin, etc.)
- All plugin version checking via `claude plugin list`
- All `enabledPlugins` / `extraKnownMarketplaces` manipulation
- Plugin registration/deregistration
- "Restart Claude Code" messaging
- `installType` detection and branching

**Step 4: Run test to verify it passes**

Run: `node --test tests/updating-no-plugins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/skills/updating-armadillo/SKILL.md tests/updating-no-plugins.test.js
git commit -m "feat!: rewrite updating-armadillo skill — SHA-based, no plugins"
```

---

## Phase 6: Clean Up References

### Task 12: Delete claude-code-plugins skill

**Files:**
- Delete: `.claude/skills/claude-code-plugins/` (entire directory — SKILL.md + reference.md)

**Step 1: Verify no other skill depends on it**

Search for references to `claude-code-plugins` in skills and agents.

**Step 2: Delete the directory**

```bash
rm -rf .claude/skills/claude-code-plugins/
```

**Step 3: Remove from armadillo.json core.skills list**

Edit `armadillo.json` to remove `"claude-code-plugins"` from `core.skills`.

**Step 4: Remove from build-claude-md.js CORE_CATEGORIES**

Remove `'claude-code-plugins'` from the Meta category array.

**Step 5: Commit**

```bash
git rm -rf .claude/skills/claude-code-plugins/
git add armadillo.json scripts/build-claude-md.js
git commit -m "chore: delete claude-code-plugins skill — plugin system removed"
```

---

### Task 13: Update all skills that mention plugins

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md`
- Modify: `.claude/skills/subagent-driven-development/SKILL.md`
- Modify: `.claude/skills/writing-plans/SKILL.md`
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`
- Modify: `.claude/skills/vitest/reference.md` (if plugin ref is in example)
- Modify: `.claude/skills/playwright/reference.md` (if plugin ref is in example)
- Modify: `.claude/skills/puppeteer/reference.md` (if plugin ref is in example)

**Step 1: Write the failing test**

```javascript
// tests/skills-no-plugin-refs.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');

describe('skills — no plugin references', () => {
  const banned = ['enabledPlugins', 'extraKnownMarketplaces', 'marketplace.json', 'plugin.json', 'CLAUDE_PLUGIN_ROOT'];

  for (const skillDir of readdirSync(SKILLS_DIR)) {
    const skillMd = join(SKILLS_DIR, skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) continue;

    it(`${skillDir}/SKILL.md has no plugin references`, () => {
      const content = readFileSync(skillMd, 'utf8');
      for (const term of banned) {
        assert.ok(!content.includes(term), `${skillDir}/SKILL.md contains: ${term}`);
      }
    });
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/skills-no-plugin-refs.test.js`
Expected: FAIL — several skills still reference plugins

**Step 3: Update each skill**

For each failing skill, find and replace plugin references:
- `finishing-a-development-branch`: Remove any plugin registration steps from branch completion
- `subagent-driven-development`: Remove plugin context from subagent prompts
- `writing-plans`: Remove plugin-related planning steps
- `armadillo-shepherd`: Remove `claude-code-plugins` from routing table. Update Meta section: remove `claude-code-plugins` entry. Change install/update descriptions to reference git-native flow.
- Reference skills (vitest, playwright, puppeteer): If the word "plugin" appears in a generic context (e.g., "Vitest plugins"), that's fine — only remove armadillo-specific plugin references.

**Step 4: Run test to verify it passes**

Run: `node --test tests/skills-no-plugin-refs.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/skills/
git commit -m "refactor: remove plugin references from all skills"
```

---

### Task 14: Update/delete plugin-dependent tests

**Files to DELETE (test subjects no longer exist):**
- `tests/marketplace-validation.test.js`
- `tests/build-plugins.test.js`
- `tests/multi-plugin-structure.test.js`
- `tests/skills-json-schema.test.js`
- `tests/hooks-sharedfiles-sync.test.js`
- `tests/shared-files.test.js`

**Files to UPDATE (remove plugin assertions):**
- `tests/build-claude-md.test.js` — update to test against armadillo.json
- `tests/settings-hooks.test.js` — update path assertions
- `tests/lifecycle-hooks.test.js` — remove plugin lifecycle refs
- `tests/sync-all-hooks.test.js` — update to match rewritten sync-all
- `tests/overhaul-coverage.test.js` — remove plugin coverage checks
- `tests/deprecated-cleanup.test.js` — remove plugin-related cleanup checks

**Step 1: Delete obsolete test files**

```bash
rm tests/marketplace-validation.test.js
rm tests/build-plugins.test.js
rm tests/multi-plugin-structure.test.js
rm tests/skills-json-schema.test.js
rm tests/hooks-sharedfiles-sync.test.js
rm tests/shared-files.test.js
```

**Step 2: Update remaining test files**

For each file listed above under "UPDATE", read the file, identify plugin-specific assertions, and either remove them or update to test the new structure.

**Step 3: Run full test suite**

Run: `node --test tests/`
Expected: ALL PASS (may need iteration)

**Step 4: Commit**

```bash
git rm tests/marketplace-validation.test.js tests/build-plugins.test.js tests/multi-plugin-structure.test.js tests/skills-json-schema.test.js tests/hooks-sharedfiles-sync.test.js tests/shared-files.test.js
git add tests/
git commit -m "test: update test suite for git-native structure"
```

---

## Phase 7: Update Docs & README

### Task 15: Rewrite INSTALL.md

**Files:**
- Modify: `INSTALL.md`

**Step 1: Write the new INSTALL.md**

```markdown
# Install Armadillo

## Requirements

[Claude Code](https://claude.ai/download) — that's it. Works on macOS, Windows, and Linux. No terminal, no scripts, no package manager.

## Install

Open Claude Code in your project directory, then tell Claude:

```
Install armadillo from https://github.com/filenamedotexe/armadillo
```

Then:

```
/onboarding
```

Done.

## What happens

1. Claude reads the armadillo repo from GitHub
2. Copies core skills, hooks, rules, and agents into your `.claude/` directory
3. `/onboarding` runs project analysis, selects skill packs for your stack, and generates `CLAUDE.md`

Everything lives in your project's `.claude/` folder. Nothing global, nothing system-wide.

## Add skill packs

armadillo-core covers workflow, testing, git, and debugging. Optional skill packs extend it with domain-specific expertise — frontend, database, auth, deploy, and more.

To add or remove skill packs:

```
/updating-armadillo
```

See the [README](README.md) for the full list of available skill packs.

## Update

Tell Claude:

```
/updating-armadillo
```

Checks for new versions, diffs your files, handles conflicts, and offers new skill packs.
```

**Step 2: Commit**

```bash
git add INSTALL.md
git commit -m "docs: rewrite INSTALL.md for git-native install"
```

---

### Task 16: Regenerate CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md` (via build-claude-md.js)

**Step 1: Run the updated build-claude-md script**

```bash
node scripts/build-claude-md.js
```

**Step 2: Verify no plugin references remain**

```bash
grep -c "plugin\|marketplace\|enabledPlugin" .claude/CLAUDE.md
```
Expected: 0 (or only generic uses like "Vitest plugin")

**Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: regenerate CLAUDE.md from armadillo.json"
```

---

### Task 17: Update README.md

**Files:**
- Modify: `README.md` — remove all plugin installation instructions, update to git-native
- Modify: `scripts/update-readme.js` — read from armadillo.json instead of skills.json

**Step 1: Update update-readme.js**

Change the script to read from `armadillo.json` instead of `skills.json` + `.claude-plugin/marketplace.json`.

**Step 2: Regenerate README**

```bash
node scripts/update-readme.js
```

**Step 3: Manual review of generated README**

Verify:
- Install instructions say "tell Claude" not "run install.sh"
- No `enabledPlugins` JSON blocks
- No marketplace URLs
- Skill packs section shows packs, not plugins

**Step 4: Commit**

```bash
git add README.md scripts/update-readme.js
git commit -m "docs: update README for git-native install"
```

---

## Phase 8: Update package.json & Final Cleanup

### Task 18: Update package.json

**Files:**
- Modify: `package.json`

**Step 1: Update package.json**

Remove:
- `"files": [".claude/", "skills.json"]` → `"files": [".claude/", "packs/", "armadillo.json"]`
- `"build-claude-md"` script already updated
- Add: `"build-manifest": "node scripts/build-armadillo-json.js"` if we created that script

Remove from `scripts`:
- Any reference to build-plugins

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: update package.json — remove skills.json, add armadillo.json"
```

---

### Task 19: Remove release-checklist plugin references

**Files:**
- Modify: `.claude/rules/release-checklist.md` — update to reference armadillo.json instead of plugin manifests

**Step 1: Update release-checklist**

The version-bump.js pipeline now stages `armadillo.json` instead of `.claude-plugin/` and `plugins/`. Update the rule to reflect this.

**Step 2: Commit**

```bash
git add .claude/rules/release-checklist.md
git commit -m "docs: update release-checklist for git-native structure"
```

---

### Task 20: Run full test suite & fix remaining failures

**Step 1: Run all tests**

```bash
node --test tests/
```

**Step 2: Fix any failures**

Iterate until all tests pass.

**Step 3: Commit fixes**

```bash
git add .
git commit -m "fix: resolve remaining test failures after migration"
```

---

### Task 21: Final verification — no plugin artifacts remain

**Step 1: Comprehensive search**

```bash
grep -r "enabledPlugins\|extraKnownMarketplaces\|marketplace\.json\|plugin\.json\|CLAUDE_PLUGIN_ROOT\|\.claude-plugin" . \
  --include="*.js" --include="*.json" --include="*.sh" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.worktrees \
  --exclude-dir=.claude/docs/plans
```

Expected: ZERO results (excluding plan docs which are historical).

**Step 2: Verify no .claude-plugin directories exist**

```bash
find . -name ".claude-plugin" -type d -not -path "./.git/*" -not -path "./.worktrees/*"
```

Expected: Empty

**Step 3: Verify armadillo.json is consistent**

```bash
node --test tests/armadillo-json.test.js
```

**Step 4: Verify all hook scripts are executable**

```bash
find .claude/hooks -name "*.sh" -exec test -x {} \; -print
```

**Step 5: Final commit (if any fixes needed)**

```bash
git add .
git commit -m "chore: final cleanup — zero plugin artifacts remaining"
```

---

## Summary

| Phase | Tasks | What happens |
|-------|-------|-------------|
| 1. Structure | 1-3 | Create armadillo.json, move core to .claude/, move packs, delete plugins/ |
| 2. Hooks | 4-5 | Remove CLAUDE_PLUGIN_ROOT from all hooks, update settings.json |
| 3. Scripts | 6-9 | Rewrite build-claude-md, sync-all, version-bump; delete build-plugins |
| 4. Onboarding | 10 | Rewrite onboarding skill — git-native install flow |
| 5. Updating | 11 | Rewrite updating-armadillo skill — SHA-based updates |
| 6. Cleanup | 12-14 | Delete claude-code-plugins skill, update all skill refs, fix tests |
| 7. Docs | 15-17 | Rewrite INSTALL.md, regenerate CLAUDE.md, update README |
| 8. Final | 18-21 | Update package.json, release checklist, run full tests, verify zero artifacts |

21 tasks. Sequential dependencies throughout (each phase builds on previous). Best executed via subagent-driven-development in batches.
