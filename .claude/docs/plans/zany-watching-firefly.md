# Plugin Distribution + Auto-Sync Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Finalize armadillo's distribution as a GitHub plugin marketplace, auto-generate all docs from skills.json, and enforce mandatory skill announcements across all 83 skills.

**Architecture:** Single source of truth (`skills.json`) drives generation of README, CLAUDE.md, and plugin manifests via `<!-- BEGIN:X -->` marker-based templating. Hooks fire via `.claude/settings.json` using `$CLAUDE_PROJECT_DIR/hooks/` paths (standalone format). Local dev uses `claude --plugin-dir .`.

**Tech Stack:** Node.js scripts, bash hooks, Claude Code plugin system

---

## What's Already Done (verified — do NOT redo)

- `.claude/settings.local.json` — broken `enabledPlugins`/`extraKnownMarketplaces` already removed
- `.claude/settings.json` — hooks already defined with `$CLAUDE_PROJECT_DIR/hooks/` paths (9 event types)
- `scripts/build-claude-md.js` — exists, generates CLAUDE.md from skills.json + marketplace.json
- `scripts/version-bump.js` — already calls `build-claude-md.js` and stages `.claude/CLAUDE.md`
- `scripts/sync-all.js` — already has `validateSettingsHooks()` and CLAUDE.md marker validation
- `tests/settings-hooks.test.js`, `tests/sync-all-hooks.test.js`, `tests/build-claude-md.test.js` — all pass
- All 641 tests pass
- 10 core skills have `**Mandatory Announcement**` pattern (brainstorming, writing-plans, executing-plans, onboarding, updating-armadillo, writing-prs, finishing-a-development-branch, using-git-worktrees, subagent-driven-development, test-driven-development)
- 2 fresh-project skills have `**Announce at start:**` pattern

---

## Remaining Tasks

### Task 1: Write skill announcement audit test (RED)

**Files:**
- Create: `tests/skill-announcement.test.js`

**Step 1: Write the failing test**

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));

