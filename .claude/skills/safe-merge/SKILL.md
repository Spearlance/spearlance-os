---
model: claude-sonnet-4-6
context: fork
name: safe-merge
description: "Use when ready to merge a feature branch — validates all quality gates (tests, build, lint, conflicts, migrations) before merging. Also use when you want automated pre-merge verification."
---

# Safe Merge

Pre-merge quality gate validation. Ensures feature branches meet all requirements before merging to main.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🚀 safe-merge ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line: branch name being merged]            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Process

### Phase 1: Pre-Flight Checks

| Check | Command | Fail Action |
|-------|---------|-------------|
| Not on main | `git rev-parse --abbrev-ref HEAD` | Abort — cannot merge FROM main |
| Clean working tree | `git status --porcelain` | Prompt to commit or stash |
| PR exists | `gh pr status --json state,reviewDecision` | Warn — create PR first |
| Branch age | `git log -1 --format=%ci HEAD` | Warn if >7 days, flag if >14 days |
| Integration branch | Check if `integrate/` prefix | Verify all constituent branches merged first |

### Phase 2: Quality Gates

Run all checks in sequence. **Stop on first failure.**

| Gate | Command | Requirement |
|------|---------|-------------|
| Type check | `npm run check` (or project equivalent) | Exit code 0, no type errors |
| Build | `npm run build` (or project equivalent) | Successful completion |
| Lint | `npm run lint` (or project equivalent) | No errors (warnings OK) |
| Tests | `npm test` (or project equivalent) | All pass |

Auto-detect the project's test/build commands from package.json, Makefile, pyproject.toml, Cargo.toml, or go.mod.

### Phase 3: Merge Conflict Check

```bash
git fetch origin main
git merge --no-commit --no-ff origin/main
```

If conflicts detected → abort merge, report conflicting files, provide resolution instructions.

If clean → `git merge --abort` (we're just checking, not merging yet).

### Phase 4: Schema/Migration Check

Only if schema files changed:

```bash
git diff origin/main --name-only | grep -E "db/|schema|migration|prisma|drizzle"
```

If changes detected:
- Verify migration files are present
- Check for rollback plan
- Prompt for database backup confirmation

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

If no PR exists, merge locally:

```bash
git checkout main && git pull origin main
git merge --no-ff <feature-branch>
git push origin main
```

### Phase 6: Post-Merge Verification

```bash
git checkout main && git pull
npm run build && npm test
```

Confirm main is still green after merge.

## Output Report

```
## Safe Merge Report — <branch-name>

Pre-Flight   ✓ branch: feat/my-feature  ✓ clean tree  ✓ PR #42
Quality Gates ✓ typecheck  ✓ build  ✓ lint  ✓ tests (14 pass)
Conflicts     ✓ no conflicts with main
Migrations    ○ no schema changes
Merge         ✓ squash merged via PR #42

Verdict: MERGE SUCCESSFUL
```

## Error Handling

If any gate fails:

1. **STOP** — do not proceed
2. **Report** which gate failed with full error output
3. **Provide fix instructions**
4. **Never merge** until all gates pass

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Merging with failing tests | Run full test suite — no exceptions |
| Skipping build check | Build failures break deploy — always verify |
| Merging with conflicts | Resolve conflicts on the feature branch, not main |
| Not pulling latest main first | Always fetch + check against latest main |
| Merging directly without PR | Go through PR for audit trail and review |
