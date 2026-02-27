# Enforcement Hooks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add PreToolUse and UserPromptSubmit hooks that prevent Claude from bypassing armadillo skills with built-in agents/tools.

**Architecture:** Three hooks in `.claude/hooks/hooks.json`: (1) inline EnterPlanMode blocker, (2) shell script that parses Task tool dispatches and blocks Plan/Explore agent types, (3) shell script that injects skill awareness on every user prompt. All `type: "command"`, deterministic, no LLM calls.

**Tech Stack:** Bash shell scripts, `jq` for JSON parsing, Node.js `node:test` for unit tests

**Design doc:** `.claude/docs/plans/2026-02-18-enforcement-hooks-design.md`

---

### Task 1: enforce-skills.sh — Tests and Implementation

**Files:**
- Create: `tests/enforce-skills.test.js`
- Create: `.claude/hooks/enforce-skills.sh`

**Context:** This script is called by a `PreToolUse` hook with matcher `Task`. It receives JSON on stdin containing `tool_input.subagent_type`. It must block `Plan` and `Explore` types (exit 2 + stderr) and allow everything else (exit 0).

**Step 1: Write the failing tests**

Create `tests/enforce-skills.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '..', '.claude', 'hooks', 'enforce-skills.sh');

function run(input) {
  try {
    const stdout = execSync(`echo '${JSON.stringify(input)}' | bash "${SCRIPT}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return { exitCode: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

describe('enforce-skills.sh', () => {
  test('blocks Plan agent type with exit 2', () => {
    const result = run({ tool_input: { subagent_type: 'Plan' } });
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /writing-plans/i);
  });

  test('blocks Explore agent type with exit 2', () => {
    const result = run({ tool_input: { subagent_type: 'Explore' } });
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Glob|Grep|Read|skill/i);
  });

  test('allows general-purpose agent type', () => {
    const result = run({ tool_input: { subagent_type: 'general-purpose' } });
    assert.equal(result.exitCode, 0);
  });

  test('allows Bash agent type', () => {
    const result = run({ tool_input: { subagent_type: 'Bash' } });
    assert.equal(result.exitCode, 0);
  });

  test('allows code-reviewer agent type', () => {
    const result = run({ tool_input: { subagent_type: 'code-reviewer' } });
    assert.equal(result.exitCode, 0);
  });

  test('allows when subagent_type is missing', () => {
    const result = run({ tool_input: {} });
    assert.equal(result.exitCode, 0);
  });

  test('allows when tool_input is missing', () => {
    const result = run({});
    assert.equal(result.exitCode, 0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/enforce-skills.test.js`
Expected: FAIL — script does not exist yet

**Step 3: Write the implementation**

Create `.claude/hooks/enforce-skills.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse hook: blocks Plan and Explore Task agent dispatches.
# Matcher: Task — fires on every Task tool call.
# Reads tool_input.subagent_type from stdin JSON.

set -euo pipefail

INPUT=$(cat)
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')

case "$AGENT_TYPE" in
  Plan)
    echo "Blocked: Plan agent is disabled. Use the writing-plans skill instead: invoke Skill tool with skill=\"writing-plans\"" >&2
    exit 2
    ;;
  Explore)
    echo "Blocked: Explore agent is disabled. Use Glob/Grep/Read tools directly, or invoke a matching skill (e.g. systematic-debugging, writing-skills)." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
```

**Step 4: Make the script executable**

Run: `chmod +x .claude/hooks/enforce-skills.sh`

**Step 5: Run tests to verify they pass**

Run: `node --test tests/enforce-skills.test.js`
Expected: 7/7 PASS

**Step 6: Commit**

```bash
git add tests/enforce-skills.test.js .claude/hooks/enforce-skills.sh
git commit -m "feat: add enforce-skills.sh hook to block Plan/Explore agents"
```

---

### Task 2: inject-skill-awareness.sh — Tests and Implementation

**Files:**
- Create: `tests/inject-skill-awareness.test.js`
- Create: `.claude/hooks/inject-skill-awareness.sh`

**Context:** This script is called by a `UserPromptSubmit` hook (no matcher — fires on every prompt). It outputs JSON with `hookSpecificOutput.additionalContext` to inject a skill awareness reminder into Claude's context. Always exits 0.

**Step 1: Write the failing tests**

Create `tests/inject-skill-awareness.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '..', '.claude', 'hooks', 'inject-skill-awareness.sh');

function run(input = {}) {
  const stdout = execSync(`echo '${JSON.stringify(input)}' | bash "${SCRIPT}"`, {
    encoding: 'utf8',
  });
  return JSON.parse(stdout);
}

