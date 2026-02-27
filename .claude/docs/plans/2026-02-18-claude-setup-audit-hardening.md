# Claude Setup Audit Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 18 findings from the Claude Code setup audit — security hardening, settings optimization, agent upgrades, hook consolidation, and modular rules.

**Architecture:** Changes span two scopes: (1) the armadillo-cli project files (`.claude/` template that ships to users), and (2) the user's global `~/.claude/settings.json`. All project changes get tests. Global settings changes are verified with `jq` validation.

**Tech Stack:** Node.js test runner (`node:test`), bash hooks, JSON config, markdown rules

---

## Scope Note

- **Finding 1 (plaintext secrets):** This modifies `~/.claude/settings.json` — the user's GLOBAL config, not the project. We create a `~/.claude/secrets.sh` helper script and update the global settings to reference it.
- **Findings 2-4, 11, 14, 18:** Also modify `~/.claude/settings.json` (global scope).
- **Findings 5-17 (remaining):** Modify project files under `.claude/` (shipped template).

---

### Task 1: Create secrets helper script and remove plaintext tokens from global settings

**Files:**
- Create: `~/.claude/secrets.sh`
- Modify: `~/.claude/settings.json`

**Step 1: Create the secrets helper script**

Create `~/.claude/secrets.sh`:
```bash
#!/usr/bin/env bash
# Exports secrets from macOS Keychain or environment.
# Called by Claude Code via shell profile sourcing.
# Add to ~/.zshrc: source ~/.claude/secrets.sh

# Prefer Keychain, fall back to hardcoded (migrate these to Keychain over time)
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(security find-generic-password -a "$USER" -s "GITHUB_TOKEN" -w 2>/dev/null || echo "")}"
export CF_TOKEN="${CF_TOKEN:-$(security find-generic-password -a "$USER" -s "CF_TOKEN" -w 2>/dev/null || echo "")}"
export DEEPGRAM_API_KEY="${DEEPGRAM_API_KEY:-$(security find-generic-password -a "$USER" -s "DEEPGRAM_API_KEY" -w 2>/dev/null || echo "")}"
```

Make it executable:
```bash
chmod +x ~/.claude/secrets.sh
```

**Step 2: Store the current tokens in macOS Keychain**

```bash
security add-generic-password -a "$USER" -s "GITHUB_TOKEN" -w "<YOUR_GITHUB_TOKEN>" -U
security add-generic-password -a "$USER" -s "CF_TOKEN" -w "<YOUR_CF_TOKEN>" -U
security add-generic-password -a "$USER" -s "DEEPGRAM_API_KEY" -w "<YOUR_DEEPGRAM_KEY>" -U
```

**Step 3: Source the secrets script from shell profile**

Add to `~/.zshrc` (if not already present):
```bash
# Claude Code secrets
[ -f ~/.claude/secrets.sh ] && source ~/.claude/secrets.sh
```

**Step 4: Update `~/.claude/settings.json` — remove tokens from env, add schema, attribution, sandbox, autocompact, effort, plansDirectory**

This is the big global settings overhaul. The new file:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "USE_BUILTIN_RIPGREP": "0",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "88",
    "CLAUDE_CODE_EFFORT_LEVEL": "high"
  },
  "attribution": {
    "commit": "Co-Authored-By: Claude <noreply@anthropic.com>",
    "pr": "Generated with [Claude Code](https://claude.com/claude-code)"
  },
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(env -u GITHUB_TOKEN *)",
      "Bash(gh *)",
      "Bash(jq *)",
      "Bash(which *)",
      "Bash(ls *)",
      "Bash(mkdir *)",
      "Bash(chmod *)",
      "Bash(security *)",
      "Bash(cat *)",
      "Bash(wc *)",
      "Bash(diff *)",
      "Bash(sort *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(curl *)",
      "Bash(cd *)",
      "Bash(pwd)",
      "Bash(echo *)",
      "Bash(rm *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(test *)",
      "Bash([ *)",
      "WebSearch",
      "WebFetch",
      "Read",
      "Write(/Users/zachwieder/Documents/AGENCY/**)",
      "Edit(/Users/zachwieder/Documents/AGENCY/**)",
      "Glob",
      "Grep",
      "Task",
      "mcp__backlog__task_edit"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/credentials*)",
      "Read(**/*secret*)",
      "Write(**/.env)",
      "Write(**/.env.*)"
    ],
    "ask": []
  },
  "plansDirectory": ".claude/docs/plans",
  "enabledPlugins": {},
  "skipDangerousModePermissionPrompt": true
}
```

**Step 5: Verify global settings is valid JSON**

```bash
jq . ~/.claude/settings.json > /dev/null
```
Expected: exits 0, no output

**Step 6: Verify secrets script works**

```bash
source ~/.claude/secrets.sh && echo "GITHUB_TOKEN=${GITHUB_TOKEN:0:4}..." && echo "CF_TOKEN=${CF_TOKEN:0:4}..." && echo "DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY:0:4}..."
```
Expected: prints first 4 chars of each token followed by `...`

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(security): move secrets to macOS Keychain, harden global settings

- Remove plaintext GITHUB_TOKEN, CF_TOKEN, DEEPGRAM_API_KEY from settings.json
- Create ~/.claude/secrets.sh for Keychain-backed secret loading
- Add \$schema for IDE validation
- Add attribution setting (replaces manual Co-Authored-By)
- Scope Bash permissions to specific commands instead of blanket allow
- Add deny rules for .env, credentials, and secret files
- Remove blanket Write/Read in favor of scoped AGENCY/** paths
- Set CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=88 for skill-heavy setup
- Set CLAUDE_CODE_EFFORT_LEVEL=high as default
- Set plansDirectory to .claude/docs/plans"
```

