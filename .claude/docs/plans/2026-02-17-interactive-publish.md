# Interactive Publish Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Replace the tag-based `publish.yml` with a `workflow_dispatch` workflow that asks for a version bump type before publishing to GitHub Packages.

**Architecture:** A single `workflow_dispatch` GitHub Actions workflow with a `bump` choice input (patch/minor/major). On run: bumps `package.json` version, creates a `release/vX.Y.Z` branch with the bump commit, opens a PR against main (branch protection compliance), then publishes immediately from the release branch so the new version is available right away.

**Tech Stack:** GitHub Actions `workflow_dispatch`, `npm version`, GitHub Packages (`npm.pkg.github.com`), `gh` CLI for PR creation.

---

## Context

The existing `.github/workflows/publish.yml` triggers on `v*` tag pushes. It has no interactivity and no version bumping — the user had to manually create a git tag and push it. The new workflow replaces this with a GitHub Actions UI dropdown that appears when the user clicks "Run workflow" on the Actions tab.

Branch protection is active (enforce_admins: true, PRs required, squash merge only). The version bump commit cannot go directly to main — it goes to a release branch, and a PR is created automatically.

The test file `tests/github-files.test.js` does not yet exist on main (it's in pending PR #1 on branch `test/safe-merge-workflow`). For this reason, we add the publish.yml test to the **existing PR #1 branch** so the test infrastructure is in one place, and this change rides on the same PR.

---

## Task 1: Switch to the existing PR #1 worktree

The worktree for PR #1 already exists and has the test infrastructure. We'll add the publish.yml changes there.

**Step 1: Verify the worktree exists and is on the right branch**

```bash
cd ~/.config/armadillo/worktrees/armadillo-cli/test-safe-merge-workflow
git status
git log --oneline -4
```

Expected: on branch `test/safe-merge-workflow`, 4 commits ahead of main.

---

## Task 2: Write the failing test for publish.yml (RED)

**Files:**
- Modify: `tests/github-files.test.js`

**Step 1: Add publish.yml describe block to the test file**

Append to `tests/github-files.test.js`:

```js
describe('publish.yml', () => {
  const content = readFileSync('.github/workflows/publish.yml', 'utf8');

  test('exists', () => assert.ok(existsSync('.github/workflows/publish.yml')));
  test('triggers on workflow_dispatch', () => assert.match(content, /workflow_dispatch/));
  test('has bump input', () => assert.match(content, /bump/));
  test('has patch option', () => assert.match(content, /patch/));
  test('has minor option', () => assert.match(content, /minor/));
  test('has major option', () => assert.match(content, /major/));
  test('has contents write permission', () => assert.match(content, /contents: write/));
  test('has pull-requests write permission', () => assert.match(content, /pull-requests: write/));
  test('bumps version', () => assert.match(content, /npm version/));
  test('creates release branch', () => assert.match(content, /release\//));
  test('opens PR', () => assert.match(content, /gh pr create/));
  test('publishes package', () => assert.match(content, /npm publish/));
});
```

**Step 2: Run the failing tests**

```bash
cd ~/.config/armadillo/worktrees/armadillo-cli/test-safe-merge-workflow
node --test tests/github-files.test.js 2>&1 | tail -20
```

Expected: ~10 failures in the `publish.yml` suite (`triggers on workflow_dispatch`, etc.)

**Step 3: Commit the failing tests**

```bash
git add tests/github-files.test.js
git commit -m "test: add publish.yml structure assertions (RED)"
```

---

## Task 3: Implement the new publish.yml (GREEN)

**Files:**
- Modify: `.github/workflows/publish.yml`

**Step 1: Replace the entire file contents**

```yaml
name: Publish to GitHub Packages

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'

      - run: npm ci

      - name: Bump version
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npm version ${{ github.event.inputs.bump }} --no-git-tag-version
          echo "VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_ENV

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
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2: Run the tests — all publish.yml tests should pass**

```bash
cd ~/.config/armadillo/worktrees/armadillo-cli/test-safe-merge-workflow
node --test tests/github-files.test.js 2>&1 | tail -20
```

Expected: All tests in `publish.yml` suite pass. Total should be 28 pass, 0 fail.

**Step 3: Run the full test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: `pass 28, fail 0`

**Step 4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "feat: interactive publish workflow with workflow_dispatch and version bump"
```

---

## Task 4: Push and update the PR

**Step 1: Push the new commits to the existing PR branch**

```bash
env -u GITHUB_TOKEN git push origin test/safe-merge-workflow
```

**Step 2: Verify CI picks up the new commits**

```bash
env -u GITHUB_TOKEN gh pr checks 1 2>&1
```

Note: CI may fail due to billing limit (same as before — not a code issue). The tests pass locally.

---

## Files Changed

| File | Action |
|------|--------|
| `tests/github-files.test.js` | Add `publish.yml` describe block (12 assertions) |
| `.github/workflows/publish.yml` | Replace tag trigger with `workflow_dispatch` + version bump + PR creation |
| `.claude/CLAUDE.md` | Add principle: never use `EnterPlanMode`, use `writing-plans` skill |

---

## Verification

1. `npm test` locally — 28 pass, 0 fail
2. After PR merges: Go to **Actions → Publish to GitHub Packages → Run workflow**
3. Select `patch` / `minor` / `major` from the dropdown
4. Workflow bumps version, opens a release PR, publishes to GitHub Packages
5. `npm install @anthropic-zach/armadillo` gets the new version
