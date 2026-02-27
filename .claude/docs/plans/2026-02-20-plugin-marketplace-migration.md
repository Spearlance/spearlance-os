# Plugin Marketplace Migration + Auto-Sync Docs

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Make armadillo work as a real Claude Code plugin — hooks fire, docs auto-generate from source-of-truth data, skill docs ship with enforcement, users get a clean install.

**Architecture:** GitHub plugin marketplace is the single distribution mechanism. All 23 plugins already have correct `.claude-plugin/plugin.json` manifests. `skills.json` is the source of truth — README.md and CLAUDE.md auto-generate from it on every push. Skill docs include mandatory enforcement language.

**Tech Stack:** Node.js scripts, bash hooks, Claude Code plugin system

---

### Task 1: Fix Local Dev Plugin Registration

**Files:**
- Modify: `.claude/settings.local.json`

**Step 1: Write the failing test**

Manual test — verify hooks don't fire currently:
```bash
echo '{"tool_input":{"subagent_type":"Explore"}}' | bash plugins/core/hooks/enforce-skills.sh
# Should exit 2 (blocks Explore)
```
This works in isolation but doesn't fire via Claude Code because the plugin isn't registered.

**Step 2: Fix `.claude/settings.local.json`**

Replace the broken `"source": "directory"` with valid GitHub source:

```json
{
  "permissions": {
    "allow": [
      "Bash(~/.zshrc)", "Bash(git commit:*)", "Bash(while read line)",
      "Bash(do echo \"$line\")", "Bash(done)", "Bash(find:*)",
      "Bash(python3:*)", "Bash(xargs ls -la)"
    ]
  },
  "enabledPlugins": {
    "armadillo-core@armadillo": true
  },
  "extraKnownMarketplaces": {
    "armadillo": {
      "source": { "source": "github", "repo": "filenamedotexe/armadillo" }
    }
  }
}
```

**Step 3: Verify**

Restart Claude Code. Check `/hooks` menu — should show armadillo hooks labeled `[Plugin]`.

**Step 4: Commit**

```bash
git add .claude/settings.local.json
git commit -m "fix: use github source for local plugin registration"
```

---

### Task 2: Create `scripts/build-claude-md.js`

Auto-generate CLAUDE.md from skills.json so it never drifts.

**Files:**
- Create: `scripts/build-claude-md.js`
- Modify: `.claude/CLAUDE.md` (becomes generated)

**Step 1: Write the failing test**

```javascript
// tests/build-claude-md.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateClaudeMd } from '../scripts/build-claude-md.js';

describe('build-claude-md.js', () => {
  it('generates skills list from skills.json', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('brainstorming'));
    assert.ok(output.includes('test-driven-development'));
  });

  it('includes plugin ecosystem table', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('armadillo-core'));
    assert.ok(output.includes('armadillo-frontend'));
  });

  it('includes rules table', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('coding-standards'));
    assert.ok(output.includes('git-workflow'));
  });

  it('includes model selection table', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('claude-opus-4-6'));
    assert.ok(output.includes('claude-sonnet-4-6'));
  });

  it('wraps in armadillo markers', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('<!-- armadillo:start -->'));
    assert.ok(output.includes('<!-- armadillo:end -->'));
  });

  it('preserves content below armadillo markers', () => {
    const output = generateClaudeMd();
    assert.ok(output.includes('<!-- Add your project-specific instructions below this line -->'));
  });

  it('skill count matches skills.json', () => {
    const skillsJson = JSON.parse(readFileSync('skills.json', 'utf8'));
    const coreCount = skillsJson.bundles.core.skills.length;
    const output = generateClaudeMd();
    assert.ok(output.includes(`${coreCount}`));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-claude-md.test.js`
Expected: FAIL — module not found

**Step 3: Write `scripts/build-claude-md.js`**

Reads `skills.json` and `marketplace.json`. Generates the full armadillo-managed section of CLAUDE.md between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` markers. Generates:

1. **Skills list** — organized by category (Workflow, Collaboration, Git, Testing, Frontend, Backend, etc.) from bundle data
2. **Plugin ecosystem table** — from marketplace.json plugins array with skill counts from skills.json
3. **Rules table** — from sharedFiles.rules with descriptions
4. **Model selection table** — hardcoded tiers (Opus/Sonnet/Haiku/Inherit) with skill assignments read from SKILL.md frontmatter
5. **Permissions section** — default mode, toggle instructions

When writing to disk:
- If CLAUDE.md exists and has content below `<!-- armadillo:end -->`, preserve it
- If CLAUDE.md doesn't exist, add the `<!-- Add your project-specific instructions below -->` footer

Export `generateClaudeMd()` for testing. CLI entrypoint writes to `.claude/CLAUDE.md`.

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-claude-md.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/build-claude-md.js tests/build-claude-md.test.js .claude/CLAUDE.md
git commit -m "feat: auto-generate CLAUDE.md from skills.json"
```

---

### Task 3: Extend `update-readme.js` with Plugin Ecosystem Table

**Files:**
- Modify: `scripts/update-readme.js`
- Modify: `README.md` (add markers for new sections)

**Step 1: Write the failing test**

```javascript
// Add to tests/update-readme.test.js (or create)
it('generates plugin ecosystem table from marketplace.json', () => {
  // Read README after running update-readme
  const readme = readFileSync('README.md', 'utf8');
  assert.ok(readme.includes('<!-- BEGIN:plugin-ecosystem-table -->'));
  assert.ok(readme.includes('armadillo-core'));
  assert.ok(readme.includes('armadillo-frontend'));
});
```

