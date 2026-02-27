# Claude Code System Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Implement all audit-identified improvements: TDD hard gate via TaskCompleted hook, improved Stop hook, SubagentStart context injection, async lint feedback, skill/config fixes, GitHub Action for auto-updating README on push to main, and a cleaner release process.

**Architecture:** New hooks (TaskCompleted, SubagentStart, async PostToolUse) are bash scripts registered in hooks.json and added to skills.json sharedFiles so they ship to all Armadilloers. A GitHub Action reads skills.json as the single source of truth and auto-commits README updates on every push to main. CLAUDE_CODE_SUBAGENT_MODEL=sonnet added to shipped settings.json.

**Tech Stack:** Bash hooks, Node.js (GitHub Action script), GitHub Actions YAML, JSON (skills.json, CHANGELOG.json), Markdown (README.md, skill files)

**Downstream compatibility:** All changes are additive. No breaking changes. Existing Armadilloers running `/updating-armadillo` will receive new hook scripts and updated files automatically.

---

## Phase 1 — New Hook Scripts

### Task 1: Create task-completed.sh

**Files:**
- Create: `.claude/hooks/task-completed.sh`

**Step 1: Write the hook script**

```bash
#!/usr/bin/env bash
# TaskCompleted hook — blocks task completion if tests fail.
# Fires when any agent calls TaskUpdate(status: "completed").
# Detects test runner automatically. Exits 0 (allow) if no tests found.

set -euo pipefail

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty' 2>/dev/null) || TASK_SUBJECT=""

# Only enforce on code-related tasks
case "$TASK_SUBJECT" in
  *implement*|*fix*|*add*|*feat*|*refactor*|*create*|*build*|*update*|*write*)
    ;;
  *)
    exit 0
    ;;
esac

# Detect test runner and run tests with a 60s timeout
run_tests() {
  # TypeScript/JavaScript — vitest
  if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    timeout 60 npx vitest run --reporter=verbose 2>&1
    return $?
  fi

  # TypeScript/JavaScript — jest
  if [ -f "jest.config.ts" ] || [ -f "jest.config.js" ] || [ -f "jest.config.mjs" ]; then
    timeout 60 npx jest --passWithNoTests 2>&1
    return $?
  fi

  # package.json with test script
  if [ -f "package.json" ]; then
    TEST_SCRIPT=$(node -e "const p=require('./package.json');process.stdout.write(p.scripts&&p.scripts.test?p.scripts.test:'')" 2>/dev/null)
    if [ -n "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "echo \"Error: no test specified\" && exit 1" ]; then
      timeout 60 npm test 2>&1
      return $?
    fi
  fi

  # Python — pytest
  if [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] && grep -q "\[tool.pytest" pyproject.toml 2>/dev/null; then
    timeout 60 python -m pytest -q 2>&1
    return $?
  fi

  # No test runner found — allow completion
  return 0
}

OUTPUT=$(run_tests)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | tail -20)
  echo "Tests failing — fix before completing '${TASK_SUBJECT}':" >&2
  echo "$TRIMMED" >&2
  exit 2
fi

exit 0
```

**Step 2: Make executable**

```bash
chmod +x /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/.claude/hooks/task-completed.sh
```

Expected: no output, exit 0.

**Step 3: Commit**

```bash
git add .claude/hooks/task-completed.sh
git commit -m "feat(hooks): add TaskCompleted hook — TDD hard gate on task completion"
```

---

### Task 2: Update stop-verify.sh

The current Stop hook has a loop risk: if it fires and Claude continues, the next Stop fires again indefinitely. Fix by checking `stop_hook_active`. Also improve the message to be more actionable.

**Files:**
- Modify: `.claude/hooks/stop-verify.sh`

**Step 1: Replace the script content**

Replace the entire file with:

```bash
#!/usr/bin/env bash
# Stop hook — injects a verification reminder before Claude finishes responding.
# Checks stop_hook_active to prevent infinite loops.
# Advisory only — does not block. Hard enforcement is in TaskCompleted hook.

set -euo pipefail

INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || STOP_HOOK_ACTIVE="false"

# If already in a stop hook cycle, exit silently to prevent loops
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

REMINDER="Before finishing: (1) All tests pass — run them if unsure. (2) No uncommitted changes left behind. (3) TaskList has no orphaned in_progress tasks. Use the verification-before-completion skill if any of these are unchecked."
REMINDER_ESCAPED=$(escape_for_json "$REMINDER")

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "${REMINDER_ESCAPED}"
  }
}
EOF

exit 0
```

