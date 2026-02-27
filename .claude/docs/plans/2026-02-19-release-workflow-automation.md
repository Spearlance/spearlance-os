# Release Workflow Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Automate version bumping on every push to main via pre-push git hook

**Architecture:** Pre-push hook intercepts push, runs version-bump script that detects change type from conventional commits, bumps version, updates CHANGELOG + README, creates commit, continues push

**Tech Stack:** Node.js (ESM), Bash, Git hooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 1: Version Bump Script Foundation

**Files:**
- Create: `scripts/version-bump.js`
- Modify: `package.json` (add postinstall script later)

**Step 1: Create version-bump.js with basic structure**

```javascript
#!/usr/bin/env node
/**
 * version-bump.js
 * Auto-detects version bump type from commits and updates package.json, CHANGELOG.json, README.md
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const exec = promisify(execCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function main() {
  console.log('→ Checking if version bump needed...');

  // Read current version
  const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const currentVersion = packageJson.version;
  console.log(`→ Current version: ${currentVersion}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

**Step 2: Make script executable**

Run: `chmod +x scripts/version-bump.js`

**Step 3: Test script runs**

Run: `node scripts/version-bump.js`

Expected output:
```
→ Checking if version bump needed...
→ Current version: 0.5.3
```

**Step 4: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): add version-bump script foundation"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 2: Detect Commits Since Last Version

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Add getCommitsSinceLastVersion function**

Add after the `ROOT` constant:

```javascript
async function getCommitsSinceLastVersion() {
  try {
    // Get commits that are being pushed (not yet on remote)
    const { stdout } = await exec('git log origin/main..HEAD --oneline');
    if (!stdout.trim()) {
      // No commits to push, check if we're already at a version commit
      const { stdout: lastCommit } = await exec('git log -1 --oneline');
      if (lastCommit.includes('chore: release')) {
        return [];  // Already have version commit
      }
      // Get last commit to analyze
      return [lastCommit.trim()];
    }
    return stdout.trim().split('\n');
  } catch (err) {
    // If origin/main doesn't exist yet, get all commits
    const { stdout } = await exec('git log --oneline');
    return stdout.trim().split('\n');
  }
}
```

**Step 2: Add commit detection to main function**

Update main() to:

```javascript
async function main() {
  console.log('→ Checking if version bump needed...');

  const commits = await getCommitsSinceLastVersion();

  if (commits.length === 0) {
    console.log('→ No commits to version (already released)');
    process.exit(0);
  }

  console.log(`→ Found ${commits.length} commit(s):`);
  commits.forEach(c => console.log(`  • ${c}`));

  // Read current version
  const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const currentVersion = packageJson.version;
  console.log(`→ Current version: ${currentVersion}`);

  process.exit(0);
}
```

**Step 3: Test with existing commits**

Run: `node scripts/version-bump.js`

Expected: Shows commits since last push

**Step 4: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): detect commits since last version"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 3: Detect Change Type from Commits

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Add detectChangeType function**

Add after getCommitsSinceLastVersion:

```javascript
function detectChangeType(commits) {
  const hasBreaking = commits.some(c =>
    c.includes('BREAKING CHANGE') ||
    c.includes('!:') ||
    c.match(/^[a-z]+!:/)  // e.g., feat!: or fix!:
  );

  const hasFeat = commits.some(c => c.match(/feat(\([^)]*\))?:/));
  const hasFix = commits.some(c => c.match(/fix(\([^)]*\))?:/));

  if (hasBreaking) return 'major';
  if (hasFeat) return 'minor';
  if (hasFix) return 'patch';
  return 'patch';  // default
}
```

**Step 2: Update main to use detectChangeType**

Add before `process.exit(0)`:

```javascript
const changeType = detectChangeType(commits);
console.log(`→ Detected change type: ${changeType}`);
```

**Step 3: Test detection logic**

Run: `node scripts/version-bump.js`

Expected: Detects "patch" or "minor" based on your commits

**Step 4: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): detect change type from conventional commits"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 4: Bump Version

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Add bumpVersion function**

Add after detectChangeType:

```javascript
function bumpVersion(version, changeType) {
  const [major, minor, patch] = version.split('.').map(Number);

  if (changeType === 'major') {
    return `${major + 1}.0.0`;
  }
  if (changeType === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}
```

**Step 2: Update main to bump version**

Add after detectChangeType:

```javascript
const newVersion = bumpVersion(currentVersion, changeType);
console.log(`→ Bumping ${currentVersion} → ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
writeFileSync(
  join(ROOT, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8'
);
console.log('→ Updated package.json');
```

**Step 3: Test version bump (dry run)**

Run: `node scripts/version-bump.js`

Check: `git diff package.json` shows version bumped

**Step 4: Restore package.json**

Run: `git restore package.json`

**Step 5: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): bump version based on change type"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 5: Update CHANGELOG.json

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Add updateChangelog function**

Add after bumpVersion:

```javascript
function updateChangelog(newVersion, commits) {
  const changelogPath = join(ROOT, 'CHANGELOG.json');
  const changelog = JSON.parse(readFileSync(changelogPath, 'utf8'));

  // Generate changes from commits
  const changes = commits
    .filter(c => !c.includes('chore: release'))  // Skip release commits
    .map(c => {
      // Extract type and summary from conventional commit
      const match = c.match(/^[a-f0-9]+ ([a-z]+)(\([^)]*\))?(!)?:\s*(.+)$/);
      if (!match) {
        return {
          type: 'improved',
          summary: c.replace(/^[a-f0-9]+ /, ''),  // Remove commit hash
          breaking: false
        };
      }

      const [, commitType, , breaking, summary] = match;

      const typeMap = {
        feat: 'added',
        fix: 'fixed',
        docs: 'improved',
        refactor: 'improved',
        test: 'improved',
        chore: 'improved'
      };

      return {
        type: typeMap[commitType] || 'improved',
        summary: summary,
        breaking: Boolean(breaking)
      };
    });

  // Add new version entry at top
  const newChangelog = {
    [newVersion]: {
      date: new Date().toISOString().split('T')[0],  // YYYY-MM-DD
      changes
    },
    ...changelog
  };

  writeFileSync(
    changelogPath,
    JSON.stringify(newChangelog, null, 2) + '\n',
    'utf8'
  );
}
```

**Step 2: Call updateChangelog in main**

Add after updating package.json:

```javascript
updateChangelog(newVersion, commits);
console.log('→ Updated CHANGELOG.json');
```

**Step 3: Test CHANGELOG update**

Run: `node scripts/version-bump.js`

Check: `git diff CHANGELOG.json` shows new entry

**Step 4: Restore files**

Run: `git restore package.json CHANGELOG.json`

**Step 5: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): update CHANGELOG.json from commits"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 6: Update README and Create Commit

**Files:**
- Modify: `scripts/version-bump.js`

**Step 1: Add README update and git commit**

Add after updateChangelog call:

```javascript
// Run update-readme script
console.log('→ Running update-readme...');
await exec('npm run update-readme');

// Stage all changed files
await exec('git add package.json CHANGELOG.json README.md');

// Create release commit
const commitMessage = `chore: release ${newVersion}

Co-Authored-By: Claude <noreply@anthropic.com>`;

await exec(`git commit -m "${commitMessage.replace(/\n/g, '\\n')}"`);
console.log(`→ Created commit: chore: release ${newVersion}`);

console.log('● ahh, that felt good didn\'t it?');
```

**Step 2: Test full workflow**

Run: `node scripts/version-bump.js`

Expected: Creates version bump commit

Check: `git log -1` shows release commit

**Step 3: Verify all files updated**

Check:
- `git show HEAD:package.json` — version bumped
- `git show HEAD:CHANGELOG.json` — entry added
- `git show HEAD:README.md` — updated

**Step 4: Reset test commit**

Run: `git reset HEAD~1`

**Step 5: Commit**

```bash
git add scripts/version-bump.js
git commit -m "feat(release): update README and create release commit"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 7: Pre-Push Hook

**Files:**
- Create: `.githooks/pre-push`

**Step 1: Create .githooks directory**

Run: `mkdir -p .githooks`

**Step 2: Create pre-push hook script**

Create `.githooks/pre-push`:

```bash
#!/bin/bash
#
# Pre-push hook: Auto-bump version if not already bumped
#

# Get the root of the git repo
REPO_ROOT=$(git rev-parse --show-toplevel)

# Run version-bump script
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Pre-push: Checking version..."

if ! node "$REPO_ROOT/scripts/version-bump.js"; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Version bump failed. Push aborted."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
```

**Step 3: Make hook executable**

Run: `chmod +x .githooks/pre-push`

**Step 4: Commit**

