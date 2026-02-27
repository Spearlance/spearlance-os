# Armadillo System Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Implement the approved 5-area system optimization: bug discipline, visual testing, efficiency, install/update policy, and git strategy — across 2 new rules, 2 updated rules, and 11 updated skills.

**Architecture:** New cross-cutting behaviors live in rule files (auto-loaded). Targeted changes to existing skills add awareness of new rules and fix known bugs. No new skills created — this extends what exists.

**Tech Stack:** Markdown skill/rule files. No runtime code changes.

**Design doc:** `.claude/docs/plans/2026-02-22-armadillo-system-optimization-design.md`

---

## Parallelization Guide

All 15 tasks touch exactly one file each. They are **fully independent** and can be dispatched in parallel batches:

| Batch | Tasks | Files |
|-------|-------|-------|
| Batch 1 (new rules) | 1, 2 | `bug-discipline.md`, `visual-testing.md` |
| Batch 2 (rule updates) | 3, 4 | `coding-standards.md`, `git-workflow.md` |
| Batch 3 (workflow skills) | 5, 6, 7 | `test-driven-development`, `executing-plans`, `subagent-driven-development` |
| Batch 4 (git + quality skills) | 8, 9, 10, 11, 12, 13 | `safe-merge`, `finishing-branch`, `dispatching-parallel-agents`, `verification`, `git-setup`, `writing-prs` |
| Batch 5 (install/update skills) | 14, 15 | `onboarding`, `updating-armadillo` |

Within each batch, all tasks can run in parallel (zero file overlap).

---

### Task 1: Create Bug Discipline Rule

**Files:**
- Create: `.claude/rules/bug-discipline.md`

**Step 1: Create the rule file**

```markdown
---
paths:
  - "**/*.{js,ts,jsx,tsx,py,go,rs,java,rb,sh}"
  - "**/*.{test,spec}.*"
---

# Bug Discipline

## The Iron Law

```
NEVER SKIP A BUG. NEVER DERAIL THE PRIMARY TASK.
```

When you encounter a bug or unexpected behavior during any work, follow this three-phase protocol. No exceptions.

## Phase 1: SPAWN

Immediately spawn a background subagent with:
- **Repro context:** error message, stack trace, file:line where bug was observed
- **Mandate:** write a failing test that proves the bug, then create a persistent Task with repro steps + expected behavior
- **Isolation:** use `isolation: "worktree"` for safe parallel investigation

```
Task(
  description: "Bug: <one-line summary>",
  prompt: "...<repro context>...",
  subagent_type: "general-purpose",
  run_in_background: true,
  isolation: "worktree"
)
```

The subagent should:
1. Write a failing test proving the bug
2. Attempt a minimal fix
3. If fix works → commit on worktree branch
4. If fix fails → create Task with findings for later

## Phase 2: CONTINUE

Primary work proceeds uninterrupted:
- Bug subagent runs in background
- Primary task does NOT block on bug resolution
- No derailing focus from current objective
- Brief note in output: `⚠ Bug spawned → <summary> (background)`

## Phase 3: VERIFY

At end of current work block (after commit, before moving to next task):
- Check bug Task status via `TaskOutput`
- If subagent produced fix + passing test → review the worktree branch, merge if clean
- If subagent still working → note status, continue to next task
- If subagent failed → escalate to `systematic-debugging` skill

## When This Applies

- Test failure during non-TDD work (not during intentional RED phase)
- Runtime error during development
- Unexpected behavior spotted while reading code
- Regression discovered while working on unrelated feature

## When This Does NOT Apply

- Intentional TDD RED phase (test is supposed to fail)
- Known pre-existing failures documented in the codebase
- Environmental issues (missing env var, wrong Node version)

## Integration

| Skill | How it uses this rule |
|-------|----------------------|
| `test-driven-development` | Bug encounter escape hatch — spawn instead of blocking |
| `executing-plans` | Same escape hatch between batch tasks |
| `subagent-driven-development` | Controller monitors for bug Tasks created by implementer subagents |
```

**Step 2: Verify the file**

Run: Read the file back, confirm it has all 3 phases and the integration table.

**Step 3: Commit**

