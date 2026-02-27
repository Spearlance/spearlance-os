# Skill System Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Harden TDD enforcement across three levels (prose, structural, code), fix description guidance to "WHAT + WHEN, never HOW", add reference files for skill authors, and update best practices.

**Architecture:** Four workstreams shipping as one release. Level 3 code enforcement (verify-tdd-order.sh) gets proper TDD with a node test. Skill prose changes are direct edits to existing files. New reference files are standalone markdown. All changes are additive — no existing behavior removed.

**Tech Stack:** Bash (verify script), Node.js test runner (`node --test`), Markdown (skill prose)

**Design doc:** `.claude/docs/plans/2026-02-17-skill-improvements-design.md`

---

### Task 1: Create verify-tdd-order.sh with test (Level 3 — Code Enforcement)

**Files:**
- Create: `.claude/scripts/verify-tdd-order.sh`
- Create: `tests/verify-tdd-order.test.js`

This script analyzes git commit history on the current branch and flags commits that add implementation files without corresponding test files. Implements Anthropic's "code as enforcement" insight.

**Step 1: Write the failing test**

Create `tests/verify-tdd-order.test.js`:

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT = join(import.meta.dirname, '..', '.claude', 'scripts', 'verify-tdd-order.sh');

function createTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'tdd-verify-'));
  execSync('git init && git commit --allow-empty -m "initial"', { cwd: dir });
  // Create a "main" branch at initial commit
  execSync('git branch -M main', { cwd: dir });
  // Create feature branch
  execSync('git checkout -b feature', { cwd: dir });
  return dir;
}

function addFile(dir, path, content) {
  const full = join(dir, path);
  mkdirSync(join(dir, ...path.split('/').slice(0, -1)), { recursive: true });
  writeFileSync(full, content);
  execSync(`git add "${path}" && git commit -m "add ${path}"`, { cwd: dir });
}