**Step 2: Run test — expect FAIL**

**Step 3: Add to `update-readme.js`**

- Read `.claude-plugin/marketplace.json` for plugin list
- Read `skills.json` for skill counts per bundle
- Generate plugin ecosystem table between `<!-- BEGIN:plugin-ecosystem-table -->` and `<!-- END:plugin-ecosystem-table -->` markers
- Add markers to README.md for the new section

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add scripts/update-readme.js README.md
git commit -m "feat: auto-generate plugin ecosystem table in README"
```

---

### Task 4: Add `build-claude-md.js` to Pre-Push Pipeline

**Files:**
- Modify: `scripts/version-bump.js` (line ~159, add call after update-readme)

**Step 1: Add the call**

After `await exec('npm run update-readme', { cwd: ROOT });` (line 160), add:

```javascript
console.log('→ Regenerating CLAUDE.md...');
await exec(`node "${join(ROOT, 'scripts', 'build-claude-md.js')}"`, { cwd: ROOT });
```

**Step 2: Update the git add line (line 167)**

Add `.claude/CLAUDE.md` to the staged files:

```javascript
await exec('git add package.json CHANGELOG.json README.md .claude/CLAUDE.md .claude-plugin/ plugins/', { cwd: ROOT });
```

**Step 3: Verify**

Run full pipeline manually:
```bash
node scripts/build-claude-md.js && echo "PASS"
```

**Step 4: Commit**

```bash
git add scripts/version-bump.js
git commit -m "chore: add CLAUDE.md generation to pre-push pipeline"
```

---

### Task 5: Add `project-context` Rule Description

**Files:**
- Modify: `scripts/update-readme.js` (rulesDescriptions object, ~line 43)

**Step 1: Add the missing description**

In the `rulesDescriptions` object, add:

```javascript
'rules/project-context.md': 'Stack-aware behavior — reads stack.json, PROJECT.md, fresh-project.json',
```

**Step 2: Run**

```bash
npm run update-readme
```

**Step 3: Verify README shows the description**

**Step 4: Commit**

```bash
git add scripts/update-readme.js README.md
git commit -m "fix: add project-context rule description to README"
```

---

### Task 6: Edit Skill Docs — Mandatory Enforcement Language

Every skill that touches a gate needs its flag-touch instruction. Every skill needs the announcement pattern.

**Files to modify:**
- `plugins/core/skills/writing-prs/SKILL.md` — ensure `touch /tmp/.armadillo-pr-skill-active` first-action is present
- `plugins/core/skills/finishing-a-development-branch/SKILL.md` — ensure `touch /tmp/.armadillo-merge-skill-active` first-action is present
- `plugins/core/skills/systematic-debugging/SKILL.md` — ensure `rm -f /tmp/.armadillo-tests-failing` first-action is present
- `plugins/core/hooks/inject-skill-awareness.sh` — ensure full action→skill mapping with CONSTRAINT language

**Step 1: Read each file and verify flag instructions are present**

If the linter/user reverted changes from PRs #21-22, re-add them.

**Step 2: Verify `inject-skill-awareness.sh` has full mapping**

The additionalContext should include:
- CRITICAL CONSTRAINT language
- Action→skill mapping table
- Plan/Explore/EnterPlanMode BLOCKED statements
- `gh pr create` blocked without writing-prs

**Step 3: Run existing tests**

```bash
node --test tests/enforcement-tightened.test.js
node --test tests/inject-skill-awareness.test.js
node --test tests/enforce-pr-skill.test.js
node --test tests/enforce-merge-skill.test.js
node --test tests/enforce-debug-gate.test.js
```

All should pass.

**Step 4: Commit**

```bash
git add plugins/core/skills/ plugins/core/hooks/inject-skill-awareness.sh
git commit -m "fix: restore mandatory enforcement language in skill docs"
```

---

### Task 7: Sync Local Branch with Remote Main

**Files:**
- All reverted files from PRs #21-22

**Step 1: Check current git status**

```bash
git status
git log --oneline -5
```

**Step 2: Pull latest from remote**

```bash
env -u GITHUB_TOKEN git pull origin main
```

**Step 3: Verify all tests pass**

```bash
npm test
```

**Step 4: No commit needed — pull brings us in sync**

---

### Task 8: Verify Full Pipeline End-to-End

**Step 1: Run all generation scripts**

```bash
node scripts/build-claude-md.js
npm run update-readme
node scripts/sync-all.js
```

**Step 2: Run all tests**

```bash
npm test
```

**Step 3: Verify generated files match source data**

- CLAUDE.md skill count matches skills.json
- README.md skill count matches skills.json
- README.md plugin table matches marketplace.json
- All plugin versions match package.json

**Step 4: Commit any generated changes**

```bash
git add .claude/CLAUDE.md README.md
git commit -m "docs: regenerate CLAUDE.md and README from skills.json"
```

---

## Verification

1. `node --test tests/*.test.js` — all tests pass
2. `node scripts/build-claude-md.js` — generates CLAUDE.md without errors
3. `npm run update-readme` — README markers updated
4. `node scripts/sync-all.js` — all validation passes
5. `.claude/settings.local.json` has valid GitHub source (not `"directory"`)
6. Skill docs have flag-touch first-actions
7. `inject-skill-awareness.sh` has full CONSTRAINT language
8. Restart Claude Code → `/hooks` menu shows armadillo hooks as `[Plugin]`