**Step 2: Verify JSON is valid**

```bash
bash -c 'INPUT='"'"'{"stop_hook_active": false}'"'"' bash .claude/hooks/stop-verify.sh <<< "$INPUT" | jq .'
```

Expected: valid JSON with `hookSpecificOutput.additionalContext`.

**Step 3: Commit**

```bash
git add .claude/hooks/stop-verify.sh
git commit -m "fix(hooks): add stop_hook_active guard to Stop hook — prevents infinite loops"
```

---

### Task 3: Create subagent-start.sh

Inject armadillo coding standards into every spawned subagent's context at startup.

**Files:**
- Create: `.claude/hooks/subagent-start.sh`

**Step 1: Write the hook script**

```bash
#!/usr/bin/env bash
# SubagentStart hook — injects coding standards and output style into subagent context.
# Fires whenever a Task tool call spawns a subagent.
# Subagents don't inherit the parent session's loaded rules, so this bridges the gap.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

# Load coding standards and output style
STANDARDS_CONTEXT=""

coding_standards="${PLUGIN_ROOT}/rules/coding-standards.md"
if [ -f "$coding_standards" ]; then
  content=$(cat "$coding_standards" 2>/dev/null || true)
  escaped=$(escape_for_json "$content")
  STANDARDS_CONTEXT="<coding-standards>\n${escaped}\n</coding-standards>"
fi

output_style="${PLUGIN_ROOT}/rules/output-style.md"
if [ -f "$output_style" ]; then
  content=$(cat "$output_style" 2>/dev/null || true)
  escaped=$(escape_for_json "$content")
  STANDARDS_CONTEXT="${STANDARDS_CONTEXT}\n\n<output-style>\n${escaped}\n</output-style>"
fi

if [ -z "$STANDARDS_CONTEXT" ]; then
  exit 0
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "${STANDARDS_CONTEXT}"
  }
}
EOF

exit 0
```

**Step 2: Make executable**

```bash
chmod +x /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/.claude/hooks/subagent-start.sh
```

**Step 3: Commit**

```bash
git add .claude/hooks/subagent-start.sh
git commit -m "feat(hooks): add SubagentStart hook — inject coding standards into all subagents"
```

---

### Task 4: Create async-lint.sh

Non-blocking post-edit lint/typecheck. Fires async after Write or Edit — Claude keeps working while checks run. Results arrive on the next turn.

**Files:**
- Create: `.claude/hooks/async-lint.sh`

**Step 1: Write the hook script**

```bash
#!/usr/bin/env bash
# PostToolUse async hook — runs typecheck/lint after Write or Edit.
# async: true in hooks.json — Claude is NOT blocked while this runs.
# Results arrive as systemMessage on next conversation turn.

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || FILE_PATH=""

# Skip non-source files
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.md|*.json|*.sh|*.txt|*.yaml|*.yml|*.toml|*.lock) exit 0 ;;
esac

run_check() {
  # TypeScript — tsc
  if [ -f "tsconfig.json" ] && command -v npx >/dev/null 2>&1; then
    timeout 30 npx tsc --noEmit 2>&1
    return $?
  fi

  # Deno
  if command -v deno >/dev/null 2>&1 && [ -f "deno.json" ]; then
    timeout 30 deno check "$FILE_PATH" 2>&1
    return $?
  fi

  # Python — mypy if available
  if [[ "$FILE_PATH" == *.py ]] && command -v mypy >/dev/null 2>&1; then
    timeout 30 mypy "$FILE_PATH" --ignore-missing-imports 2>&1
    return $?
  fi

  return 0
}

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

OUTPUT=$(run_check)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | head -15)
  ESCAPED=$(escape_for_json "$TRIMMED")
  FILENAME=$(basename "$FILE_PATH")
  echo "{\"systemMessage\": \"Type errors after editing ${FILENAME}: ${ESCAPED}\"}"
fi

exit 0
```

