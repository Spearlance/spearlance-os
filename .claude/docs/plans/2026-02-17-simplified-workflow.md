# Simplified GitHub Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:subagent-driven-development to implement this plan task-by-task.

**Goal:** Remove required PR reviews so a solo maintainer can merge their own PRs when CI passes, and add auto-merge to the publish workflow so version bump PRs land on main without manual intervention.

**Architecture:** Two changes: (1) GitHub branch protection API update — remove required reviews + enforce_admins, add CI as a required status check; (2) one-line addition to publish.yml that queues auto-merge after PR creation. Tests drive both changes.

**Tech Stack:** Node.js test runner (`node --test`), GitHub CLI (`gh api`), GitHub Actions YAML.

---

### Task 1: Set up worktree

**Files:** none (setup only)

**Step 1: Create worktree**

```bash
env -u GITHUB_TOKEN git pull origin main
git worktree add ~/.config/armadillo/worktrees/armadillo-cli/chore-simplify-workflow \
  -b chore/simplify-workflow
cd ~/.config/armadillo/worktrees/armadillo-cli/chore-simplify-workflow
npm install
```

**Step 2: Run baseline tests**

```bash
npm test
```

Expected: all tests pass. If any fail, stop and investigate before proceeding.

---

### Task 2: Update branch protection tests (RED)

**Files:**
- Modify: `tests/github-api.test.js`

**Context:** The current tests assert the OLD branch protection settings (1 required reviewer, CODEOWNERS required, enforce_admins ON). We need to update them to assert the NEW desired state BEFORE applying the change — this is the RED step.

**Step 1: Replace the `branch protection` describe block**

In `tests/github-api.test.js`, find and replace the entire `describe('branch protection', ...)` block (lines 33–55) with:

```js
describe('branch protection', { skip: GH ? undefined : 'gh not authenticated' }, () => {
  let p;
  before(() => { p = ghJson(`repos/${REPO}/branches/main/protection`); });

  test('PR required (no reviewer)', () => {
    assert.equal(p.required_pull_request_reviews.required_approving_review_count, 0);
  });
  test('stale reviews not dismissed', () => {
    assert.equal(p.required_pull_request_reviews.dismiss_stale_reviews, false);
  });
  test('CODEOWNERS review not required', () => {
    assert.equal(p.required_pull_request_reviews.require_code_owner_reviews, false);
  });
  test('force pushes blocked', () => {
    assert.equal(p.allow_force_pushes.enabled, false);
  });
  test('linear history required', () => {
    assert.equal(p.required_linear_history.enabled, true);
  });
  test('enforce_admins disabled', () => {
    assert.equal(p.enforce_admins.enabled, false);
  });
  test('CI status check required', () => {
    const contexts = p.required_status_checks?.contexts ?? [];
    assert.ok(contexts.includes('ci'), `expected "ci" in ${JSON.stringify(contexts)}`);
  });
});
```

**Step 2: Run tests to confirm RED**

```bash
npm test
```

Expected: 4 failures in `branch protection` describe block (approving count, stale, CODEOWNERS, enforce_admins still show old values; CI check missing). Other tests still pass.

**Step 3: Commit failing tests**

```bash
git add tests/github-api.test.js
git commit -m "test: update branch protection assertions for simplified workflow"
```

---

### Task 3: Apply branch protection change (GREEN)

**Files:** none (GitHub API call — no files changed)

**Step 1: Apply the new branch protection via API**

```bash
env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo-cli/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Expected: JSON response with the updated settings.

**Note on `contexts: ["ci"]`:** `ci` is the job name in `.github/workflows/ci.yml`. If the check isn't recognized, run `gh api repos/filenamedotexe/armadillo-cli/commits/main/check-runs` on a recent PR commit to see the exact context name GitHub uses.

**Step 2: Run tests to confirm GREEN**

```bash
npm test
```

Expected: all 7 branch protection tests pass. Full suite green.

---

### Task 4: Update publish.yml test (RED)

**Files:**
- Modify: `tests/github-files.test.js`

**Step 1: Add auto-merge test to the `publish.yml` describe block**

In `tests/github-files.test.js`, find the `publish.yml` describe block. After the `opens PR` test (line 49), add:

```js
  test('auto-merges release PR', () => assert.match(content, /gh pr merge --auto --squash/));
```

**Step 2: Run tests to confirm RED**

```bash
npm test
```

Expected: 1 failure — `auto-merges release PR` fails because publish.yml doesn't have the line yet.

---

### Task 5: Enable auto-merge on repo + update publish.yml (GREEN)

**Files:**
- Modify: `.github/workflows/publish.yml`

**Step 1: Enable auto-merge on the repo** (required for `gh pr merge --auto` to work)

```bash
env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo-cli \
  --method PATCH \
  --field allow_auto_merge=true
```

Expected: JSON response with `"allow_auto_merge": true`.

**Step 2: Add auto-merge line to publish.yml**

In `.github/workflows/publish.yml`, find the "Push release branch and open PR" step. After `gh pr create ...` (the closing `--head "$BRANCH"` line), add one line before the closing of the run block:

```yaml
      - name: Push release branch and open PR
        run: |
          BRANCH="release/v$VERSION"
          git checkout -b "$BRANCH"
          git add package.json
          git commit -m "chore: bump version to v$VERSION"
          git push origin "$BRANCH"
          gh pr create \
            --title "chore: release v$VERSION" \
            --body "Automated version bump to v$VERSION — published to GitHub Packages." \
            --base main \
            --head "$BRANCH"
          gh pr merge --auto --squash
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 3: Run tests to confirm GREEN**

```bash
npm test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add .github/workflows/publish.yml tests/github-files.test.js
git commit -m "feat: auto-merge release PR on CI pass"
```

---

### Task 6: Commit .claude/CLAUDE.md change

**Files:**
- Modify: `.claude/CLAUDE.md` (unstaged change — "Never use EnterPlanMode" line already written, just needs committing)

**Step 1: Stage and commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: prohibit EnterPlanMode in favour of writing-plans skill"
```

---

### Task 7: Create PR and merge

**Step 1: Push branch**

```bash
env -u GITHUB_TOKEN git push -u origin chore/simplify-workflow
```

**Step 2: Create PR**

```bash
env -u GITHUB_TOKEN gh pr create \
  --title "chore: simplify GitHub workflow for solo maintainer" \
  --body "$(cat <<'EOF'
## What

- Branch protection: remove required reviews + enforce_admins, add CI as required status check
- Publish workflow: auto-merge version bump PR once CI passes
- CLAUDE.md: prohibit EnterPlanMode

## Why

Solo maintainer doesn't need a human reviewer to approve their own PRs. CI passing is sufficient gate. Auto-merge on publish removes the manual housekeeping step of merging the version bump PR.

## Test plan
- [ ] All tests pass in CI
- [ ] Branch protection tests confirm new settings
- [ ] publish.yml test confirms auto-merge line present
EOF
)"
```

**Step 3: Merge once CI passes**

Since `required_approving_review_count` is now 0, you can merge immediately when CI goes green:

```bash
env -u GITHUB_TOKEN gh pr merge --squash --delete-branch
```

---

### Task 8: Land the open version bump PR

After Task 7 is merged, merge the open PR #3 (`chore: release v0.1.1`) to bring main's `package.json` to `0.1.1`:

```bash
env -u GITHUB_TOKEN gh pr merge 3 --squash
```

Expected: main now shows `"version": "0.1.1"`.