```bash
git add .claude/rules/bug-discipline.md
git commit -m "feat(rules): add bug-discipline rule — never skip, never derail"
```

---

### Task 2: Create Visual Testing Rule

**Files:**
- Create: `.claude/rules/visual-testing.md`

**Step 1: Create the rule file**

```markdown
---
paths:
  - "**/*.{jsx,tsx,svelte,vue,astro}"
  - "**/components/**"
  - "**/pages/**"
  - "**/app/**"
---

# Visual Testing

## When This Rule Activates

Only when the project has a frontend stack. Detected from:
- `stack.json` containing framework like `nextjs`, `astro`, `sveltekit`, `react-vite`
- `package.json` with framework deps (`react`, `next`, `astro`, `svelte`, `vue`)
- File patterns: `src/components/`, `app/`, `pages/`, `*.tsx`, `*.jsx`

**Pure backend/CLI projects:** This rule is inactive. Skip visual testing entirely.

## Expanded TDD Cycle

When frontend work is detected, the TDD cycle becomes:

```
RED → GREEN → VISUAL → REFACTOR
```

- **RED** — failing functional test (behavior, not appearance)
- **GREEN** — implementation passes functional test
- **VISUAL** — capture/verify visual baseline
  - Playwright `toHaveScreenshot()` for automated regression
  - Cross-browser: Chromium + Firefox + WebKit (minimum)
  - Viewports: mobile (375px), tablet (768px), desktop (1280px)
  - Deterministic: `animations: 'disabled'`, fonts loaded, time frozen
  - `mask` option for dynamic elements (timestamps, avatars, ads)
- **REFACTOR** — clean up with both functional + visual tests as safety net

## Approval Workflow

| Scenario | Action |
|----------|--------|
| Intentional visual change | `npx playwright test --update-snapshots` |
| Unintentional visual diff | Treat as RED — it's a regression, fix it |
| New component (no baseline) | First run creates baseline, commit snapshots |

## Local vs CI

| Context | Scope |
|---------|-------|
| Local development | Selective — only changed components' visual tests |
| CI pipeline | Full visual suite across all browsers + viewports |
| Pre-commit | Affected visual tests only |
| Pre-push | Full visual suite |

## Interactive Verification

When `claude --chrome` is available:
- Use for live design verification during development
- Complementary to automated tests, not a replacement
- Good for subjective quality checks automated tests can't catch

## Deterministic Rendering Checklist

Before capturing screenshots:
- [ ] `animations: 'disabled'` in Playwright config
- [ ] Fonts loaded (`page.waitForLoadState('networkidle')` or font-face check)
- [ ] Time frozen (`page.clock.setFixedTime()` for timestamps)
- [ ] Dynamic content masked (`mask: [page.locator('.avatar')]`)
- [ ] Viewport set explicitly (`page.setViewportSize()`)
- [ ] Color scheme set (`page.emulateMedia({ colorScheme: 'light' })`)

## Integration

| Skill | How it uses this rule |
|-------|----------------------|
| `test-driven-development` | Adds VISUAL step after GREEN when frontend detected |
| `verification-before-completion` | Adds visual regression check to completion gate |
| `playwright` | Viewport presets + cross-browser config templates |
```

**Step 2: Verify the file**

Run: Read the file back, confirm it has the expanded TDD cycle, approval workflow, and integration table.

**Step 3: Commit**

```bash
git add .claude/rules/visual-testing.md
git commit -m "feat(rules): add visual-testing rule — RED/GREEN/VISUAL/REFACTOR cycle"
```

---

### Task 3: Update Coding Standards Rule — Efficiency Sections

**Files:**
- Modify: `.claude/rules/coding-standards.md` — append after line 39 (end of file)

**Step 1: Add efficiency sections**

Append the following after the existing `## Skills` section (after line 38):

