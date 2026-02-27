# Release Workflow Automation Design

**Date:** 2026-02-19
**Status:** Approved
**Context:** Enforce version bumps on every push to main, zero-thought workflow

## Problem

Current workflow requires manual version bumping before pushing to main:
- Easy to forget version bump
- Inconsistent CHANGELOG updates
- Manual README updates
- Version drift between git history and package.json
- Breaks armadilloer update synchronization

## Solution

**Automatic version bumping via pre-push git hook.**

## Design

### User Workflow

```bash
# 1. Make changes
git add .
git commit -m "feat: add cool feature"

# 2. Push normally
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

**Zero additional commands. Zero thinking.**

### How It Works

**Pre-push hook intercepts every push:**

1. **Reads commits** being pushed
2. **Checks** if version was already bumped
3. **If not bumped:**
   - Parses commit messages for conventional commit prefixes
   - Detects change type:
     - `feat:` → minor bump
     - `fix:` → patch bump
     - `BREAKING CHANGE:` or `!` → major bump
     - No conventional commits → patch (default)
   - Bumps version in package.json
   - Generates CHANGELOG.json entry from commit messages
   - Runs `npm run update-readme`
   - Stages all changes
   - Creates new commit: `chore: release X.Y.Z`
4. **Continues push** with original commits + version bump commit

**Result:** Every push to main automatically includes version bump.

### Installation

**Automatic via npm:**

```json
{
  "scripts": {
    "postinstall": "node scripts/install-hooks.js"
  }
}
```

When anyone runs `npm install`, hooks are installed to `.git/hooks/`.

### Components

**1. `.githooks/pre-push`**
- Bash script that runs on every `git push`
- Calls `scripts/version-bump.js`
- Located in repo, copied to `.git/hooks/` on install

**2. `scripts/version-bump.js`**
- Node script that handles version logic
- Detects change type from commits
- Bumps version (semver)
- Updates CHANGELOG.json
- Updates README.md via update-readme.js
- Creates release commit

**3. `scripts/install-hooks.js`**
- Copies `.githooks/*` to `.git/hooks/`
- Makes hooks executable
- Runs on `npm install` via postinstall

**4. Update `release-checklist.md`**
- Remove manual checklist (now automated)
- Document the new workflow
- Explain bypass with `--no-verify` if needed

## Change Detection Logic

**Conventional commit parsing:**

```javascript
const commits = getCommitsSinceLastVersion();

const hasBreaking = commits.some(c =>
  c.includes('BREAKING CHANGE') || c.includes('!')
);
const hasFeat = commits.some(c => c.startsWith('feat'));
const hasFix = commits.some(c => c.startsWith('fix'));

if (hasBreaking) return 'major';
if (hasFeat) return 'minor';
if (hasFix) return 'patch';
return 'patch'; // default
```

## CHANGELOG Entry Format

Auto-generated from commits:

```json
{
  "X.Y.Z": {
    "date": "2026-02-19",
    "changes": [
      {
        "type": "added",
        "summary": "<extracted from feat: commits>",
        "breaking": false
      }
    ]
  }
}
```

## Edge Cases

**Bypassing the hook:**
- User can run `git push --no-verify` to skip hook
- Intentional escape hatch for emergencies
- Not recommended for normal workflow

**Multiple commits before push:**
- Hook detects ALL commits since last version
- Determines highest-priority change type
- Single version bump for all changes

**No conventional commits:**
- Defaults to patch bump
- Uses commit messages as-is for CHANGELOG

**Hook not installed:**
- First `npm install` after pulling installs hooks
- Postinstall script handles it automatically

## Benefits

**For developers:**
- Zero extra commands
- Can't forget to version bump
- CHANGELOG automatically updated
- README automatically synced

**For armadilloers:**
- Every push to main = new version
- `/updating-armadillo` always sees latest changes
- Version numbers stay in sync with git history

## Implementation Complexity

**Low:**
- ~100 lines total (hook + version-bump script + install script)
- No external dependencies beyond Node.js
- Standard git hooks (no Husky needed)
- No CI/CD changes needed

## Rollout

1. Implement scripts/version-bump.js
2. Create .githooks/pre-push
3. Create scripts/install-hooks.js
4. Add postinstall to package.json
5. Update release-checklist.md
6. Test locally
7. Commit and push (triggers hook for first time)
8. Document in CHANGELOG

## Success Criteria

- ✓ Every push to main includes version bump
- ✓ CHANGELOG.json automatically updated
- ✓ README.md automatically updated
- ✓ Zero manual steps for releases
- ✓ Armadilloers stay in sync with updates
