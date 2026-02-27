# Git Workflow

## Authentication
Claude Code sets a `GITHUB_TOKEN` env var with limited scopes (`repo` only — no `workflow`). This blocks pushes that include `.github/workflows/` files.

**Always prefix git push and gh api calls with `env -u GITHUB_TOKEN`** to use the keyring token (which has full scopes) instead:

```bash
env -u GITHUB_TOKEN git push origin <branch>
env -u GITHUB_TOKEN gh api repos/...
```

## GitHub API — REST Only

**Never use `gh pr create`, `gh pr merge`, or `gh pr view`.** These use GraphQL (5000 pts/hr, frequently exhausted). Use `gh api` (REST, separate 5000 req/hr budget) for everything.

```bash
# Detect repo slug once
SLUG=$(git remote get-url origin | sed )

# Create PR (REST — replaces gh pr create)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="feat(scope): description" \
  --field head="feat/my-branch" \
  --field base="main" \
  --field body="PR body here"

# View PR (REST — replaces gh pr view)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}"

# Merge PR (REST — replaces gh pr merge)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}/merge" \
  --method PUT \
  --field merge_method=squash
```

**Why REST over GraphQL?** GraphQL has a separate 5000 points/hr rate limit that gets exhausted during intensive sessions. REST has its own 5000 req/hr budget that never runs out in practice. One code path, no fallbacks needed.

## Branch-First Policy

**Never commit directly to `main`.** All work happens on a branch, gets reviewed via PR, and merges via squash.

```
main branch  →  always clean, always deployable
feature work →  branch → PR → squash merge → branch deleted
```

### Branch Naming

Match the conventional commit type:

| Prefix | When |
|--------|------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Code restructure |

Format: `<type>/<short-description>` — e.g. `feat/auth-refresh`, `fix/null-checkout`

### Merge Strategy

Always squash merge via REST API — one commit per feature on main, clean linear history.

```bash
# Merge via REST API
SLUG=$(git remote get-url origin | sed )
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls/${PR_NUM}/merge" \
  --method PUT --field merge_method=squash
```

## Commit Conventions
- Frequent, atomic commits
- Conventional commit messages (feat, fix, refactor, test, docs, chore)
- TDD order: test commit before (or with) implementation commit

## Post-Merge Cleanup

After a branch merges, clean up local state:

```bash
git checkout main
git pull
git fetch --prune
git branch --merged main | grep -v  | xargs git branch -d 2>/dev/null || true
```

For squash-merged branches (git can't detect squash ancestry):

```bash
git branch -D feat/my-feature
```

Run `node .claude/lib/doctor.js` to detect stale local branches.

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
