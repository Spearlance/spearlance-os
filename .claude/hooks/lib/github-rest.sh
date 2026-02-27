#!/usr/bin/env bash
# Shared GitHub REST API utilities for armadillo hooks.
# Uses REST API (5000 req/hr) instead of gh CLI's GraphQL (5000 pts/hr).
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/github-rest.sh"

# Detect owner/repo from git remote origin
gh_repo_slug() {
  git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||;s|\.git$||'
}

# List open PRs for a branch using REST API
# Usage: gh_rest_pr_list_by_head "branch-name"
# Returns: JSON array of PRs
gh_rest_pr_list_by_head() {
  local branch="$1"
  local slug
  slug=$(gh_repo_slug)
  local owner="${slug%%/*}"
  env -u GITHUB_TOKEN gh api "repos/${slug}/pulls?head=${owner}:${branch}&state=open" 2>/dev/null
}

# Merge a PR using REST API (squash merge)
# Usage: gh_rest_pr_merge "pr_number" ["commit_title"]
# Returns: JSON merge result
gh_rest_pr_merge() {
  local pr_number="$1"
  local commit_title="${2:-}"
  local slug
  slug=$(gh_repo_slug)
  env -u GITHUB_TOKEN gh api "repos/${slug}/pulls/${pr_number}/merge" \
    --method PUT \
    --field merge_method=squash \
    ${commit_title:+--field commit_title="$commit_title"} 2>/dev/null
}

# Check if GraphQL rate limit has budget remaining (>50 points buffer)
# Returns: exit 0 if available, exit 1 if exhausted
gh_graphql_available() {
  local remaining
  remaining=$(env -u GITHUB_TOKEN gh api rate_limit --jq '.resources.graphql.remaining' 2>/dev/null) || return 1
  [ "$remaining" -gt 50 ] 2>/dev/null
}