```bash
git add .githooks/pre-push
git commit -m "feat(release): add pre-push hook for version bumping"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 8: Hook Installation Script

**Files:**
- Create: `scripts/install-hooks.js`

**Step 1: Create install-hooks.js**

```javascript
#!/usr/bin/env node
/**
 * install-hooks.js
 * Copies .githooks/* to .git/hooks/ and makes them executable
 */

import { copyFileSync, chmodSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GITHOOKS_DIR = join(ROOT, '.githooks');
const GIT_HOOKS_DIR = join(ROOT, '.git', 'hooks');

if (!existsSync(GIT_HOOKS_DIR)) {
  console.log('✗ .git/hooks directory not found (not a git repo?)');
  process.exit(0);
}

const hooks = readdirSync(GITHOOKS_DIR);

hooks.forEach(hookName => {
  const src = join(GITHOOKS_DIR, hookName);
  const dest = join(GIT_HOOKS_DIR, hookName);

  copyFileSync(src, dest);
  chmodSync(dest, 0o755);  // Make executable

  console.log(`✓ Installed ${hookName}`);
});

console.log(`✓ Git hooks installed (${hooks.length} hook${hooks.length !== 1 ? 's' : ''})`);
```

**Step 2: Make script executable**

Run: `chmod +x scripts/install-hooks.js`

**Step 3: Test installation**

Run: `node scripts/install-hooks.js`

Expected output:
```
✓ Installed pre-push
✓ Git hooks installed (1 hook)
```

Check: `ls -la .git/hooks/pre-push` shows executable hook

**Step 4: Commit**

```bash
git add scripts/install-hooks.js
git commit -m "feat(release): add hook installation script"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 9: Add Postinstall Script

**Files:**
- Modify: `package.json`

**Step 1: Add postinstall script**

Update scripts section in package.json:

```json
{
  "scripts": {
    "test": "node --test tests/*.test.js",
    "update-readme": "node scripts/update-readme.js",
    "postinstall": "node scripts/install-hooks.js"
  }
}
```

**Step 2: Test postinstall**

Run: `npm install`

Expected: Hook installation runs automatically

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat(release): add postinstall hook installation"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 10: Update Release Checklist

**Files:**
- Modify: `.claude/rules/release-checklist.md`

**Step 1: Rewrite release-checklist.md**

Replace entire file with:

```markdown
# Release Workflow (armadillo-cli repo only)

This rule applies to the armadillo-cli repository. It is NOT shipped to user projects.

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
```

**Step 2: Commit**

```bash
git add .claude/rules/release-checklist.md
git commit -m "docs(release): update checklist for automatic versioning"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Task 11: Test End-to-End Workflow

**Files:**
- None (testing only)

**Step 1: Make a test change**

Create test file:

```bash
echo "test" > test-versioning.txt
git add test-versioning.txt
git commit -m "feat: test automatic versioning"
```

**Step 2: Push and verify hook runs**

Run: `git push`

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pre-push: Checking version...
→ Found 1 commit(s):
  • <hash> feat: test automatic versioning
→ Current version: 0.5.3
→ Detected change type: minor
→ Bumping 0.5.3 → 0.6.0
→ Updated package.json
→ Updated CHANGELOG.json
→ Running update-readme...
→ Created commit: chore: release 0.6.0
● ahh, that felt good didn't it?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Step 3: Verify remote has both commits**

Run: `git log origin/main -2 --oneline`

Expected: Shows both commits (feat + release)

**Step 4: Verify files were updated**

Check:
- `package.json` version = 0.6.0
- `CHANGELOG.json` has 0.6.0 entry
- `README.md` updated

**Step 5: Clean up test file**

```bash
git rm test-versioning.txt
git commit -m "chore: remove test file"
git push
```

Expected: Hook runs again, creates 0.6.1

**Step 6: Done**

All components working. Workflow is automatic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Success Criteria

✓ Pre-push hook installed automatically on `npm install`
✓ Hook detects change type from conventional commits
✓ Version bumped correctly (patch/minor/major)
✓ CHANGELOG.json updated with commit summaries
✓ README.md updated via update-readme script
✓ Release commit created automatically
✓ Push continues with both commits
✓ Zero manual steps required
✓ Bypass available with `--no-verify`

## Notes

- Hook runs client-side only (no CI/CD changes)
- Can be bypassed intentionally with `--no-verify`
- Works for single-maintainer workflow
- Scales to team use (everyone gets hook on `npm install`)
- No external dependencies (just Node + Git)
