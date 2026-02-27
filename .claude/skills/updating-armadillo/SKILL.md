---
model: claude-opus-4-6
context: fork
name: updating-armadillo
description: Use when checking for armadillo updates, upgrading to a new version, verifying installation health, adding or removing skill packs, or when the user says "update armadillo", "upgrade", "check for updates", "doctor", "add pack", or "remove pack".
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, WebFetch, Skill
---

# Updating Armadillo

## Overview

Intelligent update skill that fetches the latest armadillo commit SHA from GitHub, compares file hashes to detect what changed, auto-updates unmodified files, handles conflicts with user decisions, manages skill packs, and runs a full intelligence audit on user-owned files. Also handles health check (doctor) functionality.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🛡 updating-armadillo ━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what update/action]   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

**Model requirement:** This skill involves version comparison and upgrade decisions. Use **Opus 4.6** (`claude-opus-4-6`).

## When to Use

- User says "update armadillo", "upgrade", "check for updates", "doctor"
- User says "add pack", "remove pack", "install skill pack", "add backend skills"
- Manifest SHA doesn't match latest commit SHA
- After armadillo publishes new commits
- Periodic health check of installation

## When NOT to Use

- No manifest exists → use `onboarding` skill instead
- Fresh project with no `.claude/` → use `onboarding` skill instead

## Process Flow

```
Start
  ↓
Step 1: Read .armadillo-manifest.json
  → extract current SHA, installed packs, file hashes, repoUrl
  ↓
Step 2: Fetch latest commit SHA from GitHub
  → if SHA matches → skip to Step 5.5 (intelligence layer — always runs)
  → if SHA differs → continue
  ↓
Step 2.5: Present What's New (CHANGELOG.json)
  → breaking changes? ask to confirm before proceeding
  ↓
Step 3: Fetch remote armadillo.json, diff file by file
  → hash match + owner:armadillo → auto-update
  → hash mismatch + owner:armadillo → flag as conflict
  → new file → offer or auto-install
  → owner:user → skip
  → deleted upstream + owner:armadillo → delete local
  ↓
Step 3.5: Sync infrastructure (hooks, settings, rules)
  → hook scripts, hooks.json, settings.json, rules
  ↓
Step 4: Resolve conflicts one at a time
  → keep mine / use armadillo's / show diff
  ↓
Step 5: Pack Management
  → offer new packs, add/remove packs
  ↓
Step 5.5: Intelligence Layer
  → semantic overlap detection
  → quality audit
  → hook audit
  → orphan resolution
  ↓
Step 6: Health Check
  ↓
Step 7: Update .armadillo-manifest.json
  ↓
Done
```

## Step 0: Pre-flight Check

Before any GitHub API calls, verify `gh` CLI is installed and authenticated:

```bash
# 1. Check gh CLI is installed
command -v gh >/dev/null 2>&1 || { echo "gh CLI not found. Install from https://cli.github.com"; exit 1; }

# 2. Check keyring auth (not Claude Code's limited GITHUB_TOKEN)
env -u GITHUB_TOKEN gh auth status 2>&1
```

**If `command -v gh` fails:** Tell the user:
```
gh CLI not installed. Install it first:
  brew install gh        # macOS
  https://cli.github.com # other platforms
Then re-invoke this skill.
```

**If `gh auth status` exits non-zero:** Tell the user:
```
GitHub CLI not authenticated. Run:
  gh auth login
Then re-invoke this skill.
```

**If both pass:** Continue silently to Step 1.

## Step 1: Read Current State

1. Read `.armadillo-manifest.json` from the user's `.claude/` directory
   - If no manifest → tell user to run `onboarding` skill instead
2. Extract: current version SHA, installed packs, file hashes, file ownership
3. Resolve the repo to use:
   - If `repoUrl` is present in manifest, parse the owner/repo from it
     (e.g. `https://github.com/filenamedotexe/armadillo` → `filenamedotexe/armadillo`)
   - If absent, use this exact constant — do NOT guess or infer from directory names:
   ```bash
   REPO="filenamedotexe/armadillo"
   ```
   ⚠️ The repo slug is exactly `armadillo`. Do NOT append `-cli` or any other suffix. The local directory name is irrelevant.

**Manifest format:**

```json
{
  "version": "abc123def456",
  "repoUrl": "https://github.com/filenamedotexe/armadillo",
  "installedAt": "2026-02-20T00:00:00Z",
  "updatedAt": "2026-02-20T00:00:00Z",
  "installedPacks": ["frontend", "backend", "database"],
  "files": {
    "skills/brainstorming/SKILL.md": {
      "owner": "armadillo",
      "hash": "sha256..."
    }
  }
}
```

