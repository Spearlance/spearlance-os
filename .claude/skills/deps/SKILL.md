---
model: claude-sonnet-4-6
context: fork
name: deps
description: "Use when managing dependencies — auditing for vulnerabilities, updating packages safely, or adding new dependencies with rollback on failure. Also use when npm audit reports issues or packages are outdated."
---

# Deps

Safe dependency management with audit, changelog review, test, and automatic rollback on failure.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🔧 deps ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what you're updating]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Commands

### Audit

Check current dependency health:

```bash
npm audit                    # Security vulnerabilities
npm outdated                 # Available updates
```

Reports: critical/high vulnerabilities, patch/minor/major updates available, inactive packages.

### Update

Plan and execute safe updates:

**Step 1: Categorize by risk**

| Level | Risk | Action |
|-------|------|--------|
| Patch (x.x.PATCH) | Low | Auto-apply |
| Minor (x.MINOR.x) | Medium | Review changelog, apply if safe |
| Major (MAJOR.x.x) | High | Requires manual approval |

**Step 2: For each update**

1. Check changelog for breaking changes (use WebSearch)
2. Apply the update
3. Run full verification: `npm run check && npm run build && npm test`
4. If fails → rollback immediately

**Step 3: Report results**

```
▪ [N] updates applied successfully
▪ [N] updates skipped (breaking changes)
▪ [N] updates failed (rolled back)
```

### Add

Safely add a new dependency:

1. **Audit package** — check weekly downloads, last publish date, maintainer count
2. **Check bundle size** — warn if >100KB (frontend bundle impact)
3. **Install and verify** — `npm install <package> && npm run check && npm run build`
4. **Rollback if issues** — `npm uninstall <package> && git checkout package.json package-lock.json`

## Quick Reference

| Action | Command |
|--------|---------|
| Audit health | `deps audit` |
| Safe update | `deps update` |
| Add package | `deps add <package>` |
| Remove package | `npm uninstall <package>` |

## Safety Rules

- Never force-update packages with known breaking changes
- Always run full build + tests after updates
- Keep lock file committed (package-lock.json / yarn.lock / pnpm-lock.yaml)
- Rollback immediately on test/build failure
- Warn if package is >100KB (frontend bundle impact)
- Never update all major versions at once — one at a time

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Updating all packages at once | Update one risk level at a time: patch → minor → major |
| Skipping changelog review for minor bumps | Minor versions can have subtle behavior changes — always check |
| Not running build after update | Type errors and build failures only surface with full verify |
| Force-resolving audit warnings | Fix the vulnerability, don't suppress the warning |
| Ignoring peer dependency warnings | Peer dep mismatches cause runtime errors — resolve them |
