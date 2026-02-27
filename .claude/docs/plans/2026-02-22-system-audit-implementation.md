# System Verification Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Fix all P0 issues (broken hooks, broken tests, overzealous TaskCompleted), add P1 hooks (Stop, SubagentStop, SessionEnd, PostToolUseFailure, doctor drift check), apply P2 polish (statusMessage, snapshot rotation, reference skills, architecture doc), and add `context: fork` for model enforcement.

**Architecture:** All changes are additive — new hook scripts in `.claude/hooks/`, edits to `settings.json` and `hooks.json`, a new doctor.js check, and skill frontmatter updates. No behavioral regressions expected.

**Tech Stack:** Bash (hook scripts), Node.js (doctor.js), YAML frontmatter (skills)

---

### Task 1: Sync settings.json from hooks.json — add 3 missing PostToolUse hooks

**Files:**
- Modify: `.claude/settings.json:68-82` (PostToolUse section)

**Step 1: Write a test to verify all hooks.json entries exist in settings.json**

```javascript
// tests/settings-hooks-sync.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('settings.json ↔ hooks.json sync', () => {
  it('every hook script in hooks.json has a matching entry in settings.json', () => {
    const hooksJson = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks', 'hooks.json'), 'utf8'));
    const settingsJson = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));

    // Extract all script paths from hooks.json
    const hooksScripts = new Set();
    for (const [event, groups] of Object.entries(hooksJson.hooks)) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command) {
            // Extract script filename from command
            const match = hook.command.match(/([a-z-]+\.sh)/);
            if (match) hooksScripts.add(`${event}:${match[1]}`);
          }
        }
      }
    }

    // Extract all script paths from settings.json
    const settingsScripts = new Set();
    for (const [event, groups] of Object.entries(settingsJson.hooks || {})) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command) {
            const match = hook.command.match(/([a-z-]+\.sh)/);
            if (match) settingsScripts.add(`${event}:${match[1]}`);
          }
        }
      }
    }

    // Every hooks.json entry should exist in settings.json
    const missing = [];
    for (const entry of hooksScripts) {
      if (!settingsScripts.has(entry)) missing.push(entry);
    }

    assert.deepStrictEqual(missing, [],
      `Missing from settings.json: ${missing.join(', ')}`);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/settings-hooks-sync.test.js`
Expected: FAIL — missing `PostToolUse:enforce-tdd-order.sh`, `PostToolUse:nap-ninja-hook.sh`, `PostToolUse:env-ninja-hook.sh`

**Step 3: Add the 3 missing hooks to settings.json PostToolUse section**

In `.claude/settings.json`, the PostToolUse section needs:
- Add `enforce-tdd-order.sh` to the `"matcher": "Bash"` group (after `detect-test-failure.sh`)
- Add `nap-ninja-hook.sh` to the `"matcher": "Write|Edit"` group (before `async-lint.sh`)
- Add `env-ninja-hook.sh` to the `"matcher": "Write|Edit"` group (before `async-lint.sh`)

The PostToolUse section should become:

```json
"PostToolUse": [
  {
    "matcher": "Bash",
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-push-pr-check.sh" },
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/detect-test-failure.sh" },
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-tdd-order.sh" }
    ]
  },
  {
    "matcher": "Write|Edit",
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/nap-ninja-hook.sh" },
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/env-ninja-hook.sh" },
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/async-lint.sh", "async": true, "timeout": 60 }
    ]
  }
]
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/settings-hooks-sync.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/settings-hooks-sync.test.js .claude/settings.json
git commit -m "fix(hooks): sync settings.json with hooks.json — re-enable 3 missing enforcement hooks"
```

---

### Task 2: Fix test suite — convert vitest imports to node:test

**Files:**
- Modify: `tests/generate-pages.test.js`
- Modify: `tests/generate-sidebar.test.js`
- Modify: `tests/generate-skill-page.test.js`
- Modify: `tests/parse-frontmatter.test.js`

The project uses `node --test` (package.json `scripts.test`). Four test files import from `vitest` which doesn't exist as a dependency. Convert them to `node:test` + `node:assert` to match every other test file in the repo.

**Step 1: Convert each file's imports**

For each of the 4 files, replace:
```javascript
import { describe, it, expect } from 'vitest';
```
with:
```javascript
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
```

And replace all `expect(x).toContain(y)` with `assert.ok(x.includes(y), 'should contain: ' + y)`.
Replace all `expect(x).toBe(y)` with `assert.strictEqual(x, y)`.
Replace all `expect(x).toBeTruthy()` with `assert.ok(x)`.
Replace all `expect(x).toMatch(y)` with `assert.match(x, y)`.