```markdown

## Selective Test Execution

- **Local development:** run only tests related to changed files
  - Vitest: `--changed` flag or filename patterns
  - Playwright: `--grep` or specific test file
  - Jest: `--findRelatedTests`
- **CI:** full suite always — no shortcuts
- **Pre-commit:** affected tests only
- **Pre-push:** full suite

## Caching

- **Dependencies:** cache `node_modules` between installs (`npm ci`, lockfile hash)
- **Browsers:** cache Playwright browsers (~500MB) — `npx playwright install` only on miss
- **Build artifacts:** cache `.next/`, `dist/`, `.astro/` between builds where safe
- **Test results:** Vitest `--cache` for incremental runs

## Parallel Work Decomposition

When task spans backend + frontend + tests:
1. Decompose into independent workstreams
2. Backend API → subagent A (`isolation: "worktree"`)
3. Frontend UI → subagent B (`isolation: "worktree"`)
4. Test infrastructure → subagent C (`isolation: "worktree"`)
5. Integration after all complete

Use `dispatching-parallel-agents` for 3+ independent streams.
Use `subagent-driven-development` for sequential-with-review.

## Timeout Budgets

- **Subagent tasks:** 10 min max before status check
- **If no progress after 2 checks:** escalate to user
- **Background Bash:** 5 min max for builds, 10 min for full test suites
```

**Step 2: Verify the file**

Run: Read the file back, confirm 4 new sections exist after Skills.

**Step 3: Commit**

```bash
git add .claude/rules/coding-standards.md
git commit -m "feat(rules): add efficiency sections to coding-standards — selective tests, caching, parallelism, timeouts"
```

---

### Task 4: Update Git Workflow Rule — Integration Branches, Conflict Resolution, Branch TTL, Draft PRs

**Files:**
- Modify: `.claude/rules/git-workflow.md` — append after line 97 (before end of file)

**Step 1: Add four new sections**

Append after the existing `Run node .claude/lib/doctor.js...` line (line 97):

```markdown

## Integration Branches

**When to use:** Auto-detect trigger — 3+ active branches touching overlapping files.

Suggest to developer: "Multiple branches touching shared files. Create integration branch to reconcile?"

**Developer approves before creation.** Never auto-create.

### Naming

`integrate/<description>` — e.g., `integrate/auth-refactor`

### Lifecycle

1. Create from main: `git checkout -b integrate/auth-refactor main`
2. Merge constituent feature branches into it
3. Test the integrated result
4. Merge to main via single squash PR
5. Delete integration branch + all constituent branches

### When NOT to Use

- Changes are independent (no file overlap)
- Parallel reviews are wanted (integration blocks individual PRs)
- One risky change shouldn't hold others back

## Conflict Resolution

- **Rebase frequency:** Rebase feature onto main at minimum every 2 days
- **Resolve on feature branch:** Never resolve conflicts on main
- **Complex conflicts:** If resolution is complex → create integration branch
- **Enable `git rerere`:** Reuse recorded resolution to avoid re-resolving same conflicts

```bash
git config rerere.enabled true
```

## Branch TTL

| Age | Action |
|-----|--------|
| 7 days | Warning: "Branch `feat/x` is 7 days old. Rebase or merge?" |
| 14 days | Flag: "Branch `feat/x` has drifted significantly from main" |

Detection: `doctor.js` enhanced to check branch age + main divergence.

TTL check runs during: `finishing-a-development-branch`, `safe-merge`.

```bash
# Check branch age
BRANCH_DATE=$(git log -1 --format=%ci <branch>)
DAYS_OLD=$(( ($(date +%s) - $(date -d "$BRANCH_DATE" +%s)) / 86400 ))
```

## Draft PRs

Support draft PRs for early-signal / WIP visibility:

```bash
# Create draft PR via REST
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="feat(scope): WIP description" \
  --field head="feat/my-branch" \
  --field base="main" \
  --field body="WIP — not ready for review" \
  --field draft=true

# Convert draft to ready
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}" \
  --method PATCH \
  --field draft=false
```
```

**Step 2: Verify the file**

Run: Read the file back, confirm 4 new sections exist (Integration Branches, Conflict Resolution, Branch TTL, Draft PRs).

**Step 3: Commit**

```bash
git add .claude/rules/git-workflow.md
git commit -m "feat(rules): add integration branches, conflict resolution, branch TTL, draft PRs to git-workflow"
```

---

### Task 5: Update Test-Driven Development Skill — Bug Escape Hatch + Visual Step

**Files:**
- Modify: `.claude/skills/test-driven-development/SKILL.md`

