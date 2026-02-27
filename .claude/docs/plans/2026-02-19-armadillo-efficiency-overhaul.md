# Armadillo Efficiency Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Apply all brainstorming improvements — hook DRY extraction, bug fixes, native frontmatter upgrades, Explore unblock, settings overhaul, doctor script, skills.json dependency graph, and full rename from armadillo-cli to armadillo.

**Architecture:** Eight phases, each independently committable. Phase 1 (shared hook lib) is the foundation. Phase 7 (rename) is intentionally last because it touches nearly every file. All changes are project-level — shipped to user projects.

**Tech Stack:** Bash hooks, Node.js scripts (zero deps), YAML frontmatter, JSON config

---

## Phase 1: Shared Hook Utilities + Bug Fixes

### Task 1: Create shared hook escape library

**Files:**
- Create: `.claude/hooks/lib/json-escape.sh`

**Step 1: Write the shared library**

```bash
#!/usr/bin/env bash
# Shared JSON escape utility for all armadillo hooks.
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/json-escape.sh"

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}
```

**Step 2: Verify it loads correctly**

Run: `bash -c 'source ".claude/hooks/lib/json-escape.sh" && escape_for_json "hello\nworld\"test"'`
Expected: `hello\nworld\"test`

**Step 3: Commit**

```bash
git add .claude/hooks/lib/json-escape.sh
git commit -m "refactor: extract shared escape_for_json to hooks/lib/json-escape.sh"
```

---

### Task 2: Update all hooks to source shared lib

**Files:**
- Modify: `.claude/hooks/session-start.sh`
- Modify: `.claude/hooks/stop-verify.sh`
- Modify: `.claude/hooks/subagent-start.sh`
- Modify: `.claude/hooks/pre-compact.sh`
- Modify: `.claude/hooks/post-push-pr-check.sh`
- Modify: `.claude/hooks/async-lint.sh`

**Step 1: In each of the 6 files, replace the inline `escape_for_json` function with a source line**

Add near the top (after `set -euo pipefail` and after `SCRIPT_DIR`/`PLUGIN_ROOT` if present):

```bash
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/json-escape.sh"
```

Remove the entire `escape_for_json() { ... }` function block from each file.

For `post-push-pr-check.sh`, the function is defined inside an `if` block — extract the source line to the top of the script (after `set -euo pipefail`) and remove the inline function from the `if` block.

**Step 2: Run all hooks to verify they still work**

```bash
echo '{"tool_input":{"command":"git push origin main"}}' | bash .claude/hooks/post-push-pr-check.sh
echo '{}' | bash .claude/hooks/stop-verify.sh
echo '{"tool_input":{"subagent_type":"general-purpose"}}' | bash .claude/hooks/enforce-skills.sh
```

Expected: No errors, valid JSON output where applicable.

**Step 3: Run existing tests**

Run: `node --test tests/*.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add .claude/hooks/session-start.sh .claude/hooks/stop-verify.sh .claude/hooks/subagent-start.sh .claude/hooks/pre-compact.sh .claude/hooks/post-push-pr-check.sh .claude/hooks/async-lint.sh
git commit -m "refactor: DRY hook scripts — source shared json-escape.sh"
```

---

### Task 3: Fix task-completed.sh bash precedence bug

**Files:**
- Modify: `.claude/hooks/task-completed.sh`

**Step 1: Fix line 44**

Replace:
```bash
  if [ -f "pyproject.toml" ] || [ -f "pyproject.toml" ] && grep -q "\[tool.pytest" pyproject.toml 2>/dev/null; then
```

With:
```bash
  # Python — pytest
  if [ -f "pytest.ini" ] || { [ -f "pyproject.toml" ] && grep -q "\[tool.pytest" pyproject.toml 2>/dev/null; }; then
```

The `{ }` grouping ensures the `&&` binds to the grep, not the outer `if`.

**Step 2: Verify the hook still runs**

```bash
echo '{"task_subject":"implement feature X"}' | bash .claude/hooks/task-completed.sh
```

Expected: Exit 0 (no test runner found in this project root)

