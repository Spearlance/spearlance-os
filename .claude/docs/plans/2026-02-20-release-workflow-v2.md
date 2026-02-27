# Release Workflow v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add branch protection, bypassPermissions UX (prompt + session nudge), and CI version-bump so PR-based workflow keeps everything in sync.

**Architecture:** Pre-commit hook blocks main commits locally. publish.yml gains version-bump + sync steps so PR merges auto-version. session-start.sh nudges users to bypassPermissions mode. Onboarding and updating skills add a bypass prompt.

**Tech Stack:** bash (hooks), Node.js (scripts), GitHub Actions (CI), markdown (skills)

**Key discovery:** `publish.yml` already creates GitHub releases (lines 43-49). No new release workflow needed. But it doesn't run version-bump.js, so PR-based merges don't auto-version. Also: `ci.yml` uses `feature/**` but branch naming convention uses `feat/` — broken pattern.

---

### Task 1: Pre-commit branch protection hook

**Files:**
- Create: `.githooks/pre-commit`
- Create: `tests/pre-commit-hook.test.js`

**Step 1: Write the failing test**

```js
// tests/pre-commit-hook.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('.githooks/pre-commit — branch protection', () => {
  const hookPath = join(ROOT, '.githooks', 'pre-commit');

  it('pre-commit hook file exists', () => {
    assert.ok(existsSync(hookPath), '.githooks/pre-commit must exist');
  });

  it('checks current branch name', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('git') && content.includes('branch'), 'must check git branch');
  });

  it('blocks commits on main', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('main'), 'must reference main branch');
  });

  it('blocks commits on master', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('master'), 'must reference master branch');
  });

  it('has ARMADILLO_ALLOW_MAIN escape hatch', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('ARMADILLO_ALLOW_MAIN'), 'must have escape hatch env var');
  });

  it('exits non-zero when blocked', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.includes('exit 1'), 'must exit 1 to block commit');
  });

  it('has shebang', () => {
    const content = readFileSync(hookPath, 'utf8');
    assert.ok(content.startsWith('#!/'), 'must have shebang line');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/pre-commit-hook.test.js`
Expected: FAIL — file doesn't exist yet

**Step 3: Write the pre-commit hook**

```bash
#!/bin/bash
#
# Pre-commit hook: Block commits directly to main/master
# Escape hatch: ARMADILLO_ALLOW_MAIN=1 git commit ...
#
# Used by version-bump.js for release commits.
#

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  if [ "${ARMADILLO_ALLOW_MAIN:-0}" = "1" ]; then
    exit 0
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✗ Direct commits to $BRANCH are blocked."
  echo ""
  echo "  Create a branch first:"
  echo "    git checkout -b feat/your-feature"
  echo ""
  echo "  Emergency override (version-bump only):"
  echo "    ARMADILLO_ALLOW_MAIN=1 git commit ..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

exit 0
```

Make executable: `chmod +x .githooks/pre-commit`

**Step 4: Run test to verify it passes**

Run: `node --test tests/pre-commit-hook.test.js`
Expected: PASS — all 7 assertions

**Step 5: Commit**

```bash
git add .githooks/pre-commit tests/pre-commit-hook.test.js
git commit -m "feat: add pre-commit hook blocking direct main commits"
```

---

### Task 2: Update version-bump.js with escape hatch

**Files:**
- Modify: `scripts/version-bump.js:171-179` (the git commit exec call)
- Modify: `tests/version-bump.test.js` (add escape hatch test)

**Step 1: Write the failing test**

Add to `tests/version-bump.test.js`:

```js
describe('version-bump.js escape hatch', () => {
  test('git commit call sets ARMADILLO_ALLOW_MAIN env', () => {
    const script = readFileSync(join(__dirname, '..', 'scripts', 'version-bump.js'), 'utf8');
    assert.ok(
      script.includes('ARMADILLO_ALLOW_MAIN'),
      'version-bump.js must set ARMADILLO_ALLOW_MAIN for its git commit call'
    );
  });
});
```

Add required imports at top if not present:
```js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/version-bump.test.js`
Expected: FAIL — ARMADILLO_ALLOW_MAIN not in source yet

**Step 3: Update version-bump.js**

In `scripts/version-bump.js`, change the git commit exec call (around line 173) from:

```js
  await exec(`git commit -m "$(cat <<'EOF'
