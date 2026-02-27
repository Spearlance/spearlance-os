---
model: claude-sonnet-4-6
context: fork
name: cleanup
description: "Use when post-implementation cleanup is needed — archiving old docs, scanning for orphaned files, removing debug code, organizing imports, and auditing .claude/ for stale references. Also use after a feature ships or periodically to prevent drift."
---

# Cleanup

Post-implementation cleanup to keep the codebase and documentation organized. Run after a feature ships or periodically to prevent drift.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 cleanup ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what you're cleaning]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Scope Options

| Scope | Stages | When |
|-------|--------|------|
| `full` (default) | All 5 stages | After a major feature ships |
| `code` | Stages 2 + 5 | Quick code hygiene pass |
| `docs` | Stages 1, 3, 4 | Documentation sync |

## Process

### Stage 1: Archive Completed Docs

Move completed plan/design docs to a dated archive.

1. Scan `.claude/docs/plans/` for docs marked completed or fully implemented
2. Create archive subfolder: `.claude/docs/archive/YYYY-MM/`
3. Move completed docs — preserve original filename, add completion date header
4. Keep the most recent 2-3 handoff docs accessible

**Rules:** Never delete — always archive. Preserve filenames.

### Stage 2: Scan for Orphaned Files

Find files that no longer serve a purpose.

| Check | How |
|-------|-----|
| Orphaned components | Components not imported anywhere |
| Dead test files | Tests for removed features |
| Removed feature files | Referenced in history but no longer needed |
| Dead imports | Import paths that don't resolve |

**Report findings — do NOT auto-delete:**

```
▪ `path/to/file` — not imported anywhere
▪ `path/to/test` — tests for removed feature
▸ Delete these? [Y/N]
```

### Stage 3: Update README

Verify README accurately reflects the codebase:

- [ ] Project structure matches actual directories
- [ ] Commands listed actually work
- [ ] Dependencies match package.json / pyproject.toml
- [ ] Feature list is current

Do NOT add information that wasn't there — keep same scope and style.

### Stage 4: Audit .claude/ Folder

Check .claude/ configuration matches current codebase:

- [ ] File paths referenced in skills/rules still exist
- [ ] Component/collection counts are accurate
- [ ] Skill descriptions match current behavior
- [ ] Rules don't reference deleted patterns

Update stale references. Report what changed.

### Stage 5: Code Cleanup

Remove development artifacts and enforce consistency.

| Action | Details |
|--------|---------|
| Debug code | Remove `console.log`, `console.debug`, `debugger`. Keep `console.error` in error handlers. |
| Unused variables | Run type checker / linter to find. Remove unused imports and vars. |
| Placeholders | Search for TODO, FIXME, HACK, TEMP, XXX. Fix, track, or remove. |
| Import organization | Run formatter. Verify: external → internal → types. |
| Lint | Run project linter with auto-fix. Review semantic changes. |

## Output Report

```
## Cleanup Report

### Archived Documents
▪ [N] docs archived to `.claude/docs/archive/YYYY-MM/`

### Orphaned Files
▪ [N] orphaned files found (see details)

### README Updates
▪ [list of changes]

### .claude Updates
▪ [list of files updated]

### Code Cleanup
▪ [N] debug statements removed
▪ [N] unused variables removed
▪ [N] TODOs addressed
▪ [N] lint issues auto-fixed

Total files modified: [N]
```

## Safety Rules

- NEVER delete files without user confirmation
- ALWAYS archive rather than delete documents
- NEVER remove `console.error` in error handling paths
- NEVER modify files in `node_modules/`, `.vercel/`, `dist/`
- NEVER change behavior — only clean up artifacts

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Auto-deleting orphaned files | Report and ask — never auto-delete |
| Removing console.error | Only remove console.log/debug — keep error handling |
| Adding new README content | Match existing scope — don't expand |
| Cleaning during active development | Wait until feature is committed and shipped |