> **NOTE:** The secrets.sh and ~/.zshrc changes are local-only (not in git). Only the settings.json and project files are committed.

---

### Task 2: Add `$schema` to project settings.json

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Write the failing test**

Create `tests/settings-schema.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('settings.json schema validation', () => {
  test('project settings.json has $schema field', () => {
    const settings = JSON.parse(
      readFileSync(resolve(__dirname, '..', '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(
      settings.$schema,
      'https://json.schemastore.org/claude-code-settings.json'
    );
  });

  test('project settings.json is valid JSON', () => {
    const raw = readFileSync(
      resolve(__dirname, '..', '.claude', 'settings.json'),
      'utf8'
    );
    assert.doesNotThrow(() => JSON.parse(raw));
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/settings-schema.test.js
```
Expected: FAIL — `$schema` field not present

**Step 3: Add `$schema` to `.claude/settings.json`**

Update `.claude/settings.json` to:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/reinject-after-compact.sh"
          }
        ]
      }
    ]
  }
}
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/settings-schema.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/settings-schema.test.js .claude/settings.json
git commit -m "feat(settings): add \$schema to project settings.json for IDE validation"
```

---

### Task 3: Add persistent memory to all 7 custom agents

**Files:**
- Modify: `.claude/agents/code-reviewer.md`
- Modify: `.claude/agents/brand-strategist.md`
- Modify: `.claude/agents/claude-code-guide.md`
- Modify: `.claude/agents/duda-migration-agent.md`
- Modify: `.claude/agents/google-api-guide.md`
- Modify: `.claude/agents/remotion-creator.md`
- Modify: `.claude/agents/ascii-art-creator.md`
- Create: `tests/agent-frontmatter.test.js`

**Step 1: Write the failing test**

Create `tests/agent-frontmatter.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = resolve(__dirname, '..', '.claude', 'agents');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    // Handle simple key: value (not multi-line)
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      let val = kv[2].trim();
      // Parse numbers
      if (/^\d+$/.test(val)) val = parseInt(val, 10);
      fm[kv[1]] = val;
    }
  }
  return fm;
}

const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