chore: release ${newVersion}

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"`, { cwd: ROOT });
```

To:

```js
  await exec(`git commit -m "$(cat <<'EOF'
chore: release ${newVersion}

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"`, { cwd: ROOT, env: { ...process.env, ARMADILLO_ALLOW_MAIN: '1' } });
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/version-bump.test.js`
Expected: PASS — all tests including new escape hatch test

**Step 5: Commit**

```bash
git add scripts/version-bump.js tests/version-bump.test.js
git commit -m "feat: version-bump uses ARMADILLO_ALLOW_MAIN escape hatch for release commits"
```

---

### Task 3: CI version-bump in publish workflow

**Files:**
- Modify: `.github/workflows/publish.yml`
- Create: `tests/publish-workflow.test.js`

**Context:** When PRs merge to main on GitHub, the local pre-push hook doesn't fire. publish.yml needs to run version-bump + sync so everything stays in sync.

**Step 1: Write the failing test**

```js
// tests/publish-workflow.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('.github/workflows/publish.yml — version sync', () => {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'publish.yml'), 'utf8');

  it('runs version-bump.js before publishing', () => {
    assert.ok(workflow.includes('version-bump'), 'must run version-bump script');
  });

  it('runs sync-all.js before publishing', () => {
    assert.ok(workflow.includes('sync-all'), 'must run sync-all validation');
  });

  it('commits version changes with skip-ci', () => {
    assert.ok(
      workflow.includes('[skip ci]') || workflow.includes('[skip-ci]'),
      'version commit must include [skip ci] to prevent infinite loop'
    );
  });

  it('has fetch-depth 0 for commit analysis', () => {
    assert.ok(workflow.includes('fetch-depth: 0'), 'needs full history for version-bump commit analysis');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/publish-workflow.test.js`
Expected: FAIL — publish.yml doesn't have version-bump or sync-all

**Step 3: Update publish.yml**

Replace `.github/workflows/publish.yml` with:

```yaml
name: Publish to npm

on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - name: Version bump and sync
        run: |
          # Run version-bump (analyzes commits, bumps package.json, CHANGELOG, README, CLAUDE.md)
          node scripts/version-bump.js || true

          # Validate everything is in sync
          node scripts/sync-all.js

          # If version-bump created changes, commit them
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add -A
          if ! git diff --staged --quiet; then
            git commit -m "chore: release $(node -p \"require('./package.json').version\") [skip ci]

          Co-Authored-By: Claude <noreply@anthropic.com>"
            git push
            echo "VERSION_BUMPED=true" >> $GITHUB_ENV
          fi

      - name: Check if version needs publishing
        id: check
        run: |
          CURRENT=$(node -p "require('./package.json').version")
          PUBLISHED=$(npm view @filenamedotexe/armadillo version 2>/dev/null || echo "0.0.0")
          if [ "$CURRENT" != "$PUBLISHED" ]; then
            echo "needed=true" >> $GITHUB_OUTPUT
            echo "version=$CURRENT" >> $GITHUB_OUTPUT
          else
            echo "needed=false" >> $GITHUB_OUTPUT
          fi
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish
        if: steps.check.outputs.needed == 'true'
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub release
        if: steps.check.outputs.needed == 'true'
        run: |
          VERSION=${{ steps.check.outputs.version }}
          gh release create "v${VERSION}" --title "v${VERSION}" --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/publish-workflow.test.js`
Expected: PASS — all 4 assertions

**Step 5: Commit**

```bash
git add .github/workflows/publish.yml tests/publish-workflow.test.js
git commit -m "feat: CI runs version-bump and sync before publishing"
```

---

### Task 4: Fix CI branch patterns

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `tests/ci-branch-patterns.test.js`

**Context:** `ci.yml` triggers on `feature/**` but branch naming convention uses `feat/`. Also missing `docs/`, `test/`, `refactor/` patterns.

**Step 1: Write the failing test**

```js
// tests/ci-branch-patterns.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('.github/workflows/ci.yml — branch patterns', () => {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

  it('triggers on feat/ branches (not feature/)', () => {
    assert.ok(workflow.includes("'feat/**'"), 'must use feat/ not feature/');
  });

  it('triggers on fix/ branches', () => {
    assert.ok(workflow.includes("'fix/**'"), 'must include fix/ branches');
  });

  it('triggers on chore/ branches', () => {
    assert.ok(workflow.includes("'chore/**'"), 'must include chore/ branches');
  });

  it('triggers on docs/ branches', () => {
    assert.ok(workflow.includes("'docs/**'"), 'must include docs/ branches');
  });

  it('triggers on refactor/ branches', () => {
    assert.ok(workflow.includes("'refactor/**'"), 'must include refactor/ branches');
  });

  it('triggers on test/ branches', () => {
    assert.ok(workflow.includes("'test/**'"), 'must include test/ branches');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ci-branch-patterns.test.js`
Expected: FAIL — ci.yml has `feature/**` not `feat/**`, missing docs/refactor/test

**Step 3: Update ci.yml**

In `.github/workflows/ci.yml`, change the `branches` list from:

```yaml
    branches:
      - 'feature/**'
      - 'fix/**'
      - 'chore/**'
```

To:

```yaml
    branches:
      - 'feat/**'
      - 'fix/**'
      - 'chore/**'
      - 'docs/**'
      - 'refactor/**'
      - 'test/**'
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/ci-branch-patterns.test.js`
Expected: PASS — all 6 assertions

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml tests/ci-branch-patterns.test.js
git commit -m "fix: CI branch patterns match conventional commit prefixes"
```

---

### Task 5: Session-start bypass nudge

**Files:**
- Modify: `plugins/core/hooks/session-start.sh:112-120` (add inverse check)
- Modify: `tests/bypass-detection.test.js` (add nudge tests)

**Context:** session-start.sh already has bypass detection (warns when bypass IS active on lines 112-120). We need the inverse: nudge when bypass is NOT active. The nudge should appear every session until they toggle.

**Step 1: Write the failing test**

Add to `tests/bypass-detection.test.js`:

```js
describe('session-start.sh — bypass mode nudge', () => {
  it('nudges when NOT in bypassPermissions mode', () => {
    const hook = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      hook.includes('armadillo works best with bypassPermissions') ||
      hook.includes('bypass_nudge'),
      'must nudge users not on bypassPermissions'
    );
  });

  it('nudge references /updating-armadillo', () => {
    const hook = readFileSync(SCRIPT, 'utf8');
    assert.ok(
      hook.includes('updating-armadillo'),
      'nudge must point user to /updating-armadillo to toggle'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/bypass-detection.test.js`
Expected: FAIL — no nudge text in session-start.sh yet

**Step 3: Update session-start.sh**

In `plugins/core/hooks/session-start.sh`, find the bypass detection block (around line 112). After the existing `bypass_warning` block, add a `bypass_nudge` block:

```bash
# === BYPASS MODE NUDGE (when NOT on bypassPermissions) ===
bypass_nudge=""
if [ -f "$SETTINGS_FILE" ]; then
  NUDGE_MODE=$(jq -r '.permissions.defaultMode // ""' "$SETTINGS_FILE" 2>/dev/null || echo "")
  if [ "$NUDGE_MODE" != "bypassPermissions" ] && [ -n "$NUDGE_MODE" ]; then
    bypass_nudge="\\n\\n<bypass-nudge>💡 armadillo works best with bypassPermissions mode — say \\\"/updating-armadillo\\\" to toggle. deny-list still blocks catastrophic commands.</bypass-nudge>"
  fi
fi
```

Then add `${bypass_nudge}` to the `additionalContext` string in the JSON output (line 127), after `${bypass_warning}`.

**Important:** The `$SETTINGS_FILE` variable is already defined on line 114. The bypass nudge uses the same variable. It only fires when `defaultMode` exists but is NOT `bypassPermissions`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/bypass-detection.test.js`
Expected: PASS — all tests including new nudge tests

**Step 5: Commit**

```bash
git add plugins/core/hooks/session-start.sh tests/bypass-detection.test.js
git commit -m "feat: session-start nudges users to enable bypassPermissions"
```

---

### Task 6: bypassPermissions prompt in onboarding skill

**Files:**
- Modify: `plugins/core/skills/onboarding/SKILL.md`

**Context:** After Phase 2 writes settings.json (around the "Write settings.json" step), add a permission mode prompt. This is a skill doc edit — no tests needed (skill content is guidance for the AI, not executable code).

**Step 1: Edit onboarding SKILL.md**

Find the section in Phase 2 that says "3. **Write settings.json**" (around line 267). After the settings.json writing instruction, add a new step:

```markdown
4. **Permission mode selection** — armadillo works best with bypassPermissions. Ask the user:

   Use **AskUserQuestion** with these options:
   ```
   armadillo works best with bypassPermissions mode.

   What this means:
   ▪ Claude auto-approves all tool calls except the deny-list
   ▪ Faster iteration — no permission prompts for safe commands
   ▪ Deny-list still blocks catastrophic commands (rm -rf /, force push, etc.)

   ▸ Enable bypassPermissions?
   ```
   - **"Yes, enable it" (Recommended)** — set `defaultMode` to `"bypassPermissions"` in settings.json
   - **"No, keep acceptEdits"** — leave as-is; session-start will nudge each session

   If yes → use **Edit** tool to change `"defaultMode": "acceptEdits"` to `"defaultMode": "bypassPermissions"` in the project's `.claude/settings.json`.
```

Also renumber the subsequent steps (current step 4 "Knowledge base" becomes step 5).

**Step 2: Commit**

```bash
git add plugins/core/skills/onboarding/SKILL.md
git commit -m "feat: onboarding prompts users to enable bypassPermissions"
```

---

### Task 7: bypassPermissions prompt in updating-armadillo skill

**Files:**
- Modify: `plugins/core/skills/updating-armadillo/SKILL.md`
- Modify: `tests/bypass-detection.test.js` (update existing test)

**Context:** The updating-armadillo skill should offer the bypass toggle during migration steps and as a general option. Currently it says `acceptEdits` is the default (line 863). Also need to add a bypass toggle to the Step 8 (add/remove plugins) section or as a new standalone step.

**Step 1: Write the failing test**

Update the existing test in `tests/bypass-detection.test.js`:

Change the test `'references acceptEdits as default'` to also verify bypass recommendation:

```js
  it('recommends bypassPermissions during updates', () => {
    const content = readFileSync(
      join(ROOT, '.claude', 'skills', 'updating-armadillo', 'SKILL.md'), 'utf8'
    );
    assert.ok(
      content.includes('bypassPermissions') && content.includes('Recommended'),
      'must recommend bypassPermissions mode'
    );
  });
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/bypass-detection.test.js`
Expected: FAIL — updating-armadillo doesn't recommend bypass yet

**Step 3: Update updating-armadillo SKILL.md**

Add a new Step 8.5 (between Step 8 and Step 9) or integrate into the health check:

Find the "## Step 6: Health Check (Doctor)" section. After check 8 ("Plugin registration"), add check 9:

```markdown
9. **Permission mode** — is the user on bypassPermissions? If not, offer to toggle:

   ```
   ℹ  Permission mode: acceptEdits

   armadillo works best with bypassPermissions mode.
   ▪ Faster iteration — no permission prompts for safe commands
   ▪ Deny-list still blocks catastrophic commands

   ▸ Enable bypassPermissions? (Recommended)
   ```

   Use **AskUserQuestion**:
   - **"Yes, enable it" (Recommended)** — Edit settings.json `defaultMode` to `"bypassPermissions"`
   - **"No, keep current mode"** — skip; session-start will continue nudging
```

Also update Key Rule 13 from:
```
13. **acceptEdits is the default** — the installed settings.json ships with acceptEdits + allow-list...
```
To:
```
13. **bypassPermissions is recommended** — onboarding asks users to opt in; session-start nudges if they decline; health check offers toggle. acceptEdits remains the shipped default so users explicitly consent.
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/bypass-detection.test.js`
Expected: PASS — all tests

**Step 5: Commit**

```bash
git add plugins/core/skills/updating-armadillo/SKILL.md tests/bypass-detection.test.js
git commit -m "feat: updating-armadillo recommends bypassPermissions during health check"
```

---

### Task 8: Update build-claude-md.js permissions section

**Files:**
- Modify: `scripts/build-claude-md.js:179-195` (the `buildPermissionsSection` function)
- Modify: `tests/build-claude-md.test.js` (add test for bypass recommendation)

**Step 1: Write the failing test**

Add to `tests/build-claude-md.test.js`:

```js
describe('buildPermissionsSection — bypass recommendation', () => {
  it('recommends bypassPermissions in the generated section', () => {
    // Import the generator and check the output
    const { generateClaudeMd } = await import('../scripts/build-claude-md.js');
    // Minimal skills.json and marketplace.json for testing
    const skillsJson = { skills: {}, bundles: { core: { skills: [] } }, sharedFiles: { rules: [] } };
    const marketplaceJson = { plugins: [] };
    const output = generateClaudeMd(skillsJson, marketplaceJson);
    assert.ok(
      output.includes('Recommended') && output.includes('bypassPermissions'),
      'must recommend bypassPermissions'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-claude-md.test.js`
Expected: FAIL — current text says `acceptEdits` default without bypass recommendation

**Step 3: Update buildPermissionsSection in build-claude-md.js**

Replace the `buildPermissionsSection` function (lines 179-195) with:

```js
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
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-claude-md.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build-claude-md.js tests/build-claude-md.test.js
git commit -m "feat: CLAUDE.md permissions section recommends bypassPermissions"
```

---

### Task 9: Run full test suite and verify

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (existing + new)

**Step 2: Run sync validation**

Run: `node scripts/sync-all.js`
Expected: All systems in sync

**Step 3: Verify pre-commit hook is installed**

Run: `node scripts/install-hooks.js`
Expected: `✓ Installed pre-commit` and `✓ Installed pre-push`

**Step 4: Final commit if any fixups needed**

```bash
git add -A
git commit -m "chore: fixups from full test suite validation"
```

(Only if there are changes to commit.)