**Step 1: Add bug escape hatch after Debugging Integration section (after line 375)**

Insert after `Never fix bugs without a test.` (line 375), before `## Testing Anti-Patterns`:

```markdown

## Bug Encounter During Work

When you discover a bug while working on a different task:

**DO NOT** stop your current TDD cycle to fix it.
**DO** follow the `bug-discipline` rule:

1. **SPAWN** — background subagent with repro context (error, stack trace, file:line)
2. **CONTINUE** — finish your current RED/GREEN/REFACTOR cycle
3. **VERIFY** — check bug Task status at end of current work block

This is the ONE exception to "never fix bugs without a test" — you're delegating the test-writing to the subagent, not skipping it.

See `.claude/rules/bug-discipline.md` for full protocol.
```

**Step 2: Add VISUAL step after REFACTOR section (after line 212)**

Insert after `Keep tests green. Don't add behavior.` (line 212), before `### Repeat`:

```markdown

### VISUAL — Screenshot Baseline (Frontend Only)

**When:** Project has frontend stack (detected per `.claude/rules/visual-testing.md`).
**Skip:** Pure backend/CLI projects.

After GREEN and REFACTOR, capture visual baseline:

```bash
npx playwright test --grep "visual" path/to/component.spec.ts
```

Requirements:
- `toHaveScreenshot()` for automated comparison
- Viewports: mobile (375px), tablet (768px), desktop (1280px)
- `animations: 'disabled'`, fonts loaded, time frozen
- `mask` dynamic elements (timestamps, avatars)

**New component:** First run creates baseline. Commit snapshot files.
**Existing component changed:** Compare against baseline. Intentional change → `--update-snapshots`. Unintentional diff → treat as RED.

The full cycle becomes: **RED → GREEN → VISUAL → REFACTOR**
```

**Step 3: Verify the file**

Run: Read the file back, confirm both new sections exist.

**Step 4: Commit**

```bash
git add .claude/skills/test-driven-development/SKILL.md
git commit -m "feat(skills): add bug escape hatch + visual step to test-driven-development"
```

---

### Task 6: Update Executing Plans Skill — Bug Escape Hatch + Flexible Batch Size

**Files:**
- Modify: `.claude/skills/executing-plans/SKILL.md`

**Step 1: Add bug escape hatch to Step 2 (modify line 36 area)**

Replace line 35-36:

```markdown
### Step 2: Execute Batch
**Default: First 3 tasks**
```

With:

```markdown
### Step 2: Execute Batch
**Default batch size: 3 tasks.** Adjust based on task complexity:
- Simple tasks (single-file edits, config changes): batch of 4-5
- Medium tasks (new feature with tests): batch of 3
- Complex tasks (multi-file, architectural): batch of 1-2
```

**Step 2: Add bug escape hatch after Step 2, substep 5 (after line 45)**

Insert after `5. Mark as completed` (line 45), before `### Step 3`:

```markdown

**Bug encounter between tasks:** If a bug or unexpected behavior surfaces during execution:
1. Follow `.claude/rules/bug-discipline.md` — spawn background subagent
2. Note: `⚠ Bug spawned → <summary> (background)`
3. Continue with next task in batch
4. Check bug Task status at end of batch (before Step 3 report)
```

**Step 3: Verify the file**

Run: Read the file back, confirm flexible batch size and bug escape hatch exist.

**Step 4: Commit**

```bash
git add .claude/skills/executing-plans/SKILL.md
git commit -m "feat(skills): add bug escape hatch + flexible batch size to executing-plans"
```

---

### Task 7: Update Subagent-Driven Development Skill — Bug Monitoring + Caching Hints

**Files:**
- Modify: `.claude/skills/subagent-driven-development/SKILL.md`

**Step 1: Add bug monitoring to Red Flags section (after line 258)**

Insert before `**If subagent asks questions:**` (line 260):

```markdown

**Bug monitoring:** Between tasks, check for any persistent Tasks created by implementer subagents that indicate bugs:
- If bug Task found with fix → review worktree branch, merge if clean
- If bug Task found without fix → note for later, continue execution
- Follow `.claude/rules/bug-discipline.md` Phase 3 protocol
```