describe('all SKILL.md files have mandatory announcement', () => {
  for (const [name, skill] of Object.entries(skillsJson.skills)) {
    const skillMd = skill.files?.find(f => f.endsWith('SKILL.md'));
    if (!skillMd) continue;

    test(`${name} has announcement directive`, () => {
      // Try both the symlink path and plugin path
      const symlinkPath = join(ROOT, 'skills', name, 'SKILL.md');
      const pluginPath = join(ROOT, 'plugins', skill.bundle || 'core', 'skills', name, 'SKILL.md');
      const filePath = existsSync(symlinkPath) ? symlinkPath : pluginPath;

      assert.ok(existsSync(filePath), `${name}/SKILL.md must exist at ${filePath}`);
      const content = readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('Mandatory Announcement') || content.includes('Announce at start'),
        `${name}/SKILL.md missing announcement directive`
      );
    });
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/skill-announcement.test.js 2>&1 | tail -20`
Expected: FAIL — ~71 skills missing announcement

**Step 3: Commit (RED)**

```bash
git add tests/skill-announcement.test.js
git commit -m "test: audit all SKILL.md files for mandatory announcement directive"
```

---

### Task 2: Add announcements to 13 missing core skills (GREEN — core)

**Files:**
- Modify: `plugins/core/skills/systematic-debugging/SKILL.md`
- Modify: `plugins/core/skills/verification-before-completion/SKILL.md`
- Modify: `plugins/core/skills/dispatching-parallel-agents/SKILL.md`
- Modify: `plugins/core/skills/requesting-code-review/SKILL.md`
- Modify: `plugins/core/skills/receiving-code-review/SKILL.md`
- Modify: `plugins/core/skills/writing-skills/SKILL.md`
- Modify: `plugins/core/skills/writing-reference-skills/SKILL.md`
- Modify: `plugins/core/skills/armadillo-shepherd/SKILL.md`
- Modify: `plugins/core/skills/playwright/SKILL.md`
- Modify: `plugins/core/skills/puppeteer/SKILL.md`
- Modify: `plugins/core/skills/cypress/SKILL.md`
- Modify: `plugins/core/skills/vitest/SKILL.md`
- Modify: `plugins/core/skills/claude-code-plugins/SKILL.md`

**Step 1: Add announcement to each skill**

For each skill, add after the `## Overview` line (or after the first paragraph if no Overview):

```markdown
**Mandatory Announcement — FIRST OUTPUT before anything else:**

"I'm using the [skill-name] skill to [action]."
```

Specific wording per skill:
- `systematic-debugging`: "...to trace the root cause of this issue."
- `verification-before-completion`: "...to verify this work before claiming done."
- `dispatching-parallel-agents`: "...to run these tasks concurrently."
- `requesting-code-review`: "...to request a code review."
- `receiving-code-review`: "...to process this code review feedback."
- `writing-skills`: "...to create this new skill."
- `writing-reference-skills`: "...to create this reference skill."
- `armadillo-shepherd`: "...to route this request to the correct skill."
- `playwright`: "...for Playwright testing reference."
- `puppeteer`: "...for Puppeteer automation reference."
- `cypress`: "...for Cypress testing reference."
- `vitest`: "...for Vitest testing reference."
- `claude-code-plugins`: "...for Claude Code plugins reference."

**Step 2: Run core skill tests**

Run: `node --test tests/skill-announcement.test.js 2>&1 | grep -E "core|✔|✗" | head -20`
Expected: All 23 core skills pass

**Step 3: Commit**

```bash
git add plugins/core/skills/*/SKILL.md
git commit -m "feat(skills): add mandatory announcement to all core skills"
```

---

### Task 3: Add announcements to ~60 non-core skills (GREEN — all)

**Files:**
- Modify: All SKILL.md files in `plugins/*/skills/*/SKILL.md` (except core, already done)

**Step 1: Add announcement to each non-core skill**

Standard pattern for reference/domain skills:

```markdown
**Mandatory Announcement — FIRST OUTPUT before anything else:**

"I'm using the [skill-name] skill for [tool/framework] reference."
```

Plugins to process (60 skills across 22 plugins):
- `frontend` (10): tailwind-css, shadcn-ui, nextjs, astro, framer-motion, gsap, responsive-design, accessibility, react-vite, sveltekit
- `google-apis` (7): ga4-api, google-ads-api, google-search-console-api, google-business-profile-api, google-places-api, lighthouse-api, youtube-data-api
- `backend` (4): hono, express, trpc, rest-api-patterns
- `database` (4): supabase, mongodb, redis-upstash, neon
- `orm` (2): drizzle, prisma
- `auth` (3): authjs, clerk, supabase-auth
- `deploy` (4): vercel, cloudflare-pages-workers, docker, github-actions
- `forms` (2): react-hook-form, zod
- `state` (2): zustand, tanstack-query
- `monitoring` (2): sentry, posthog
- `cms` (2): sanity, payload
- `email` (2): resend, react-email
- `storage` (2): uploadthing, s3-cloudflare-r2
- `ai` (2): vercel-ai-sdk, anthropic-api
- `tooling` (2): eslint-prettier, turborepo
- `fresh-project` (1): stack-recommender (scaffold and fresh-project already have it)
- `mobile` (1): expo-react-native
- `payments` (1): stripe-api
- `video` (1): remotion
- `brand` (2): brand-knowledge-builder, deepgram-transcription
- `web-migration` (1): duda-to-astro-migration
- `creative` (1): ascii-art

**Step 2: Run full announcement test**

Run: `node --test tests/skill-announcement.test.js`
Expected: All 83 skills pass

**Step 3: Commit**

```bash
git add plugins/*/skills/*/SKILL.md
git commit -m "feat(skills): add mandatory announcement to all non-core skills"
```

---

### Task 4: Auto-generate README plugin ecosystem table

**Files:**
- Modify: `README.md` — wrap plugin table with markers
- Modify: `scripts/update-readme.js` — add plugin table generation

**Step 1: Write failing test**

Add to `tests/readme-content.test.js`:

```javascript
test('plugin ecosystem table has correct skill counts from skills.json', () => {
  const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const coreCount = skillsJson.bundles.core.skills.length;
  assert.ok(
    readme.includes(`armadillo-core | ${coreCount} |`),
    `README plugin table should show armadillo-core with ${coreCount} skills`
  );
});
```

**Step 2: Run test — verify FAIL**

Run: `node --test tests/readme-content.test.js`

**Step 3: Wrap README plugin table with markers**

Find the existing plugin table in README.md and wrap it:

```markdown
<!-- BEGIN:plugin-table -->
| Plugin | Skills | Focus |
|--------|--------|-------|
...
<!-- END:plugin-table -->
```

**Step 4: Add generation to `update-readme.js`**

```javascript
import { getBundlePluginMap } from './build-plugins.js';

// Build plugin ecosystem table
const pluginMap = getBundlePluginMap(skillsJson);
const pluginTable = [
  '| Plugin | Skills | Focus |',
  '|--------|--------|-------|',
  ...Object.entries(pluginMap).map(([bundleName, info]) => {
    return `| ${info.packageName} | ${info.skills.length} | ${info.description} |`;
  })
].join('\n');

readme = replaceBetweenMarkers(readme, 'plugin-table', `\n${pluginTable}\n`);
```

**Step 5: Run tests — verify PASS**

Run: `node --test tests/readme-content.test.js`

**Step 6: Commit**

```bash
git add README.md scripts/update-readme.js tests/readme-content.test.js
git commit -m "feat(readme): auto-generate plugin ecosystem table from skills.json"
```

---

### Task 5: Create DEVELOPMENT.md

**Files:**
- Create: `DEVELOPMENT.md`

**Step 1: Write the doc**

```markdown
# Developing armadillo

## Local Development

When working on armadillo itself, use `--plugin-dir` to load hooks, skills, agents, and rules from your local checkout:

```bash
claude --plugin-dir .
```

This loads `plugins/core` directly from your working tree. All hooks fire using `${CLAUDE_PLUGIN_ROOT}` paths. No plugin registration needed.

### Alternative: Settings-Based Hooks

The project's `.claude/settings.json` also has hooks defined using `$CLAUDE_PROJECT_DIR/hooks/` paths. These fire without `--plugin-dir` as long as the `hooks/` symlink resolves correctly (→ `plugins/core/hooks/`).

### What NOT to Do

Do NOT add `enabledPlugins` or `extraKnownMarketplaces` to `.claude/settings.local.json`. The `"source": "directory"` type does not exist in Claude Code. Use `--plugin-dir` for local dev instead.

## Running Tests

```bash
npm test
```

641 tests across 36 test files. Uses Node's built-in test runner (`node:test`).

## Pre-Push Hook

The `.githooks/pre-push` hook runs automatically on `git push`:

1. Detects version bump type from conventional commits
2. Bumps `package.json` version
3. Updates `CHANGELOG.json`
4. Regenerates `README.md` (4 auto-generated sections from skills.json)
5. Regenerates `.claude/CLAUDE.md` (full skill/plugin listing from skills.json)
6. Syncs all 23 plugin manifests to matching version
7. Validates hooks, CLAUDE.md markers, and README
8. Creates release commit and pushes

## Auto-Generated Files

These files are generated from `skills.json` as the single source of truth:

| File | Generator | Sections |
|------|-----------|----------|
| `README.md` | `scripts/update-readme.js` | core-skills-count, core-skills-table, rules-count, rules-table, plugin-table |
| `.claude/CLAUDE.md` | `scripts/build-claude-md.js` | Everything between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` |
| `plugins/*/.claude-plugin/plugin.json` | `scripts/build-plugins.js` | Scaffolded from bundles |
| `plugins/*/.claude-plugin/marketplace.json` | `scripts/build-plugins.js` | Scaffolded from bundles |

**Never hand-edit the auto-generated sections.** Edit `skills.json` instead, then run the generator or push (pre-push hook runs them all).

## Adding a New Skill

1. Add the skill to the correct plugin: `plugins/<bundle>/skills/<name>/SKILL.md`
2. Register in `skills.json` under `bundles.<bundle>.skills` and `skills.<name>`
3. Create symlink: `ln -s ../plugins/<bundle>/skills/<name> skills/<name>`
4. Add `**Mandatory Announcement**` pattern to the SKILL.md
5. Run `npm test` to verify
6. Push — pre-push hook updates README, CLAUDE.md, and manifests automatically

## Plugin Structure

```
plugins/
  core/                    # Always installed
    .claude-plugin/        # Plugin manifest
    skills/                # 23 workflow/meta skills
    agents/                # 14 agent definitions
    hooks/                 # 16 hook scripts + hooks.json
    rules/                 # 5 rule files
  frontend/                # Optional skill pack
    .claude-plugin/        # Plugin manifest
    skills/                # 10 frontend skills
  ...                      # 22 more optional skill packs
```

## Distribution

Users install via `npx armadillo init` or manually:

```json
// .claude/settings.json
{
  "extraKnownMarketplaces": {
    "armadillo": {
      "source": { "source": "github", "repo": "filenamedotexe/armadillo" }
    }
  },
  "enabledPlugins": {
    "armadillo-core@armadillo": true,
    "armadillo-frontend@armadillo": true
  }
}
```
```

**Step 2: Commit**

```bash
git add DEVELOPMENT.md
git commit -m "docs: add DEVELOPMENT.md with local dev and contribution guide"
```

---

### Task 6: Verify hooks fire end-to-end

**Files:** None (verification only)

**Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass (641+)

**Step 2: Run sync-all validation**

```bash
node scripts/sync-all.js
```
Expected: All validations pass (hooks, CLAUDE.md, settings.json hooks, manifests)

**Step 3: Verify hook scripts are executable**

```bash
ls -la hooks/*.sh | head -20
```
Expected: All scripts have execute permission

**Step 4: Test a hook script directly**

```bash
echo '{}' | bash hooks/inject-skill-awareness.sh
```
Expected: Valid JSON output with `hookSpecificOutput.additionalContext`

**Step 5: Commit if any fixes needed, otherwise done**

---

## Verification

After all tasks complete:

1. `npm test` — all tests pass including new `skill-announcement.test.js`
2. `node scripts/sync-all.js` — all validations green
3. `node scripts/build-claude-md.js --dry-run | head -5` — generates valid CLAUDE.md
4. `node scripts/update-readme.js` — generates valid README with plugin table
5. Every SKILL.md has `Mandatory Announcement` or `Announce at start`
6. `DEVELOPMENT.md` documents `--plugin-dir .` workflow
7. README plugin table shows correct skill counts from skills.json
8. `.claude/settings.json` hooks use `$CLAUDE_PROJECT_DIR/hooks/` paths
9. `.claude/settings.local.json` has NO plugin registration
