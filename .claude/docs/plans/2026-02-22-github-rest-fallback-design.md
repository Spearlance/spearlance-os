# GitHub REST API Fallback — Design

## Problem

The `gh` CLI uses GitHub's GraphQL API for all `pr` commands (`pr list`, `pr create`, `pr merge`). GraphQL has a 5,000 points/hour rate limit. During intensive sessions (subagent-driven-dev with 9+ tasks), the `post-push-pr-check.sh` hook fires on every push, and combined with polling in `finishing-a-development-branch`, this exhausts the GraphQL budget — blocking PR creation at the worst possible moment.

## Solution

Switch hooks from `gh pr *` (GraphQL) to `gh api repos/.../pulls` (REST). REST has a separate 5,000 requests/hour limit that's barely touched during normal workflows.

## Changes

### 1. New: `.claude/hooks/lib/github-rest.sh`

Shared library providing REST-based alternatives:

- `gh_repo_slug()` — detect `owner/repo` from git remote
- `gh_rest_pr_list_by_head()` — `GET /repos/{o}/{r}/pulls?head={owner}:{branch}`
- `gh_rest_pr_create()` — `POST /repos/{o}/{r}/pulls`
- `gh_rest_pr_merge()` — `PUT /repos/{o}/{r}/pulls/{n}/merge`
- `gh_graphql_available()` — check GraphQL budget before using it

All functions use `env -u GITHUB_TOKEN gh api` for auth consistency.

### 2. Update: `post-push-pr-check.sh`

- Replace `gh pr list --head` → `gh_rest_pr_list_by_head`
- Replace `gh pr merge --auto` → guard with `gh_graphql_available()`, skip silently if exhausted

### 3. Update: `finishing-a-development-branch` SKILL.md

Add "Rate Limit Fallback" section:
- `gh pr create` fails → use REST `POST /repos/.../pulls`
- `gh pr merge` fails → use REST `PUT /repos/.../pulls/{n}/merge`
- Note: auto-merge is GraphQL-only — direct REST merge as fallback

### Known limitation

Auto-merge (`gh pr merge --auto`) requires GraphQL. No REST equivalent exists. When GraphQL is exhausted, direct REST merge works as fallback.