**Step 2: Add caching hints to the Prompt Templates section (after line 101)**

Insert after `- ./code-quality-reviewer-prompt.md` (line 101):

```markdown

### Implementer Context Hints

When dispatching implementer subagents, include these efficiency hints in the prompt:

- **Selective tests:** "Run only tests related to your changes, not the full suite"
- **Caching:** "If installing dependencies, use `npm ci` (faster than `npm install`)"
- **Background long tasks:** "Use `run_in_background: true` for test suites and builds"
```

**Step 3: Verify the file**

Run: Read the file back, confirm both new sections exist.

**Step 4: Commit**

```bash
git add .claude/skills/subagent-driven-development/SKILL.md
git commit -m "feat(skills): add bug monitoring + caching hints to subagent-driven-development"
```

---

### Task 8: Update Safe Merge Skill — GraphQL→REST Fix + Branch TTL + Integration Branch

**Files:**
- Modify: `.claude/skills/safe-merge/SKILL.md`

**Step 1: Fix the GraphQL bug in Phase 5 (replace lines 69-73)**

Replace:

```markdown
### Phase 5: Execute Merge

Use the project's merge strategy. Default to squash merge via PR:

```bash
gh pr merge --squash --delete-branch
```
```

With:

```markdown
### Phase 5: Execute Merge

Use the project's merge strategy. Default to squash merge via PR using REST API:

```bash
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}/merge" \
  --method PUT \
  --field merge_method=squash \
  --field commit_title="<type>(<scope>): <description> (#${PR_NUM})"
```

**Never use `gh pr merge`** — it uses GraphQL (rate-limited). Always use REST `gh api`.
```

**Step 2: Add Branch TTL check to Phase 1 (after line 28, the PR exists check)**

Insert after the PR exists row in the Pre-Flight Checks table:

```markdown
| Branch age | `git log -1 --format=%ci HEAD` | Warn if >7 days, flag if >14 days |
```

**Step 3: Add Integration Branch verification to Phase 1 (after Branch age row)**

Insert:

```markdown
| Integration branch | Check if `integrate/` prefix | Verify all constituent branches merged first |
```

**Step 4: Verify the file**

Run: Read the file back, confirm:
- Phase 5 uses REST `gh api` (not `gh pr merge`)
- Phase 1 has branch age and integration branch checks

**Step 5: Commit**

```bash
git add .claude/skills/safe-merge/SKILL.md
git commit -m "fix(skills): replace GraphQL merge with REST in safe-merge + add branch TTL and integration branch checks"
```

---

### Task 9: Update Finishing a Development Branch — Integration Branch Awareness + Branch Age Warning + Draft PR Option

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md`

**Step 1: Add branch age warning to Step 1 (after Step 1b, before "If tests fail")**

Insert after the Step 1b section (after line 53):

```markdown

**Step 1c: Check branch age.**

```bash
BRANCH_DATE=$(git log -1 --format=%ci HEAD)
# Calculate days old
```

| Age | Action |
|-----|--------|
| ≤ 7 days | Continue normally |
| 7-14 days | `⚠ Branch is <N> days old. Consider rebasing onto main before proceeding.` |
| > 14 days | `◆ Branch has drifted significantly from main (<N> days). Strongly recommend rebasing before merge.` |
```

**Step 2: Add Draft PR as 4th option (modify Step 3, lines 132-143)**

Replace:

```markdown
Present exactly these 3 options:

```
Implementation complete. What would you like to do?

1. Push and create a Pull Request
2. Keep the branch as-is (I'll handle it later)
3. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.
```

With:

```markdown
Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Push and create a Pull Request
2. Push and create a Draft PR (WIP — not ready for review)
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.
```

**Step 3: Add Option 2 handler (after Option 1 section, before Option 2: Keep As-Is)**

Insert a new Option 2: Draft PR section:

```markdown
#### Option 2: Push and Create Draft PR

Same as Option 1 but with `--field draft=true`:

```bash
env -u GITHUB_TOKEN git push -u origin <feature-branch>

SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes
▪ <change 1>
▪ <change 2>

## Status
🚧 Work in progress — not ready for review

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
PR_NUM=$(env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --field draft=true \
  --jq '.number')
echo "Created draft PR #${PR_NUM}"
```

Report: "Draft PR #<N> created. Convert to ready when done: `gh api repos/${SLUG}/pulls/${PR_NUM} --method PATCH --field draft=false`"

**Don't cleanup worktree** — WIP means user will come back to it.
```

**Step 4: Renumber existing Options 2→3 and 3→4**

Update "Option 2: Keep As-Is" to "Option 3: Keep As-Is" and "Option 3: Discard" to "Option 4: Discard".

**Step 5: Add integration branch awareness**

Insert after Step 2 (Determine Base Branch), before Step 3:

```markdown
### Step 2.5: Integration Branch Detection

Check if an integration branch exists that this feature should target:

```bash
git branch -r | grep 'origin/integrate/' | head -5
```

If integration branches exist, check for file overlap:

```bash
# Files changed on this branch
git diff main...HEAD --name-only > /tmp/my-files.txt
# Files changed on integration branch
git diff main...origin/integrate/<name> --name-only > /tmp/integrate-files.txt
# Overlap
comm -12 <(sort /tmp/my-files.txt) <(sort /tmp/integrate-files.txt)
```

If overlap detected:
```
ℹ Integration branch `integrate/<name>` exists with overlapping files.
  Consider merging into the integration branch instead of main.

  ▸ Target main or integrate/<name>?
```
```

**Step 6: Update the Quick Reference table**

Update to reflect 4 options instead of 3.

**Step 7: Verify the file**

Run: Read the file back, confirm:
- 4 options in Step 3
- Draft PR handler (Option 2)
- Branch age warning (Step 1c)
- Integration branch detection (Step 2.5)

**Step 8: Commit**

```bash
git add .claude/skills/finishing-a-development-branch/SKILL.md
git commit -m "feat(skills): add draft PR option, branch age warning, integration branch awareness to finishing-branch"
```

---

### Task 10: Update Dispatching Parallel Agents — Timeout Guidance + Worktree Default

**Files:**
- Modify: `.claude/skills/dispatching-parallel-agents/SKILL.md`

**Step 1: Add timeout guidance (after Verification section, line 184)**

Insert before `## Real-World Impact`:

```markdown

## Timeout & Progress Monitoring

| Budget | Threshold | Action |
|--------|-----------|--------|
| Implementation subagent | 10 min | Check status via `TaskOutput` |
| No progress after 2 checks | 20 min | Escalate to user |
| Background Bash (builds) | 5 min | Poll for completion |
| Background Bash (full test suite) | 10 min | Poll for completion |

```bash
# Check subagent progress
TaskOutput(task_id: "<id>", block: false, timeout: 5000)
```

If subagent is stuck (no file changes, no test output after 10 min):
1. Stop the task: `TaskStop(task_id: "<id>")`
2. Report what was attempted
3. Dispatch fresh agent with narrower scope or escalate
```

**Step 2: Add worktree isolation default (in the Pattern section, after line 77)**

Insert after `### 3. Dispatch in Parallel`, before the code block:

```markdown

**Default isolation:** Use `isolation: "worktree"` for all implementation agents to prevent file conflicts:

```typescript
Task(
  description: "Fix agent-tool-abort.test.ts",
  prompt: "...",
  subagent_type: "general-purpose",
  run_in_background: true,
  isolation: "worktree"  // safe parallel work
)
```
```

**Step 3: Verify the file**

Run: Read the file back, confirm timeout table and worktree isolation guidance exist.

**Step 4: Commit**

```bash
git add .claude/skills/dispatching-parallel-agents/SKILL.md
git commit -m "feat(skills): add timeout guidance + worktree isolation default to dispatching-parallel-agents"
```

---

### Task 11: Update Verification Before Completion — Visual Regression Gate

**Files:**
- Modify: `.claude/skills/verification-before-completion/SKILL.md`

**Step 1: Add visual regression check to Common Failures table (after line 63)**

Insert a new row after the "Requirements met" row:

```markdown
| Visual unchanged | Visual test output: 0 diffs | "I didn't change any styles" |
```

**Step 2: Add visual verification pattern to Key Patterns section (after line 118)**

Insert after the Agent delegation pattern:

```markdown

**Visual regression (frontend projects):**
```
✅ [Run visual tests] [See: 0 screenshot diffs] "No visual regressions"
❌ "I only changed logic, visuals are fine" (visual side effects happen)
```

**When to run visual verification:**
- ANY change to `.tsx`, `.jsx`, `.svelte`, `.vue`, `.astro` files
- ANY change to CSS/Tailwind classes
- ANY change to component props that affect rendering
- Skip for pure backend/API/CLI changes
```

**Step 3: Verify the file**

Run: Read the file back, confirm visual regression row in table and pattern section exist.

**Step 4: Commit**

```bash
git add .claude/skills/verification-before-completion/SKILL.md
git commit -m "feat(skills): add visual regression gate to verification-before-completion"
```

---

### Task 12: Update Git Setup Skill — Git Rerere + Integration Branch Guidelines

**Files:**
- Modify: `.claude/skills/git-setup/SKILL.md`

**Step 1: Add git rerere to Step 1 Detection (after line 52)**

Add to the detection script:

```bash
# Check if rerere is enabled
git config rerere.enabled 2>/dev/null || echo "not set"
```

Add row to Detection Report table:

```
| git rerere | ✗ Not enabled |
```

**Step 2: Add rerere setup after Step 2 Branch Protection (after line 136)**

Insert a new step:

```markdown
## Step 2.5: Enable Git Rerere

**Auto-enable** (no question — this is a net improvement with zero downside):

```bash
git config rerere.enabled true
```

What this does: When you resolve a merge conflict, git remembers the resolution. Next time the same conflict appears, it's auto-resolved. Zero overhead, saves time on rebases.

Present:
```
✓ Enabled git rerere (reuse recorded resolution)
  ↳ Merge conflicts you resolve once are auto-resolved in future
```
```

**Step 3: Add integration branch guidelines to Step 3 Git Workflow Rule (modify the markdown template)**

In the git-workflow.md template content (around line 171), add before the closing ``` of the template:

```markdown

## Integration Branches

When 3+ branches touch overlapping files, create an integration branch:
- Naming: `integrate/<description>`
- Merge all feature branches into integration first
- Then squash-merge integration to main
- Developer approval required before creation
```

**Step 4: Verify the file**

Run: Read the file back, confirm rerere setup and integration branch guidelines exist.

**Step 5: Commit**

```bash
git add .claude/skills/git-setup/SKILL.md
git commit -m "feat(skills): add git rerere + integration branch guidelines to git-setup"
```

---

### Task 13: Update Writing PRs Skill — Draft PR Support

**Files:**
- Modify: `.claude/skills/writing-prs/SKILL.md`

**Step 1: Add draft PR section (after the "With Review Guide" section, before Integration)**

Insert before `## Integration` (line 285):

```markdown
### Draft PR (WIP)

When creating a work-in-progress PR, add `--field draft=true`:

```bash
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes (so far)
▪ <change 1>
▪ <change 2>

## Status
🚧 Work in progress — not ready for review

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): WIP <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --field draft=true \
  --jq '.number, .html_url'
