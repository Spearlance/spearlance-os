# Changelog System Design

## Problem

When users run "update armadillo", the updating skill knows *which files changed* (via hash comparison) but not *what changed semantically*. Users see "23 files auto-updated" with no context. They can't make informed decisions about conflicts, and they miss new capabilities.

## Solution

A `CHANGELOG.json` file in the repo root that's:
- **Machine-readable** for the updating skill to act on programmatically
- **Human-readable** when rendered by the skill during updates
- **Auto-generated** by the finishing-a-development-branch skill when working in the armadillo repo

## Schema

`CHANGELOG.json` at repo root:

```json
{
  "0.2.0": {
    "date": "2026-02-17",
    "changes": [
      {
        "type": "added",
        "skill": "requesting-code-review",
        "files": ["skills/requesting-code-review/code-reviewer.md"],
        "summary": "Added OWASP security checklist to code reviewer",
        "details": "Code reviewer now checks for hardcoded secrets, input validation, SQL injection, auth enforcement, data protection, command injection, and dependency vulnerabilities.",
        "breaking": false
      }
    ]
  }
}
```

### Change types

- `added` — new skill or new file in existing skill
- `improved` — enhanced existing skill/file
- `fixed` — bug fix
- `removed` — deleted skill/file
- `breaking` — requires user action (always shown with explanation before auto-updating)

### Fields

- `type` — one of the change types above
- `skill` — the skill name (key in skills.json)
- `files` — array of file paths that changed (relative to `.claude/`)
- `summary` — one-line human-readable description
- `details` — optional longer explanation
- `breaking` — boolean; if true, updating skill stops to explain before applying

## How it gets written

The `finishing-a-development-branch` skill detects when it's running in the armadillo repo (checks `package.json` name is `@filenamedotexe/armadillo`) and:

1. Diffs `.claude/skills/` and `skills.json` against the base branch
2. Identifies which skills had files added/modified/removed
3. Reads the actual diffs to understand what changed
4. Generates changelog entries with meaningful summaries
5. Appends them to `CHANGELOG.json` under the current version (from `package.json`)
6. Commits the changelog update alongside the rest of the work

Version bucketing: entries go under whatever version is in `package.json`. Multiple PRs before a version bump accumulate under the same version key.

## How it gets consumed

The `updating-armadillo` skill adds a new step between fetching the latest release and classifying file changes:

1. Fetch `CHANGELOG.json` from GitHub:
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo-cli/contents/CHANGELOG.json --jq '.content' | base64 -d
   ```
2. Collect all entries between user's current version and latest
3. Present "What's New" summary grouped by change type
4. Breaking changes shown first with explanation
5. Ask user to proceed

### Multi-version jumps

If user is on v0.1.0 and latest is v0.3.0, aggregate all entries from v0.1.1 through v0.3.0. Nothing gets missed.

### Example output

```
## What's New (v0.1.2 → v0.2.0)

### Improved
- **requesting-code-review:** Added OWASP security checklist to code reviewer

### Added
- **neon:** New skill — Neon serverless Postgres (in Database bundle)

### Fixed
- **systematic-debugging:** Fixed find-polluter.sh path resolution on macOS

2 skills updated, 1 new skill available.
Proceed with update?
```

## Files to change

| File | Action |
|------|--------|
| `CHANGELOG.json` (new) | Create at repo root with initial entries for existing versions |
| `package.json` | Add `CHANGELOG.json` to `files` array |
| `skills.json` | Add `CHANGELOG.json` to `sharedFiles` |
| `finishing-a-development-branch/SKILL.md` | Add armadillo-repo detection + auto-changelog generation |
| `updating-armadillo/SKILL.md` | Add changelog fetch + "What's New" presentation step |

## What we're NOT doing

- No GitHub Action for changelog generation (Claude does it in-session)
- No separate changelog skill (it's a behavior of finishing-a-development-branch)
- No CHANGELOG.md (JSON is source of truth, updating skill renders for humans)
- No CI enforcement (the skill handles it automatically)