**Step 2: Run the 4 converted tests individually**

Run: `node --test tests/generate-pages.test.js tests/generate-sidebar.test.js tests/generate-skill-page.test.js tests/parse-frontmatter.test.js`
Expected: PASS (or fail on actual assertion issues — diagnose if so)

**Step 3: Run the full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/generate-pages.test.js tests/generate-sidebar.test.js tests/generate-skill-page.test.js tests/parse-frontmatter.test.js
git commit -m "fix(tests): convert 4 vitest imports to node:test — fix ERR_MODULE_NOT_FOUND"
```

---

### Task 3: Add TaskCompleted scope filter — skip tests for research tasks

**Files:**
- Modify: `.claude/hooks/task-completed.sh`

The TaskCompleted hook runs the full test suite on EVERY task completion, including research/exploration tasks. The hook receives `task_subject` and `task_description` in its JSON input. Use these to detect non-code tasks and skip the test suite.

**Step 1: Write a test for the scope filter logic**

```javascript
// tests/task-completed-scope.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('task-completed.sh scope filter', () => {
  const script = readFileSync(join(ROOT, '.claude', 'hooks', 'task-completed.sh'), 'utf8');

  it('has a research/exploration skip pattern', () => {
    assert.ok(
      script.includes('research') || script.includes('explor') || script.includes('audit') || script.includes('SKIP_PATTERNS'),
      'should have keywords for skipping non-code tasks'
    );
  });

  it('still runs tests for implementation tasks', () => {
    assert.ok(script.includes('run_tests'), 'should still call run_tests');
  });

  it('reads task_description from input', () => {
    assert.ok(
      script.includes('task_description') || script.includes('TASK_DESCRIPTION'),
      'should read task_description from JSON input'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/task-completed-scope.test.js`
Expected: FAIL — script doesn't have research skip pattern yet

**Step 3: Add scope filter to task-completed.sh**

After line 9 (where `TASK_SUBJECT` is extracted), add:

```bash
TASK_DESCRIPTION=$(echo "$INPUT" | jq -r '.task_description // empty' 2>/dev/null) || TASK_DESCRIPTION=""

# Skip test suite for non-code tasks (research, exploration, audits, planning)
COMBINED="${TASK_SUBJECT} ${TASK_DESCRIPTION}"
COMBINED_LOWER=$(echo "$COMBINED" | tr '[:upper:]' '[:lower:]')
SKIP_PATTERNS="research|explor|audit|investigat|analyz|review context|read.*file|check.*status|gather|understand|plan|design|brainstorm|document"
if echo "$COMBINED_LOWER" | grep -qE "$SKIP_PATTERNS"; then
  # Non-code task — skip test suite, allow completion
  exit 0
fi
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/task-completed-scope.test.js`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add .claude/hooks/task-completed.sh tests/task-completed-scope.test.js
git commit -m "fix(hooks): skip test suite for research/exploration tasks in TaskCompleted hook"
```

---

### Task 4: Add Stop hook — final verification gate

**Files:**
- Create: `.claude/hooks/stop-verification.sh`
- Modify: `.claude/settings.json` (add Stop event)
- Modify: `.claude/hooks/hooks.json` (add Stop event)

The `Stop` hook fires when Claude finishes responding. It receives `stop_hook_active` (boolean — true if Claude is already continuing from a previous Stop hook) and `last_assistant_message`. Use this to inject a final verification reminder. Do NOT block — just provide context via `additionalContext`.

Important: The `Stop` event does NOT support matchers. Always fires on every occurrence.

**Step 1: Write a test for the Stop hook script**

```javascript
// tests/stop-verification.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('stop-verification.sh', () => {
  const scriptPath = join(ROOT, '.claude', 'hooks', 'stop-verification.sh');

  it('exists and is executable', () => {
    assert.ok(existsSync(scriptPath));
    execSync(`test -x "${scriptPath}"`, { stdio: 'pipe' });
  });

  it('exits 0 when stop_hook_active is true (prevents infinite loop)', () => {
    const result = execSync(
      `echo '{"stop_hook_active": true, "last_assistant_message": "done"}' | bash "${scriptPath}"`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    // Should exit 0 — no blocking
    assert.ok(true, 'exited successfully');
  });

  it('exits 0 for normal stops', () => {
    const result = execSync(
      `echo '{"stop_hook_active": false, "last_assistant_message": "I finished the task"}' | bash "${scriptPath}"`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    assert.ok(true, 'exited successfully');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/stop-verification.test.js`
Expected: FAIL — script doesn't exist

**Step 3: Create the Stop hook script**

Create `.claude/hooks/stop-verification.sh`:

```bash
#!/usr/bin/env bash
# Stop hook — fires when Claude finishes responding.
# Does NOT block (no exit 2). Injects a verification reminder
# when the response looks like task completion.
# CRITICAL: Must check stop_hook_active to prevent infinite loops.

set -euo pipefail

INPUT=$(cat)
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || STOP_ACTIVE="false"

# Prevent infinite loop — if we're already in a stop hook continuation, exit immediately
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null) || LAST_MSG=""

# Only inject verification context for completion-like messages
LAST_LOWER=$(echo "$LAST_MSG" | tr '[:upper:]' '[:lower:]')
if echo "$LAST_LOWER" | grep -qE "(done|complete|finished|shipped|merged|all (tests|checks) pass|ahh, that felt good)"; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "Verification reminder: Before claiming completion, confirm tests pass and no regressions introduced. Use verification-before-completion skill if applicable."
  }
}
EOF
fi

exit 0
```

Make executable: `chmod +x .claude/hooks/stop-verification.sh`

**Step 4: Add Stop to settings.json and hooks.json**

In `settings.json`, add after the TaskCompleted section:

```json
"Stop": [
  {
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/stop-verification.sh" }
    ]
  }
]
```

Add the same entry to `hooks.json`.

**Step 5: Run test to verify it passes**

Run: `node --test tests/stop-verification.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add .claude/hooks/stop-verification.sh .claude/settings.json .claude/hooks/hooks.json tests/stop-verification.test.js
git commit -m "feat(hooks): add Stop hook for final verification gate"
```

---

### Task 5: Add SubagentStop hook — post-subagent quality gate

**Files:**
- Create: `.claude/hooks/subagent-stop.sh`
- Modify: `.claude/settings.json` (add SubagentStop event)
- Modify: `.claude/hooks/hooks.json` (add SubagentStop event)

The `SubagentStop` hook fires when a subagent finishes. It receives `agent_id`, `agent_type`, `agent_transcript_path`, and `last_assistant_message`. Matcher filters on agent type. Use this to log subagent completions and warn about incomplete work.

**Step 1: Write a test**

```javascript
// tests/subagent-stop.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('subagent-stop.sh', () => {
  const scriptPath = join(ROOT, '.claude', 'hooks', 'subagent-stop.sh');

  it('exists and is executable', () => {
    assert.ok(existsSync(scriptPath));
    execSync(`test -x "${scriptPath}"`, { stdio: 'pipe' });
  });

  it('exits 0 for completed subagents', () => {
    execSync(
      `echo '{"agent_type":"general-purpose","agent_id":"test-123","last_assistant_message":"Task complete.","stop_hook_active":false}' | bash "${scriptPath}"`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    assert.ok(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/subagent-stop.test.js`
Expected: FAIL — script doesn't exist

**Step 3: Create the SubagentStop hook script**

Create `.claude/hooks/subagent-stop.sh`:

```bash
#!/usr/bin/env bash
# SubagentStop hook — fires when a subagent finishes.
# Logs completion and warns if the subagent response suggests incomplete work.
# Does NOT block by default. Matcher: all agent types.

set -euo pipefail

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"' 2>/dev/null) || AGENT_TYPE="unknown"
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // ""' 2>/dev/null) || AGENT_ID=""
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null) || LAST_MSG=""
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || STOP_ACTIVE="false"

# Prevent infinite loop
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

# Check for signs of incomplete work
LAST_LOWER=$(echo "$LAST_MSG" | tr '[:upper:]' '[:lower:]')
INCOMPLETE=""
if echo "$LAST_LOWER" | grep -qE "(could not|unable to|failed to|error|blocked|couldn't|timed out)"; then
  INCOMPLETE="true"
fi

if [ "$INCOMPLETE" = "true" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStop",
    "additionalContext": "⚠ Subagent ${AGENT_TYPE} (${AGENT_ID}) may have incomplete work. Review its output before proceeding."
  }
}
EOF
fi

exit 0
```

Make executable: `chmod +x .claude/hooks/subagent-stop.sh`

**Step 4: Add SubagentStop to settings.json and hooks.json**

```json
"SubagentStop": [
  {
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/subagent-stop.sh" }
    ]
  }
]
```

**Step 5: Run test, verify pass, commit**

Run: `node --test tests/subagent-stop.test.js`
Expected: PASS

```bash
git add .claude/hooks/subagent-stop.sh .claude/settings.json .claude/hooks/hooks.json tests/subagent-stop.test.js
git commit -m "feat(hooks): add SubagentStop hook for post-subagent quality warnings"
```

---

### Task 6: Add SessionEnd hook — cleanup temp files

**Files:**
- Create: `.claude/hooks/session-end.sh`
- Modify: `.claude/settings.json` (add SessionEnd event)
- Modify: `.claude/hooks/hooks.json` (add SessionEnd event)

The `SessionEnd` hook fires when a session terminates. No decision control (can't block). Matcher on reason: `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`. Use this to clean up `/tmp/.armadillo-*` flag files and rotate old pre-compact snapshots.

**Step 1: Write a test**

```javascript
// tests/session-end.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('session-end.sh', () => {
  const scriptPath = join(ROOT, '.claude', 'hooks', 'session-end.sh');

  it('exists and is executable', () => {
    assert.ok(existsSync(scriptPath));
    execSync(`test -x "${scriptPath}"`, { stdio: 'pipe' });
  });

  it('contains tmp cleanup logic', () => {
    const content = readFileSync(scriptPath, 'utf8');
    assert.ok(content.includes('/tmp/.armadillo'), 'should clean up armadillo temp files');
  });

  it('contains snapshot rotation logic', () => {
    const content = readFileSync(scriptPath, 'utf8');
    assert.ok(content.includes('snapshot') || content.includes('SNAPSHOT'), 'should handle snapshot rotation');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/session-end.test.js`
Expected: FAIL — script doesn't exist

**Step 3: Create the SessionEnd hook script**

Create `.claude/hooks/session-end.sh`:

```bash
#!/usr/bin/env bash
# SessionEnd hook — fires when a session terminates.
# Cleans up temp files and rotates old snapshots. Cannot block session exit.

set -euo pipefail

# 1. Clean up /tmp/.armadillo-* flag files from this session
rm -f /tmp/.armadillo-no-skill-yet
rm -f /tmp/.armadillo-skill-reminder-shown
rm -f /tmp/.armadillo-debug-session
rm -f /tmp/.armadillo-tests-failing

# 2. Rotate old pre-compact snapshots — keep last 10 of each type
SNAPSHOT_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/progress/snapshots"
if [ -d "$SNAPSHOT_DIR" ]; then
  for prefix in swarm-state error-log progress git-log; do
    # List files sorted by modification time (oldest first), skip the 10 newest
    FILES=$(ls -1t "$SNAPSHOT_DIR"/${prefix}-pre-compact-*.* 2>/dev/null || true)
    COUNT=$(echo "$FILES" | grep -c . 2>/dev/null || echo "0")
    if [ "$COUNT" -gt 10 ]; then
      echo "$FILES" | tail -n +"11" | xargs rm -f 2>/dev/null || true
    fi
  done
fi

exit 0
```

Make executable: `chmod +x .claude/hooks/session-end.sh`

**Step 4: Add SessionEnd to settings.json and hooks.json**

```json
"SessionEnd": [
  {
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-end.sh" }
    ]
  }
]
```

**Step 5: Run test, verify pass, commit**

Run: `node --test tests/session-end.test.js`
Expected: PASS

```bash
git add .claude/hooks/session-end.sh .claude/settings.json .claude/hooks/hooks.json tests/session-end.test.js
git commit -m "feat(hooks): add SessionEnd hook for temp file cleanup and snapshot rotation"
```

---

### Task 7: Add PostToolUseFailure hook — corrective error context

**Files:**
- Create: `.claude/hooks/tool-failure-context.sh`
- Modify: `.claude/settings.json` (add PostToolUseFailure event)
- Modify: `.claude/hooks/hooks.json` (add PostToolUseFailure event)

The `PostToolUseFailure` hook fires when a tool call fails. It receives `tool_name`, `tool_input`, `error`, and `is_interrupt`. Can return `additionalContext` — cannot block (tool already failed). Use this to inject corrective guidance (e.g., "if npm test fails, use systematic-debugging skill").

**Step 1: Write a test**

```javascript
// tests/tool-failure-context.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('tool-failure-context.sh', () => {
  const scriptPath = join(ROOT, '.claude', 'hooks', 'tool-failure-context.sh');

  it('exists and is executable', () => {
    assert.ok(existsSync(scriptPath));
    execSync(`test -x "${scriptPath}"`, { stdio: 'pipe' });
  });

  it('exits 0 for user interrupts', () => {
    execSync(
      `echo '{"tool_name":"Bash","error":"interrupted","is_interrupt":true}' | bash "${scriptPath}"`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    assert.ok(true);
  });

  it('provides context for test failures', () => {
    const result = execSync(
      `echo '{"tool_name":"Bash","tool_input":{"command":"npm test"},"error":"exit code 1","is_interrupt":false}' | bash "${scriptPath}"`,
      { cwd: ROOT, encoding: 'utf8', timeout: 5000 }
    );
    assert.ok(result.includes('additionalContext'), 'should provide additionalContext');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/tool-failure-context.test.js`
Expected: FAIL — script doesn't exist

**Step 3: Create the PostToolUseFailure hook script**

Create `.claude/hooks/tool-failure-context.sh`:

```bash
#!/usr/bin/env bash
# PostToolUseFailure hook — fires when a tool call fails.
# Injects corrective context. Cannot block (tool already failed).

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || TOOL_NAME=""
ERROR=$(echo "$INPUT" | jq -r '.error // ""' 2>/dev/null) || ERROR=""
IS_INTERRUPT=$(echo "$INPUT" | jq -r '.is_interrupt // false' 2>/dev/null) || IS_INTERRUPT="false"
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || COMMAND=""

# Skip user interrupts — nothing to fix
if [ "$IS_INTERRUPT" = "true" ]; then
  exit 0
fi

CONTEXT=""

# Test failures → suggest systematic-debugging
if [ "$TOOL_NAME" = "Bash" ]; then
  case "$COMMAND" in
    *"npm test"*|*"npx vitest"*|*"npx jest"*|*"pytest"*|*"node --test"*)
      CONTEXT="Test suite failed. Use the systematic-debugging skill to diagnose: is this a CODE BUG, CODE GAP, TEST BUG, or ENV issue? Do NOT tweak code randomly until tests pass."
      ;;
    *"git push"*)
      CONTEXT="Push failed. Check: authentication (env -u GITHUB_TOKEN), branch protection rules, or pre-push hook failures."
      ;;
    *"npm install"*|*"npm ci"*)
      CONTEXT="Package install failed. Check: node version (engines field), lockfile conflicts, or network issues."
      ;;
  esac
fi

# Write/Edit failures
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  CONTEXT="File operation failed. Check: file permissions, path existence, and whether the old_string for Edit matches exactly."
fi

if [ -n "$CONTEXT" ]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": "${CONTEXT}"
  }
}
EOF
fi

exit 0
```

Make executable: `chmod +x .claude/hooks/tool-failure-context.sh`

**Step 4: Add PostToolUseFailure to settings.json and hooks.json**

```json
"PostToolUseFailure": [
  {
    "hooks": [
      { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/tool-failure-context.sh" }
    ]
  }
]
```

**Step 5: Run test, verify pass, commit**

Run: `node --test tests/tool-failure-context.test.js`
Expected: PASS

```bash
git add .claude/hooks/tool-failure-context.sh .claude/settings.json .claude/hooks/hooks.json tests/tool-failure-context.test.js
git commit -m "feat(hooks): add PostToolUseFailure hook for corrective error context"
```

---

### Task 8: Add doctor.js check for settings.json ↔ hooks.json drift

**Files:**
- Modify: `.claude/lib/doctor.js` (add check between existing checks 3 and 4)

**Step 1: Write a test**

```javascript
// tests/doctor-drift.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('doctor.js settings↔hooks drift check', () => {
  it('contains drift detection logic', () => {
    const content = readFileSync(join(ROOT, '.claude', 'lib', 'doctor.js'), 'utf8');
    assert.ok(
      content.includes('settings.json') && content.includes('hooks.json') && content.includes('drift'),
      'should compare settings.json against hooks.json for drift'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/doctor-drift.test.js`
Expected: FAIL — doctor.js doesn't contain drift check

**Step 3: Add drift check to doctor.js**

After the "Hook scripts executable" check (section 4, around line 84), add:

```javascript
// 4b. Settings↔hooks.json drift check
const settingsPath2 = join(CLAUDE_DIR, 'settings.json');
if (existsSync(hooksPath) && existsSync(settingsPath2)) {
  try {
    const hooksConfig = JSON.parse(readFileSync(hooksPath, 'utf8'));
    const settingsConfig = JSON.parse(readFileSync(settingsPath2, 'utf8'));

    // Extract script filenames from hooks.json
    const hooksScripts = new Set();
    for (const [event, groups] of Object.entries(hooksConfig.hooks || {})) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command) {
            const match = hook.command.match(/([a-z-]+\.sh)/);
            if (match) hooksScripts.add(`${event}:${match[1]}`);
          }
        }
      }
    }

    // Extract script filenames from settings.json
    const settingsScripts = new Set();
    for (const [event, groups] of Object.entries(settingsConfig.hooks || {})) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          if (hook.command) {
            const match = hook.command.match(/([a-z-]+\.sh)/);
            if (match) settingsScripts.add(`${event}:${match[1]}`);
          }
        }
      }
    }

    // Check for drift — hooks.json entries missing from settings.json
    const missing = [...hooksScripts].filter(s => !settingsScripts.has(s));
    if (missing.length === 0) {
      ok('settings.json ↔ hooks.json in sync (no drift)');
    } else {
      fail(`settings.json ↔ hooks.json drift: ${missing.length} hook(s) missing from settings.json`);
      missing.forEach(m => console.log(`       ↳ ${m}`));
    }
  } catch (e) {
    warn(`Could not check drift: ${e.message}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/doctor-drift.test.js`
Expected: PASS

**Step 5: Run doctor to verify it works**

Run: `node .claude/lib/doctor.js`
Expected: Shows "settings.json ↔ hooks.json in sync (no drift)" if Task 1 is already done

**Step 6: Commit**

```bash
git add .claude/lib/doctor.js tests/doctor-drift.test.js
git commit -m "feat(doctor): add settings.json ↔ hooks.json drift detection"
```

---

### Task 9: Add statusMessage to all hooks

**Files:**
- Modify: `.claude/settings.json` (add statusMessage to each hook handler)
- Modify: `.claude/hooks/hooks.json` (add statusMessage to each hook handler)

The `statusMessage` field shows a custom spinner message while the hook runs. Add it to all hooks for better UX.

**Step 1: Write a test**

```javascript
// tests/hooks-status-messages.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('hooks statusMessage', () => {
  it('every non-inline hook in settings.json has a statusMessage', () => {
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    const missing = [];
    for (const [event, groups] of Object.entries(settings.hooks || {})) {
      for (const group of groups) {
        for (const hook of (group.hooks || [])) {
          // Skip inline commands (like rm -f)
          if (hook.command && hook.command.includes('.sh') && !hook.statusMessage) {
            missing.push(`${event}: ${hook.command.split('/').pop()}`);
          }
        }
      }
    }
    assert.deepStrictEqual(missing, [], `Missing statusMessage: ${missing.join(', ')}`);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/hooks-status-messages.test.js`
Expected: FAIL — no hooks have statusMessage yet

**Step 3: Add statusMessage to every hook handler in settings.json and hooks.json**

Status messages by hook:
- `session-start.sh` → `"Loading armadillo context..."`
- `inject-skill-awareness.sh` → `"Checking skill routing..."`
- `enforce-skills.sh` → `"Validating agent dispatch..."`
- `enforce-skill-gate.sh` → `"Checking skill gate..."`
- `enforce-debug-before-fix.sh` → `"Checking debug state..."`
- `post-push-pr-check.sh` → `"Checking PR status..."`
- `detect-test-failure.sh` → `"Detecting test results..."`
- `enforce-tdd-order.sh` → `"Checking TDD commit order..."`
- `nap-ninja-hook.sh` → `"Scanning for hardcoded business data..."`
- `env-ninja-hook.sh` → `"Scanning for hardcoded secrets..."`
- `async-lint.sh` → `"Running lint check..."` (async, shown briefly)
- `subagent-start.sh` → `"Injecting subagent context..."`
- `pre-compact.sh` → `"Saving pre-compact snapshot..."`
- `task-completed.sh` → `"Running completion checks..."`
- `stop-verification.sh` → `"Verification check..."`
- `subagent-stop.sh` → `"Checking subagent output..."`
- `session-end.sh` → `"Cleaning up session..."`
- `tool-failure-context.sh` → `"Analyzing failure..."`

Add `"statusMessage": "..."` to each hook handler object in both files.

**Step 4: Run test to verify it passes**

Run: `node --test tests/hooks-status-messages.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/settings.json .claude/hooks/hooks.json tests/hooks-status-messages.test.js
git commit -m "feat(hooks): add statusMessage to all hooks for better spinner UX"
```

---

### Task 10: Add snapshot rotation to pre-compact.sh

**Files:**
- Modify: `.claude/hooks/pre-compact.sh`

The SessionEnd hook (Task 6) handles rotation on exit, but we should also rotate during pre-compact to prevent unbounded growth in long-running sessions. Add the same rotation logic (keep last 10) to pre-compact.sh, before the new snapshot is created.

**Step 1: Write a test**

```javascript
// tests/pre-compact-rotation.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('pre-compact.sh snapshot rotation', () => {
  it('contains snapshot rotation logic', () => {
    const content = readFileSync(join(ROOT, '.claude', 'hooks', 'pre-compact.sh'), 'utf8');
    assert.ok(
      content.includes('tail -n') || content.includes('keep last') || content.includes('xargs rm'),
      'should rotate old snapshots'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/pre-compact-rotation.test.js`
Expected: FAIL — pre-compact.sh doesn't have rotation

**Step 3: Add rotation before snapshot creation**

In `.claude/hooks/pre-compact.sh`, after `mkdir -p "$SNAPSHOT_DIR"` (line 17) and before the snapshot copies, add:

```bash
# Rotate old snapshots — keep last 10 of each type
for prefix in swarm-state error-log progress git-log; do
  FILES=$(ls -1t "$SNAPSHOT_DIR"/${prefix}-pre-compact-*.* 2>/dev/null || true)
  COUNT=$(echo "$FILES" | grep -c . 2>/dev/null || echo "0")
  if [ "$COUNT" -gt 10 ]; then
    echo "$FILES" | tail -n +"11" | xargs rm -f 2>/dev/null || true
  fi
done
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/pre-compact-rotation.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add .claude/hooks/pre-compact.sh tests/pre-compact-rotation.test.js
git commit -m "feat(hooks): add snapshot rotation to pre-compact — keep last 10"
```

---

### Task 11: Update armadillo.json and sync-all.js for new hooks

**Files:**
- Modify: `armadillo.json` (add new hook entries to core.hooks)
- Modify: `scripts/sync-all.js` (add new hooks to requiredHooks list)

**Step 1: Write a test**

```javascript
// tests/new-hooks-manifest.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('new hooks in manifest', () => {
  it('armadillo.json lists all new hooks', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'armadillo.json'), 'utf8'));
    const hookNames = manifest.core.hooks.map(h => h.name || h);
    const newHooks = ['stop-verification.sh', 'subagent-stop.sh', 'session-end.sh', 'tool-failure-context.sh'];
    for (const hook of newHooks) {
      assert.ok(
        hookNames.some(h => typeof h === 'string' ? h.includes(hook) : (h.name || '').includes(hook)),
        `armadillo.json should list ${hook}`
      );
    }
  });

  it('sync-all.js validates new hooks', () => {
    const content = readFileSync(join(ROOT, 'scripts', 'sync-all.js'), 'utf8');
    assert.ok(content.includes('stop-verification.sh') || content.includes('Stop'),
      'sync-all should validate Stop hook');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/new-hooks-manifest.test.js`
Expected: FAIL — new hooks not in manifest

**Step 3: Add new hooks to armadillo.json**

Read `armadillo.json`, find the `core.hooks` array, and add entries for:
- `stop-verification.sh` (Stop event)
- `subagent-stop.sh` (SubagentStop event)
- `session-end.sh` (SessionEnd event)
- `tool-failure-context.sh` (PostToolUseFailure event)

**Step 4: Update sync-all.js requiredHooks array**

Add the 4 new hooks to the `requiredHooks` array in `validateHooks()`:

```javascript
{ event: 'Stop', script: 'stop-verification.sh', critical: false },
{ event: 'SubagentStop', script: 'subagent-stop.sh', critical: false },
{ event: 'SessionEnd', script: 'session-end.sh', critical: false },
{ event: 'PostToolUseFailure', script: 'tool-failure-context.sh', critical: false }
```

**Step 5: Run test, verify pass, commit**

Run: `node --test tests/new-hooks-manifest.test.js`
Expected: PASS

```bash
git add armadillo.json scripts/sync-all.js tests/new-hooks-manifest.test.js
git commit -m "feat(manifest): register 4 new hooks in armadillo.json and sync-all.js"
```

---

### Task 12: Add context: fork to skills for model enforcement

**Files:**
- Modify: Multiple `.claude/skills/*/SKILL.md` files

Skills with `model:` field only enforce the model when `context: fork` is set. Without it, skills run inline on the parent model.

**Important trade-off:** `context: fork` means the skill runs in an isolated subagent without conversation history. Only add it to skills designed as self-contained tasks. Do NOT add it to skills that need interactive conversation context.

**Skills to add `context: fork` to:**
- `cleanup/SKILL.md` (Sonnet — scans files, self-contained)
- `deps/SKILL.md` (Sonnet — audits packages, self-contained)
- `safe-merge/SKILL.md` (Sonnet — runs quality checks, self-contained)
- `verification-before-completion/SKILL.md` (Sonnet — runs verification commands, self-contained)
- `finishing-a-development-branch/SKILL.md` (Sonnet — guides merge, self-contained)
- `writing-prs/SKILL.md` (Sonnet — generates PR, self-contained)
- `requesting-code-review/SKILL.md` (Sonnet — prepares review request, self-contained)
- `git-setup/SKILL.md` (Sonnet — configures git, self-contained)

**Skills to SKIP (need conversation context):**
- `brainstorming` (interactive Q&A with user)
- `writing-plans` (needs design context from conversation)
- `executing-plans` (needs plan context)
- `systematic-debugging` (needs error context from conversation)
- `test-driven-development` (needs implementation context)
- `armadillo-shepherd` (router, must be inline)
- `receiving-code-review` (needs review feedback context)
- `subagent-driven-development` (orchestrator, must be inline)
- `dispatching-parallel-agents` (orchestrator, must be inline)
- All testing skills (vitest, playwright, etc. — reference skills, inline is correct)

**Step 1: Write a test**

```javascript
// tests/context-fork.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');

describe('context: fork enforcement', () => {
  const shouldHaveFork = [
    'onboarding', 'writing-skills', 'cleanup', 'deps', 'safe-merge',
    'verification-before-completion', 'finishing-a-development-branch',
    'writing-prs', 'requesting-code-review', 'git-setup'
  ];

  for (const skill of shouldHaveFork) {
    it(`${skill} has context: fork`, () => {
      const skillPath = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!existsSync(skillPath)) return; // skip if not present
      const content = readFileSync(skillPath, 'utf8');
      assert.ok(content.includes('context: fork'), `${skill} should have context: fork`);
    });
  }
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/context-fork.test.js`
Expected: FAIL — 8 skills missing `context: fork`

**Step 3: Add `context: fork` to each skill's frontmatter**

For each of the 8 skills listed above, add `context: fork` to the YAML frontmatter (after the `model:` or `description:` line, before the closing `---`).

**Step 4: Run test, verify pass, commit**

Run: `node --test tests/context-fork.test.js`
Expected: PASS

```bash
git add .claude/skills/*/SKILL.md tests/context-fork.test.js
git commit -m "feat(skills): add context: fork to 8 self-contained skills for model enforcement"
```

---

### Task 13: Create architecture.md documenting agent hierarchy

**Files:**
- Create: `.claude/docs/architecture.md`

Document the full armadillo agent hierarchy: how skills, agents, hooks, and rules interact. This is reference documentation for contributors.

**Step 1: Write a test**

```javascript
// tests/architecture-doc.test.js
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('architecture.md', () => {
  it('exists', () => {
    assert.ok(existsSync(join(ROOT, '.claude', 'docs', 'architecture.md')));
  });

  it('covers key sections', () => {
    const content = readFileSync(join(ROOT, '.claude', 'docs', 'architecture.md'), 'utf8');
    assert.ok(content.includes('Hook'), 'should document hooks');
    assert.ok(content.includes('Skill'), 'should document skills');
    assert.ok(content.includes('Agent'), 'should document agents');
    assert.ok(content.includes('Rule'), 'should document rules');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/architecture-doc.test.js`
Expected: FAIL — file doesn't exist

**Step 3: Write architecture.md**

Create `.claude/docs/architecture.md` documenting:
- **Layer 1: Rules** — always-loaded `.claude/rules/*.md`, enforce standards passively
- **Layer 2: Hooks** — event-driven enforcement, `settings.json` is runtime config, `hooks.json` is source of truth
- **Layer 3: Skills** — invokable workflow definitions, `context: fork` for isolation, `model:` for model selection
- **Layer 4: Agents** — subagent definitions in `.claude/agents/`, dispatched via Task tool
- **Orchestration** — armadillo-shepherd routes requests, skill packs add domain expertise
- **Data flow** — how user request flows through shepherd → skill → implementation → hooks → completion
- **File locations** — canonical paths for every component type

Keep it under 150 lines. Reference the routing table in armadillo-shepherd rather than duplicating it.

**Step 4: Run test, verify pass, commit**

Run: `node --test tests/architecture-doc.test.js`
Expected: PASS

```bash
git add .claude/docs/architecture.md tests/architecture-doc.test.js
git commit -m "docs: add architecture.md documenting armadillo agent hierarchy"
```

---

### Task 14: Run full test suite and verify everything

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS (including all new tests from Tasks 1-13)

**Step 2: Run doctor.js**

Run: `node .claude/lib/doctor.js`
Expected: All checks pass, including the new drift check

**Step 3: Run sync-all.js**

Run: `node scripts/sync-all.js`
Expected: All validations pass

**Step 4: Verify hook count**

Count hooks in settings.json — should have 11 event types:
SessionStart, PreToolUse, UserPromptSubmit, SubagentStart, PreCompact, PostToolUse, TaskCompleted, Stop, SubagentStop, SessionEnd, PostToolUseFailure

**Step 5: Final commit if any fixes needed**

If any issues found, fix and commit with: `fix(audit): <description>`