**Step 2: Make executable**

```bash
chmod +x /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/.claude/hooks/async-lint.sh
```

**Step 3: Commit**

```bash
git add .claude/hooks/async-lint.sh
git commit -m "feat(hooks): add async lint hook — non-blocking typecheck after Write/Edit"
```

---

### Task 5: Update hooks.json

Register all new hooks.

**Files:**
- Modify: `.claude/hooks/hooks.json`

**Step 1: Replace hooks.json content**

New content (complete file):

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
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/subagent-start.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/pre-compact.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-push-pr-check.sh"
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/async-lint.sh",
            "async": true,
            "timeout": 60
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/task-completed.sh",
            "timeout": 90
          }
        ]
      }
    ],
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
  }
}
```

**Step 2: Validate JSON**

```bash
jq . /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/.claude/hooks/hooks.json
```

Expected: valid JSON, no errors.

**Step 3: Commit**

```bash
git add .claude/hooks/hooks.json
git commit -m "feat(hooks): register TaskCompleted, SubagentStart, async lint in hooks.json"
```

---

## Phase 2 — Skill and Config Fixes

### Task 6: Fix TDD skill broken reference

The TDD skill references `verify-tdd-order.sh` which doesn't exist. Remove it.

**Files:**
- Modify: `.claude/skills/test-driven-development/SKILL.md`

**Step 1: Remove the broken reference block**

Find this block in the file (near line 350):
```markdown
**Automated verification (if available):**
```bash
# Check TDD ordering across branch commits
.claude/scripts/verify-tdd-order.sh
```
This script checks git history to verify test commits came before implementation commits. Run it before claiming TDD compliance.
```

Replace with nothing (delete entirely). The verification checklist above it is sufficient.

**Step 2: Confirm the file still reads correctly**

Read the file around that area to confirm no orphaned content.

**Step 3: Commit**

```bash
git add .claude/skills/test-driven-development/SKILL.md
git commit -m "fix(tdd): remove broken verify-tdd-order.sh reference"
```

---

### Task 7: Add allowed-tools to writing-prs skill

When writing-prs skill is active, `gh` commands shouldn't require permission prompts.

**Files:**
- Modify: `.claude/skills/writing-prs/SKILL.md`

**Step 1: Update frontmatter**

Current frontmatter:
```yaml
---
name: writing-prs
description: Use when creating pull requests, writing PR descriptions, or when finishing-a-development-branch creates a PR. Ensures PR titles follow conventional commits and descriptions follow the hybrid template format.
---
```

New frontmatter (add `allowed-tools`):
```yaml
---
name: writing-prs
description: Use when creating pull requests, writing PR descriptions, or when finishing-a-development-branch creates a PR. Ensures PR titles follow conventional commits and descriptions follow the hybrid template format.
allowed-tools: "Bash(gh *)"
---
```

**Step 2: Commit**

```bash
git add .claude/skills/writing-prs/SKILL.md
git commit -m "feat(writing-prs): allow gh commands without permission prompts"
```

---

### Task 8: Add CLAUDE_CODE_SUBAGENT_MODEL to settings.json

All Task-dispatched subagents globally use Sonnet by default, regardless of main session model. Prevents Opus session from making all subagents Opus too.

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Update settings.json**

Current content:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [...]
  }
}
```

Add `env` field:
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

**Step 2: Validate JSON**

```bash
jq . /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/.claude/settings.json
```

Expected: valid JSON.

**Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat(settings): set CLAUDE_CODE_SUBAGENT_MODEL=sonnet — subagents use Sonnet globally"
```

---

## Phase 3 — GitHub Action + Auto-README

### Task 9: Add auto-generation markers to README.md

Add HTML comment markers so the update script can replace dynamic sections without touching the rest of the file.

**Files:**
- Modify: `README.md`

**Step 1: Wrap the core skills count and table**

Find in README.md:
```
22 skills covering the full development lifecycle:

| Skill | What it does |
|-------|-------------|
| **brainstorming** | ...
...
| **vitest** | ... |
```

Replace with (same content, add markers):
```
<!-- BEGIN:core-skills-count -->22<!-- END:core-skills-count --> skills covering the full development lifecycle:

<!-- BEGIN:core-skills-table -->
| Skill | What it does |
|-------|-------------|
| **brainstorming** | Explore intent and requirements before building |
...all rows...
| **vitest** | Vitest unit and component testing — Vite-native, Jest-compatible API |
<!-- END:core-skills-table -->
```

**Step 2: Wrap the rules count and table**

Find:
```
4 rules ship with every install:

| Rule | What it enforces |
...
```

Replace with:
```
<!-- BEGIN:rules-count -->4<!-- END:rules-count --> rules ship with every install:

<!-- BEGIN:rules-table -->
| Rule | What it enforces |
|------|-----------------|
...
<!-- END:rules-table -->
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "chore(readme): add auto-generation markers for CI script"
```

---

### Task 10: Create scripts/update-readme.js

Node.js script that reads skills.json as source of truth and regenerates the marked sections of README.md.

**Files:**
- Create: `scripts/update-readme.js`

**Step 1: Create the scripts directory and file**

```javascript
#!/usr/bin/env node
/**
 * update-readme.js
 * Reads skills.json as source of truth and updates README.md marked sections.
 * Runs in CI on push to main. Also runnable locally: node scripts/update-readme.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const skillsJson = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// Read CHANGELOG.json to validate version consistency
const changelogJson = JSON.parse(readFileSync(join(ROOT, 'CHANGELOG.json'), 'utf8'));
const changelogLatest = Object.keys(changelogJson)[0];
const packageVersion = packageJson.version;

if (changelogLatest !== packageVersion) {
  console.error(`VERSION MISMATCH: package.json has ${packageVersion} but CHANGELOG.json latest is ${changelogLatest}`);
  console.error('Update both files to match before pushing to main.');
  process.exit(1);
}

// Build core skills table from skills.json
const coreSkills = skillsJson.bundles.core.skills;
const skillsTable = [
  '| Skill | What it does |',
  '|-------|-------------|',
  ...coreSkills.map(name => {
    const skill = skillsJson.skills[name];
    if (!skill) return `| **${name}** | |`;
    return `| **${name}** | ${skill.description} |`;
  })
].join('\n');

// Build rules table from sharedFiles.rules
const rulesFiles = skillsJson.sharedFiles.rules;
const rulesDescriptions = {
  'rules/coding-standards.md': 'DRY, YAGNI, TDD, smart backgrounding, skill-first workflow',
  'rules/git-workflow.md': '`env -u GITHUB_TOKEN` auth, conventional commits, atomic changes',
  'rules/output-style.md': 'Consistent formatting, status markers, Armadilloer voice',
  'rules/pr-format.md': 'Conventional commits PR titles, hybrid template, anti-patterns',
};
const rulesTable = [
  '| Rule | What it enforces |',
  '|------|-----------------|',
  ...rulesFiles.map(file => {
    const name = file.replace('rules/', '').replace('.md', '');
    const desc = rulesDescriptions[file] || '';
    return `| **${name}** | ${desc} |`;
  })
].join('\n');

// Update README.md
let readme = readFileSync(join(ROOT, 'README.md'), 'utf8');

function replaceBetweenMarkers(content, marker, replacement) {
  const begin = `<!-- BEGIN:${marker} -->`;
  const end = `<!-- END:${marker} -->`;
  const regex = new RegExp(`${begin}[\\s\\S]*?${end}`, 'g');
  return content.replace(regex, `${begin}${replacement}${end}`);
}

readme = replaceBetweenMarkers(readme, 'core-skills-count', String(coreSkills.length));
readme = replaceBetweenMarkers(readme, 'core-skills-table', `\n${skillsTable}\n`);
readme = replaceBetweenMarkers(readme, 'rules-count', String(rulesFiles.length));
readme = replaceBetweenMarkers(readme, 'rules-table', `\n${rulesTable}\n`);

writeFileSync(join(ROOT, 'README.md'), readme, 'utf8');

console.log(`✓ README.md updated — ${coreSkills.length} core skills, ${rulesFiles.length} rules`);
console.log(`✓ Version consistency: ${packageVersion} ✓`);
```

**Step 2: Add npm script to package.json**

In `package.json`, update the scripts field:
```json
"scripts": {
  "test": "node --test tests/*.test.js",
  "update-readme": "node scripts/update-readme.js"
}
```

**Step 3: Test the script locally**

```bash
node /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/scripts/update-readme.js
```

Expected: `✓ README.md updated — 22 core skills, 4 rules` and `✓ Version consistency: 0.4.0 ✓`

**Step 4: Commit**

```bash
git add scripts/update-readme.js package.json
git commit -m "feat(scripts): add update-readme.js — skills.json as source of truth for README"
```

---

### Task 11: Create GitHub Action

Auto-runs the update script on every push to main. Commits README changes back if anything changed.

**Files:**
- Create: `.github/workflows/update-readme.yml`

**Step 1: Create .github/workflows directory and file**

```yaml
name: Update README

on:
  push:
    branches: [main]
    paths-ignore:
      - 'README.md'  # prevent loop on auto-commits

jobs:
  update-readme:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run update-readme script
        run: node scripts/update-readme.js

      - name: Commit README if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add README.md
          if git diff --staged --quiet; then
            echo "README.md already up to date — no commit needed"
          else
            git commit -m "chore(ci): auto-update README from skills.json [skip ci]"
            git push
            echo "README.md updated and pushed"
          fi
```

**Step 2: Verify YAML syntax (manual check)**

Read the file back and confirm indentation is correct. YAML is whitespace-sensitive.

**Step 3: Commit**

```bash
git add .github/workflows/update-readme.yml
git commit -m "feat(ci): add GitHub Action to auto-update README on push to main"
```

---

## Phase 4 — Release

### Task 12: Update skills.json — add new hooks to sharedFiles

New hook scripts must be listed in `sharedFiles.hooks` so `updating-armadillo` ships them to users.

**Files:**
- Modify: `skills.json`

**Step 1: Update sharedFiles.hooks array**

Current `sharedFiles.hooks`:
```json
[
  "hooks/hooks.json",
  "hooks/enforce-skills.sh",
  "hooks/inject-skill-awareness.sh",
  "hooks/pre-compact.sh",
  "hooks/reinject-after-compact.sh",
  "hooks/session-start.sh",
  "hooks/stop-verify.sh",
  "hooks/post-push-pr-check.sh"
]
```

New (add 3 new scripts):
```json
[
  "hooks/hooks.json",
  "hooks/enforce-skills.sh",
  "hooks/inject-skill-awareness.sh",
  "hooks/pre-compact.sh",
  "hooks/reinject-after-compact.sh",
  "hooks/session-start.sh",
  "hooks/stop-verify.sh",
  "hooks/post-push-pr-check.sh",
  "hooks/task-completed.sh",
  "hooks/subagent-start.sh",
  "hooks/async-lint.sh"
]
```

**Step 2: Validate JSON**

```bash
jq . /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/skills.json | head -20
```

Expected: valid JSON output.

**Step 3: Commit**

```bash
git add skills.json
git commit -m "chore(skills): register new hooks in sharedFiles for downstream distribution"
```

---

### Task 13: Version bump, CHANGELOG, CLAUDE.md

Bump to 0.5.0 (minor — new hooks, GitHub CI, settings update). Update all release files.

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.json`
- Modify: `.claude/CLAUDE.md`

**Step 1: Bump version in package.json**

Change `"version": "0.4.0"` to `"version": "0.5.0"`.

**Step 2: Add 0.5.0 entry to CHANGELOG.json**

Add at the top of the JSON object (before `"0.4.0"`):

```json
"0.5.0": {
  "date": "2026-02-18",
  "changes": [
    {
      "type": "added",
      "skill": "task-completed-hook",
      "files": ["hooks/task-completed.sh"],
      "summary": "New hook: TaskCompleted — TDD hard gate blocks task completion if tests fail",
      "details": "Detects test runner (vitest, jest, npm test, pytest) automatically. Fires on every TaskUpdate(status: completed) call. Exits 0 if no test infrastructure found — never blocks non-code projects. 90s timeout.",
      "breaking": false
    },
    {
      "type": "improved",
      "skill": "stop-verify",
      "files": ["hooks/stop-verify.sh"],
      "summary": "Stop hook now checks stop_hook_active to prevent infinite loops",
      "details": "Previously the Stop hook could trigger an infinite loop if Claude continued in response to it. Now checks stop_hook_active field and exits silently if already in a Stop hook cycle.",
      "breaking": false
    },
    {
      "type": "added",
      "skill": "subagent-start-hook",
      "files": ["hooks/subagent-start.sh"],
      "summary": "New hook: SubagentStart — injects coding standards into all subagents",
      "details": "Subagents don't inherit the parent session's loaded rules. This hook injects coding-standards.md and output-style.md into every spawned subagent's context, ensuring consistent behavior across all Task-dispatched agents.",
      "breaking": false
    },
    {
      "type": "added",
      "skill": "async-lint-hook",
      "files": ["hooks/async-lint.sh"],
      "summary": "New hook: async lint/typecheck after Write or Edit — non-blocking",
      "details": "Runs TypeScript (tsc --noEmit), Deno check, or mypy after file edits. async: true — Claude keeps working while checks run. Results arrive as systemMessage on next turn. Gracefully skips projects without type checkers.",
      "breaking": false
    },
    {
      "type": "added",
      "skill": "writing-prs",
      "files": ["skills/writing-prs/SKILL.md"],
      "summary": "writing-prs: allow gh commands without permission prompts via allowed-tools",
      "details": "Added allowed-tools: Bash(gh *) to writing-prs frontmatter. When this skill is active, gh subcommands don't require per-use approval.",
      "breaking": false
    },
    {
      "type": "improved",
      "skill": "settings",
      "files": ["settings.json"],
      "summary": "settings.json: CLAUDE_CODE_SUBAGENT_MODEL=sonnet — subagents use Sonnet globally",
      "details": "Prevents Opus main sessions from spawning Opus subagents by default. All Task-dispatched subagents now use Sonnet unless overridden per-agent.",
      "breaking": false
    },
    {
      "type": "added",
      "skill": "ci",
      "files": [".github/workflows/update-readme.yml", "scripts/update-readme.js"],
      "summary": "GitHub Action: auto-update README on push to main from skills.json",
      "details": "Skills.json is now the single source of truth for README skill counts and tables. The CI script also validates package.json version matches CHANGELOG.json latest entry — fails if they're out of sync. Run `npm run update-readme` locally to test.",
      "breaking": false
    }
  ]
},
```

**Step 3: Update .claude/CLAUDE.md hooks section**

In the CLAUDE.md, the hooks section (if present) should reference the new hooks. Find the `## Background Execution` section or relevant section that mentions hooks and add a note about the new TaskCompleted and SubagentStart hooks.

If there's no hooks section, no update needed.

**Step 4: Validate CHANGELOG.json**

```bash
jq 'keys | .[0]' /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/CHANGELOG.json
```

Expected: `"0.5.0"`

**Step 5: Run update-readme.js to verify version passes**

```bash
node /Users/zachwieder/Documents/AGENCY/Zach\ Tools/armadillo-cli/scripts/update-readme.js
```

Expected: `✓ Version consistency: 0.5.0 ✓`

**Step 6: Commit all release files**

```bash
git add package.json CHANGELOG.json .claude/CLAUDE.md
git commit -m "chore(release): bump to 0.5.0 — system improvements release"
```

---

### Task 14: Create PR

Use the writing-prs skill to create the PR.

**Step 1: Push to remote**

```bash
env -u GITHUB_TOKEN git push origin main
```

**Step 2: Invoke writing-prs skill**

```
/writing-prs
```

The skill will guide creation of the PR with conventional commits title and hybrid template body.

PR title should be: `feat(system): hooks, CI auto-readme, and config improvements`

---

## Downstream Compatibility Note

After this PR merges, Armadilloers running `/updating-armadillo` will:
1. Receive 3 new hook scripts (`task-completed.sh`, `subagent-start.sh`, `async-lint.sh`)
2. Receive updated `hooks.json` with new entries — the updating-armadillo skill handles JSON merging
3. Receive updated `settings.json` with `CLAUDE_CODE_SUBAGENT_MODEL`
4. Receive updated `stop-verify.sh`

The `task-completed.sh` and `async-lint.sh` are designed to gracefully exit 0 in projects without test infrastructure or type checkers — zero disruption to non-code projects.