```

**Convert draft to ready:**

```bash
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}" \
  --method PATCH \
  --field draft=false
```

**When to use drafts:**
- Early signal on approach before full implementation
- WIP visibility for team awareness
- When `finishing-a-development-branch` offers Option 2 (Draft PR)
```

**Step 2: Verify the file**

Run: Read the file back, confirm draft PR section exists before Integration.

**Step 3: Commit**

```bash
git add .claude/skills/writing-prs/SKILL.md
git commit -m "feat(skills): add draft PR support to writing-prs"
```

---

### Task 14: Update Onboarding Skill — Full Install, No Pack Prompting

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md`

**Step 1: Replace the Pack Selection section (lines 305-346)**

Replace the entire "### Pack Selection" section (from `### Pack Selection` through the end of the interactive selection code block) with:

```markdown
### Pack Installation

**Install ALL packs unconditionally.** Every Armadilloer gets the complete skill library. Skills that don't match their stack sit dormant with zero overhead.

No interactive selection. No prompting. Full install.

**Fetch all packs from the armadillo repo:**

For each pack directory in `packs/`:
1. Read pack's skill files from `packs/<pack-name>/skills/<skill-name>/SKILL.md`
2. Write to `.claude/skills/<skill-name>/SKILL.md`
3. Copy any additional files (prompt templates, test files, etc.)

**Log what was installed:**

```
Installed skill packs:
  ✓ core (29 skills)
  ✓ frontend (16 skills)
  ✓ google-apis (8 skills)
  ✓ backend (4 skills)
  ...
  ✓ dns (7 skills)