describe('inject-skill-awareness.sh', () => {
  test('outputs valid JSON', () => {
    const result = run({ prompt: 'hello' });
    assert.equal(typeof result, 'object');
  });

  test('has hookSpecificOutput with correct event name', () => {
    const result = run({ prompt: 'hello' });
    assert.equal(result.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  });

  test('has additionalContext with skill reminder', () => {
    const result = run({ prompt: 'hello' });
    const ctx = result.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('skill'), 'should mention skills');
    assert.ok(ctx.includes('Skill tool') || ctx.includes('Skill'), 'should reference Skill tool');
  });

  test('mentions blocked agent types in reminder', () => {
    const result = run({ prompt: 'hello' });
    const ctx = result.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('Explore') || ctx.includes('Plan'), 'should mention blocked agents');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `node --test tests/inject-skill-awareness.test.js`
Expected: FAIL — script does not exist yet

**Step 3: Write the implementation**

Create `.claude/hooks/inject-skill-awareness.sh`:

```bash
#!/usr/bin/env bash
# UserPromptSubmit hook: injects skill awareness reminder into Claude's context.
# No matcher — fires on every user prompt.

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "REMINDER: Before responding, check if an armadillo skill applies to this request. Use the Skill tool to invoke skills. Never bypass skills with Explore/Plan agents or EnterPlanMode."
  }
}
EOF

exit 0
```

**Step 4: Make the script executable**

Run: `chmod +x .claude/hooks/inject-skill-awareness.sh`

**Step 5: Run tests to verify they pass**

Run: `node --test tests/inject-skill-awareness.test.js`
Expected: 4/4 PASS

**Step 6: Commit**

```bash
git add tests/inject-skill-awareness.test.js .claude/hooks/inject-skill-awareness.sh
git commit -m "feat: add inject-skill-awareness.sh hook for per-prompt reminders"
```

---

### Task 3: Update hooks.json — Add All Three Hooks

**Files:**
- Modify: `.claude/hooks/hooks.json`

**Context:** Add the three enforcement hooks to the existing hooks.json that currently only has `SessionStart`. The EnterPlanMode blocker is an inline command (no script file). The Task and UserPromptSubmit hooks reference the scripts created in Tasks 1-2.

**Step 1: Edit hooks.json**

Replace the entire contents of `.claude/hooks/hooks.json` with:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh",
            "async": false
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "EnterPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Blocked: EnterPlanMode is disabled. Use the writing-plans skill instead: invoke Skill tool with skill=\"writing-plans\"' >&2; exit 2"
          }
        ]
      },
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/enforce-skills.sh"
          }
        ]
      }
    ],
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
  }
}
```

**Step 2: Validate JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/hooks/hooks.json', 'utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Run all tests to confirm nothing broke**

Run: `node --test tests/*.test.js`
Expected: All tests pass (existing + new)

**Step 4: Commit**

```bash
git add .claude/hooks/hooks.json
git commit -m "feat: register enforcement hooks in hooks.json"
```

---

### Task 4: Update skills.json sharedFiles

**Files:**
- Modify: `skills.json:329-334` (sharedFiles.hooks array)

**Context:** The `sharedFiles.hooks` array tells the armadillo installer which hook files to copy to user projects. Add the two new scripts.

**Step 1: Edit skills.json**

Add the two new hook scripts to the `sharedFiles.hooks` array. The array should become:

```json
"hooks": [
  "hooks/hooks.json",
  "hooks/enforce-skills.sh",
  "hooks/inject-skill-awareness.sh",
  "hooks/reinject-after-compact.sh",
  "hooks/run-hook.cmd",
  "hooks/session-start.sh"
]
```

Keep alphabetical order after `hooks.json`.

**Step 2: Validate JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('skills.json', 'utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Run all tests to confirm nothing broke**

Run: `node --test tests/*.test.js`
Expected: All tests pass

**Step 4: Commit**

```bash
git add skills.json
git commit -m "feat: add enforcement hook scripts to sharedFiles manifest"
```

---

### Task 5: Run Full Test Suite and Verify

**Files:** None (verification only)

**Step 1: Run npm test (all unit tests)**

Run: `npm test`
Expected: All tests pass including new enforce-skills and inject-skill-awareness tests

**Step 2: Verify hook scripts are executable**

Run: `ls -la .claude/hooks/enforce-skills.sh .claude/hooks/inject-skill-awareness.sh`
Expected: Both show `-rwxr-xr-x` permissions

**Step 3: Manual smoke test — enforce-skills.sh**

Run each of these and verify output:

```bash
echo '{"tool_input":{"subagent_type":"Plan"}}' | .claude/hooks/enforce-skills.sh
# Expected: exit 2, stderr mentions writing-plans

echo '{"tool_input":{"subagent_type":"Explore"}}' | .claude/hooks/enforce-skills.sh
# Expected: exit 2, stderr mentions Glob/Grep/Read

echo '{"tool_input":{"subagent_type":"general-purpose"}}' | .claude/hooks/enforce-skills.sh
# Expected: exit 0, no output

echo '{"tool_input":{"subagent_type":"Bash"}}' | .claude/hooks/enforce-skills.sh
# Expected: exit 0, no output
```

**Step 4: Manual smoke test — inject-skill-awareness.sh**

```bash
echo '{"prompt":"hello"}' | .claude/hooks/inject-skill-awareness.sh
# Expected: valid JSON with hookSpecificOutput.additionalContext
```

**Step 5: Validate hooks.json references**

Run: `node -e "const h = JSON.parse(require('fs').readFileSync('.claude/hooks/hooks.json','utf8')); console.log('Events:', Object.keys(h.hooks).join(', '))"`
Expected: `Events: SessionStart, PreToolUse, UserPromptSubmit`
