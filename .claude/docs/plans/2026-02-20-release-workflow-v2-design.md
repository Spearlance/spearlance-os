# Release Workflow v2 — Design

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Branch protection, bypassPermissions UX, GitHub release automation

## Context

armadillo already has a solid release pipeline:
- Pre-push hook → `version-bump.js` (auto-bumps from conventional commits)
- `sync-all.js` validates plugin manifests, symlinks, hooks, README, CLAUDE.md
- `build-claude-md.js` regenerates CLAUDE.md from skills.json + marketplace.json
- `update-readme.js` regenerates README.md sections
- Branch-first policy documented in `git-workflow.md`

### Gaps Identified

1. **No branch protection enforcement** — rule says "never commit to main" but nothing stops it
2. **No bypassPermissions recommendation** — ships with `acceptEdits` default, no prompt to upgrade
3. **No GitHub releases** — `updating-armadillo` checks `releases/latest` but no releases exist
4. **No session-start nudge** — users on acceptEdits never learn about bypass mode

## Change 1: Pre-commit Branch Protection

### What
Add `.githooks/pre-commit` that blocks commits to main/master. Escape hatch: `ARMADILLO_ALLOW_MAIN=1`.

### Flow
```
pre-commit fires
  → get current branch name
  → if main or master:
    → if ARMADILLO_ALLOW_MAIN=1: allow
    → else: print error, exit 1
  → else: allow
```

### Files
- **New:** `.githooks/pre-commit` — branch guard script
- **Edit:** `scripts/version-bump.js` — set `ARMADILLO_ALLOW_MAIN=1` env var when creating release commit
- **Edit:** `scripts/install-hooks.js` — already copies all `.githooks/*` so no change needed

### Edge Case
The version-bump script creates a release commit on main during pre-push. It needs the escape hatch. Updated `exec()` call passes `ARMADILLO_ALLOW_MAIN=1` in env.

## Change 2: bypassPermissions Prompt

### What
During onboarding and updating, ask users if they want bypassPermissions mode. If yes, flip `defaultMode` in their settings.json.

### Where
- **Edit:** `plugins/core/skills/onboarding/SKILL.md` — after Phase 2 settings.json write, add a permission mode prompt
- **Edit:** `plugins/core/skills/updating-armadillo/SKILL.md` — during migration, offer the toggle
- **Edit:** `scripts/build-claude-md.js` — update default Permissions section text to recommend bypass

### Prompt Design
```
armadillo works best with bypassPermissions mode.

What this means:
▪ Claude auto-approves all tool calls except the deny-list
▪ Faster iteration — no permission prompts for safe commands
▪ Deny-list still blocks catastrophic commands (rm -rf /, force push, etc.)

▸ Enable bypassPermissions?
  1. Yes, enable it (Recommended)
  2. No, keep acceptEdits
```

If yes → Edit settings.json `defaultMode` to `"bypassPermissions"`.

### Manifest Tracking
Store `permissionMode: "bypassPermissions"` or `"acceptEdits"` in manifest so the session-start hook knows without reading settings.json every time.

## Change 3: Session-Start Nudge

### What
`session-start.sh` checks permission mode. If not bypassPermissions, prints a one-liner nudge every session until they switch.

### Implementation
```bash
# In session-start.sh — check permission mode
SETTINGS="$CLAUDE_PROJECT_DIR/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  MODE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SETTINGS','utf8')).permissions?.defaultMode || 'unknown')")
  if [ "$MODE" != "bypassPermissions" ]; then
    echo "💡 armadillo works best with bypassPermissions — run /updating-armadillo to toggle"
  fi
fi
```

### Behavior
- Fires every session start
- Disappears once they switch to bypassPermissions
- Short, non-intrusive one-liner
- Points them to /updating-armadillo (which handles the toggle)

## Change 4: GitHub Release Automation

### What
GitHub Actions workflow that auto-creates tagged releases when release commits land on main.

### Flow
```
push to main
  → workflow triggers
  → check if latest commit is "chore: release X.Y.Z"
  → if yes:
    → extract version from commit message
    → generate release notes from CHANGELOG.json
    → create git tag vX.Y.Z
    → create GitHub release with notes
  → if no: skip (not a release commit)
```

### Files
- **New:** `.github/workflows/release.yml` — the workflow
- **New:** `scripts/generate-release-notes.js` — reads CHANGELOG.json, outputs markdown for the given version

### Release Notes Format
```markdown
## What's New in vX.Y.Z

### Added
- feature 1
- feature 2

### Improved
- improvement 1

### Fixed
- fix 1

Full changelog: CHANGELOG.json
```

### Why This Matters
`updating-armadillo` Step 2 calls `gh api repos/.../releases/latest` to check for new versions. Without actual GitHub releases, this returns nothing. This workflow closes the loop.

## Summary

| Change | Files | Risk |
|--------|-------|------|
| Branch protection | 1 new, 1 edit | Low — escape hatch prevents lockout |
| bypassPermissions prompt | 2 skill edits, 1 script edit | Low — opt-in, never forced |
| Session nudge | 1 hook edit | Low — one-liner, disappears on toggle |
| GitHub releases | 1 workflow, 1 script | Low — read-only on codebase, only creates tags/releases |