**Step 3: Commit**

```bash
git add .claude/hooks/task-completed.sh
git commit -m "fix: bash precedence bug in task-completed.sh pytest detection"
```

---

### Task 4: Fix pre-compact.sh git path

**Files:**
- Modify: `.claude/hooks/pre-compact.sh`

**Step 1: Fix git commands to use project root, not .claude/**

Replace all instances of:
```bash
git -C "$PLUGIN_ROOT"
```

With:
```bash
git -C "$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$PLUGIN_ROOT/..")"
```

Or simpler — add a `PROJECT_ROOT` variable near the top:
```bash
PROJECT_ROOT="$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$PLUGIN_ROOT/..")"
```

Then replace `git -C "$PLUGIN_ROOT"` with `git -C "$PROJECT_ROOT"` on lines 49, 53, 54.

**Step 2: Verify**

```bash
echo '{}' | bash .claude/hooks/pre-compact.sh
```

Expected: Valid JSON output with correct branch and commits from the project root.

**Step 3: Commit**

```bash
git add .claude/hooks/pre-compact.sh
git commit -m "fix: pre-compact.sh git commands now use project root, not .claude/"
```

---

### Task 5: Delete reinject-after-compact.sh (dead code)

**Files:**
- Delete: `.claude/hooks/reinject-after-compact.sh`
- Modify: `skills.json` (remove from sharedFiles.hooks)

**Rationale:** `session-start.sh` already fires on the `compact` matcher (hooks.json SessionStart matcher is `startup|resume|clear|compact`). The reinject file is not wired in hooks.json, outputs plaintext instead of JSON, and does not re-inject any useful context. Dead code.

**Step 1: Remove from skills.json sharedFiles.hooks array**

Remove the line `"hooks/reinject-after-compact.sh"` from the `sharedFiles.hooks` array.

**Step 2: Delete the file**

```bash
rm .claude/hooks/reinject-after-compact.sh
```

**Step 3: Run tests**

Run: `node --test tests/*.test.js`
Expected: All pass (update any test that checks for this file if needed)

**Step 4: Commit**

```bash
git add skills.json
git rm .claude/hooks/reinject-after-compact.sh
git commit -m "refactor: remove dead reinject-after-compact.sh — session-start.sh covers compact event"
```

---

## Phase 2: Hook Behavior Changes

### Task 6: Make inject-skill-awareness fire once per session

**Files:**
- Modify: `.claude/hooks/hooks.json`
- Modify: `.claude/hooks/inject-skill-awareness.sh` (simplify)

**Step 1: Add `"once": true` to the UserPromptSubmit hook in hooks.json**

Replace the UserPromptSubmit entry:
```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/inject-skill-awareness.sh"
      }
    ]
  }
]
```

With:
```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/inject-skill-awareness.sh",
        "once": true
      }
    ]
  }
]
```

**Step 2: Verify hooks.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/hooks/hooks.json','utf8')); console.log('valid')"
```

**Step 3: Run existing tests**

Run: `node --test tests/*.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add .claude/hooks/hooks.json
git commit -m "perf: inject-skill-awareness fires once per session instead of every prompt"
```

---

### Task 7: Allow Explore agents (remove block)

**Files:**
- Modify: `.claude/hooks/enforce-skills.sh`
- Modify: `tests/enforce-skills.test.js`

**Step 1: Remove the Explore block from enforce-skills.sh**

Remove this entire case:
```bash
  Explore)
    echo "Blocked: Explore agent is disabled. Use Glob/Grep/Read tools directly, or invoke a matching skill (e.g. systematic-debugging, writing-skills). If no existing skill covers this exploration need and it represents a recurring pattern (not a one-off search), suggest creating a new skill to the user via the writing-skills skill." >&2
    exit 2
    ;;
```

Keep the Plan block — that's still enforced (writing-plans skill is the replacement).

**Step 2: Update test**

In `tests/enforce-skills.test.js`, find the test that expects Explore to be blocked and change it to expect Explore to be allowed (exit 0).

**Step 3: Run tests**

Run: `node --test tests/enforce-skills.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add .claude/hooks/enforce-skills.sh tests/enforce-skills.test.js
git commit -m "feat: allow Explore agents — SubagentStart hook injects standards"
```

---

## Phase 3: Skill Frontmatter Upgrades

### Task 8: Add `disable-model-invocation: true` to user-only skills

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (frontmatter only)
- Modify: `.claude/skills/updating-armadillo/SKILL.md` (frontmatter only)

These skills should only fire when the user explicitly asks. Claude should never auto-trigger onboarding or an update check.

**Step 1: Add frontmatter field to onboarding**

After the `description:` line, add:
```yaml
disable-model-invocation: true
```

**Step 2: Same for updating-armadillo**

After the `description:` line, add:
```yaml
disable-model-invocation: true
```

**Step 3: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md .claude/skills/updating-armadillo/SKILL.md
git commit -m "feat: onboarding and updating-armadillo are user-invoked only"
```

---

### Task 9: Add `allowed-tools` to skills

**Files:**
- Modify: `.claude/skills/brainstorming/SKILL.md`
- Modify: `.claude/skills/writing-plans/SKILL.md`
- Modify: `.claude/skills/systematic-debugging/SKILL.md`
- Modify: `.claude/skills/writing-skills/SKILL.md`
- Modify: `.claude/skills/onboarding/SKILL.md`
- Modify: `.claude/skills/updating-armadillo/SKILL.md`
- Modify: `.claude/skills/test-driven-development/SKILL.md`
- Modify: `.claude/skills/subagent-driven-development/SKILL.md`
- Modify: `.claude/skills/executing-plans/SKILL.md`
- Modify: `.claude/skills/verification-before-completion/SKILL.md`

**Step 1: Add `allowed-tools` to each skill's frontmatter**

| Skill | allowed-tools |
|-------|--------------|
| brainstorming | `Read, Glob, Grep, Bash, Task, AskUserQuestion, Skill` |
| writing-plans | `Read, Glob, Grep, Bash, Write, AskUserQuestion, Skill` |
| systematic-debugging | `Read, Glob, Grep, Bash, Edit, Write, Task` |
| writing-skills | `Read, Glob, Grep, Bash, Edit, Write, Task, WebSearch, WebFetch` |
| onboarding | `Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, WebFetch, Skill` |
| updating-armadillo | `Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, WebFetch, Skill` |
| test-driven-development | `Read, Glob, Grep, Bash, Edit, Write, Task` |
| subagent-driven-development | `Read, Glob, Grep, Bash, Edit, Write, Task, Skill` |
| executing-plans | `Read, Glob, Grep, Bash, Edit, Write, Task, Skill` |
| verification-before-completion | `Read, Glob, Grep, Bash` |

Add in frontmatter as:
```yaml
allowed-tools: Read, Glob, Grep, Bash, Task
```

**Step 2: Commit**

```bash
git add .claude/skills/brainstorming/SKILL.md .claude/skills/writing-plans/SKILL.md .claude/skills/systematic-debugging/SKILL.md .claude/skills/writing-skills/SKILL.md .claude/skills/onboarding/SKILL.md .claude/skills/updating-armadillo/SKILL.md .claude/skills/test-driven-development/SKILL.md .claude/skills/subagent-driven-development/SKILL.md .claude/skills/executing-plans/SKILL.md .claude/skills/verification-before-completion/SKILL.md
git commit -m "feat: add allowed-tools frontmatter to core workflow skills"
```

---

### Task 10: Add `context: fork` to heavy skills

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md`
- Modify: `.claude/skills/writing-skills/SKILL.md`

These skills involve deep exploration that would balloon the main context window. Running them forked protects the main session.

**Step 1: Add `context: fork` to frontmatter of each**

```yaml
context: fork
```

Do NOT add `context: fork` to `systematic-debugging` — debugging needs to see the main conversation context to understand what went wrong.

Do NOT add to `brainstorming` or `writing-plans` — these are conversational and need user interaction in the main context.

**Step 2: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md .claude/skills/writing-skills/SKILL.md
git commit -m "feat: onboarding and writing-skills run in forked context"
```

---

## Phase 4: Rules + CLAUDE.md Cleanup

### Task 11: Add conditional `paths:` to rules

**Files:**
- Modify: `.claude/rules/coding-standards.md`
- Modify: `.claude/rules/pr-format.md`

**Step 1: Add paths frontmatter to coding-standards.md**

Add at the very top of the file:
```yaml
---
paths:
  - "**/*.{js,ts,jsx,tsx,py,go,rs,java,rb,sh}"
  - "**/*.{test,spec}.*"
