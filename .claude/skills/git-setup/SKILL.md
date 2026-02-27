---
model: claude-sonnet-4-6
context: fork
name: git-setup
description: Use when a project has no git strategy, no branch protection, no conventional commits, or when the user says "set up git", "git workflow", "branch protection", or "version bumping". Also use when onboarding detects missing git hygiene.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

# Git Setup

## Overview

Detects a project's git health and installs armadillo's git workflow: branch protection, conventional commits, squash merge policy, and version-bump automation.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 git-setup ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what git setup action] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## When to Use

- Project has no `.githooks/` directory
- Project has no `git-workflow.md` rule
- No conventional commit history detected
- User says "set up git", "branch protection", "version bump"
- Called automatically by onboarding during Phase 1

## Step 1: Detection

Scan the project for git health signals:

```bash
# Check for branch protection
ls .githooks/pre-commit 2>/dev/null

# Check for git-workflow rule
ls .claude/rules/git-workflow.md 2>/dev/null

# Check for conventional commits in recent history
git log -10 --oneline 2>/dev/null | grep -cE '^[a-f0-9]+ (feat|fix|chore|docs|test|refactor)(\([^)]*\))?:'

# Check for package.json with version
node -e "const p=require('./package.json');console.log(p.version||'')" 2>/dev/null

# Check current branch
git branch --show-current 2>/dev/null

# Check if rerere is enabled
git config rerere.enabled 2>/dev/null || echo "not set"
```

### Detection Report

Present findings:

```
## Git Health Check

| Component | Status |
|-----------|--------|
| Branch protection (.githooks/pre-commit) | ✗ Missing |
| Git workflow rule (.claude/rules/git-workflow.md) | ✗ Missing |
| Conventional commits (last 10) | 2/10 |
| Version in package.json | ✓ v1.2.3 |
| Current branch | main (⚠ working directly on main) |
| git rerere | ✗ Not enabled |
```

## Step 2: Branch Protection

Ask the user:

```
▸ Install branch protection? This adds a pre-commit hook that blocks direct
  commits to main/master. You'll create branches for all feature work.

  Escape hatch: ARMADILLO_ALLOW_MAIN=1 git commit ...
```

Use **AskUserQuestion**:
- **"Yes, install it" (Recommended)** — install hook
- **"No, skip"** — continue without branch protection

### If yes:

1. Create `.githooks/pre-commit`:

```bash
#!/bin/bash
# Pre-commit hook: Block commits directly to main/master
# Escape hatch: ARMADILLO_ALLOW_MAIN=1 git commit ...

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  if [ "${ARMADILLO_ALLOW_MAIN:-0}" = "1" ]; then
    exit 0
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✗ Direct commits to $BRANCH are blocked."
  echo ""
  echo "  Create a branch first:"
  echo "    git checkout -b feat/your-feature"
  echo ""
  echo "  Emergency override:"
  echo "    ARMADILLO_ALLOW_MAIN=1 git commit ..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

exit 0
```

2. Make executable: `chmod +x .githooks/pre-commit`

3. Install to `.git/hooks/`:
```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

4. If `package.json` exists, add a postinstall script to auto-install hooks:

Check if `scripts.postinstall` already exists. If not:
```bash
node -e "
const pkg = require('./package.json');
if (!pkg.scripts) pkg.scripts = {};
if (!pkg.scripts.postinstall) {
  pkg.scripts.postinstall = 'cp .githooks/* .git/hooks/ 2>/dev/null && chmod +x .git/hooks/* 2>/dev/null || true';
  require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
}
"
```

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

## Step 3: Git Workflow Rule

Auto-install `.claude/rules/git-workflow.md` (no question — this is core convention):

```markdown
# Git Workflow

## Branch-First Policy

**Never commit directly to `main`.** All work happens on a branch, gets reviewed via PR, and merges via squash.

### Branch Naming

| Prefix | When |
|--------|------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Code restructure |

Format: `<type>/<short-description>` — e.g. `feat/auth-refresh`, `fix/null-checkout`

## Commit Conventions