Total: <N> skills across <N> packs
```
```

**Step 2: Verify the file**

Run: Read the file back, confirm:
- No `AskUserQuestion` with `multiSelect: true` for pack selection
- "Install ALL packs unconditionally" text exists
- No interactive checkbox UI remains

**Step 3: Commit**

```bash
git add .claude/skills/onboarding/SKILL.md
git commit -m "feat(skills): full install, no pack prompting in onboarding"
```

---

### Task 15: Update Updating Armadillo Skill — Intelligence Layer Fix + Worktree Validation + Pack Sync

**Files:**
- Modify: `.claude/skills/updating-armadillo/SKILL.md`

**Step 1: Fix the intelligence layer skip bug (modify line 50)**

Replace:

```markdown
  → if SHA matches → skip to Step 6 (health check only)
```

With:

```markdown
  → if SHA matches → skip to Step 5.5 (intelligence layer — always runs)
```

This ensures semantic overlap detection, quality audit, and hook audit run every update cycle, even on same-SHA.

**Step 2: Add worktree validation to Step 6 Health Check**

Find the Step 6 Health Check section and add a new check:

```markdown
#### Worktree Gitignore Validation

Verify worktree directories are gitignored:

```bash
# Check if .worktrees/ or worktrees/ is in .gitignore
grep -qE '^\\.?worktrees/' .gitignore 2>/dev/null
```

If NOT gitignored:
1. Add to `.gitignore`:
   ```
   .worktrees/
   worktrees/
   ```
2. Commit: `git add .gitignore && git commit -m "chore: gitignore worktree directories"`
3. Report: `✓ Fixed: worktree directories now gitignored`
```