---
```

This scopes coding standards to actual source code files — they won't fire when Claude is editing markdown docs or JSON configs.

**Step 2: Add paths frontmatter to pr-format.md**

This rule should only activate when working with git/PR operations. But `paths:` only triggers on file access, not git commands. Leave pr-format.md WITHOUT paths — it's always relevant when the writing-prs skill is active.

Actually — skip pr-format.md. `paths:` frontmatter only triggers when Claude works with matching files. PR format rules need to be active during git operations, which aren't file-path scoped. Leave it global.

**Step 3: Do NOT add paths to output-style.md or git-workflow.md**

- `output-style.md` — always active (affects all output)
- `git-workflow.md` — always active (affects all git operations)
- `release-checklist.md` — already repo-specific (title says "armadillo repo only")

**Step 4: Commit**

```bash
git add .claude/rules/coding-standards.md
git commit -m "feat: coding-standards rule scoped to source files via paths frontmatter"
```

---

### Task 12: Remove redundant @rules imports from CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: Remove the `@.claude/rules/` import lines**

Files in `.claude/rules/*.md` auto-load natively. The `@` imports cause them to load twice.

Replace the Rules section:
```markdown
## Rules

@.claude/rules/coding-standards.md
@.claude/rules/git-workflow.md
@.claude/rules/output-style.md
@.claude/rules/pr-format.md
```

With:
```markdown
## Rules

Rules auto-load from `.claude/rules/`:

| Rule | What it enforces |
|------|-----------------|
| **coding-standards** | DRY, YAGNI, TDD, smart backgrounding, skill-first workflow |
| **git-workflow** | `env -u GITHUB_TOKEN` auth, conventional commits, atomic changes |
| **output-style** | Consistent formatting, status markers, brand voice |
| **pr-format** | Conventional commits PR titles, hybrid template, anti-patterns |
```

**Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "fix: remove redundant @rules imports — rules auto-load natively"
```

---

## Phase 5: Settings + User Controls

### Task 13: Conservative default settings with documented toggle

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Change default permission mode from bypass to acceptEdits**

Replace:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  },
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(sudo rm -rf:*)",
      "Bash(mkfs:*)",
      "Bash(dd if=/dev/zero:*)",
      "Bash(dd if=/dev/random:*)",
      "Bash(> /dev/sda)",
      "Bash(chmod -R 777 /)"
    ]
  }
}
```

With:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  },
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Skill",
      "Task",
      "WebSearch",
      "WebFetch",
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git status*)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git branch*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git stash*)",
      "Bash(git worktree *)",
      "Bash(ls *)",
      "Bash(wc *)",
      "Bash(du *)",
      "Bash(env -u GITHUB_TOKEN *)",
      "Bash(gh *)",
      "Bash(jq *)",
      "Bash(shasum *)",
      "Bash(base64 *)",
      "Bash(chmod *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(python *)",
      "Bash(pytest *)",
      "Bash(cargo *)",
      "Bash(go *)",
      "Bash(timeout *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(sudo rm -rf:*)",
      "Bash(mkfs:*)",
      "Bash(dd if=/dev/zero:*)",
      "Bash(dd if=/dev/random:*)",
      "Bash(> /dev/sda)",
      "Bash(chmod -R 777 /)",
      "Bash(git push --force*)",
      "Bash(git reset --hard*)"
    ]
  }
}
```

**Step 2: Update the settings-schema test if it validates specific fields**

Run: `node --test tests/settings-schema.test.js`
Expected: Pass. If not, update test to match new structure.

**Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: conservative default permissions — acceptEdits + allow-list + deny-list"
```

---

### Task 14: Add permissions toggle documentation to CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md`

**Step 1: Add a Permissions section to the CLAUDE.md template (below the armadillo-managed section, above the user section)**

Add this inside the armadillo markers, after the Model Selection table:

```markdown
## Permissions

Default mode: `acceptEdits` — Claude can read, search, and edit files without prompting. Bash commands use an allow-list.

**Toggle bypass mode** (auto-approve everything):

Edit `.claude/settings.json` and change `"defaultMode"` to `"bypassPermissions"`.

| Mode | Behavior | Risk |
|------|----------|------|
| `acceptEdits` | Auto-approves reads + edits, prompts for unknown Bash | Low — you see Bash prompts |
| `bypassPermissions` | Auto-approves everything except deny-list | High — faster but less control |
| `plan` | Read-only, no writes | Zero — exploration only |

Deny-list always active regardless of mode (catastrophic commands blocked).
```

**Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: add permissions toggle guide to CLAUDE.md"
```

---

### Task 15: Create standalone doctor script

**Files:**
- Create: `.claude/lib/doctor.js`
- Modify: `skills.json` (add to sharedFiles.lib)

**Step 1: Write the doctor script**

```javascript
#!/usr/bin/env node
/**
 * doctor.js — Standalone health check for armadillo installations.
 * Run: node .claude/lib/doctor.js
 * No AI tokens needed. No dependencies.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = join(__dirname, '..');
const PROJECT_ROOT = join(CLAUDE_DIR, '..');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg) { console.log(`  ✓  ${msg}`); passed++; }
function fail(msg) { console.log(`  ✗  ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠  ${msg}`); warnings++; }

console.log('\n  armadillo doctor\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Manifest check
const manifestPath = join(CLAUDE_DIR, '.armadillo-manifest.json');
let manifest = null;
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    ok(`Manifest valid (v${manifest.version})`);
    if (!manifest.completed) warn('Manifest shows incomplete onboarding');
  } catch (e) {
    fail(`Manifest exists but invalid JSON: ${e.message}`);
  }
} else {
  fail('No .armadillo-manifest.json found — run onboarding');
}

// 2. File presence
if (manifest && manifest.files) {
  const files = Object.keys(manifest.files);
  let missing = 0;
  for (const f of files) {
    if (!existsSync(join(CLAUDE_DIR, f))) missing++;
  }
  if (missing === 0) {
    ok(`All ${files.length} tracked files present`);
  } else {
    fail(`${missing} of ${files.length} tracked files missing`);
  }
}

// 3. Hooks config
const hooksPath = join(CLAUDE_DIR, 'hooks', 'hooks.json');
if (existsSync(hooksPath)) {
  try {
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf8'));
    const eventCount = Object.keys(hooks.hooks || {}).length;
    ok(`hooks.json valid (${eventCount} event types)`);
  } catch (e) {
    fail(`hooks.json invalid: ${e.message}`);
  }
} else {
  fail('hooks/hooks.json not found');
}

// 4. Hook scripts executable
const hookDir = join(CLAUDE_DIR, 'hooks');
if (existsSync(hookDir)) {
  const scripts = readdirSync(hookDir).filter(f => f.endsWith('.sh'));
  let nonExec = 0;
  for (const s of scripts) {
    try {
      execSync(`test -x "${join(hookDir, s)}"`, { stdio: 'pipe' });
    } catch {
      nonExec++;
      warn(`${s} is not executable — run: chmod +x .claude/hooks/${s}`);
    }
  }
  if (nonExec === 0) ok(`All ${scripts.length} hook scripts executable`);
}

// 5. CLAUDE.md markers
const claudeMdPath = join(CLAUDE_DIR, 'CLAUDE.md');
if (existsSync(claudeMdPath)) {
  const content = readFileSync(claudeMdPath, 'utf8');
  if (content.includes('<!-- armadillo:start -->') && content.includes('<!-- armadillo:end -->')) {
    ok('CLAUDE.md armadillo markers intact');
  } else {
    fail('CLAUDE.md missing armadillo:start/end markers');
  }
} else {
  fail('CLAUDE.md not found');
}

// 6. Settings check
const settingsPath = join(CLAUDE_DIR, 'settings.json');
if (existsSync(settingsPath)) {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const mode = settings?.permissions?.defaultMode || 'unknown';
    ok(`settings.json valid (mode: ${mode})`);
  } catch (e) {
    fail(`settings.json invalid: ${e.message}`);
  }
} else {
  warn('settings.json not found');
}

// 7. Orphaned files
if (manifest && manifest.files) {
  const tracked = new Set(Object.keys(manifest.files));
  const skipDirs = new Set(['.armadillo-manifest.json', '.DS_Store']);

  function scanDir(dir, prefix) {
    const orphaned = [];
    if (!existsSync(dir)) return orphaned;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) continue;
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        orphaned.push(...scanDir(join(dir, entry.name), relPath));
      } else if (!tracked.has(relPath)) {
        orphaned.push(relPath);
      }
    }
    return orphaned;
  }

  const orphaned = scanDir(CLAUDE_DIR, '');
  if (orphaned.length === 0) {
    ok('No orphaned files');
  } else {
    warn(`${orphaned.length} orphaned file(s) not in manifest`);
    orphaned.slice(0, 5).forEach(f => console.log(`       ↳ ${f}`));
    if (orphaned.length > 5) console.log(`       ↳ ... and ${orphaned.length - 5} more`);
  }
}

// 8. Version check
if (manifest && manifest.version) {
  try {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    if (pkg.version === manifest.version) {
      ok(`Version match: ${manifest.version}`);
    }
  } catch {
    // Not an error — user project may not have package.json
  }
}

// Summary
console.log('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  ${passed} passed · ${failed} failed · ${warnings} warning(s)\n`);
process.exit(failed > 0 ? 1 : 0);
```

**Step 2: Add to skills.json sharedFiles.lib**

Add `"lib/doctor.js"` to the `sharedFiles.lib` array.

**Step 3: Run it**

```bash
node .claude/lib/doctor.js
```

Expected: Output health report with pass/fail/warning counts.

**Step 4: Commit**

```bash
git add .claude/lib/doctor.js skills.json
git commit -m "feat: add standalone doctor.js health check — zero AI tokens needed"
```

---

## Phase 6: skills.json Enhancements

### Task 16: Add `depends` field for skill dependency graph

**Files:**
- Modify: `skills.json`

**Step 1: Add `depends` arrays to skills that chain**

Add a `"depends"` field to these skills entries:

```json
"executing-plans": {
  ...
  "depends": ["writing-plans"]
},
"subagent-driven-development": {
  ...
  "depends": ["writing-plans"]
},
"writing-plans": {
  ...
  "depends": ["brainstorming"]
},
"receiving-code-review": {
  ...
  "depends": ["requesting-code-review"]
},
"requesting-code-review": {
  ...
  "depends": ["verification-before-completion"]
},
"finishing-a-development-branch": {
  ...
  "depends": ["verification-before-completion"]
}
```

Skills without dependencies don't need the field (absence = no dependencies).

Agent dependencies are already tracked via the `"agents"` field.

**Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('valid')"
```

**Step 3: Commit**

```bash
git add skills.json
git commit -m "feat: add skill dependency graph via depends field in skills.json"
```

---

### Task 17: Update sharedFiles for new files and removed files

**Files:**
- Modify: `skills.json`

**Step 1: Update sharedFiles**

Add to `sharedFiles.hooks`:
```json
"hooks/lib/json-escape.sh"
```

Remove from `sharedFiles.hooks`:
```json
"hooks/reinject-after-compact.sh"
```

(This should already be done from Task 5, but verify.)

**Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('valid')"
```

**Step 3: Commit**

```bash
git add skills.json
git commit -m "chore: update sharedFiles — add hook lib, remove dead reinject hook"
```

---

## Phase 7: Rename armadillo-cli → armadillo

### Task 18: Rename all internal references in active code files

**Files to modify (active code — NOT docs/plans):**
- `.claude/skills/onboarding/SKILL.md` — all `armadillo-cli` references
- `.claude/skills/updating-armadillo/SKILL.md` — all `armadillo-cli` references
- `.claude/skills/finishing-a-development-branch/SKILL.md` — `armadillo-cli repo` references
- `.claude/skills/ascii-art/SKILL.md` — `armadillo-cli` in example
- `.claude/rules/release-checklist.md` — `armadillo-cli` in title/body
- `tests/github-api.test.js` — `filenamedotexe/armadillo-cli` repo constant
- `README.md` — `armadillo-cli` references in URLs

**Step 1: Global find-and-replace in each file**

| Find | Replace |
|------|---------|
| `filenamedotexe/armadillo-cli` | `filenamedotexe/armadillo` |
| `armadillo-cli repo` | `armadillo repo` |
| `armadillo-cli repository` | `armadillo repository` |
| `armadillo-cli project` | `armadillo project` |
| `for armadillo-cli` | `for armadillo` |
| `the armadillo-cli` | `the armadillo` |
| `in armadillo-cli` | `in armadillo` |
| `CLI banner for armadillo-cli tool` | `CLI banner for armadillo tool` |

**Important:** Do NOT rename the npm package name — it's already `@filenamedotexe/armadillo`. No change needed there.

**Important:** Do NOT touch `.claude/docs/plans/` files — those are historical records.

**Important:** `CHANGELOG.json` has one historical reference — leave it as-is (historical record).

**Step 2: Verify no remaining active references**

```bash
grep -r "armadillo-cli" .claude/skills/ .claude/rules/ .claude/hooks/ .claude/lib/ tests/ README.md .github/ scripts/ package.json skills.json
```

Expected: No matches (docs/plans and CHANGELOG.json are OK to still have references).

**Step 3: Run all tests**

Run: `node --test tests/*.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md .claude/skills/updating-armadillo/SKILL.md .claude/skills/finishing-a-development-branch/SKILL.md .claude/skills/ascii-art/SKILL.md .claude/rules/release-checklist.md tests/github-api.test.js README.md
git commit -m "refactor: rename all armadillo-cli references to armadillo"
```

---

### Task 19: Rename local folder (LAST — after all commits)

**This task is manual and happens after pushing all other changes.**

**Step 1: Verify all changes are committed and pushed**

```bash
git status
git log --oneline -5
```

**Step 2: Rename the folder**

```bash
mv "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo"
```

**Step 3: Open a new Claude Code session in the renamed folder**

The old session will lose its working directory. Start fresh.

**Step 4: Rename the GitHub repo**

Go to https://github.com/filenamedotexe/armadillo-cli/settings and rename to `armadillo`. GitHub auto-redirects the old URL, so existing user installations referencing the old repo name will still work until they update.

---

## Phase 8: Tests + Final Verification

### Task 20: Add doctor.js test

**Files:**
- Create: `tests/doctor.test.js`

**Step 1: Write test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = join(import.meta.dirname, '..');

describe('doctor.js', () => {
  it('exists and is valid JS', () => {
    const path = join(ROOT, '.claude', 'lib', 'doctor.js');
    assert.ok(existsSync(path), 'doctor.js should exist');
  });

  it('runs without error on this repo', () => {
    const result = execSync('node .claude/lib/doctor.js', {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 10000
    });
    assert.ok(result.includes('armadillo doctor'), 'should print header');
    assert.ok(result.includes('passed'), 'should report passed checks');
  });
});
```

**Step 2: Run it**

Run: `node --test tests/doctor.test.js`
Expected: Pass

**Step 3: Commit**

```bash
git add tests/doctor.test.js
git commit -m "test: add doctor.js health check tests"
```

---

### Task 21: Add shared hook lib test

**Files:**
- Create: `tests/hook-lib.test.js`

**Step 1: Write test**

```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

describe('hooks/lib/json-escape.sh', () => {
  const libPath = join(ROOT, '.claude', 'hooks', 'lib', 'json-escape.sh');

  it('exists', () => {
    assert.ok(existsSync(libPath));
  });

  it('escapes newlines and quotes correctly', () => {
    const result = execSync(
      `bash -c 'source "${libPath}" && escape_for_json "hello\nworld\\"test"'`,
      { encoding: 'utf8' }
    );
    assert.ok(result.includes('\\n'), 'should escape newlines');
    assert.ok(result.includes('\\"'), 'should escape quotes');
  });
});

describe('no inline escape_for_json in hooks', () => {
  const hookDir = join(ROOT, '.claude', 'hooks');
  const hookFiles = ['session-start.sh', 'stop-verify.sh', 'subagent-start.sh',
                     'pre-compact.sh', 'post-push-pr-check.sh', 'async-lint.sh'];

  for (const file of hookFiles) {
    it(`${file} sources shared lib instead of inline function`, () => {
      const content = require('fs').readFileSync(join(hookDir, file), 'utf8');
      // Should NOT contain the function definition
      assert.ok(!content.includes('escape_for_json() {'),
        `${file} should not define escape_for_json inline`);
      // Should source the shared lib
      assert.ok(content.includes('json-escape.sh'),
        `${file} should source json-escape.sh`);
    });
  }
});
```

**Step 2: Run it**

Run: `node --test tests/hook-lib.test.js`
Expected: Pass

**Step 3: Commit**

```bash
git add tests/hook-lib.test.js
git commit -m "test: add hook shared lib tests — verify DRY compliance"
```

---

### Task 22: Run full test suite and verify

**Step 1: Run all tests**

```bash
node --test tests/*.test.js
```

Expected: All pass

**Step 2: Run doctor**

```bash
node .claude/lib/doctor.js
```

Expected: All green (0 failed)

**Step 3: Verify hooks JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/hooks/hooks.json','utf8')); console.log('hooks.json valid')"
node -e "JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('skills.json valid')"
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json valid')"
```

Expected: All valid

**Step 4: Verify no armadillo-cli references in active code**

```bash
grep -r "armadillo-cli" .claude/skills/ .claude/rules/ .claude/hooks/ .claude/lib/ tests/ README.md .github/ scripts/ package.json skills.json
```

Expected: No matches

**Step 5: Final commit if any test fixes were needed**

```bash
git add -A && git commit -m "test: fix any remaining test issues from overhaul"
```

---

## Task Summary

| # | Task | Phase | Files |
|---|------|-------|-------|
| 1 | Create shared hook escape library | 1 | 1 new |
| 2 | Update all hooks to source shared lib | 1 | 6 modified |
| 3 | Fix task-completed.sh bash bug | 1 | 1 modified |
| 4 | Fix pre-compact.sh git path | 1 | 1 modified |
| 5 | Delete reinject-after-compact.sh | 1 | 1 deleted, 1 modified |
| 6 | inject-skill-awareness fires once | 2 | 1 modified |
| 7 | Allow Explore agents | 2 | 2 modified |
| 8 | disable-model-invocation for user-only skills | 3 | 2 modified |
| 9 | Add allowed-tools to skills | 3 | 10 modified |
| 10 | Add context:fork to heavy skills | 3 | 2 modified |
| 11 | Conditional paths on rules | 4 | 1 modified |
| 12 | Remove redundant @rules imports | 4 | 1 modified |
| 13 | Conservative default settings | 5 | 1 modified |
| 14 | Permissions toggle docs | 5 | 1 modified |
| 15 | Standalone doctor script | 5 | 1 new, 1 modified |
| 16 | Skill dependency graph | 6 | 1 modified |
| 17 | Update sharedFiles | 6 | 1 modified |
| 18 | Rename armadillo-cli → armadillo | 7 | 7 modified |
| 19 | Rename local folder | 7 | manual |
| 20 | Doctor test | 8 | 1 new |
| 21 | Hook lib test | 8 | 1 new |
| 22 | Full verification | 8 | — |

**Total: 22 tasks · 3 new files · 1 deleted · ~30 modified**