## Step 2: Check for Updates (SHA Comparison)

1. Fetch the latest commit SHA from the armadillo repo:
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/commits/main --jq '.sha'
   ```

2. Compare to `manifest.version`:
   - **Same SHA** → user is current. Show "Already up to date (SHA: abc123)" and skip to Step 6.
   - **Different SHA** → new commits exist. Continue to Step 2.5.

## Step 2.5: Present What's New

> **Only runs when a new SHA is available.**

1. Fetch `CHANGELOG.json` from GitHub:
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/CHANGELOG.json --jq '.content' | base64 -d
   ```

2. Fetch remote `armadillo.json` to get the latest version label:
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/armadillo.json --jq '.content' | base64 -d
   ```

3. Identify entries between the user's current version label and the latest. Parse the JSON, iterate version keys, and include any version newer than the one associated with the user's current SHA. Use semantic version comparison (split on `.`, compare major/minor/patch numerically).

4. Render "What's New" grouped by change type. Breaking changes come first:

   ```
   ## What's New (v0.1.2 → v0.2.0)

   ### ⚠ Breaking Changes
   - **skill-name:** Description of what broke and what user needs to do

   ### Added
   - **new-skill:** One-line summary

   ### Improved
   - **existing-skill:** One-line summary

   ### Fixed
   - **buggy-skill:** One-line summary

   ### Removed
   - **old-skill:** One-line summary

   N skills updated, M new skills available.
   ```

5. **If there are breaking changes**, use AskUserQuestion to confirm the user wants to proceed before continuing to Step 3.

6. **If no breaking changes**, show the summary and proceed to Step 3 automatically.

7. **If CHANGELOG.json doesn't exist**, skip this step silently and proceed to Step 3.

## Step 3: Fetch & Diff Files

1. Fetch the latest `armadillo.json` from the repo (if not already fetched in Step 2.5):
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/armadillo.json --jq '.content' | base64 -d
   ```
   This file lists all armadillo-owned files and their current hashes.

2. For each file tracked in the remote `armadillo.json`:

   **Hash comparison:**
   - Compute local hash: `shasum -a 256 .claude/<path> | cut -d' ' -f1`
   - Compare to stored hash in `.armadillo-manifest.json`

   **Classification:**

   | Condition | Action |
   |-----------|--------|
   | `owner: armadillo`, local hash matches manifest hash (unmodified) | **Auto-update** — download latest, overwrite silently |
   | `owner: armadillo`, local hash differs from manifest hash (user modified) | **Conflict** — flag for Step 4 |
   | File exists in remote but not in local manifest | **New file** — auto-install if pack already installed, offer if new pack |
   | `owner: user` | **Skip** — never touch |
   | File in local manifest but not in remote (deleted upstream), `owner: armadillo` | **Delete** — remove local file, remove from manifest |
   | File in local manifest but not in remote, `owner: user` | **Inform** — tell user, remove from manifest, keep file on disk |

3. **Auto-update all unmodified armadillo files** silently using the download pattern:
   ```bash
   env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/.claude/<path> --jq '.content' | base64 -d
   ```
   Then write locally with the **Write** tool.

4. **Show summary before conflict resolution:**
   ```
   Files updated automatically: 12
   Conflicts requiring your decision: 2
   New files installed: 1
   Files deleted (removed upstream): 0
   ```


## Step 3.5: Infrastructure Sync

> **Runs after file diff/update, before conflict resolution.** Ensures settings, hooks, and rules match armadillo defaults — the infrastructure that makes everything work.

**Principle:** Armadillo owns infrastructure. Users own content. Never touch skills, agents, memory, or knowledge. Sync the plumbing smart, not caveman.

### 3.5a. Sync Hook Scripts

For each `.sh` file in the remote `.claude/hooks/` directory:
1. Download the latest version from GitHub
2. Write to local `.claude/hooks/<script>.sh`
3. Ensure executable: `chmod +x .claude/hooks/<script>.sh`
4. Update manifest hash

**These are armadillo-owned hook scripts. Users don't customize them.**

### 3.5b. Sync hooks.json

1. Fetch the latest `.claude/hooks/hooks.json` from GitHub
2. Compare with local `.claude/hooks/hooks.json`
3. For each hook event in the remote version:
   - If event is missing locally → add it
   - If event exists but commands differ → update to match remote
