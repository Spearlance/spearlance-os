---
model: claude-sonnet-4-6
name: writing-prs
description: Use when creating pull requests, writing PR descriptions, or when finishing-a-development-branch creates a PR. Ensures PR titles follow conventional commits and descriptions follow the hybrid template format.
allowed-tools: "Bash(gh *)"
---

# Writing PRs

## Overview

Write PR descriptions that help reviewers — not descriptions that restate the diff.

**Core principle:** The diff shows what changed. The PR description explains why, where to look, and how to verify.

**First action — before anything else:**
```bash
touch /tmp/.armadillo-pr-skill-active
```
This flag signals the skill is active. The flag is single-use — consumed on PR creation.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🚀 writing-prs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what PR you're creating] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

## PR Title

Conventional commits format. Always.

```
<type>(<scope>): <description>
```

| Type | When |
|------|------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build, deps, config, tooling |
| `perf` | Performance improvement |

**Rules:**
- Under 70 characters
- Lowercase after the colon
- No period at the end
- `!` before `:` for breaking changes: `feat!: remove deprecated auth export`

## PR Description Format

### Always Present

```markdown
## Why
One sentence explaining the motivation. Link to issue if one exists.

## Changes
▪ First change — what and why (not just "updated file.ts")
▪ Second change
▪ Third change

## Test plan
- [ ] `npm test` passes (or project's test command)
- [ ] Manual: specific steps to verify the change works

## Links
- Closes #<issue>
- Related: #<related-issue>

Generated with [Claude Code](https://claude.com/claude-code)
```

### Conditional: Review Guide

**Trigger:** PR touches 3 or more files.

Add between Changes and Test plan:

```markdown
## Review guide
| File | Focus |
|------|-------|
| `src/auth.ts:45-80` | New validation logic — core change |
| `src/middleware.ts:12` | Error handling flow changed |
| `tests/auth.test.ts` | New test cases — verify coverage |
```

**Rules:**
- Include line numbers when pointing to specific logic
- Most important file first
- Skip test files unless they contain surprising logic

### Conditional: Breaking Changes

**Trigger:** PR introduces breaking changes (removed exports, changed types, renamed APIs).

Add after Review guide (or Changes if no review guide):

```markdown
## Breaking changes
▪ Removed `checkAuth()` export — use `validateToken()` instead
▪ Changed `UserSession` type — added required `expiresAt` field
```

**Rules:**
- Each item: what broke + what to do instead
- Link to migration guide if complex

### Conditional: Screenshots

**Trigger:** PR includes UI changes.

Add after Changes:

```markdown
## Screenshots
| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |
```

## How to Build the Description

### Step 1: Analyze the diff

```bash
# Full diff against base branch
git diff main...HEAD

# File-level summary
git diff main...HEAD --stat

# Commit history
git log main..HEAD --oneline
```

### Step 2: Determine the "Why"

Answer ONE of these — not all:
- What problem does this solve?
- What does the user/developer gain?
- What issue/spec/design does this implement?

If you can't answer any of these, the PR might not be ready.

### Step 3: Write Changes as outcomes

**Bad:**
```
▪ Updated auth.ts
▪ Modified middleware.ts
▪ Added auth.test.ts
```

**Good:**
```
▪ Added JWT expiry validation — tokens now rejected after TTL
▪ Refactored auth middleware to use centralized validator
▪ Added 8 test cases covering valid, expired, and malformed tokens
```

### Step 4: Write actionable test steps

**Bad:**
```
- [ ] Tests pass
```

**Good:**
```
- [ ] `npm test` passes
- [ ] Manual: login → wait 5 min → refresh → should redirect to /login
- [ ] Check: expired token returns 401, not 500
```

### Step 5: Evaluate conditionals

| Condition | Add section |
|-----------|-------------|
| 3+ files changed | Review guide |
| Breaking changes | Breaking changes |
| UI changes | Screenshots |
| New dependencies | Note in Changes with reason |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Restating the diff | "Updated auth.ts to add validateToken" — reviewer sees that | Explain why: "Added token expiry check to prevent stale sessions" |
| Emoji headers | "🔧 Changes" | Plain text headers |
| Wall of prose | 3 paragraphs where 3 bullets work | Bullet points |
| Missing "why" | Changes listed without motivation | Always lead with Why section |
| Vague test plan | "Tests pass" | Specific commands + manual steps |
| Everything in title | 90-char title, empty body | Short title, details in body |
| AI filler | "This PR introduces several improvements..." | Delete. Start with the first real sentence. |

## Creating the PR — REST API

Always use `gh api` (REST). Never use `gh pr create` (GraphQL — rate-limited).

Always use HEREDOC for the body. Always use `env -u GITHUB_TOKEN`.

```bash
# Detect repo slug
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')

# Push branch first
env -u GITHUB_TOKEN git push -u origin <feature-branch>
```

### Standard (< 3 files)

```bash
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes
▪ <change 1>
▪ <change 2>

## Test plan
- [ ] <test command>
- [ ] <manual step>

## Links
- Closes #<issue>

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --jq '.number, .html_url'
```

### With Review Guide (3+ files)

```bash
SLUG=$(git remote get-url origin | sed 's|.*github.com[:/]||;s|\.git$||')
BODY=$(cat <<'EOF'
## Why
<motivation>

## Changes
▪ <change 1>
▪ <change 2>

## Review guide
| File | Focus |
|------|-------|
| `<file:line>` | <what to look at> |

## Test plan
- [ ] <test command>
- [ ] <manual step>

## Links
- Closes #<issue>

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
env -u GITHUB_TOKEN gh api "repos/${SLUG}/pulls" \
  --method POST \
  --field title="<type>(<scope>): <description>" \
  --field head="<feature-branch>" \
  --field base="main" \
  --field body="$BODY" \
  --jq '.number, .html_url'
```

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
Work in progress — not ready for review

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

## Integration

**Called by:**
- `finishing-a-development-branch` — when creating a PR (Option 1)
- Any direct PR creation via `gh api`

**Enforced by:**
- `.claude/rules/pr-format.md` — always-loaded format reminder
- Post-push hook — reminds to create PR if branch has no PR after push

**Pairs with:**
- `requesting-code-review` — review after PR is created
- `using-git-worktrees` — feature branch isolation before PR