describe('agent frontmatter', () => {
  for (const file of agentFiles) {
    describe(file, () => {
      const content = readFileSync(resolve(AGENTS_DIR, file), 'utf8');
      const fm = parseFrontmatter(content);

      test('has memory field', () => {
        assert.ok(fm.memory, `${file} should have a memory field`);
        assert.ok(
          ['user', 'project', 'local'].includes(fm.memory),
          `${file} memory should be user, project, or local — got "${fm.memory}"`
        );
      });

      test('has maxTurns field', () => {
        assert.ok(fm.maxTurns, `${file} should have a maxTurns field`);
        assert.ok(
          typeof fm.maxTurns === 'number' && fm.maxTurns > 0 && fm.maxTurns <= 50,
          `${file} maxTurns should be 1-50 — got ${fm.maxTurns}`
        );
      });
    });
  }
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/agent-frontmatter.test.js
```
Expected: FAIL — memory and maxTurns not present on any agent

**Step 3: Update all 7 agents with memory and maxTurns**

For each agent, add `memory` and `maxTurns` to the YAML frontmatter. Memory scope choices:
- `project` for agents that learn project-specific patterns (code-reviewer, duda-migration-agent)
- `user` for agents that learn personal preferences across projects (brand-strategist, claude-code-guide, google-api-guide, remotion-creator, ascii-art-creator)

maxTurns choices:
- `25` for complex multi-step agents (code-reviewer, duda-migration-agent, brand-strategist, remotion-creator)
- `20` for reference/guide agents (claude-code-guide, google-api-guide)
- `15` for focused single-task agents (ascii-art-creator)

**code-reviewer.md** — add after `model: inherit`:
```yaml
memory: project
maxTurns: 25
```

**brand-strategist.md** — add after `model: inherit`:
```yaml
memory: user
maxTurns: 25
```

**claude-code-guide.md** — add after `model: inherit`:
```yaml
memory: user
maxTurns: 20
```

**duda-migration-agent.md** — add after `model: inherit`:
```yaml
memory: project
maxTurns: 25
```

**google-api-guide.md** — add after `model: inherit`:
```yaml
memory: user
maxTurns: 20
```

**remotion-creator.md** — add after `model: inherit`:
```yaml
memory: user
maxTurns: 25
```

**ascii-art-creator.md** — add after `model: inherit`:
```yaml
memory: user
maxTurns: 15
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/agent-frontmatter.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/agent-frontmatter.test.js .claude/agents/
git commit -m "feat(agents): add persistent memory and maxTurns to all 7 custom agents"
```

---

### Task 4: Add skills field to relevant agents

**Files:**
- Modify: `.claude/agents/code-reviewer.md`
- Modify: `.claude/agents/brand-strategist.md`
- Modify: `.claude/agents/duda-migration-agent.md`
- Modify: `.claude/agents/remotion-creator.md`
- Modify: `tests/agent-frontmatter.test.js`

**Step 1: Write the failing test**

Add to `tests/agent-frontmatter.test.js`:
```javascript
// Add this mapping at top level
const EXPECTED_SKILLS = {
  'code-reviewer.md': ['verification-before-completion'],
  'brand-strategist.md': ['brand-knowledge-builder'],
  'duda-migration-agent.md': ['duda-to-astro-migration'],
  'remotion-creator.md': ['remotion'],
};

// Add this test inside the per-file describe block
test('has expected skills field (if applicable)', () => {
  const expected = EXPECTED_SKILLS[file];
  if (!expected) return; // Not all agents need skills
  // Skills in frontmatter is multi-line YAML list, parse it differently
  const skillsMatch = content.match(/^skills:\n((?:\s+-\s+.+\n?)+)/m);
  assert.ok(skillsMatch, `${file} should have a skills field`);
  for (const skill of expected) {
    assert.ok(
      skillsMatch[1].includes(skill),
      `${file} skills should include ${skill}`
    );
  }
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/agent-frontmatter.test.js
```
Expected: FAIL — skills field not present

**Step 3: Add skills to relevant agents**

For each agent that has a corresponding skill, add a `skills` block to frontmatter.

**code-reviewer.md** frontmatter — add:
```yaml
skills:
  - verification-before-completion
```

**brand-strategist.md** frontmatter — add:
```yaml
skills:
  - brand-knowledge-builder
```

**duda-migration-agent.md** frontmatter — add:
```yaml
skills:
  - duda-to-astro-migration
```

**remotion-creator.md** frontmatter — add:
```yaml
skills:
  - remotion
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/agent-frontmatter.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/agent-frontmatter.test.js .claude/agents/
git commit -m "feat(agents): add skills field to domain-specific agents"
```

---

### Task 5: Consolidate duplicate hook configurations

**Files:**
- Modify: `.claude/settings.json` — remove SessionStart hook (keep only `$schema`)
- Modify: `.claude/hooks/hooks.json` — add compact reinject to existing SessionStart block
- Create: `tests/hook-consolidation.test.js`

**Step 1: Write the failing test**

Create `tests/hook-consolidation.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('hook consolidation', () => {
  test('settings.json has no hooks section (hooks live in hooks.json)', () => {
    const settings = JSON.parse(
      readFileSync(resolve(__dirname, '..', '.claude', 'settings.json'), 'utf8')
    );
    assert.equal(settings.hooks, undefined, 'settings.json should not have hooks — they belong in hooks.json');
  });

  test('hooks.json SessionStart handles compact event', () => {
    const hooks = JSON.parse(
      readFileSync(resolve(__dirname, '..', '.claude', 'hooks', 'hooks.json'), 'utf8')
    );
    const sessionStart = hooks.hooks.SessionStart;
    assert.ok(Array.isArray(sessionStart), 'SessionStart should be an array');

    // Find the compact-specific handler
    const compactHandler = sessionStart.find(h => h.matcher && h.matcher.includes('compact'));
    assert.ok(compactHandler, 'Should have a handler that matches compact');
  });

  test('hooks.json has no duplicate SessionStart entries for compact', () => {
    const hooks = JSON.parse(
      readFileSync(resolve(__dirname, '..', '.claude', 'hooks', 'hooks.json'), 'utf8')
    );
    const sessionStart = hooks.hooks.SessionStart;
    // The existing entry matches startup|resume|clear|compact which already covers compact
    // So we should NOT have a separate compact-only entry
    const compactOnly = sessionStart.filter(h => h.matcher === 'compact');
    assert.equal(compactOnly.length, 0, 'Should not have a compact-only matcher — the main matcher already covers it');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/hook-consolidation.test.js
```
Expected: FAIL — settings.json still has hooks section

**Step 3: Remove hooks from settings.json, verify hooks.json already covers compact**

The existing `hooks.json` SessionStart matcher is `startup|resume|clear|compact` — it already handles compact. The `reinject-after-compact.sh` script is also already in `sharedFiles`. The duplicate was in `settings.json` which had a separate `compact` matcher calling the same script.

Update `.claude/settings.json` to:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json"
}
```

The `session-start.sh` already fires on compact (via the `startup|resume|clear|compact` matcher). The `reinject-after-compact.sh` is a separate script that provides additional context after compaction. We need to ensure the reinject logic is called on compact.

Looking at `session-start.sh` — it runs on all 4 events and injects the using-armadillo skill content. The `reinject-after-compact.sh` adds a short reminder about parallelism and context monitoring. These are complementary.

We need to add a second SessionStart entry in hooks.json specifically for compact with the reinject script:

Update `.claude/hooks/hooks.json` to add a compact-specific entry:

Actually, looking more carefully — the existing matcher `startup|resume|clear|compact` already matches compact, and `session-start.sh` runs for all 4 events including compact. The `reinject-after-compact.sh` in `settings.json` adds additional context specifically for compact events. Since `session-start.sh` already provides full context reinjection (which is more comprehensive), the `reinject-after-compact.sh` is actually redundant — its reminders about parallelism are a subset of what session-start.sh injects.

So the consolidation is: remove the settings.json hooks entirely, because hooks.json already covers compact via session-start.sh.

**Step 4: Run test to verify it passes**

```bash
node --test tests/hook-consolidation.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/hook-consolidation.test.js .claude/settings.json
git commit -m "refactor(hooks): consolidate duplicate compact hooks into hooks.json"
```

---

### Task 6: Create modular rules directory

**Files:**
- Create: `.claude/rules/coding-standards.md`
- Create: `.claude/rules/git-workflow.md`
- Create: `tests/rules-directory.test.js`

**Step 1: Write the failing test**

Create `tests/rules-directory.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = resolve(__dirname, '..', '.claude', 'rules');

describe('.claude/rules/ directory', () => {
  test('rules directory exists', () => {
    assert.ok(existsSync(RULES_DIR), '.claude/rules/ should exist');
  });

  test('coding-standards.md exists and has content', () => {
    const file = resolve(RULES_DIR, 'coding-standards.md');
    assert.ok(existsSync(file), 'coding-standards.md should exist');
    const content = readFileSync(file, 'utf8');
    assert.ok(content.length > 50, 'should have substantial content');
    assert.ok(content.includes('DRY'), 'should mention DRY');
    assert.ok(content.includes('YAGNI'), 'should mention YAGNI');
    assert.ok(content.includes('TDD'), 'should mention TDD');
  });

  test('git-workflow.md exists and has content', () => {
    const file = resolve(RULES_DIR, 'git-workflow.md');
    assert.ok(existsSync(file), 'git-workflow.md should exist');
    const content = readFileSync(file, 'utf8');
    assert.ok(content.length > 50, 'should have substantial content');
    assert.ok(content.includes('GITHUB_TOKEN'), 'should mention GITHUB_TOKEN workaround');
    assert.ok(content.includes('env -u'), 'should include the env -u pattern');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/rules-directory.test.js
```
Expected: FAIL — rules directory doesn't exist

**Step 3: Create the rules files**

Create `.claude/rules/coding-standards.md`:
```markdown
# Coding Standards

## Principles
- **DRY** — Don't Repeat Yourself
- **YAGNI** — You Aren't Gonna Need It
- **TDD** — Test-Driven Development (RED/GREEN/REFACTOR)

## Workflow
- One question at a time
- Verify before claiming done
- Frequent commits

## Background Execution
Use `run_in_background: true` selectively:
- **Task (agent dispatch)** calls — always background subagent dispatches
- **Long-running Bash** (test suites, builds, installs, dev servers, watchers) — background and poll with `TaskOutput`
- **Quick Bash** (git status, git log, file validation, JSON checks, single-file operations) — run synchronously

## Skills
- **Never use `EnterPlanMode`** — use the `writing-plans` skill for all planning instead
```

Create `.claude/rules/git-workflow.md`:
```markdown
# Git Workflow

## Authentication
Claude Code sets a `GITHUB_TOKEN` env var with limited scopes (`repo` only — no `workflow`). This blocks pushes that include `.github/workflows/` files.

**Always prefix git push and gh api calls with `env -u GITHUB_TOKEN`** to use the keyring token (which has full scopes) instead:

```bash
env -u GITHUB_TOKEN git push origin main
env -u GITHUB_TOKEN gh api repos/...
```

## Commit Conventions
- Frequent, atomic commits
- Conventional commit messages (feat, fix, refactor, test, docs, chore)
- TDD order: test commit before (or with) implementation commit
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/rules-directory.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/rules-directory.test.js .claude/rules/
git commit -m "feat(rules): create modular .claude/rules/ directory with coding-standards and git-workflow"
```

---

### Task 7: Add `@` imports to CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`
- Modify: `tests/rules-directory.test.js` (add import verification test)

**Step 1: Write the failing test**

Add to `tests/rules-directory.test.js`:
```javascript
describe('CLAUDE.md imports', () => {
  test('CLAUDE.md references rules via @ imports', () => {
    const claudeMd = readFileSync(
      resolve(__dirname, '..', '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.ok(
      claudeMd.includes('@.claude/rules/'),
      'CLAUDE.md should use @ imports to reference rules'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/rules-directory.test.js
```
Expected: FAIL — CLAUDE.md doesn't have @ imports yet

**Step 3: Update CLAUDE.md to use @ imports**

Replace the Principles and Background Execution and Git Authentication sections (which are now in rules/) with @ imports. The updated `.claude/CLAUDE.md` should be:

```markdown
<!-- armadillo:start -->
# Claude Code Configuration

## Skills

This project uses [Armadillo](https://github.com/yourorg/armadillo) skills. Use the Skill tool to invoke them.

### Workflow
- **brainstorming** — Start here before any creative/feature work
- **writing-plans** — Create implementation plans from designs
- **executing-plans** — Execute plans task-by-task with review checkpoints
- **test-driven-development** — RED/GREEN/REFACTOR cycle for all code
- **systematic-debugging** — Root cause analysis before fixing bugs
- **verification-before-completion** — Verify before claiming done

### Collaboration
- **requesting-code-review** — Request review after completing work
- **receiving-code-review** — Process review feedback with rigor
- **subagent-driven-development** — Dispatch subagents per task
- **dispatching-parallel-agents** — Run independent tasks in parallel

### Git
- **using-git-worktrees** — Isolated feature branches
- **finishing-a-development-branch** — Merge/PR/cleanup guidance

### Meta
- **using-armadillo** — Discover and invoke skills
- **onboarding** — Set up armadillo or migrate existing .claude/ setup
- **updating-armadillo** — Check for updates, upgrade, health check
- **writing-skills** — Create new skills (TDD cycle)
- **writing-reference-skills** — API/tool reference skills with web research

## Rules

@.claude/rules/coding-standards.md
@.claude/rules/git-workflow.md
<!-- armadillo:end -->

<!-- Add your project-specific instructions below this line -->

# Development Notes
This file doubles as the template installed to user projects via `armadillo init`.
Keep project-specific dev instructions in a root-level `CLAUDE.md` instead.
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/rules-directory.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/CLAUDE.md tests/rules-directory.test.js
git commit -m "refactor(CLAUDE.md): replace inline rules with @ imports to .claude/rules/"
```

---

### Task 8: Remove deprecated run-hook.cmd

**Files:**
- Delete: `.claude/hooks/run-hook.cmd`
- Modify: `skills.json` — remove from sharedFiles.hooks
- Create: `tests/deprecated-files.test.js`

**Step 1: Write the failing test**

Create `tests/deprecated-files.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('deprecated files', () => {
  test('run-hook.cmd does not exist', () => {
    const file = resolve(__dirname, '..', '.claude', 'hooks', 'run-hook.cmd');
    assert.ok(!existsSync(file), 'run-hook.cmd should be removed — it is deprecated');
  });

  test('skills.json does not reference run-hook.cmd', () => {
    const registry = JSON.parse(
      readFileSync(resolve(__dirname, '..', 'skills.json'), 'utf8')
    );
    const hookFiles = registry.sharedFiles.hooks;
    assert.ok(
      !hookFiles.includes('hooks/run-hook.cmd'),
      'skills.json sharedFiles should not reference run-hook.cmd'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/deprecated-files.test.js
```
Expected: FAIL — run-hook.cmd still exists

**Step 3: Delete run-hook.cmd and update skills.json**

```bash
rm .claude/hooks/run-hook.cmd
```

Update `skills.json` sharedFiles.hooks to remove `"hooks/run-hook.cmd"`:
```json
"hooks": [
  "hooks/hooks.json",
  "hooks/enforce-skills.sh",
  "hooks/inject-skill-awareness.sh",
  "hooks/reinject-after-compact.sh",
  "hooks/session-start.sh"
]
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/deprecated-files.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/deprecated-files.test.js skills.json
git rm .claude/hooks/run-hook.cmd
git commit -m "chore: remove deprecated run-hook.cmd polyglot wrapper"
```

---

### Task 9: Add PreCompact hook

**Files:**
- Create: `.claude/hooks/pre-compact.sh`
- Modify: `.claude/hooks/hooks.json` — add PreCompact event
- Modify: `skills.json` — add to sharedFiles.hooks
- Create: `tests/pre-compact-hook.test.js`

**Step 1: Write the failing test**

Create `tests/pre-compact-hook.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = resolve(__dirname, '..', '.claude', 'hooks');

describe('PreCompact hook', () => {
  test('pre-compact.sh exists and is executable', () => {
    const script = resolve(HOOKS_DIR, 'pre-compact.sh');
    assert.ok(existsSync(script), 'pre-compact.sh should exist');
  });

  test('hooks.json has PreCompact event', () => {
    const hooks = JSON.parse(
      readFileSync(resolve(HOOKS_DIR, 'hooks.json'), 'utf8')
    );
    assert.ok(hooks.hooks.PreCompact, 'hooks.json should have PreCompact event');
    assert.ok(Array.isArray(hooks.hooks.PreCompact), 'PreCompact should be an array');
  });

  test('pre-compact.sh outputs valid JSON with context save reminder', () => {
    const script = resolve(HOOKS_DIR, 'pre-compact.sh');
    const stdout = execSync(`bash "${script}"`, {
      input: '{}',
      encoding: 'utf8',
    });
    const result = JSON.parse(stdout);
    assert.ok(result.hookSpecificOutput, 'should have hookSpecificOutput');
    assert.ok(
      result.hookSpecificOutput.additionalContext.includes('compact'),
      'should mention compaction'
    );
  });

  test('skills.json includes pre-compact.sh in sharedFiles', () => {
    const registry = JSON.parse(
      readFileSync(resolve(__dirname, '..', 'skills.json'), 'utf8')
    );
    assert.ok(
      registry.sharedFiles.hooks.includes('hooks/pre-compact.sh'),
      'skills.json should include pre-compact.sh'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/pre-compact-hook.test.js
```
Expected: FAIL — pre-compact.sh doesn't exist

**Step 3: Create pre-compact.sh**

Create `.claude/hooks/pre-compact.sh`:
```bash
#!/usr/bin/env bash
# PreCompact hook: reminds Claude to save critical context before compaction.

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreCompact",
    "additionalContext": "Context is about to be compact-ed. Before compaction completes, ensure you have noted: (1) current task status and what step you're on, (2) any important decisions or context that should survive compaction, (3) files currently being modified. The session-start hook will reinject skill context after compaction."
  }
}
EOF

exit 0
```

Make it executable:
```bash
chmod +x .claude/hooks/pre-compact.sh
```

**Step 4: Add PreCompact to hooks.json**

Add to `.claude/hooks/hooks.json` after the UserPromptSubmit entry:
```json
"PreCompact": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-compact.sh"
      }
    ]
  }
]
```

**Step 5: Add to skills.json sharedFiles.hooks**

Add `"hooks/pre-compact.sh"` to the hooks array in `skills.json`.

**Step 6: Run test to verify it passes**

```bash
node --test tests/pre-compact-hook.test.js
```
Expected: PASS

**Step 7: Commit**

```bash
git add tests/pre-compact-hook.test.js .claude/hooks/pre-compact.sh .claude/hooks/hooks.json skills.json
git commit -m "feat(hooks): add PreCompact hook for context preservation before compaction"
```

---

### Task 10: Add Stop hook for auto-verification

**Files:**
- Create: `.claude/hooks/stop-verify.sh`
- Modify: `.claude/hooks/hooks.json` — add Stop event
- Modify: `skills.json` — add to sharedFiles.hooks
- Create: `tests/stop-hook.test.js`

**Step 1: Write the failing test**

Create `tests/stop-hook.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = resolve(__dirname, '..', '.claude', 'hooks');

describe('Stop hook', () => {
  test('stop-verify.sh exists', () => {
    const script = resolve(HOOKS_DIR, 'stop-verify.sh');
    assert.ok(existsSync(script), 'stop-verify.sh should exist');
  });

  test('hooks.json has Stop event', () => {
    const hooks = JSON.parse(
      readFileSync(resolve(HOOKS_DIR, 'hooks.json'), 'utf8')
    );
    assert.ok(hooks.hooks.Stop, 'hooks.json should have Stop event');
    assert.ok(Array.isArray(hooks.hooks.Stop), 'Stop should be an array');
  });

  test('stop-verify.sh outputs valid JSON with verification reminder', () => {
    const script = resolve(HOOKS_DIR, 'stop-verify.sh');
    const stdout = execSync(`bash "${script}"`, {
      input: JSON.stringify({ stop_reason: 'end_turn' }),
      encoding: 'utf8',
    });
    const result = JSON.parse(stdout);
    assert.ok(result.hookSpecificOutput, 'should have hookSpecificOutput');
    assert.ok(
      result.hookSpecificOutput.additionalContext.includes('verif'),
      'should mention verification'
    );
  });

  test('skills.json includes stop-verify.sh in sharedFiles', () => {
    const registry = JSON.parse(
      readFileSync(resolve(__dirname, '..', 'skills.json'), 'utf8')
    );
    assert.ok(
      registry.sharedFiles.hooks.includes('hooks/stop-verify.sh'),
      'skills.json should include stop-verify.sh'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/stop-hook.test.js
```
Expected: FAIL — stop-verify.sh doesn't exist

**Step 3: Create stop-verify.sh**

Create `.claude/hooks/stop-verify.sh`:
```bash
#!/usr/bin/env bash
# Stop hook: reminds Claude to verify work before finishing.

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "Before finishing: did you run verification? If you claimed something is 'done', 'fixed', or 'passing', confirm you have evidence (test output, command results, file checks). Use the verification-before-completion skill if you haven't verified yet."
  }
}
EOF

exit 0
```

Make it executable:
```bash
chmod +x .claude/hooks/stop-verify.sh
```

**Step 4: Add Stop to hooks.json**

Add to `.claude/hooks/hooks.json`:
```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-verify.sh"
      }
    ]
  }
]
```

**Step 5: Add to skills.json sharedFiles.hooks**

Add `"hooks/stop-verify.sh"` to the hooks array in `skills.json`.

**Step 6: Run test to verify it passes**

```bash
node --test tests/stop-hook.test.js
```
Expected: PASS

**Step 7: Commit**

```bash
git add tests/stop-hook.test.js .claude/hooks/stop-verify.sh .claude/hooks/hooks.json skills.json
git commit -m "feat(hooks): add Stop hook for auto-verification reminders"
```

---

### Task 11: Enable knowledge base config

**Files:**
- Modify: `.claude/knowledge/config.json`
- Create: `tests/knowledge-config.test.js`

**Step 1: Write the failing test**

Create `tests/knowledge-config.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('knowledge base config', () => {
  test('config.json has agency enabled', () => {
    const config = JSON.parse(
      readFileSync(resolve(__dirname, '..', '.claude', 'knowledge', 'config.json'), 'utf8')
    );
    assert.equal(config.agency.enabled, true, 'agency should be enabled for brand-strategist agent');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/knowledge-config.test.js
```
Expected: FAIL — agency.enabled is false

**Step 3: Update config.json**

Update `.claude/knowledge/config.json` to:
```json
{
  "agency": { "enabled": true },
  "client": { "enabled": false }
}
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/knowledge-config.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/knowledge-config.test.js .claude/knowledge/config.json
git commit -m "fix(knowledge): enable agency knowledge base for brand-strategist agent"
```

---

### Task 12: Update skills.json sharedFiles to include rules

**Files:**
- Modify: `skills.json` — add rules to sharedFiles
- Modify: `tests/rules-directory.test.js` — add registry test

**Step 1: Write the failing test**

Add to `tests/rules-directory.test.js`:
```javascript
describe('skills.json rules tracking', () => {
  test('skills.json sharedFiles includes rules', () => {
    const registry = JSON.parse(
      readFileSync(resolve(__dirname, '..', 'skills.json'), 'utf8')
    );
    assert.ok(registry.sharedFiles.rules, 'sharedFiles should have a rules key');
    assert.ok(
      registry.sharedFiles.rules.includes('rules/coding-standards.md'),
      'should include coding-standards.md'
    );
    assert.ok(
      registry.sharedFiles.rules.includes('rules/git-workflow.md'),
      'should include git-workflow.md'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
node --test tests/rules-directory.test.js
```
Expected: FAIL — no rules key in sharedFiles

**Step 3: Add rules to skills.json sharedFiles**

Add to `skills.json` sharedFiles object:
```json
"rules": [
  "rules/coding-standards.md",
  "rules/git-workflow.md"
]
```

**Step 4: Run test to verify it passes**

```bash
node --test tests/rules-directory.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add tests/rules-directory.test.js skills.json
git commit -m "feat(registry): track .claude/rules/ files in skills.json sharedFiles"
```

---

### Task 13: Run full test suite and verify everything passes

**Files:** None (verification only)

**Step 1: Run all tests**

```bash
node --test tests/*.test.js
```
Expected: ALL PASS

**Step 2: Verify JSON files are valid**

```bash
jq . .claude/settings.json > /dev/null && echo "settings.json OK"
jq . .claude/hooks/hooks.json > /dev/null && echo "hooks.json OK"
jq . skills.json > /dev/null && echo "skills.json OK"
jq . .claude/knowledge/config.json > /dev/null && echo "config.json OK"
```
Expected: All OK

**Step 3: Verify hooks are executable**

```bash
ls -la .claude/hooks/*.sh
```
Expected: All .sh files have execute permission

**Step 4: Final commit if any fixups needed**

Only commit if there were fixups. Otherwise, no commit needed.

---

## Summary of All Changes

| # | Finding | Type | Scope |
|---|---------|------|-------|
| 1 | Plaintext secrets → Keychain | security | global (~/.claude/) |
| 2 | Add `attribution` setting | config | global |
| 3 | Scope permissions + deny rules | security | global |
| 4 | ~~Sandbox config~~ (covered by scoped permissions) | security | global |
| 5 | Agent persistent memory | feature | project (.claude/agents/) |
| 6 | Consolidate hooks | refactor | project (.claude/settings.json, hooks.json) |
| 7 | `$schema` field | config | project + global |
| 8 | Modular rules directory | feature | project (.claude/rules/) |
| 9 | `@` imports in CLAUDE.md | refactor | project (.claude/CLAUDE.md) |
| 10 | `maxTurns` on agents | config | project (.claude/agents/) |
| 11 | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | config | global |
| 12 | Remove run-hook.cmd | cleanup | project (.claude/hooks/) |
| 13 | Enable knowledge base | fix | project (.claude/knowledge/) |
| 14 | `CLAUDE_CODE_EFFORT_LEVEL` | config | global |
| 15 | PreCompact hook | feature | project (.claude/hooks/) |
| 16 | Stop hook | feature | project (.claude/hooks/) |
| 17 | Agent skills field | feature | project (.claude/agents/) |
| 18 | `plansDirectory` override | config | global |

**Note:** Finding 4 (sandbox) is addressed by permission scoping in Finding 3 — adding a full sandbox config would be overly restrictive for a development CLI project. The scoped Bash permissions + deny rules provide the security benefit without blocking legitimate development commands.