4. For each hook event in the LOCAL version that's NOT in the remote:
   - Preserve it — this is a user-added hook event
5. Write the merged `hooks.json`

### 3.5c. Sync settings.json

**Hooks section:** Rebuild from the synced `hooks.json` — `hooks.json` is the source of truth.

**Permissions section** — sync permissions defaults without removing user additions:
1. Ensure `defaultMode` is `"bypassPermissions"` (offer toggle if not — same as health check)
2. Ensure all armadillo `allow` entries are present — add missing ones, don't remove user additions
3. Ensure all armadillo `deny` entries are present — add missing ones, don't remove user additions

**Env section:**
1. Ensure armadillo env vars are present (e.g., `CLAUDE_CODE_SUBAGENT_MODEL`)
2. Don't remove user-added env vars

### 3.5d. Sync Rules

1. Fetch the list of rule files from the remote `.claude/rules/` directory
2. For each armadillo-owned rule (matched by filename):
   - Download latest version, overwrite local
3. For each local rule NOT in the remote:
   - Preserve it — this is a user-added rule
4. Report what was synced

### 3.5e. Infrastructure Sync Summary

```
## Infrastructure Sync

Hook scripts updated: 12
hooks.json events synced: 10 (2 new)
settings.json hooks rebuilt: ✓
Permissions verified: bypassPermissions ✓
Rules synced: 8 (1 new: git-workflow.md)
User rules preserved: 2 (my-custom-rule.md, project-conventions.md)
```

## Step 4: Resolve Conflicts

For each conflicting file, one at a time — never batch:

1. Show the file path and explain it was modified locally
2. Offer three options via AskUserQuestion:
   - **Keep mine** — preserve local version, update manifest hash to current local hash so we don't ask again
   - **Use armadillo's** — download latest from GitHub and overwrite
   - **Show diff** — display diff between local and remote version, then ask keep/use armadillo's
3. Apply choice and update manifest hash

**Showing a diff:**
```bash
# Write the remote version to a temp file, then diff
env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/.claude/<path> --jq '.content' | base64 -d > /tmp/armadillo-remote-file
diff .claude/<path> /tmp/armadillo-remote-file
```

## Step 5: Pack Management

### 5a. Offer New Packs

For each pack available in `armadillo.json` that the user does NOT have in `manifest.installedPacks`:

```
New pack available: "database" — Neon, Supabase, MongoDB, Redis (4 skills)
Install?
```

Use AskUserQuestion. If yes, download and install all files for that pack.

### 5b. New Skills in Existing Packs

For each new skill in a pack the user already has installed:

```
New skill in "backend" pack: "hono" — Hono framework for edge APIs
Installing automatically...
```

Auto-install new skills in existing installed packs (no question needed).

### 5c. Add Pack (Explicit Request)

When user explicitly requests "add backend pack" or similar:

1. Identify which pack from their description — match to pack names in `armadillo.json`
2. Check it's not already in `manifest.installedPacks`
3. Show pack contents:
   ```
   armadillo-backend — 4 skills:
   ▪ hono — Hono edge API framework
   ▪ express — Express.js patterns
   ▪ trpc — tRPC type-safe APIs
   ▪ rest-api-patterns — REST design guide
   ```
4. Confirm via AskUserQuestion
5. Download and install all pack skill files from GitHub
6. Update `manifest.installedPacks`

### 5d. Remove Pack (Explicit Request)

When user explicitly requests "remove google-apis" or similar:

1. Identify which pack from their description
2. Confirm via AskUserQuestion — show what skills will be removed
3. Delete all pack skill files from `.claude/skills/`
4. Remove pack files from manifest
5. Update `manifest.installedPacks`

**Report:**
```
✓ google-apis pack removed

▪ 7 skills removed (ga4, google-ads, search-console, places, youtube, lighthouse, business-profile)
```

**Single source of truth:** Both `onboarding` and `updating-armadillo` read the pack list from `armadillo.json` in the armadillo repo. No hardcoded pack lists — the manifest is the authority.

If the remote `armadillo.json` has new packs not present locally → install them automatically (no prompting, per the full-install policy).

## Step 5.5: Intelligence Layer

**Run every time** — whether or not a version update was applied. Quality rot and new armadillo coverage happen between releases.

**Model requirement:** Deep semantic comparison. Use **Opus 4.6** for classification subagents.

### 5.5a. Collect User-Owned Files

