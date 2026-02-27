# Release Workflow (armadillo repo only)

This rule applies to the armadillo repository. It is NOT shipped to user projects.

## Automatic Versioning

**Every push to main automatically includes a version bump.**

Pre-push hook runs before each push:
1. Detects commits being pushed
2. Determines change type from conventional commits:
   - `feat:` → minor version bump
   - `fix:` → patch version bump
   - `BREAKING CHANGE:` or `!` → major version bump
   - No conventional commits → patch (default)
3. Bumps version in package.json
4. Updates CHANGELOG.json with commit summaries
5. Updates README.md via update-readme script
6. Creates release commit: `chore: release X.Y.Z`
7. Continues with push

## Your Workflow

```bash
# 1. Make changes
git add .
git commit -m "feat: add cool feature"

# 2. Push
git push

# 3. Hook runs automatically
→ Detected change type: minor (feat commit)
→ Bumping 0.5.3 → 0.6.0
→ Updated CHANGELOG.json
→ Updated README.md
→ Created commit: chore: release 0.6.0
→ Pushing 2 commits...
● ahh, that felt good didn't it?
```

**Zero manual steps. Zero thinking.**

## Bypassing (Emergency Use Only)

If you need to push without version bump:

```bash
git push --no-verify
```

**Not recommended.** Only use for:
- Fixing broken CI
- Emergency hotfixes where version was already bumped manually
- Reverting commits

## Conventional Commits

For automatic change detection, use conventional commit prefixes:

```
feat: add new feature       → minor version bump
fix: fix bug                → patch version bump
docs: update docs           → patch version bump (type=improved)
refactor: refactor code     → patch version bump (type=improved)
test: add tests             → patch version bump (type=improved)
chore: update dependencies  → patch version bump (type=improved)

feat!: breaking change      → major version bump
fix!: breaking fix          → major version bump
```

## CHANGELOG Format

Auto-generated from commits:

```json
{
  "X.Y.Z": {
    "date": "YYYY-MM-DD",
    "changes": [
      {
        "type": "added",
        "summary": "add new feature",
        "breaking": false
      }
    ]
  }
}
```

## Hook Installation

Hooks install automatically when anyone runs `npm install`.

If hooks aren't working:
- Run: `npm run postinstall` (or `node scripts/install-hooks.js`)
- Check: `ls -la .git/hooks/pre-push` shows executable file

## Armadilloer Updates

With automatic versioning:
- Every push to main = new version
- Armadilloers run `/updating-armadillo` to stay in sync
- Version numbers always match git history
- No version drift