**Step 3: Add pack list sync note**

In Step 5 (Pack Management), add a note about single source of truth:

```markdown
**Single source of truth:** Both `onboarding` and `updating-armadillo` read the pack list from `armadillo.json` in the armadillo repo. No hardcoded pack lists — the manifest is the authority.

If the remote `armadillo.json` has new packs not present locally → install them automatically (no prompting, per the full-install policy).
```

**Step 4: Verify the file**

Run: Read the file back, confirm:
- Line 50 says "skip to Step 5.5" (not Step 6)
- Worktree gitignore validation exists in Step 6
- Pack list sync note exists in Step 5

**Step 5: Commit**

```bash
git add .claude/skills/updating-armadillo/SKILL.md
git commit -m "fix(skills): fix intelligence layer skip + add worktree validation and pack sync to updating-armadillo"
```

---

## Verification — Full Suite

After all 15 tasks complete:

1. **File count check:** Verify all files exist
   ```bash
   ls .claude/rules/bug-discipline.md .claude/rules/visual-testing.md
   ```

2. **Keyword spot check:** Grep for key additions
   ```bash
   grep -l "SPAWN" .claude/rules/bug-discipline.md
   grep -l "VISUAL" .claude/rules/visual-testing.md
   grep -l "Selective Test Execution" .claude/rules/coding-standards.md
   grep -l "Integration Branches" .claude/rules/git-workflow.md
   grep -l "bug-discipline" .claude/skills/test-driven-development/SKILL.md
   grep -l "gh api.*merge" .claude/skills/safe-merge/SKILL.md
   grep -l "Step 5.5" .claude/skills/updating-armadillo/SKILL.md
   grep -l "draft=true" .claude/skills/writing-prs/SKILL.md
   grep -l "ALL packs" .claude/skills/onboarding/SKILL.md
   ```

3. **Run existing tests:** Ensure no regressions
   ```bash
   npm test
   ```

4. **Commit history:** Verify 15 atomic commits
   ```bash
   git log --oneline | head -20
   ```