From the manifest, collect all files with `owner: 'user'`. Skip these entirely — they are Bucket D and never audited:
- `agent-memory/*/MEMORY.md` — accumulated domain knowledge, sacred
- `context/` — runtime state written by hooks
- `progress/` — handoffs, plans, optimization logs
- `docs/` — real content (brand guides, architecture docs, research)

Process the rest: custom skills, agents, hooks, rules, and CLAUDE.md custom content.

### 5.5b. Semantic Overlap Detection

For each user-owned skill or agent:

1. **Read the file content** in full
2. **Compare against ALL current armadillo skills** — use the fetched `armadillo.json` descriptions plus read key SKILL.md files for skills that seem close
3. **Ask:** Does this file's core purpose now overlap with any armadillo skill — including skills newly added in this update?

**Classification:**

| Finding | Label | Action |
|---------|-------|--------|
| Core function 100% covered by an armadillo skill | `NOW_COVERED` | Offer to replace with armadillo version |
| Core function covered but file has additional unique logic | `PARTIAL_OVERLAP` | Surface the unique parts; offer targeted rebuild |
| File is still entirely unique, no armadillo equivalent | `UNIQUE` | Check quality (5.5c) |
| File is empty, placeholder, or contains no real content | `STALE` | Offer to delete |

**For `NOW_COVERED`:** Present to user one at a time:
```
## User Skill Now Covered: skills/commit-helper/SKILL.md

Your custom 'commit-helper' skill is now fully covered by armadillo's
'finishing-a-development-branch' skill (added in latest update).

Options:
1. Replace with armadillo's version (recommended) — removes duplication
2. Keep mine — mark as reviewed, don't ask again
3. Show armadillo's version first
```

Use **AskUserQuestion**. If they choose Replace → delete the custom file, install the armadillo equivalent, update manifest (`owner: 'armadillo'`).

**For `PARTIAL_OVERLAP`:** Extract the unique logic into the dropped content buffer and process immediately:
- Unique workflow → write a new focused custom skill via `writing-skills` TDD
- One-liner or convention → add to project-specific section of `CLAUDE.md`
- Protection/enforcement behavior → write a hook
- Reference info → write to `.claude/docs/<name>.md`
- Trivial/redundant → discard silently

Then replace the original file with the armadillo equivalent. Update manifest.

### 5.5c. Quality Audit

For each `UNIQUE` user-owned skill or agent, check these quality signals by reading the file:

| Signal | Check |
|--------|-------|
| Has frontmatter | `name:` and `description:` fields present in YAML block |
| Description is CSO-optimized | Trigger sentence — describes when to invoke, not what it does |
| Has When to Use / When NOT to Use | Avoids misuse |
| Has process flow | Numbered steps or flowchart — not just prose |
| Has Quick Reference | Command table or cheat sheet |
| Has Common Mistakes | At least 3 entries |
| Agents specified | References actual agents in `.claude/agents/` |
| Wired correctly | If skill references hooks or shared files, they exist |

**Scoring:** Count how many signals are present out of 8.

| Score | Label | Action |
|-------|-------|--------|
| 7-8 | `ARMADILLO_QUALITY` | Report as passing — no action |
| 4-6 | `NEEDS_POLISH` | Offer targeted improvement |
| 0-3 | `NEEDS_REBUILD` | Offer full rewrite via `writing-skills` TDD |

**For `NEEDS_POLISH`:** Show exactly which signals are missing, offer to fix them:
```
## Quality Check: skills/add-blog-post/SKILL.md

Missing signals (2 of 8):
✗ No Common Mistakes section
✗ Description is not CSO-optimized (says what it does, not when to trigger)

Options:
1. Fix these gaps now (targeted edit — not a full rewrite)
2. Full rebuild via writing-skills TDD
3. Skip — mark as reviewed
```

**For `NEEDS_REBUILD`:** Present as a decision:
```
## Quality Check: skills/seo-audit/SKILL.md

Score: 2/8 — does not meet armadillo standard.
Missing: frontmatter, CSO description, When NOT to Use, process flow, Quick Reference, Common Mistakes

Options:
1. Rebuild to armadillo spec (writing-skills TDD — recommended)
2. Keep as-is — mark as reviewed
```

Use **AskUserQuestion** for each. If they choose rebuild → invoke `armadillo:writing-skills` on that file immediately. If they choose skip → stamp a `qualityReviewed` field in the manifest entry so this file is not re-surfaced next update cycle.

### 5.5d. User-Owned Hook Audit

For each user-owned hook in the manifest:

1. **Check it's wired in hooks.json** — if the script exists but isn't referenced, it never runs. Offer to wire it.
2. **Check it's executable** — `ls -l` to confirm execute bit. If not, `chmod +x`.
3. **Check for error handling** — does the script have `set -euo pipefail`? If not, note it.

```
## Hook Audit: hooks/block-destructive.sh

⚠ Not wired in hooks.json — this hook never runs.

Options:
1. Wire it now (add to hooks.json with correct matcher)
2. Delete it — no longer needed
3. Skip
```

### 5.5e. Orphan Resolution

The health check (Step 6) flags orphaned files — files in `.claude/` not tracked in the manifest. Step 5.5e processes them rather than just listing them.

For each orphaned file:
1. **Read its content**
2. **Classify:**
   - Path matches an armadillo-owned file → install armadillo version, add to manifest as `owner: 'armadillo'`
   - Semantically duplicates an armadillo skill → same; extract unique content to dropped content buffer
   - Bucket D (agent-memory, context, progress, docs with real content) → add to manifest as `owner: 'user'`, no further action
   - Truly custom → present to user: keep (add to manifest as `owner: 'user'`) or delete
3. **Update manifest** — no file leaves this step untracked

### 5.5f. Audit Summary

After all items processed, show a single summary before moving to health check:

```
## User-Owned File Audit

Covered by armadillo (replaced): 1
  - skills/commit-helper/ → finishing-a-development-branch

Quality: 8 skills reviewed
  - 5 at armadillo standard ✓
  - 2 rebuilt via writing-skills TDD
  - 1 skipped (marked as reviewed)

Hooks: 2 hooks audited
  - 1 newly wired in hooks.json
  - 1 passing ✓

Orphaned files resolved: 3
  - 2 added to manifest (owner: user)
  - 1 deleted (stale placeholder)
```

## Step 6: Health Check (Doctor)

Run these checks regardless of whether an update was needed:

1. **Manifest integrity** — does `.armadillo-manifest.json` exist and parse correctly?
2. **File presence** — are all manifest-tracked files present on disk?
3. **Hook configuration** — does `hooks.json` exist and reference valid scripts?
4. **CLAUDE.md markers** — are `<!-- armadillo:start -->` and `<!-- armadillo:end -->` present?
5. **Knowledge base status** — which templates are filled vs empty?
6. **Orphaned files** — any files in `.claude/` not tracked by manifest?
7. **SHA match** — does manifest version (SHA) match the files currently on disk?
8. **Permission mode** — is the user on bypassPermissions? If not, offer to toggle:

   ```
   ℹ  Permission mode: acceptEdits

   armadillo works best with bypassPermissions mode.
   ▪ Faster iteration — no permission prompts for safe commands
   ▪ Deny-list still blocks catastrophic commands

   ▸ Enable bypassPermissions? (Recommended)
   ```

   Use **AskUserQuestion**:
   - **"Yes, enable it" (Recommended)** — Edit `.claude/settings.json` `defaultMode` to `"bypassPermissions"`
   - **"No, keep current mode"** — skip

#### Worktree Gitignore Validation

Verify worktree directories are gitignored:

```bash
# Check if .worktrees/ or worktrees/ is in .gitignore
grep -qE '^\\.?worktrees/' .gitignore 2>/dev/null
```

If NOT gitignored:
1. Add to `.gitignore`:
   ```
   .worktrees/
   worktrees/
   ```
2. Commit: `git add .gitignore && git commit -m "chore: gitignore worktree directories"`
3. Report: `✓ Fixed: worktree directories now gitignored`

### Health Report Format

```
## Health Check

OK  Manifest valid (SHA: abc123)
OK  All user-owned files present
OK  Hooks configured (SessionStart, PreToolUse)
OK  CLAUDE.md markers intact
!!  Knowledge base: 3 of 10 templates still empty
    Tip: Run brand-knowledge-builder skill to fill them in
OK  No orphaned files
OK  SHA matches manifest

1 issue found — see above.
```

## Step 7: Update .armadillo-manifest.json

If no update was performed and no health issues required changes, skip manifest write.

1. Update `version` to latest commit SHA
2. Update `updatedAt` timestamp
3. Update `installedPacks` array if packs were added/removed
4. Update all file hashes for updated files
5. Add new files to manifest
6. Remove deleted upstream files from manifest
7. Write manifest to disk with the **Write** tool

**Manifest format:**