- Frequent, atomic commits
- Conventional commit messages (feat, fix, refactor, test, docs, chore)
- TDD order: test commit before (or with) implementation commit

## Merge Strategy

Always squash merge via PR — one commit per feature on main, clean linear history.

## Integration Branches

When 3+ branches touch overlapping files, create an integration branch:
- Naming: `integrate/<description>`
- Merge all feature branches into integration first
- Then squash-merge integration to main
- Developer approval required before creation
```

Create the directory if needed: `mkdir -p .claude/rules`

**REST-first enforcement:** The `git-workflow.md` rule mandates using `gh api` REST calls instead of `gh pr create/merge/view` (GraphQL). See `.claude/rules/git-workflow.md` for the full REST API patterns and rationale.

## Step 4: Version-Bump Automation

If `package.json` exists with a `version` field, offer version-bump automation.

```
▸ Set up automatic version bumping? Conventional commits drive semver:
  feat: → minor, fix: → patch, breaking (!) → major

  Two options:
  1. Local pre-push hook (runs before each push)
  2. GitHub Actions workflow (runs in CI)
```

Use **AskUserQuestion**:
- **"Local pre-push hook" (Recommended)** — runs locally before push
- **"GitHub Actions workflow"** — runs in CI
- **"No version bumping"** — skip

### Option A: Local pre-push hook

Create `.githooks/pre-push`:

```bash
#!/bin/bash
# Pre-push hook: auto-bump version from conventional commits
# Creates a version tag based on commit types since last tag

set -e

# Get latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
LATEST_VERSION=${LATEST_TAG#v}

# Get commits since last tag
COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline 2>/dev/null || git log --oneline)

if [ -z "$COMMITS" ]; then
  exit 0
fi

# Detect change type
HAS_BREAKING=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ [a-z]+!:' || true)
HAS_FEAT=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ feat(\([^)]*\))?:' || true)

IFS='.' read -r MAJOR MINOR PATCH <<< "$LATEST_VERSION"

if [ "$HAS_BREAKING" -gt 0 ]; then
  MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
elif [ "$HAS_FEAT" -gt 0 ]; then
  MINOR=$((MINOR + 1)); PATCH=0
else
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Update package.json version
node -e "
const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
pkg.version = '${NEW_VERSION}';
require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Commit and tag
git add package.json
git commit -m "chore: release ${NEW_VERSION}" --no-verify
git tag "v${NEW_VERSION}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Bumped to v${NEW_VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

### Option B: GitHub Actions workflow

Create `.github/workflows/version-bump.yml`:

```yaml
name: Version Bump

on:
  push:
    branches: [main]

jobs:
  bump:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Bump version from commits
        run: |
          LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          COMMITS=$(git log "${LATEST_TAG}..HEAD" --oneline)

          if [ -z "$COMMITS" ]; then exit 0; fi

          HAS_BREAKING=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ [a-z]+!:' || true)
          HAS_FEAT=$(echo "$COMMITS" | grep -cE '^[a-f0-9]+ feat(\([^)]*\))?:' || true)

          IFS='.' read -r MAJOR MINOR PATCH <<< "${LATEST_TAG#v}"

          if [ "$HAS_BREAKING" -gt 0 ]; then
            MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
          elif [ "$HAS_FEAT" -gt 0 ]; then
            MINOR=$((MINOR + 1)); PATCH=0
          else
            PATCH=$((PATCH + 1))
          fi

          NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

          node -e "
          const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
          pkg.version = '${NEW_VERSION}';
          require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
          "

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json
          git commit -m "chore: release ${NEW_VERSION} [skip ci]"
          git tag "v${NEW_VERSION}"
          git push && git push --tags
```

## Step 5: Summary

Present what was configured, ask to commit.

## Key Rules

1. **Always ask before installing branch protection** — never auto-install hooks that block user actions
2. **git-workflow.md is auto-installed** — core convention, no question needed
3. **Version-bump is opt-in** — not every project wants automated versioning
4. **Never overwrite existing hooks** — if `.githooks/pre-commit` exists, read it first and merge or ask
5. **postinstall only if package.json exists** — non-Node projects skip this
