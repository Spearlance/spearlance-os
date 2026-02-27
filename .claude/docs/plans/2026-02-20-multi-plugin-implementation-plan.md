# Multi-Plugin Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Split armadillo from one monolithic plugin into 23 separate plugins (1 core + 22 skill packs) so users get bundle selection via native Claude Code plugin management.

**Architecture:** Files move from flat root directories (`skills/`, `agents/`, `hooks/`) into `plugins/*/` subdirectories. Each plugin gets its own `.claude-plugin/plugin.json`. Root-level symlinks provide backward compatibility for development. Git subtree publishes each `plugins/*/` to its own GitHub repo for user installation.

**Tech Stack:** Node.js scripts (ESM), node:test + assert/strict, git subtree, GitHub API via `gh`

**Design doc:** `.claude/docs/plans/2026-02-20-multi-plugin-architecture-design.md`

---

## Phase 1: Monorepo Restructure

### Task 1: Plugin Directory Scaffold Script (TDD)

**Files:**
- Create: `scripts/build-plugins.js`
- Create: `tests/build-plugins.test.js`

**Step 1: Write the failing test**

```js
// tests/build-plugins.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Import the mapping function we'll build
import { getBundlePluginMap, getPluginDirName } from '../scripts/build-plugins.js';

const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));

describe('build-plugins — bundle-to-plugin mapping', () => {
  test('maps all 23 bundles to plugin directory names', () => {
    const map = getBundlePluginMap(skillsJson);
    assert.equal(Object.keys(map).length, 23);
  });

  test('core maps to "core"', () => {
    assert.equal(getPluginDirName('core'), 'core');
  });

  test('frontend-dev maps to "frontend"', () => {
    assert.equal(getPluginDirName('frontend-dev'), 'frontend');
  });

  test('google-apis maps to "google-apis"', () => {
    assert.equal(getPluginDirName('google-apis'), 'google-apis');
  });

  test('every bundle has a skills array', () => {
    const map = getBundlePluginMap(skillsJson);
    for (const [bundle, info] of Object.entries(map)) {
      assert.ok(Array.isArray(info.skills), `${bundle} should have skills array`);
      assert.ok(info.skills.length > 0, `${bundle} should have at least 1 skill`);
    }
  });

  test('total skills across all plugins equals 82', () => {
    const map = getBundlePluginMap(skillsJson);
    const total = Object.values(map).reduce((sum, info) => sum + info.skills.length, 0);
    assert.equal(total, 82);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-plugins.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// scripts/build-plugins.js
#!/usr/bin/env node
/**
 * build-plugins.js
 * Maps skills.json bundles → plugin directory names.
 * Used by restructure script and ongoing validation.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Bundle name → plugin directory name overrides
// Most are identity; only exceptions listed here
const DIR_NAME_OVERRIDES = {
  'frontend-dev': 'frontend'
};

export function getPluginDirName(bundleName) {
  return DIR_NAME_OVERRIDES[bundleName] || bundleName;
}

export function getPluginPackageName(bundleName) {
  return `armadillo-${getPluginDirName(bundleName)}`;
}

export function getBundlePluginMap(skillsJson) {
  const map = {};
  for (const [bundleName, bundle] of Object.entries(skillsJson.bundles)) {
    const dirName = getPluginDirName(bundleName);
    map[bundleName] = {
      dirName,
      packageName: `armadillo-${dirName}`,
      description: bundle.description,
      skills: bundle.skills,
      isCore: bundleName === 'core'
    };
  }
  return map;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-plugins.test.js`
Expected: PASS — all 6 tests green

**Step 5: Commit**

```bash
git add tests/build-plugins.test.js scripts/build-plugins.js
git commit -m "test: add build-plugins bundle mapping with tests"
```

---

### Task 2: Plugin Manifest Generator (TDD)

**Files:**
- Modify: `scripts/build-plugins.js`
- Modify: `tests/build-plugins.test.js`

**Step 1: Write the failing test**

Add to `tests/build-plugins.test.js`:

```js
import { generatePluginJson, generateMarketplaceJson } from '../scripts/build-plugins.js';

describe('build-plugins — manifest generation', () => {
  test('generates valid plugin.json for core', () => {
    const pj = generatePluginJson('core', '0.19.0');
    assert.equal(pj.name, 'armadillo-core');
    assert.equal(pj.version, '0.19.0');
    assert.ok(pj.description);
    assert.equal(pj.repository, 'https://github.com/filenamedotexe/armadillo-core');
  });

  test('generates valid plugin.json for frontend', () => {
    const pj = generatePluginJson('frontend-dev', '0.19.0');
    assert.equal(pj.name, 'armadillo-frontend');
    assert.equal(pj.version, '0.19.0');
    assert.equal(pj.repository, 'https://github.com/filenamedotexe/armadillo-frontend');
  });

  test('generates valid marketplace.json for core', () => {
    const mj = generateMarketplaceJson('core', '0.19.0');
    assert.equal(mj.name, 'armadillo-core');
    assert.equal(mj.plugins.length, 1);
    assert.equal(mj.plugins[0].name, 'armadillo-core');
    assert.equal(mj.plugins[0].source, './');
    assert.equal(mj.plugins[0].version, '0.19.0');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-plugins.test.js`
Expected: FAIL — generatePluginJson not exported

**Step 3: Write minimal implementation**

Add to `scripts/build-plugins.js`:

```js
export function generatePluginJson(bundleName, version) {
  const dirName = getPluginDirName(bundleName);
  const packageName = `armadillo-${dirName}`;
  const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
  const bundle = skillsJson.bundles[bundleName];

  return {
    name: packageName,
    version,
    description: bundle?.description || `${packageName} skill pack for armadillo`,
    repository: `https://github.com/filenamedotexe/${packageName}`,
    license: 'MIT'
  };
}

export function generateMarketplaceJson(bundleName, version) {
  const dirName = getPluginDirName(bundleName);
  const packageName = `armadillo-${dirName}`;
  const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
  const bundle = skillsJson.bundles[bundleName];

  return {
    name: packageName,
    owner: {
      name: 'Armadillo',
      email: 'contact@armadillo.dev'
    },
    plugins: [
      {
        name: packageName,
        source: './',
        description: bundle?.description || `${packageName} skill pack`,
        version
      }
    ]
  };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-plugins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build-plugins.js tests/build-plugins.test.js
git commit -m "feat: add plugin manifest generators"
```

---

### Task 3: Create Plugin Directory Structure

**Files:**
- Modify: `scripts/build-plugins.js` (add `scaffoldPlugins()` function)
- Create: 23 directories under `plugins/`

**Step 1: Write the failing test**

Add to `tests/build-plugins.test.js`:

```js
import { existsSync } from 'node:fs';

describe('build-plugins — scaffold validation', () => {
  // This test validates the structure AFTER scaffolding runs
  test('plugins/ directory exists', () => {
    assert.ok(existsSync(join(ROOT, 'plugins')), 'plugins/ should exist');
  });

  test('all 23 plugin directories exist', () => {
    const map = getBundlePluginMap(skillsJson);
    for (const [, info] of Object.entries(map)) {
      const dir = join(ROOT, 'plugins', info.dirName);
      assert.ok(existsSync(dir), `plugins/${info.dirName} should exist`);
    }
  });

  test('each plugin has .claude-plugin/plugin.json', () => {
    const map = getBundlePluginMap(skillsJson);
    for (const [, info] of Object.entries(map)) {
      const pj = join(ROOT, 'plugins', info.dirName, '.claude-plugin', 'plugin.json');
      assert.ok(existsSync(pj), `plugins/${info.dirName}/.claude-plugin/plugin.json should exist`);
    }
  });

  test('each plugin has .claude-plugin/marketplace.json', () => {
    const map = getBundlePluginMap(skillsJson);
    for (const [, info] of Object.entries(map)) {
      const mj = join(ROOT, 'plugins', info.dirName, '.claude-plugin', 'marketplace.json');
      assert.ok(existsSync(mj), `plugins/${info.dirName}/.claude-plugin/marketplace.json should exist`);
    }
  });

  test('all plugin.json versions match package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const map = getBundlePluginMap(skillsJson);
    for (const [, info] of Object.entries(map)) {
      const pj = JSON.parse(readFileSync(
        join(ROOT, 'plugins', info.dirName, '.claude-plugin', 'plugin.json'), 'utf8'
      ));
      assert.equal(pj.version, pkg.version, `plugins/${info.dirName} version should match`);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-plugins.test.js`
Expected: FAIL — plugins/ does not exist

**Step 3: Write scaffoldPlugins() and run it**

Add to `scripts/build-plugins.js`:

```js
import { mkdirSync, writeFileSync } from 'fs';

export function scaffoldPlugins() {
  const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const map = getBundlePluginMap(skillsJson);

  for (const [bundleName, info] of Object.entries(map)) {
    const pluginDir = join(ROOT, 'plugins', info.dirName);
    const manifestDir = join(pluginDir, '.claude-plugin');
    const skillsDir = join(pluginDir, 'skills');

    mkdirSync(manifestDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });

    // Core gets extra directories
    if (info.isCore) {
      mkdirSync(join(pluginDir, 'agents'), { recursive: true });
      mkdirSync(join(pluginDir, 'hooks', 'lib'), { recursive: true });
      mkdirSync(join(pluginDir, 'rules'), { recursive: true });
    }

    // Write manifests
    writeFileSync(
      join(manifestDir, 'plugin.json'),
      JSON.stringify(generatePluginJson(bundleName, version), null, 2) + '\n'
    );
    writeFileSync(
      join(manifestDir, 'marketplace.json'),
      JSON.stringify(generateMarketplaceJson(bundleName, version), null, 2) + '\n'
    );
  }
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'scaffold') {
    scaffoldPlugins();
    console.log('✓ Plugin directories scaffolded');
  }
}
```

Then run:

```bash
node scripts/build-plugins.js scaffold
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-plugins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add plugins/ scripts/build-plugins.js tests/build-plugins.test.js
git commit -m "feat: scaffold 23 plugin directories with manifests"
```

---

### Task 4: Move Core Files to plugins/core/

**Files:**
- Move: `agents/*.md` → `plugins/core/agents/`
- Move: `hooks/*` → `plugins/core/hooks/`
- Move: `.claude/rules/{coding-standards,git-workflow,output-style,pr-format,project-context}.md` → `plugins/core/rules/`
- Move: 22 core skill directories → `plugins/core/skills/`
- Create: symlinks at old locations

Core skills (from skills.json bundle "core"): brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, armadillo-shepherd, verification-before-completion, writing-plans, writing-reference-skills, writing-skills, onboarding, updating-armadillo, playwright, puppeteer, cypress, vitest, writing-prs

**Step 1: Move agents**

```bash
# Move all 14 agent files
git mv agents/ascii-art-creator.md plugins/core/agents/
git mv agents/backend-guide.md plugins/core/agents/
git mv agents/brand-strategist.md plugins/core/agents/
git mv agents/claude-code-guide.md plugins/core/agents/
git mv agents/code-reviewer.md plugins/core/agents/
git mv agents/database-guide.md plugins/core/agents/
git mv agents/duda-migration-agent.md plugins/core/agents/
git mv agents/frontend-dev-guide.md plugins/core/agents/
git mv agents/frontend-testing-guide.md plugins/core/agents/
git mv agents/fullstack-architect.md plugins/core/agents/
git mv agents/google-api-guide.md plugins/core/agents/
git mv agents/infra-guide.md plugins/core/agents/
git mv agents/project-scaffolder.md plugins/core/agents/
git mv agents/remotion-creator.md plugins/core/agents/

# Replace with symlink
rmdir agents  # git mv emptied it
ln -s plugins/core/agents agents
```

**Step 2: Move hooks**

```bash
git mv hooks/hooks.json plugins/core/hooks/
git mv hooks/async-lint.sh plugins/core/hooks/
git mv hooks/enforce-skills.sh plugins/core/hooks/
git mv hooks/inject-skill-awareness.sh plugins/core/hooks/
git mv hooks/post-push-pr-check.sh plugins/core/hooks/
git mv hooks/pre-compact.sh plugins/core/hooks/
git mv hooks/session-start.sh plugins/core/hooks/
git mv hooks/stop-verify.sh plugins/core/hooks/
git mv hooks/subagent-start.sh plugins/core/hooks/
git mv hooks/task-completed.sh plugins/core/hooks/
git mv hooks/lib/json-escape.sh plugins/core/hooks/lib/

rmdir hooks/lib hooks
ln -s plugins/core/hooks hooks
```

**Step 3: Move rules (shared only, keep release-checklist.md)**

```bash
git mv .claude/rules/coding-standards.md plugins/core/rules/
git mv .claude/rules/git-workflow.md plugins/core/rules/
git mv .claude/rules/output-style.md plugins/core/rules/
git mv .claude/rules/pr-format.md plugins/core/rules/
git mv .claude/rules/project-context.md plugins/core/rules/

# Create symlinks back so .claude/rules/ still works for dev
ln -s ../../plugins/core/rules/coding-standards.md .claude/rules/coding-standards.md
ln -s ../../plugins/core/rules/git-workflow.md .claude/rules/git-workflow.md
ln -s ../../plugins/core/rules/output-style.md .claude/rules/output-style.md
ln -s ../../plugins/core/rules/pr-format.md .claude/rules/pr-format.md
ln -s ../../plugins/core/rules/project-context.md .claude/rules/project-context.md
# release-checklist.md stays as real file (repo-specific)
```

**Step 4: Move core skills (22 skills)**

```bash
for skill in brainstorming dispatching-parallel-agents executing-plans finishing-a-development-branch receiving-code-review requesting-code-review subagent-driven-development systematic-debugging test-driven-development using-git-worktrees armadillo-shepherd verification-before-completion writing-plans writing-reference-skills writing-skills onboarding updating-armadillo playwright puppeteer cypress vitest writing-prs; do
  git mv "skills/$skill" "plugins/core/skills/$skill"
done
```

**Step 5: Verify and commit**

Run: `ls plugins/core/skills/ | wc -l` → expect 22
Run: `ls plugins/core/agents/ | wc -l` → expect 14
Run: `ls plugins/core/hooks/*.sh | wc -l` → expect 9

```bash
git add -A
git commit -m "refactor: move core files to plugins/core/"
```

---

### Task 5: Move Skill Packs to Plugin Directories

**Files:**
- Move: 60 remaining skill directories from `skills/` → their respective `plugins/*/skills/`

**Step 1: Move all skill packs**

```bash
# frontend (10 skills)
for skill in tailwind-css shadcn-ui nextjs astro react-vite sveltekit framer-motion gsap responsive-design accessibility; do
  git mv "skills/$skill" "plugins/frontend/skills/$skill"
done

# google-apis (7 skills)
for skill in ga4-api google-ads-api google-business-profile-api google-places-api google-search-console-api lighthouse-api youtube-data-api; do
  git mv "skills/$skill" "plugins/google-apis/skills/$skill"
done

# backend (4 skills)
for skill in hono express trpc rest-api-patterns; do
  git mv "skills/$skill" "plugins/backend/skills/$skill"
done

# database (4 skills)
for skill in neon supabase mongodb redis-upstash; do
  git mv "skills/$skill" "plugins/database/skills/$skill"
done

# orm (2 skills)
for skill in drizzle prisma; do
  git mv "skills/$skill" "plugins/orm/skills/$skill"
done

# auth (3 skills)
for skill in authjs clerk supabase-auth; do
  git mv "skills/$skill" "plugins/auth/skills/$skill"
done

# deploy (4 skills)
for skill in vercel cloudflare-pages-workers docker github-actions; do
  git mv "skills/$skill" "plugins/deploy/skills/$skill"
done

# forms (2 skills)
for skill in zod react-hook-form; do
  git mv "skills/$skill" "plugins/forms/skills/$skill"
done

# state (2 skills)
for skill in zustand tanstack-query; do
  git mv "skills/$skill" "plugins/state/skills/$skill"
done

# monitoring (2 skills)
for skill in sentry posthog; do
  git mv "skills/$skill" "plugins/monitoring/skills/$skill"
done

# cms (2 skills)
for skill in sanity payload; do
  git mv "skills/$skill" "plugins/cms/skills/$skill"
done

# email (2 skills)
for skill in resend react-email; do
  git mv "skills/$skill" "plugins/email/skills/$skill"
done

# storage (2 skills)
for skill in uploadthing s3-cloudflare-r2; do
  git mv "skills/$skill" "plugins/storage/skills/$skill"
done

# ai (2 skills)
for skill in vercel-ai-sdk anthropic-api; do
  git mv "skills/$skill" "plugins/ai/skills/$skill"
done

# tooling (2 skills)
for skill in eslint-prettier turborepo; do
  git mv "skills/$skill" "plugins/tooling/skills/$skill"
done

# fresh-project (3 skills)
for skill in fresh-project scaffold stack-recommender; do
  git mv "skills/$skill" "plugins/fresh-project/skills/$skill"
done

# mobile (1 skill)
git mv skills/expo-react-native plugins/mobile/skills/expo-react-native

# payments (1 skill)
git mv skills/stripe-api plugins/payments/skills/stripe-api

# video (1 skill)
git mv skills/remotion plugins/video/skills/remotion

# brand (2 skills)
for skill in brand-knowledge-builder deepgram-transcription; do
  git mv "skills/$skill" "plugins/brand/skills/$skill"
done

# web-migration (1 skill)
git mv skills/duda-to-astro-migration plugins/web-migration/skills/duda-to-astro-migration

# creative (1 skill)
git mv skills/ascii-art plugins/creative/skills/ascii-art
```

**Step 2: Create root skills/ as symlink directory**

The root `skills/` directory should now be empty. Replace it with a directory of symlinks so the root plugin still discovers all skills for development:

```bash
rmdir skills
mkdir skills

# Create symlinks for all 82 skills pointing to their plugin locations
# Core skills
for skill in brainstorming dispatching-parallel-agents executing-plans finishing-a-development-branch receiving-code-review requesting-code-review subagent-driven-development systematic-debugging test-driven-development using-git-worktrees armadillo-shepherd verification-before-completion writing-plans writing-reference-skills writing-skills onboarding updating-armadillo playwright puppeteer cypress vitest writing-prs; do
  ln -s "../plugins/core/skills/$skill" "skills/$skill"
done

# Frontend
for skill in tailwind-css shadcn-ui nextjs astro react-vite sveltekit framer-motion gsap responsive-design accessibility; do
  ln -s "../plugins/frontend/skills/$skill" "skills/$skill"
done

# Google APIs
for skill in ga4-api google-ads-api google-business-profile-api google-places-api google-search-console-api lighthouse-api youtube-data-api; do
  ln -s "../plugins/google-apis/skills/$skill" "skills/$skill"
done

# Backend
for skill in hono express trpc rest-api-patterns; do
  ln -s "../plugins/backend/skills/$skill" "skills/$skill"
done

# Database
for skill in neon supabase mongodb redis-upstash; do
  ln -s "../plugins/database/skills/$skill" "skills/$skill"
done

# ORM
for skill in drizzle prisma; do
  ln -s "../plugins/orm/skills/$skill" "skills/$skill"
done

# Auth
for skill in authjs clerk supabase-auth; do
  ln -s "../plugins/auth/skills/$skill" "skills/$skill"
done

# Deploy
for skill in vercel cloudflare-pages-workers docker github-actions; do
  ln -s "../plugins/deploy/skills/$skill" "skills/$skill"
done

# Forms
for skill in zod react-hook-form; do
  ln -s "../plugins/forms/skills/$skill" "skills/$skill"
done

# State
for skill in zustand tanstack-query; do
  ln -s "../plugins/state/skills/$skill" "skills/$skill"
done

# Monitoring
for skill in sentry posthog; do
  ln -s "../plugins/monitoring/skills/$skill" "skills/$skill"
done

# CMS
for skill in sanity payload; do
  ln -s "../plugins/cms/skills/$skill" "skills/$skill"
done

# Email
for skill in resend react-email; do
  ln -s "../plugins/email/skills/$skill" "skills/$skill"
done

# Storage
for skill in uploadthing s3-cloudflare-r2; do
  ln -s "../plugins/storage/skills/$skill" "skills/$skill"
done

# AI
for skill in vercel-ai-sdk anthropic-api; do
  ln -s "../plugins/ai/skills/$skill" "skills/$skill"
done

# Tooling
for skill in eslint-prettier turborepo; do
  ln -s "../plugins/tooling/skills/$skill" "skills/$skill"
done

# Fresh Project
for skill in fresh-project scaffold stack-recommender; do
  ln -s "../plugins/fresh-project/skills/$skill" "skills/$skill"
done

# Single-skill packs
ln -s "../plugins/mobile/skills/expo-react-native" "skills/expo-react-native"
ln -s "../plugins/payments/skills/stripe-api" "skills/stripe-api"
ln -s "../plugins/video/skills/remotion" "skills/remotion"
ln -s "../plugins/brand/skills/brand-knowledge-builder" "skills/brand-knowledge-builder"
ln -s "../plugins/brand/skills/deepgram-transcription" "skills/deepgram-transcription"
ln -s "../plugins/web-migration/skills/duda-to-astro-migration" "skills/duda-to-astro-migration"
ln -s "../plugins/creative/skills/ascii-art" "skills/ascii-art"
```

**Step 3: Update .claude/ symlinks**

```bash
# .claude/skills already points to ../skills (directory of symlinks now)
# .claude/agents already points to ../agents (symlink to plugins/core/agents)
# .claude/hooks already points to ../hooks (symlink to plugins/core/hooks)
# Verify they resolve:
ls .claude/skills/brainstorming/SKILL.md
ls .claude/agents/code-reviewer.md
ls .claude/hooks/hooks.json
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: distribute skills across 22 plugin directories"
```

---

### Task 6: Update sync-all.js for Multi-Plugin (TDD)

**Files:**
- Modify: `scripts/sync-all.js`

**Step 1: Update sync-all.js**

Replace `syncPluginVersions()` to iterate over all 23 plugins:

```js
// In syncPluginVersions(), replace single-plugin logic with:
function syncPluginVersions() {
  console.log('\n━━━ Syncing Plugin Manifest Versions ━━━');

  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  info(`Source: package.json v${version}`);

  // Sync root .claude-plugin/ (dev monolith)
  const rootPluginPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(rootPluginPath)) {
    const plugin = JSON.parse(fs.readFileSync(rootPluginPath, 'utf8'));
    if (plugin.version !== version) {
      plugin.version = version;
      fs.writeFileSync(rootPluginPath, JSON.stringify(plugin, null, 2) + '\n');
      success(`Updated .claude-plugin/plugin.json → ${version}`);
    } else {
      success(`.claude-plugin/plugin.json already ${version}`);
    }

    const rootMpPath = path.join(ROOT, '.claude-plugin', 'marketplace.json');
    const marketplace = JSON.parse(fs.readFileSync(rootMpPath, 'utf8'));
    const armadilloPlugin = marketplace.plugins.find(p => p.name === 'armadillo');
    if (armadilloPlugin && armadilloPlugin.version !== version) {
      armadilloPlugin.version = version;
      fs.writeFileSync(rootMpPath, JSON.stringify(marketplace, null, 2) + '\n');
      success(`Updated .claude-plugin/marketplace.json → ${version}`);
    } else {
      success(`.claude-plugin/marketplace.json already ${version}`);
    }
  }

  // Sync all 23 plugin manifests
  const pluginsDir = path.join(ROOT, 'plugins');
  if (!fs.existsSync(pluginsDir)) return;

  const pluginDirs = fs.readdirSync(pluginsDir).filter(d =>
    fs.statSync(path.join(pluginsDir, d)).isDirectory()
  );

  for (const dir of pluginDirs) {
    const pjPath = path.join(pluginsDir, dir, '.claude-plugin', 'plugin.json');
    const mjPath = path.join(pluginsDir, dir, '.claude-plugin', 'marketplace.json');

    if (!fs.existsSync(pjPath)) {
      error(`Missing: plugins/${dir}/.claude-plugin/plugin.json`);
      continue;
    }

    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
    if (pj.version !== version) {
      pj.version = version;
      fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n');
      success(`Updated plugins/${dir}/plugin.json → ${version}`);
    } else {
      success(`plugins/${dir}/plugin.json already ${version}`);
    }

    if (fs.existsSync(mjPath)) {
      const mj = JSON.parse(fs.readFileSync(mjPath, 'utf8'));
      const p = mj.plugins?.[0];
      if (p && p.version !== version) {
        p.version = version;
        fs.writeFileSync(mjPath, JSON.stringify(mj, null, 2) + '\n');
        success(`Updated plugins/${dir}/marketplace.json → ${version}`);
      }
    }
  }
}
```

Update `validateSymlinks()` — change expected symlink targets:

```js
const requiredSymlinks = [
  { link: '.claude/skills', target: '../skills' },
  { link: '.claude/agents', target: '../agents' },
  { link: '.claude/hooks', target: '../hooks' }
];
// These stay the same — .claude/* points to root level, root level symlinks to plugins/core/*
```

**Step 2: Run existing + new tests**

Run: `node --test tests/*.test.js`
Expected: PASS — all 578+ tests

**Step 3: Commit**

```bash
git add scripts/sync-all.js
git commit -m "refactor: update sync-all.js for multi-plugin validation"
```

---

### Task 7: Update version-bump.js for Multi-Plugin (TDD)

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Update version-bump.js**

In the `main()` function, after updating package.json and running sync-all.js (which now bumps all 23 plugins), update the git add line:

```js
// Replace the git add line:
await exec('git add package.json CHANGELOG.json README.md .claude-plugin/ plugins/', { cwd: ROOT });
```

This works because sync-all.js already bumps all `plugins/*/` manifests. The version-bump just needs to stage them.

**Step 2: Run existing tests**

Run: `node --test tests/version-bump.test.js`
Expected: PASS — pure functions unchanged

**Step 3: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: PASS

**Step 4: Commit**

```bash
git add scripts/version-bump.js
git commit -m "refactor: version-bump stages multi-plugin manifests"
```

---

### Task 8: Fix Broken Tests

After the restructure, some tests may reference old paths. Run the full suite and fix any failures.

**Step 1: Run full test suite**

Run: `node --test tests/*.test.js`

**Step 2: Fix any path-related failures**

Common fixes:
- Tests referencing `.claude/hooks/` path → hooks are now at `plugins/core/hooks/` but symlinked, so `.claude/hooks/` should still resolve
- Tests referencing `skills/X/SKILL.md` → skills are now symlinks, `existsSync` follows symlinks so should work
- `skills-json-schema.test.js` checks `existsSync(join(CLAUDE, file))` where `file` is like `skills/brainstorming/SKILL.md` → follows symlinks, should work
- `lifecycle-hooks.test.js` reads from `resolve(HOOKS_DIR)` which is `.claude/hooks` → symlink resolves to `plugins/core/hooks`, should work

If a test fails because it checks `lstatSync().isSymbolicLink()` specifically, update it to follow symlinks.

**Step 3: Run again to verify all pass**

Run: `node --test tests/*.test.js`
Expected: PASS — 578+ tests (may have new tests from build-plugins)

**Step 4: Commit fixes**

```bash
git add tests/
git commit -m "fix: update test paths for multi-plugin structure"
```

---

## Phase 2: Publishing Pipeline

### Task 9: Create publish-plugins.js Script (TDD)

**Files:**
- Create: `scripts/publish-plugins.js`
- Create: `tests/publish-plugins.test.js`

**Step 1: Write the failing test**

```js
// tests/publish-plugins.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getSubtreeCommands } from '../scripts/publish-plugins.js';

describe('publish-plugins — subtree commands', () => {
  test('generates correct git subtree push command for core', () => {
    const cmds = getSubtreeCommands();
    const core = cmds.find(c => c.plugin === 'core');
    assert.ok(core);
    assert.equal(core.prefix, 'plugins/core');
    assert.equal(core.repo, 'filenamedotexe/armadillo-core');
  });

  test('generates correct command for frontend', () => {
    const cmds = getSubtreeCommands();
    const frontend = cmds.find(c => c.plugin === 'frontend');
    assert.ok(frontend);
    assert.equal(frontend.prefix, 'plugins/frontend');
    assert.equal(frontend.repo, 'filenamedotexe/armadillo-frontend');
  });

  test('generates 23 commands total', () => {
    const cmds = getSubtreeCommands();
    assert.equal(cmds.length, 23);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/publish-plugins.test.js`
Expected: FAIL

**Step 3: Write minimal implementation**

```js
// scripts/publish-plugins.js
#!/usr/bin/env node
/**
 * publish-plugins.js
 * Publishes each plugins/* directory to its own GitHub repo via git subtree push.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function getSubtreeCommands() {
  const pluginsDir = join(ROOT, 'plugins');
  const dirs = readdirSync(pluginsDir).filter(d =>
    statSync(join(pluginsDir, d)).isDirectory()
  );

  return dirs.map(dir => {
    const pjPath = join(pluginsDir, dir, '.claude-plugin', 'plugin.json');
    const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
    return {
      plugin: dir,
      prefix: `plugins/${dir}`,
      repo: `filenamedotexe/${pj.name}`,
      command: `git subtree push --prefix=plugins/${dir} git@github.com:filenamedotexe/${pj.name}.git main`
    };
  });
}

async function main() {
  const commands = getSubtreeCommands();
  console.log(`Publishing ${commands.length} plugins...\n`);

  for (const cmd of commands) {
    console.log(`→ Publishing ${cmd.plugin} to ${cmd.repo}...`);
    try {
      await exec(cmd.command, { cwd: ROOT });
      console.log(`  ✓ ${cmd.plugin} published`);
    } catch (err) {
      console.error(`  ✗ ${cmd.plugin} failed: ${err.message}`);
    }
  }

  console.log('\n● ahh, that felt good didn\'t it?');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/publish-plugins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/publish-plugins.js tests/publish-plugins.test.js
git commit -m "feat: add publish-plugins.js for git subtree publishing"
```

---

### Task 10: Create GitHub Repos

**Step 1: Create 22 public repos (core already exists as armadillo)**

```bash
# Create repos for all non-core plugins
for plugin in frontend google-apis backend database orm auth deploy forms state monitoring cms email storage ai tooling fresh-project mobile payments video brand web-migration creative; do
  env -u GITHUB_TOKEN gh repo create "filenamedotexe/armadillo-${plugin}" --public --description "armadillo ${plugin} skill pack" || true
done
```

Note: armadillo-core may need special handling — the existing `filenamedotexe/armadillo` repo could be renamed or a new `armadillo-core` repo created.

**Step 2: Verify repos exist**

```bash
env -u GITHUB_TOKEN gh repo list filenamedotexe --limit 30 | grep armadillo
```

**Step 3: Commit (no code changes, but document)**

No commit needed — repos are external infrastructure.

---

### Task 11: CI/CD Workflow for Publishing

**Files:**
- Create: `.github/workflows/publish-plugins.yml`

**Step 1: Create the workflow**

```yaml
# .github/workflows/publish-plugins.yml
name: Publish Plugins

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for subtree

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Publish all plugins
        run: node scripts/publish-plugins.js
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Commit**

```bash
git add .github/workflows/publish-plugins.yml
git commit -m "ci: add publish-plugins workflow on tag push"
```

---

## Phase 3: Skill & Documentation Updates

### Task 12: Update Onboarding Skill for Multi-Plugin

**Files:**
- Modify: `plugins/core/skills/onboarding/SKILL.md`

**Step 1: Update the onboarding skill**

Key changes to the skill:
1. Replace bundle selection from skills.json with plugin selection
2. Write `enabledPlugins` entries per selected plugin to settings.json
3. Each selected plugin gets its own marketplace entry
4. Update manifest format to include `installedPlugins` array

The full onboarding SKILL.md is long — the key sections to change:

- **Phase 2 (Bundle Selection):** Replace "read skills.json bundles" with "present 22 optional skill packs as checkboxes, each maps to an armadillo plugin"
- **Settings.json writing:** Write `extraKnownMarketplaces` and `enabledPlugins` per plugin (use the format from the design doc)
- **Manifest format:** Add `installedPlugins: ["core", ...]` field, change `installType: "plugin"`

**Step 2: Commit**

```bash
git add plugins/core/skills/onboarding/SKILL.md
git commit -m "feat(onboarding): multi-plugin selection flow"
```

---

### Task 13: Update Updating-Armadillo Skill for Multi-Plugin Migration

**Files:**
- Modify: `plugins/core/skills/updating-armadillo/SKILL.md`

**Step 1: Update the skill**

Key changes:
1. **Step 2.6 migration** detects three install types:
   - `legacy-file-copy` → map bundles to plugins, register in settings.json
   - `plugin` (single monolith) → detect, offer to enable all skill packs
   - `multi-plugin` → already on multi-plugin, just check versions
2. **Update flow** iterates installed plugins, checks each version
3. **Bundle mapping table** embedded in the skill for migration
4. **Add/remove plugins** section for post-install management

**Step 2: Commit**

```bash
git add plugins/core/skills/updating-armadillo/SKILL.md
git commit -m "feat(updating-armadillo): multi-plugin migration + version checking"
```

---

### Task 14: Update skills.json File Paths

**Files:**
- Modify: `skills.json`

**Step 1: Update all file paths in skills.json**

Skills now live under `plugins/*/skills/` but `skills.json` references paths relative to `.claude/`. Since `.claude/skills/` symlinks resolve through to `plugins/*/skills/`, the existing paths like `skills/brainstorming/SKILL.md` still work.

However, update `sharedFiles` to reflect new locations:

```json
{
  "sharedFiles": {
    "hooks": [
      "hooks/hooks.json",
      "hooks/enforce-skills.sh",
      "hooks/inject-skill-awareness.sh",
      "hooks/pre-compact.sh",
      "hooks/session-start.sh",
      "hooks/stop-verify.sh",
      "hooks/post-push-pr-check.sh",
      "hooks/task-completed.sh",
      "hooks/subagent-start.sh",
      "hooks/async-lint.sh",
      "hooks/lib/json-escape.sh"
    ],
    "rules": [
      "rules/coding-standards.md",
      "rules/git-workflow.md",
      "rules/output-style.md",
      "rules/pr-format.md",
      "rules/project-context.md"
    ]
  }
}
```

These paths still work via symlinks. No change needed unless symlink resolution fails.

**Step 2: Run tests**

Run: `node --test tests/skills-json-schema.test.js tests/shared-files.test.js`
Expected: PASS — symlinks resolve

**Step 3: Commit (if changes needed)**

```bash
git add skills.json
git commit -m "chore: verify skills.json paths resolve through symlinks"
```

---

### Task 15: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Key sections to update:
1. **Installation** — explain multi-plugin: install core first, then pick skill packs
2. **Plugin ecosystem table** — list all 23 plugins with skill counts and descriptions
3. **What Happens During Update** — reference multi-plugin update flow
4. **User Project Directory** — show updated structure (plugins load automatically)

**Step 2: Run update-readme.js**

```bash
node scripts/update-readme.js
```

**Step 3: Run README tests**

Run: `node --test tests/readme-content.test.js`
Expected: PASS

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README for multi-plugin architecture"
```

---

### Task 16: Update CLAUDE.md Template

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: Update the CLAUDE.md**

The skills table in CLAUDE.md is auto-generated and lists all skills. After multi-plugin, the template needs to note which plugins provide which skills. The CLAUDE.md is the template shipped in the core plugin.

Add a "Plugin Ecosystem" section explaining the modular structure.

**Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md template for multi-plugin"
```

---

## Phase 4: Testing & Validation

### Task 17: Plugin Structure Validation Test (TDD)

**Files:**
- Create: `tests/multi-plugin-structure.test.js`

**Step 1: Write the test**

```js
// tests/multi-plugin-structure.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync, lstatSync, readlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));

describe('multi-plugin structure', () => {
  test('only core has agents/ directory', () => {
    const pluginsDir = join(ROOT, 'plugins');
    const dirs = readdirSync(pluginsDir).filter(d =>
      statSync(join(pluginsDir, d)).isDirectory()
    );
    for (const dir of dirs) {
      const agentsDir = join(pluginsDir, dir, 'agents');
      if (dir === 'core') {
        assert.ok(existsSync(agentsDir), 'core should have agents/');
      } else {
        assert.ok(!existsSync(agentsDir) || readdirSync(agentsDir).length === 0,
          `plugins/${dir} should NOT have agents/`);
      }
    }
  });

  test('only core has hooks/ directory', () => {
    const pluginsDir = join(ROOT, 'plugins');
    const dirs = readdirSync(pluginsDir).filter(d =>
      statSync(join(pluginsDir, d)).isDirectory()
    );
    for (const dir of dirs) {
      const hooksDir = join(pluginsDir, dir, 'hooks');
      if (dir === 'core') {
        assert.ok(existsSync(hooksDir), 'core should have hooks/');
      } else {
        assert.ok(!existsSync(hooksDir) || readdirSync(hooksDir).length === 0,
          `plugins/${dir} should NOT have hooks/`);
      }
    }
  });

  test('only core has rules/ directory', () => {
    const pluginsDir = join(ROOT, 'plugins');
    const dirs = readdirSync(pluginsDir).filter(d =>
      statSync(join(pluginsDir, d)).isDirectory()
    );
    for (const dir of dirs) {
      const rulesDir = join(pluginsDir, dir, 'rules');
      if (dir === 'core') {
        assert.ok(existsSync(rulesDir), 'core should have rules/');
      } else {
        assert.ok(!existsSync(rulesDir) || readdirSync(rulesDir).length === 0,
          `plugins/${dir} should NOT have rules/`);
      }
    }
  });

  test('all 82 skills are reachable via root skills/ symlinks', () => {
    const allSkills = Object.keys(skillsJson.skills);
    for (const skill of allSkills) {
      const skillPath = join(ROOT, 'skills', skill, 'SKILL.md');
      assert.ok(existsSync(skillPath), `skills/${skill}/SKILL.md should be reachable`);
    }
  });

  test('synchronized versions across all plugins', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const pluginsDir = join(ROOT, 'plugins');
    const dirs = readdirSync(pluginsDir).filter(d =>
      statSync(join(pluginsDir, d)).isDirectory()
    );
    for (const dir of dirs) {
      const pj = JSON.parse(readFileSync(
        join(pluginsDir, dir, '.claude-plugin', 'plugin.json'), 'utf8'
      ));
      assert.equal(pj.version, pkg.version, `plugins/${dir} version mismatch`);
    }
  });
});
```

**Step 2: Run test**

Run: `node --test tests/multi-plugin-structure.test.js`
Expected: PASS (if prior tasks completed correctly)

**Step 3: Commit**

```bash
git add tests/multi-plugin-structure.test.js
git commit -m "test: add multi-plugin structure validation"
```

---

### Task 18: Bundle-to-Plugin Mapping Test (TDD)

**Files:**
- Add to: `tests/build-plugins.test.js`

**Step 1: Write the test**

```js
describe('build-plugins — bundle mapping completeness', () => {
  test('every skill in skills.json maps to a plugin directory that exists', () => {
    const map = getBundlePluginMap(skillsJson);
    for (const [skillName, skill] of Object.entries(skillsJson.skills)) {
      const bundleInfo = map[skill.bundle];
      assert.ok(bundleInfo, `skill ${skillName} has bundle ${skill.bundle} which should exist`);
      const skillDir = join(ROOT, 'plugins', bundleInfo.dirName, 'skills', skillName);
      assert.ok(existsSync(skillDir), `${skillDir} should exist for skill ${skillName}`);
    }
  });

  test('frontend-dev bundle maps to frontend plugin directory', () => {
    const map = getBundlePluginMap(skillsJson);
    assert.equal(map['frontend-dev'].dirName, 'frontend');
    assert.ok(existsSync(join(ROOT, 'plugins', 'frontend', 'skills', 'tailwind-css')));
  });
});
```

**Step 2: Run test**

Run: `node --test tests/build-plugins.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/build-plugins.test.js
git commit -m "test: validate bundle-to-plugin mapping completeness"
```

---

### Task 19: Full Test Suite Pass

**Step 1: Run everything**

Run: `node --test tests/*.test.js`
Expected: ALL PASS (578+ original tests + new tests)

**Step 2: Fix any remaining failures**

Common issues:
- Tests that use `lstatSync` to check for symlinks vs real directories
- Tests that count files and don't account for `.claude-plugin/` directories in plugins
- Path resolution differences

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve all test failures for multi-plugin structure"
```

---

## Phase 5: Release v0.19.0

### Task 20: Update settings.local.json for Development

**Files:**
- Modify: `.claude/settings.local.json`

**Step 1: Update for multi-plugin development**

The dogfooding setup needs to register all 23 plugins or keep the root monolith. Simplest: keep root `.claude-plugin/` as the dev monolith (all skills via symlinks). No settings.local.json changes needed.

Alternatively, generate multi-plugin settings.local.json with a helper script.

**Step 2: Verify skills load**

Restart Claude Code session. Run: `/brainstorming` to verify skills still load.

---

### Task 21: Pre-Release Validation

**Step 1: Run sync-all.js**

```bash
node scripts/sync-all.js
```
Expected: `✓ All systems in sync`

**Step 2: Run full test suite**

```bash
node --test tests/*.test.js
```
Expected: ALL PASS

**Step 3: Verify publish-plugins generates correct commands**

```bash
node -e "import('./scripts/publish-plugins.js').then(m => m.getSubtreeCommands().forEach(c => console.log(c.command)))"
```
Expected: 23 `git subtree push` commands with correct prefixes and repos

---

### Task 22: Release

**Step 1: Push to main**

```bash
env -u GITHUB_TOKEN git push origin main
```

Pre-push hook auto-bumps version (feat commits → minor bump → 0.19.0).

**Step 2: Publish all plugins**

```bash
node scripts/publish-plugins.js
```

**Step 3: Create GitHub releases**

```bash
VERSION=$(node -p "require('./package.json').version")
for plugin in core frontend google-apis backend database orm auth deploy forms state monitoring cms email storage ai tooling fresh-project mobile payments video brand web-migration creative; do
  env -u GITHUB_TOKEN gh release create "v${VERSION}" \
    --repo "filenamedotexe/armadillo-${plugin}" \
    --title "v${VERSION}" \
    --notes "Release v${VERSION} — see [changelog](https://github.com/filenamedotexe/armadillo-cli/blob/main/CHANGELOG.json)" || true
done
```

**Step 4: Verify installation**

In a test project, install armadillo-core:
1. Add to `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "armadillo-core": {
      "source": { "source": "github", "repo": "filenamedotexe/armadillo-core" }
    }
  },
  "enabledPlugins": {
    "armadillo-core@armadillo-core": true
  }
}
```
2. Restart Claude Code
3. Verify core skills load
4. Run `/onboarding` to test plugin selection flow

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1. Restructure | 1-8 | Files in `plugins/*/`, symlinks for dev, scripts updated |
| 2. Publishing | 9-11 | publish-plugins.js, GitHub repos, CI/CD |
| 3. Skills & Docs | 12-16 | Onboarding, updating, README, CLAUDE.md updated |
| 4. Testing | 17-19 | Structure validation, mapping tests, full suite green |
| 5. Release | 20-22 | v0.19.0 published across 23 repos |

**22 tasks total · ~3 hours estimated execution time**