```json
{
  "version": "abc123def456",
  "repoUrl": "https://github.com/filenamedotexe/armadillo",
  "installedAt": "2026-02-20T00:00:00Z",
  "updatedAt": "2026-02-20T00:00:00Z",
  "installedPacks": ["core", "frontend", "google-apis"],
  "files": {
    "skills/brainstorming/SKILL.md": {
      "owner": "armadillo",
      "hash": "sha256:abc123..."
    },
    "skills/my-custom-skill/SKILL.md": {
      "owner": "user",
      "hash": "sha256:def456...",
      "qualityReviewed": true
    }
  }
}
```

## Permission Mode Toggle

When the user says "toggle permission mode", "switch to bypassPermissions", "enable bypass", or similar:

1. Read `.claude/settings.json`
2. Check current `defaultMode` value
3. Toggle:
   - `acceptEdits` → `bypassPermissions`
   - `bypassPermissions` → `acceptEdits`
4. Show what changed:
   ```
   ✓ Permission mode: acceptEdits → bypassPermissions

   ▪ Claude can now auto-approve reads, edits, and Bash without prompting
   ▪ Deny-list still blocks catastrophic commands (rm -rf, git push --force, etc.)
   ```

## Key Rules

1. **Never touch user-owned files in Steps 1-5** — Step 5.5 is the only place that touches them, and only with user consent
2. **Auto-update silently** — unmodified armadillo files update without asking
3. **One conflict at a time** — don't batch conflict resolution
4. **Always run health check** — even if no update needed
5. **Stamp hashes after user keeps** — so we don't re-ask next update
6. **Track everything** — new files, deleted files, hash changes all go in manifest
7. **Use Opus 4.6** for comparison and classification subagents
8. **Bucket D is sacred** — agent-memory, context, progress, docs with real content are never audited, never touched, only added to manifest if orphaned
9. **One user-owned file at a time in Step 5.5** — never batch decisions
10. **Stamp qualityReviewed on skips** — so the file isn't re-surfaced every update cycle
11. **Step 5.5 runs every time** — not just when a new version is available; quality rot happens between releases
12. **Orphaned files must be resolved** — Step 5.5e classifies and tracks every one; health report alone is not enough
13. **bypassPermissions is recommended** — health check offers toggle; acceptEdits remains the shipped default
14. **SHA-based versioning** — `manifest.version` stores the commit SHA, not a semver tag
15. **armadillo.json is the remote file manifest** — fetch it to know what files the latest version ships
16. **Infrastructure sync is non-destructive** — add missing entries, update armadillo-owned entries, never remove user additions
17. **hooks.json is the source of truth for settings.json hooks** — always rebuild settings.json hooks from hooks.json, never the other way around

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Updating user-owned files in Steps 1-5 | Those are for armadillo-owned files only — user-owned files are handled exclusively in Step 5.5 |
| Skipping Step 5.5 because no version update was needed | Step 5.5 runs every time — quality rot and new armadillo coverage happen between releases |
| Auditing Bucket D files (agent-memory, context, progress, docs) | These are sacred — skip classification, just ensure they're in manifest |
| Asking about unmodified armadillo files | Auto-update silently if hash matches |
| Not stamping hash after "keep mine" | Stamp so we don't ask again next update |
| Not stamping qualityReviewed after "skip" in Step 5.5 | Without the stamp, the same file is flagged every single update |
| Batching Step 5.5 decisions | One user-owned file at a time with full context — never present multiple at once |
| Skipping health check when no update needed | Always run health check |
| Not offering new packs | Compare latest armadillo.json packs to manifest installedPacks |
| Batch-presenting conflicts | One at a time with diff option |
| Leaving orphaned files unresolved | Step 5.5e must classify and manifest-track every orphaned file — health report alone is not enough |
| Not downloading files before writing | Use gh api to fetch file content from GitHub |
| Using hardcoded repo instead of manifest repoUrl | Read repoUrl from manifest, fall back to default |
| Not showing What's New | Fetch CHANGELOG.json before classifying changes — users deserve context |
| Missing the overlap check for newly installed skills | Step 5.5b must compare user skills against ALL current armadillo skills, including ones just installed in this update cycle |
| Only checking skills in Step 5.5 | Also audit user-owned agents, hooks, and rules — not just skills |
| Comparing semver tags instead of commit SHAs | manifest.version is a commit SHA — compare SHA to SHA, not version strings |
| Fetching releases endpoint instead of commits | Use `gh api repos/.../commits/main` to get the latest SHA, not releases |