function runScript(dir, base) {
  try {
    const result = execSync(`bash "${SCRIPT}" ${base || 'main'}`, {
      cwd: dir,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { exitCode: 0, output: result };
  } catch (e) {
    return { exitCode: e.status, output: e.stdout || '' };
  }
}

describe('verify-tdd-order', () => {
  it('passes when test is committed before implementation', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'tests/add.test.js', 'test("adds", () => {})');
      addFile(dir, 'src/add.js', 'function add(a,b) { return a+b; }');
      const { exitCode, output } = runScript(dir);
      assert.equal(exitCode, 0);
      assert.match(output, /PASS/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when implementation is committed without any test', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'src/add.js', 'function add(a,b) { return a+b; }');
      const { exitCode, output } = runScript(dir);
      assert.equal(exitCode, 1);
      assert.match(output, /FAIL|violation/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes when test and implementation are in the same commit', () => {
    const dir = createTempRepo();
    try {
      // Both in same commit
      const srcDir = join(dir, 'src');
      const testDir = join(dir, 'tests');
      mkdirSync(srcDir, { recursive: true });
      mkdirSync(testDir, { recursive: true });
      writeFileSync(join(srcDir, 'add.js'), 'function add(a,b) { return a+b; }');
      writeFileSync(join(testDir, 'add.test.js'), 'test("adds", () => {})');
      execSync('git add -A && git commit -m "add with test"', { cwd: dir });
      const { exitCode } = runScript(dir);
      assert.equal(exitCode, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores non-implementation files (config, docs, json)', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'README.md', '# hello');
      addFile(dir, 'package.json', '{}');
      addFile(dir, '.eslintrc.yml', 'rules: {}');
      const { exitCode } = runScript(dir);
      assert.equal(exitCode, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('recognizes various test file patterns', () => {
    const dir = createTempRepo();
    try {
      // _test.go pattern
      addFile(dir, 'add_test.go', 'func TestAdd(t *testing.T) {}');
      addFile(dir, 'add.go', 'func add(a, b int) int { return a+b }');
      // test_ pattern
      addFile(dir, 'test_utils.py', 'def test_add(): pass');
      addFile(dir, 'utils.py', 'def add(a,b): return a+b');
      const { exitCode } = runScript(dir);
      assert.equal(exitCode, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports correct count of violations', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'src/a.js', 'a');
      addFile(dir, 'src/b.js', 'b');
      addFile(dir, 'tests/c.test.js', 'test');
      addFile(dir, 'src/c.js', 'c');
      const { exitCode, output } = runScript(dir);
      // a.js and b.js have no tests — 2 violations
      assert.equal(exitCode, 1);
      assert.match(output, /2/); // should mention 2 violations
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('handles empty branch (no commits since base)', () => {
    const dir = createTempRepo();
    try {
      const { exitCode, output } = runScript(dir);
      assert.equal(exitCode, 0);
      assert.match(output, /no commits|PASS/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/verify-tdd-order.test.js`
Expected: FAIL — script file doesn't exist yet

**Step 3: Write the script**

Create `.claude/scripts/verify-tdd-order.sh`:

```bash
#!/usr/bin/env bash
#
# verify-tdd-order.sh — Check that implementation commits have corresponding tests.
#
# Usage: verify-tdd-order.sh [base-branch]
#   base-branch: Branch to compare against (default: main)
#
# Exit codes:
#   0 — All implementation commits have tests (or no implementation commits)
#   1 — One or more commits add implementation without tests
#   2 — Error (not in a git repo, base branch not found, etc.)

set -euo pipefail

BASE="${1:-main}"

# Find merge-base
MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null) || {
  echo "ERROR: Cannot find merge-base with '$BASE'. Are you on a feature branch?" >&2
  exit 2
}

# Get commits since merge-base (oldest first)
COMMITS=$(git rev-list --reverse "$MERGE_BASE"..HEAD)

if [ -z "$COMMITS" ]; then
  echo "PASS: No commits since $BASE."
  exit 0
fi

# File classification patterns
is_test_file() {
  local f="$1"
  # Common test file patterns
  [[ "$f" == *.test.* ]] && return 0
  [[ "$f" == *_test.* ]] && return 0
  [[ "$f" == *.spec.* ]] && return 0
  [[ "$f" == test_*.* ]] && return 0
  [[ "$f" == tests/* ]] && return 0
  [[ "$f" == __tests__/* ]] && return 0
  [[ "$f" == .claude/tests/* ]] && return 0
  [[ "$f" == *test*/* && "$f" == *.* ]] && return 0
  return 1
}

is_implementation_file() {
  local f="$1"
  # Skip non-code files
  case "$f" in
    *.md|*.json|*.yml|*.yaml|*.toml|*.lock|*.css|*.html|*.svg|*.png|*.jpg|*.gif|*.ico) return 1 ;;
    *.gitignore|*.env*|LICENSE*|Makefile|Dockerfile|*.dockerignore) return 1 ;;
    .claude/docs/*|.claude/skills/*/SKILL.md) return 1 ;;  # Skill prose is tested differently
  esac
  # Skip test files
  is_test_file "$f" && return 1
  # Everything else with a code extension is implementation
  case "$f" in
    *.js|*.ts|*.jsx|*.tsx|*.py|*.go|*.rs|*.java|*.rb|*.sh|*.bash|*.zsh) return 0 ;;
  esac
  return 1
}

violations=0
total_commits=0
test_seen=0  # Track whether any test has been seen on the branch

while IFS= read -r commit; do
  total_commits=$((total_commits + 1))

  # Get files changed in this commit
  files=$(git diff-tree --no-commit-id --name-only -r "$commit" 2>/dev/null)

  has_impl=false
  has_test=false
  impl_files=""

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    if is_test_file "$file"; then
      has_test=true
      test_seen=1
    fi
    if is_implementation_file "$file"; then
      has_impl=true
      impl_files="${impl_files}    ${file}\n"
    fi
  done <<< "$files"

  # Violation: implementation without test in this commit AND no test seen before
  if $has_impl && ! $has_test && [ "$test_seen" -eq 0 ]; then
    violations=$((violations + 1))
    short=$(git rev-parse --short "$commit")
    msg=$(git log --format='%s' -1 "$commit")
    echo "VIOLATION: $short ($msg)"
    echo -e "  Implementation files without preceding test:"
    echo -e "$impl_files"
  fi

  # If this commit has a test, mark it
  if $has_test; then
    test_seen=1
  fi

  # Reset test_seen after an implementation commit that had tests
  # (next impl commit needs its own test)
  if $has_impl && $has_test; then
    test_seen=0
  fi
  if $has_impl && ! $has_test && [ "$test_seen" -eq 1 ]; then
    # Implementation came after a test — that's TDD. Reset.
    test_seen=0
  fi

done <<< "$COMMITS"

echo ""
echo "Checked $total_commits commits."

if [ "$violations" -gt 0 ]; then
  echo "FAIL: $violations TDD violation(s) found."
  exit 1
else
  echo "PASS: All implementation commits have corresponding tests."
  exit 0
fi
```

**Step 4: Make script executable**

Run: `chmod +x .claude/scripts/verify-tdd-order.sh`

**Step 5: Run test to verify it passes**

Run: `node --test tests/verify-tdd-order.test.js`
Expected: All 7 tests pass.

If any fail, fix the script logic and re-run until green. The test expectations define the contract — don't change tests to match broken behavior.

**Step 6: Commit**

```bash
git add tests/verify-tdd-order.test.js .claude/scripts/verify-tdd-order.sh
git commit -m "feat: add verify-tdd-order.sh script with tests (Level 3 TDD enforcement)"
```

---

### Task 2: Add HARD-GATE to TDD skill (Level 1 — Prose Enforcement)

**Files:**
- Modify: `.claude/skills/test-driven-development/SKILL.md:6-14`

**Step 1: Add the HARD-GATE block**

In `.claude/skills/test-driven-development/SKILL.md`, insert a `<HARD-GATE>` block immediately after the Overview section (after line 12, before "## When to Use" on line 16). This is the same enforcement pattern used by the brainstorming skill (line 14 of `brainstorming/SKILL.md`) and the verification-before-completion skill.

Find this text (lines 8-16):

```markdown
## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use
```

Replace with:

```markdown
## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

<HARD-GATE>
Do NOT write any production code, implementation logic, or non-test code until you have written a failing test that defines the desired behavior. This applies to EVERY task regardless of perceived simplicity. "Production code" includes utility functions, helpers, refactors, and bug fixes — anything that isn't a test.
</HARD-GATE>

## When to Use
```

**Step 2: Add script reference to the Verification Checklist**

Find the Verification Checklist section (lines 332-344). After the existing checklist, add a reference to the verify script:

Find:

```markdown
Can't check all boxes? You skipped TDD. Start over.
```

Replace with:

```markdown
Can't check all boxes? You skipped TDD. Start over.

**Automated verification (if available):**
```bash
# Check TDD ordering across branch commits
.claude/scripts/verify-tdd-order.sh
```
This script checks git history to verify test commits came before implementation commits. Run it before claiming TDD compliance.
```

**Step 3: Read back and verify**

Read `.claude/skills/test-driven-development/SKILL.md` and confirm:
- `<HARD-GATE>` block exists between Overview and When to Use
- It mentions "production code", "implementation logic", "non-test code"
- It says "EVERY task regardless of perceived simplicity"
- Script reference exists in Verification Checklist

**Step 4: Commit**

```bash
git add .claude/skills/test-driven-development/SKILL.md
git commit -m "feat: add HARD-GATE and script reference to TDD skill (Level 1 enforcement)"
```

---

### Task 3: Make TDD mandatory in SDD subagent prompts (Level 2 — Structural Enforcement)

**Files:**
- Modify: `.claude/skills/subagent-driven-development/implementer-prompt.md:32-33,64-65`
- Modify: `.claude/skills/subagent-driven-development/spec-reviewer-prompt.md:38-61`
- Modify: `.claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md:9-18`

#### Part A: Update implementer-prompt.md

**Step 1: Make TDD mandatory (line 33)**

In `.claude/skills/subagent-driven-development/implementer-prompt.md`, find this text (lines 29-37):

```
    ## Your Job

    Once you're clear on requirements:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Self-review (see below)
    6. Report back
```

Replace with:

```
    ## Your Job

    Once you're clear on requirements:
    1. Write a failing test FIRST (TDD is mandatory — no production code before a failing test)
    2. Watch the test fail (verify it fails for the right reason)
    3. Write minimal code to make the test pass
    4. Verify all tests pass
    5. Repeat steps 1-4 for each behavior
    6. Commit your work
    7. Self-review (see below)
    8. Report back
```

**Step 2: Update self-review checklist (line 65)**

Find this text (lines 63-66):

```
    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?
```

Replace with:

```
    **Testing (TDD is ALWAYS required):**
    - Did I write every test BEFORE its implementation?
    - Did I watch each test fail before writing code?
    - Do tests verify behavior (not mock behavior)?
    - Are tests comprehensive?
```

#### Part B: Update spec-reviewer-prompt.md

**Step 3: Add TDD compliance check**

In `.claude/skills/subagent-driven-development/spec-reviewer-prompt.md`, find this text (lines 37-60):

```
    ## Your Job

    Read the implementation code and verify:

    **Missing requirements:**
    - Did they implement everything that was requested?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?

    **Extra/unneeded work:**
    - Did they build things that weren't requested?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" that weren't in spec?

    **Misunderstandings:**
    - Did they interpret requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Verify by reading code, not by trusting report.**

    Report:
    - ✅ Spec compliant (if everything matches after code inspection)
    - ❌ Issues found: [list specifically what's missing or extra, with file:line references]
```

Replace with:

```
    ## Your Job

    Read the implementation code and verify:

    **TDD compliance (check FIRST):**
    - Do test files exist for the implementation?
    - Check git log: were test files committed before or alongside implementation?
      Run: `git log --oneline --name-only` and verify test files appear in commits
      before or in the same commit as implementation files.
    - If implementation was committed without tests → flag as ❌ TDD violation

    **Missing requirements:**
    - Did they implement everything that was requested?
    - Are there requirements they skipped or missed?
    - Did they claim something works but didn't actually implement it?

    **Extra/unneeded work:**
    - Did they build things that weren't requested?
    - Did they over-engineer or add unnecessary features?
    - Did they add "nice to haves" that weren't in spec?

    **Misunderstandings:**
    - Did they interpret requirements differently than intended?
    - Did they solve the wrong problem?
    - Did they implement the right feature but wrong way?

    **Verify by reading code, not by trusting report.**

    Report:
    - ✅ Spec compliant (if everything matches AND TDD was followed)
    - ❌ Issues found: [list specifically what's missing or extra, with file:line references]
    - ❌ TDD violation: [list commits that added implementation without tests]
```

#### Part C: Update code-quality-reviewer-prompt.md

**Step 4: Add TDD check to code quality reviewer**

In `.claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md`, find this text (lines 7-18):

```
**Only dispatch after spec compliance review passes.**

```
Task tool (armadillo:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
```

Replace with:

```
**Only dispatch after spec compliance review passes (including TDD compliance).**

```
Task tool (armadillo:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]

  ADDITIONAL CHECK: Verify TDD was followed — tests should exist and
  cover the implementation. If the verify-tdd-order.sh script exists
  at .claude/scripts/verify-tdd-order.sh, run it as part of the review.
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
```

**Step 5: Read back all three files and verify**

Read all three modified files and confirm:
- `implementer-prompt.md`: Steps start with "Write a failing test FIRST", self-review says "TDD is ALWAYS required"
- `spec-reviewer-prompt.md`: "TDD compliance" check section exists and is checked FIRST, includes git log command
- `code-quality-reviewer-prompt.md`: References verify-tdd-order.sh script, mentions TDD compliance requirement

**Step 6: Commit**

```bash
git add .claude/skills/subagent-driven-development/implementer-prompt.md \
       .claude/skills/subagent-driven-development/spec-reviewer-prompt.md \
       .claude/skills/subagent-driven-development/code-quality-reviewer-prompt.md
git commit -m "feat: make TDD mandatory in all SDD subagent prompts (Level 2 enforcement)"
```

---

### Task 4: Fix description guidance in writing-skills/SKILL.md (Workstream 2)

**Files:**
- Modify: `.claude/skills/writing-skills/SKILL.md:96-197`

**Step 1: Update frontmatter guidance (line 96-103)**

In `.claude/skills/writing-skills/SKILL.md`, find:

```markdown
**Frontmatter (YAML):**
- Only two fields supported: `name` and `description`
- Max 1024 characters total
- `name`: Use letters, numbers, and hyphens only (no parentheses, special chars)
- `description`: Third-person, describes ONLY when to use (NOT what it does)
  - Start with "Use when..." to focus on triggering conditions
  - Include specific symptoms, situations, and contexts
  - **NEVER summarize the skill's process or workflow** (see CSO section for why)
  - Keep under 500 characters if possible
```

Replace with:

```markdown
**Frontmatter (YAML):**
- Only two fields supported: `name` and `description`
- Max 1024 characters total
- `name`: Use letters, numbers, and hyphens only (no parentheses, special chars)
- `description`: Third-person, describes WHAT the skill does and WHEN to use it (never HOW)
  - Include both purpose (what it does) and triggering conditions (when to use it)
  - Start with a brief statement of what it does, then "Use when..." for triggers
  - **NEVER summarize the skill's process or workflow** (see CSO section for why)
  - Keep under 500 characters if possible
```

**Step 2: Update CSO section title and framing (lines 140-157)**

Find:

```markdown
## Claude Search Optimization (CSO)

**Critical for discovery:** Future Claude needs to FIND your skill

### 1. Rich Description Field

**Purpose:** Claude reads description to decide which skills to load for a given task. Make it answer: "Should I read this skill right now?"

**Format:** Start with "Use when..." to focus on triggering conditions

**CRITICAL: Description = When to Use, NOT What the Skill Does**

The description should ONLY describe triggering conditions. Do NOT summarize the skill's process or workflow in the description.

**Why this matters:** Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews (spec compliance then code quality).

When the description was changed to just "Use when executing implementation plans with independent tasks" (no workflow summary), Claude correctly read the flowchart and followed the two-stage review process.

**The trap:** Descriptions that summarize workflow create a shortcut Claude will take. The skill body becomes documentation Claude skips.
```

Replace with:

```markdown
## Claude Search Optimization (CSO)

**Critical for discovery:** Future Claude needs to FIND your skill

### 1. Rich Description Field

**Purpose:** Claude reads description to decide which skills to load for a given task. Make it answer: "Should I read this skill right now?"

**Formula: WHAT + WHEN, never HOW**

Include both what the skill does (purpose) and when to use it (triggers). Never describe the skill's process, workflow, or steps.

**CRITICAL: Description = What It Does + When to Use, NEVER How It Works**

A good description tells Claude the skill's purpose and the situations that trigger it. A bad description summarizes the skill's workflow or process steps.

**Why "never HOW" matters:** Testing revealed that when a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews (spec compliance then code quality).

When the description included purpose + triggers but no workflow summary, Claude correctly read the flowchart and followed the two-stage review process.

**The trap:** Descriptions that summarize workflow create a shortcut Claude will take. The skill body becomes documentation Claude skips.
```

**Step 3: Update the examples (lines 160-172)**

Find:

```yaml
# ❌ BAD: Summarizes workflow - Claude may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: Triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code
```

Replace with:

```yaml
# ❌ BAD: Summarizes workflow (HOW) - Claude may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail (HOW)
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ✅ GOOD: WHAT + WHEN, no workflow summary
description: Dispatch fresh subagent per task with two-stage review. Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: WHAT + WHEN
description: Enforce test-first development discipline. Use when implementing any feature or bugfix, before writing implementation code
```

**Step 4: Update the content guidelines (lines 174-180)**

Find:

```markdown
**Content:**
- Use concrete triggers, symptoms, and situations that signal this skill applies
- Describe the *problem* (race conditions, inconsistent behavior) not *language-specific symptoms* (setTimeout, sleep)
- Keep triggers technology-agnostic unless the skill itself is technology-specific
- If skill is technology-specific, make that explicit in the trigger
- Write in third person (injected into system prompt)
- **NEVER summarize the skill's process or workflow**
```

Replace with:

```markdown
**Content:**
- Start with a brief statement of what the skill does (WHAT)
- Follow with concrete triggers, symptoms, and situations (WHEN)
- Describe the *problem* (race conditions, inconsistent behavior) not *language-specific symptoms* (setTimeout, sleep)
- Keep triggers technology-agnostic unless the skill itself is technology-specific
- If skill is technology-specific, make that explicit in the trigger
- Write in third person (injected into system prompt)
- **NEVER summarize the skill's process, steps, or workflow (HOW)**
```

**Step 5: Read back and verify**

Read `.claude/skills/writing-skills/SKILL.md` and confirm:
- Line ~99 says "WHAT the skill does and WHEN to use it (never HOW)"
- CSO section title says "WHAT + WHEN, never HOW"
- Examples show WHAT + WHEN pattern (not just WHEN)
- All references to "WHEN only" or "NOT what it does" are gone
- All references to "never HOW" / "NEVER summarize workflow" are preserved
- The SDD workflow-shortcut evidence is preserved (the important CSO insight)

**Step 6: Commit**

```bash
git add .claude/skills/writing-skills/SKILL.md
git commit -m "feat: update description guidance to WHAT + WHEN, never HOW"
```

---

### Task 5: Create skill-patterns.md (Workstream 3)

**Files:**
- Create: `.claude/skills/writing-skills/skill-patterns.md`

**Step 1: Create the file**

Create `.claude/skills/writing-skills/skill-patterns.md`:

```markdown
# Skill Patterns Reference

Five common patterns for structuring skills, identified from Anthropic's official guide and armadillo's skill library. Use this when deciding how to structure a new skill.

## 1. Sequential Workflow Orchestration

**When to use:** Complex multi-step processes where order matters and steps build on each other.

**Structure:**
- Numbered steps with clear entry/exit criteria
- Flowchart showing the decision path
- Verification checkpoints between steps
- Clear "done" conditions

**Armadillo examples:**
- `brainstorming` — Explore → Questions → Approaches → Design → Doc → Handoff
- `finishing-a-development-branch` — Verify tests → Changelog → Base branch → Options → Execute → Cleanup
- `subagent-driven-development` — Read plan → Dispatch → Review → Fix → Next task

**Common pitfall:** Steps that are too coarse-grained. If a step takes > 5 minutes, split it.

## 2. Iterative Refinement

**When to use:** Quality-sensitive tasks that benefit from review cycles.

**Structure:**
- Initial attempt
- Validation/review step
- Fix loop (repeat until passing)
- Gate before proceeding

**Armadillo examples:**
- `receiving-code-review` — Analyze feedback → Classify → Implement → Verify each fix
- `test-driven-development` — RED → GREEN → REFACTOR → repeat
- `writing-skills` — Baseline → Write skill → Test → Close loopholes → Re-test

**Common pitfall:** No termination condition. Always define when the loop ends.

## 3. Context-Aware Tool Selection

**When to use:** Tasks where the right approach depends on what you find.

**Structure:**
- Discovery/analysis phase
- Decision tree or flowchart
- Branch-specific instructions
- Merge point for common post-processing

**Armadillo examples:**
- `systematic-debugging` — Reproduce → Gather evidence → Analyze → Choose strategy
- `onboarding` — Scan existing → Classify files → Route each to appropriate handler

**Common pitfall:** Decision tree that's too deep. Keep to 2-3 levels max.

## 4. Discipline Enforcement

**When to use:** Rules that agents are tempted to skip under pressure.

**Structure:**
- `<HARD-GATE>` tag with non-negotiable rule
- Iron Law (one-line summary)
- Rationalization table (excuse → reality)
- Red Flags list (symptoms of violation)
- "Spirit vs letter" statement

**Armadillo examples:**
- `test-driven-development` — HARD-GATE + Iron Law + rationalization table
- `verification-before-completion` — Gate Function + rationalization prevention
- `brainstorming` — HARD-GATE before any implementation

**Common pitfall:** Rules without rationalization counters. Agents WILL find loopholes.

## 5. Domain-Specific Intelligence

**When to use:** Reference material for specific tools, APIs, or domains.

**Structure:**
- Quick start (minimal working example)
- Reference tables (endpoints, methods, config)
- Common recipes (task-oriented examples)
- Troubleshooting section

**Armadillo examples:**
- `neon` — Serverless Postgres reference with connection patterns
- `stripe-api` — Payment integration with webhook handling
- `ga4-api` — Analytics queries with dimension/metric reference

**Common pitfall:** Including information Claude already knows. Only add domain-specific context that isn't in Claude's training data.

## Pattern Selection

| Question | Pattern |
|----------|---------|
| Does order matter? | Sequential Workflow |
| Does quality need iteration? | Iterative Refinement |
| Does the approach depend on context? | Context-Aware Selection |
| Will agents try to skip this? | Discipline Enforcement |
| Is this reference material? | Domain-Specific Intelligence |

Most skills combine 2-3 patterns. For example, `subagent-driven-development` is Sequential Workflow + Iterative Refinement (the review loop within the sequential flow).
```

**Step 2: Verify file is well-formed**

Read `.claude/skills/writing-skills/skill-patterns.md` and confirm:
- All 5 patterns documented
- Each has: When to use, Structure, Armadillo examples, Common pitfall
- Pattern Selection table at the end
- References real armadillo skills (not hypothetical)

**Step 3: Commit**

```bash
git add .claude/skills/writing-skills/skill-patterns.md
git commit -m "feat: add skill-patterns.md reference to writing-skills"
```

---

### Task 6: Create degrees-of-freedom.md (Workstream 3)

**Files:**
- Create: `.claude/skills/writing-skills/degrees-of-freedom.md`

**Step 1: Create the file**

Create `.claude/skills/writing-skills/degrees-of-freedom.md`:

```markdown
# Degrees of Freedom Reference

How much latitude to give Claude in a skill. Match the specificity to the task's fragility.

From Anthropic's official guide: "Think of Claude as a robot exploring a path. Narrow bridge with cliffs on both sides → low freedom. Open field with no hazards → high freedom."

## The Three Levels

### High Freedom (text-based, multiple valid approaches)

**Use when:**
- Multiple approaches are valid
- Decisions depend on runtime context
- Heuristics guide the approach
- Creativity or judgment matters

**Looks like:** Prose instructions, guidelines, principles, checklists.

**Example from armadillo:**
```markdown
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability
4. Verify adherence to project conventions
```

**Armadillo skills at this level:** `brainstorming` (exploration is open-ended), `receiving-code-review` (judgment-heavy analysis)

### Medium Freedom (pseudocode with parameters)

**Use when:**
- A preferred pattern exists but details vary
- Configuration affects behavior
- Structure matters but specifics depend on context

**Looks like:** Templates with fill-in sections, pseudocode, configurable scripts.

**Example from armadillo:**
```markdown
## Generate report

Use this template and customize as needed:
- ## Summary — [adapt to findings]
- ## Key Findings — [3-5 bullets]
- ## Recommendations — [actionable items]
```

**Armadillo skills at this level:** `writing-plans` (structure defined, content varies), `writing-skills` (template + checklist, content open)

### Low Freedom (specific scripts, exact steps)

**Use when:**
- Operations are fragile and error-prone
- Consistency is critical
- A specific sequence must be followed
- Deviation causes failure

**Looks like:** Exact commands, specific scripts, no-modification warnings.

**Example from armadillo:**
```markdown
## Database migration

Run exactly this script:
```bash
python scripts/migrate.py --verify --backup
```
Do not modify the command or add additional flags.
```

**Armadillo skills at this level:** `verification-before-completion` (exact gate function, no shortcuts), `finishing-a-development-branch` (exact git commands)

## Decision Framework

**"How fragile is this task?"**

| Fragility | Freedom | Example |
|-----------|---------|---------|
| High (deviation = failure) | Low | Database migrations, deployment scripts |
| Medium (preferred pattern) | Medium | Code generation, report templates |
| Low (many valid approaches) | High | Code review, brainstorming, analysis |

## Mixing Levels Within a Skill

Most skills use different levels for different sections:

- **When to Use** → High freedom (judgment about when to apply)
- **Core Process** → Medium freedom (structured but flexible)
- **Critical Steps** → Low freedom (exact commands, must follow)

Example: `subagent-driven-development` uses high freedom for "when to parallelize" (judgment call) but low freedom for "dispatch prompt template" (exact format required).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Low freedom for judgment tasks | Agent follows letter, misses spirit. Use high. |
| High freedom for fragile tasks | Agent improvises, breaks things. Use low. |
| Same level throughout | Mix levels — guidance where needed, freedom where safe. |
| Over-constraining creative tasks | Kill agent effectiveness. Trust Claude's judgment. |
| Under-constraining risky tasks | Agent takes shortcuts. Add specific guardrails. |
```

**Step 2: Verify**

Read the file and confirm it covers all three levels with armadillo examples and includes the decision framework.

**Step 3: Commit**

```bash
git add .claude/skills/writing-skills/degrees-of-freedom.md
git commit -m "feat: add degrees-of-freedom.md reference to writing-skills"
```

---

### Task 7: Create troubleshooting-guide.md (Workstream 3)

**Files:**
- Create: `.claude/skills/writing-skills/troubleshooting-guide.md`

**Step 1: Create the file**

Create `.claude/skills/writing-skills/troubleshooting-guide.md`:

```markdown
# Skill Troubleshooting Guide

Common problems when writing skills and how to fix them.

## Skill Not Invoked

**Symptom:** You say "use the X skill" or describe a scenario that should trigger X, but Claude doesn't load it.

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| Description too narrow | Add more trigger conditions and synonyms |
| Description too vague | Make triggers specific ("Use when..." not "Helps with...") |
| Description missing WHAT | Add what the skill does, not just when to use it |
| Name doesn't match mental model | Rename using gerund form (e.g., "testing-code" not "test-utils") |
| Competing skill has better match | Differentiate descriptions or merge skills |

**Diagnostic:** Read the skill's YAML frontmatter. Does the `description` match how you'd naturally ask for help? If you'd say "help me debug this", does the description mention "debug"?

## Skill Invoked but Steps Skipped

**Symptom:** Claude loads the skill but doesn't follow all steps. It takes shortcuts.

**Causes and fixes:**

| Cause | Fix |
|-------|-----|
| Description summarizes workflow | Remove HOW from description (CSO trap) |
| No enforcement mechanism | Add `<HARD-GATE>` tag for critical rules |
| Instructions feel advisory | Add rationalization table and red flags list |
| Too many steps | Consolidate or split into sub-skills |
| Steps aren't clearly separated | Use numbered lists, not prose paragraphs |

**Diagnostic:** Check if the description contains any workflow summary. Test: if you deleted the SKILL.md body and only had the description, could Claude "wing it"? If yes, the description leaks too much process.

## Skill Too Long (>500 Lines)

**Symptom:** SKILL.md exceeds 500 lines. Performance degrades.

**Fixes:**
1. Move heavy reference to separate files (e.g., `reference.md`, `api-docs.md`)
2. Keep SKILL.md as a "table of contents" pointing to detail files
3. Use `@filename.md` references for content Claude loads on-demand
4. Move examples to a separate `examples.md` if >3 examples

**Anthropic's guidance:** "Keep SKILL.md body under 500 lines for optimal performance. Split content into separate files when approaching this limit."

**Rule of thumb:** SKILL.md = overview + decision logic + critical rules. Everything else goes in linked files.

## Cross-Model Failures

**Symptom:** Skill works with Opus but fails with Haiku (or vice versa).

**Fixes:**

| Model | Common issue | Fix |
|-------|-------------|-----|
| Haiku | Skips steps, needs more guidance | Add more explicit instructions, lower freedom |
| Sonnet | Generally works but misses nuance | Clarify edge cases explicitly |
| Opus | Over-explains, adds unwanted extras | Use stronger YAGNI language |

**From Anthropic:** "What works perfectly for Opus might need more detail for Haiku. If you plan to use your Skill across multiple models, aim for instructions that work well with all of them."

**Testing approach:** Test each skill with the model you'll use it with. If you use Haiku for subagents, test with Haiku — not just Opus.

## Skill Rationalized Away

**Symptom:** Agent finds creative reasons to not follow the skill's rules.

**Fixes (escalating enforcement):**

1. **Add `<HARD-GATE>` tag** — Strongest prose enforcement
2. **Add rationalization table** — Explicitly counter every known excuse
3. **Add red flags list** — Help agent self-detect rationalization
4. **Add "spirit vs letter" statement** — Cut off "I'm following the spirit" arguments
5. **Add code enforcement** — Scripts that verify compliance programmatically

**Pressure testing:** Use 3+ combined pressures (time + sunk cost + authority) to verify. See `testing-skills-with-subagents.md` for methodology.

## Skill Creates Confusion

**Symptom:** Agent applies skill incorrectly or in wrong context.

**Fixes:**

| Cause | Fix |
|-------|-----|
| Ambiguous "When to Use" | Add "When NOT to Use" section with explicit exclusions |
| Similar to another skill | Add comparison flowchart (see SDD vs executing-plans example) |
| Examples too abstract | Replace with concrete, real-world examples |
| Missing decision logic | Add flowchart for non-obvious decisions |

## Quick Diagnostic Checklist

When a skill isn't working:

1. **Check description** — Does it say WHAT + WHEN (never HOW)?
2. **Check length** — Is SKILL.md under 500 lines?
3. **Check enforcement** — Does it have `<HARD-GATE>` for critical rules?
4. **Check examples** — Are they concrete and runnable?
5. **Check model** — Are you testing with the model you'll deploy with?
6. **Check references** — Are linked files one level deep from SKILL.md?
7. **Run pressure test** — Does the agent follow rules under combined pressures?
```

**Step 2: Verify**

Read the file and confirm it covers all 6 problem categories with diagnostic steps and fixes.

**Step 3: Commit**

```bash
git add .claude/skills/writing-skills/troubleshooting-guide.md
git commit -m "feat: add troubleshooting-guide.md reference to writing-skills"
```

---

### Task 8: Update anthropic-best-practices.md (Workstream 4)

**Files:**
- Modify: `.claude/skills/writing-skills/anthropic-best-practices.md:147-153,185-198,1091-1099`

**Step 1: Update frontmatter documentation (around line 147)**

Find:

```markdown
<Note>
  **YAML Frontmatter**: The SKILL.md frontmatter supports two fields:

  * `name` - Human-readable name of the Skill (64 characters maximum)
  * `description` - One-line description of what the Skill does and when to use it (1024 characters maximum)

  For complete Skill structure details, see the [Skills overview](/en/docs/agents-and-tools/agent-skills/overview#skill-structure).
</Note>
```

Replace with:

```markdown
<Note>
  **YAML Frontmatter**: The SKILL.md frontmatter supports these fields:

  * `name` - Human-readable name of the Skill (64 characters maximum)
  * `description` - One-line description of what the Skill does and when to use it (1024 characters maximum)

  Optional fields (platform-dependent):
  * `alwaysApply` - If true, skill is always loaded into context (use sparingly)
  * `globs` - File patterns that trigger this skill (e.g., `["*.py", "tests/**"]`)
  * `filePaths` - Specific file paths that trigger this skill

  For complete Skill structure details, see the [Skills overview](/en/docs/agents-and-tools/agent-skills/overview#skill-structure).
</Note>
```

**Step 2: Align description guidance (around line 185-198)**

The current text already says "include both what the Skill does and when to use it" (line 187) — which is correct. But we should add the "never HOW" warning to align with the updated writing-skills/SKILL.md.

Find (line 197):

```markdown
**Be specific and include key terms**. Include both what the Skill does and specific triggers/contexts for when to use it.
```

Replace with:

```markdown
**Be specific and include key terms**. Include both what the Skill does (WHAT) and specific triggers/contexts for when to use it (WHEN). **Never summarize the skill's workflow or process steps (HOW)** — this causes Claude to shortcut the full skill content.
```

**Step 3: Add cross-model testing emphasis (after the existing section around line 142)**

The existing content at lines 132-142 already covers cross-model testing. This is sufficient — no changes needed here. Verify it's present.

**Step 4: Verify token budget section exists (around line 1097-1099)**

The existing content already says "Keep SKILL.md body under 500 lines" (line 1099). Verify it's present — no changes needed.

**Step 5: Read back and verify**

Read `.claude/skills/writing-skills/anthropic-best-practices.md` and confirm:
- Optional frontmatter fields documented (alwaysApply, globs, filePaths)
- Description guidance includes "never HOW" warning
- Cross-model testing section exists (was already there)
- 500-line limit documented (was already there)

**Step 6: Commit**

```bash
git add .claude/skills/writing-skills/anthropic-best-practices.md
git commit -m "feat: add optional frontmatter fields and align description guidance in best practices"
```

---

### Task 9: End-to-end verification

**Files:**
- Read: all modified files for sanity check

**Step 1: Run all tests**

Run: `npm test`
Expected: All existing tests pass (no regressions).

Run: `node --test tests/verify-tdd-order.test.js`
Expected: All 7 verify-tdd-order tests pass.

**Step 2: Verify TDD skill has HARD-GATE**

Read `.claude/skills/test-driven-development/SKILL.md` and confirm:
- `<HARD-GATE>` block between Overview and When to Use
- Script reference in Verification Checklist

**Step 3: Verify SDD prompts enforce TDD**

Read all three SDD prompt files and confirm:
- `implementer-prompt.md`: TDD is mandatory, not conditional
- `spec-reviewer-prompt.md`: TDD compliance check is first
- `code-quality-reviewer-prompt.md`: References verify-tdd-order.sh

**Step 4: Verify writing-skills description guidance**

Read `.claude/skills/writing-skills/SKILL.md` and confirm:
- "WHAT + WHEN, never HOW" framing throughout
- No remaining "WHEN only" or "NOT what it does" language
- CSO workflow-shortcut evidence preserved

**Step 5: Verify all reference files exist and are well-formed**

Read each file and check structure:
- `.claude/skills/writing-skills/skill-patterns.md` — 5 patterns
- `.claude/skills/writing-skills/degrees-of-freedom.md` — 3 levels
- `.claude/skills/writing-skills/troubleshooting-guide.md` — 6 problem categories

**Step 6: Verify anthropic-best-practices.md updates**

Read `.claude/skills/writing-skills/anthropic-best-practices.md` and confirm:
- Optional frontmatter fields documented
- "never HOW" warning in description guidance

**Step 7: Verify verify-tdd-order.sh is executable**

Run: `ls -la .claude/scripts/verify-tdd-order.sh`
Expected: `-rwxr-xr-x` (executable bit set)

**Step 8: Check git status is clean**

Run: `git status`
Expected: Nothing uncommitted (all changes committed in tasks 1-8).

If any uncommitted changes remain, commit them:

```bash
git add -A
git commit -m "chore: final verification cleanup"
```
