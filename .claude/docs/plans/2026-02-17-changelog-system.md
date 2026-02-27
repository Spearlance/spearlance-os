# Changelog System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add a structured CHANGELOG.json that the updating-armadillo skill uses to show users what changed, and the finishing-a-development-branch skill auto-generates when working in the armadillo repo.

**Architecture:** A `CHANGELOG.json` file at repo root holds per-version, per-skill change entries. The finishing skill detects when it's in the armadillo repo and auto-generates entries by diffing skill files. The updating skill fetches the changelog from GitHub and renders a "What's New" summary during updates.

**Tech Stack:** JSON, skill markdown files, git diff

**Design doc:** `.claude/docs/plans/2026-02-17-changelog-system-design.md`

---

### Task 1: Create CHANGELOG.json with seed data

**Files:**
- Create: `CHANGELOG.json`

**Step 1: Create the initial CHANGELOG.json**

This seeds the changelog from the current version onward. Older installs that predate the changelog will see "What's New" from this point forward when they first update.

```json
{
  "0.1.2": {
    "date": "2026-02-17",
    "changes": [
      {
        "type": "added",
        "skill": "onboarding",
        "files": ["skills/onboarding/SKILL.md"],
        "summary": "New skill: intelligent project onboarding",
        "details": "Scans existing .claude/ setups, auto-upgrades armadillo-covered items, walks through custom unknowns, rebuilds kept customs to armadillo quality, and analyzes the project codebase to recommend custom skills.",
        "breaking": false
      },
      {
        "type": "added",
        "skill": "updating-armadillo",
        "files": ["skills/updating-armadillo/SKILL.md"],
        "summary": "New skill: version-aware updates with conflict resolution",
        "details": "Replaces CLI update command. Fetches latest from GitHub, auto-updates unmodified files, handles conflicts intelligently, offers new bundles/skills, includes health check (doctor) functionality.",
        "breaking": false
      },
      {
        "type": "improved",
        "skill": "subagent-driven-development",
        "files": ["skills/subagent-driven-development/SKILL.md"],
        "summary": "Added parallel subagent dispatch for non-overlapping tasks",
        "details": "Tasks touching completely separate files can now be dispatched in parallel for faster execution. Includes safety rules to prevent conflicts.",
        "breaking": false
      },
      {
        "type": "improved",
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

**Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('CHANGELOG.json','utf-8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```bash
git add CHANGELOG.json
git commit -m "feat: add CHANGELOG.json with seed data for v0.1.2"
```

---

### Task 2: Register CHANGELOG.json in package.json and skills.json

**Files:**
- Modify: `package.json:19-24` (files array)
- Modify: `skills.json:328-381` (sharedFiles section)

**Step 1: Add CHANGELOG.json to package.json files array**

In `package.json`, the `files` array currently lists:
```json
"files": [
  "bin/",
  "src/",
  ".claude/",
  "skills.json"
]
```

Add `"CHANGELOG.json"` to the array:
```json
"files": [
  "bin/",
  "src/",
  ".claude/",
  "skills.json",
  "CHANGELOG.json"
]
```

**Step 2: Add CHANGELOG.json to skills.json sharedFiles**

In `skills.json`, the `sharedFiles` object needs a new `changelog` category. Add after the `settings` entry:

```json
"sharedFiles": {
  "hooks": [...],
  "lib": [...],
  "tests": [...],
  "settings": ["settings.json"],
  "changelog": ["../CHANGELOG.json"]
}
```

Wait — `CHANGELOG.json` lives at repo root, not inside `.claude/`. The `sharedFiles` paths are relative to `.claude/`. Two options:

**Option A:** Use `"../CHANGELOG.json"` as the path — but this is unusual and the onboarding/updating skills would need to handle the `../` prefix specially.

**Option B:** Don't add it to `sharedFiles` at all — the updating skill already knows to fetch it explicitly by name from GitHub. It doesn't need to be tracked in the manifest like other shared files because it's never copied to user projects. It's only fetched at update time and rendered.

**Go with Option B.** The `CHANGELOG.json` is a repo-level metadata file consumed at update time, not a file installed to user projects. Only add it to `package.json` `files` so it ships with npm.

**Step 3: Validate both files**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf-8')); console.log('package.json valid')"`
Expected: `package.json valid`

Run: `node -e "JSON.parse(require('fs').readFileSync('skills.json','utf-8')); console.log('skills.json valid')"`
Expected: `skills.json valid`

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add CHANGELOG.json to package.json files array"
```

Note: Only `package.json` changes. `skills.json` is NOT modified (per Option B reasoning above).

---

### Task 3: Update finishing-a-development-branch skill with auto-changelog

**Files:**
- Modify: `.claude/skills/finishing-a-development-branch/SKILL.md`

This is the key task. The skill needs a new step that detects when it's in the armadillo repo and auto-generates changelog entries.

**Step 1: Add "Step 1.5: Auto-Generate Changelog (Armadillo Repo Only)" section**

Insert this section between the existing "Step 1: Verify Tests" and "Step 2: Determine Base Branch" sections. The full text to add:

```markdown
### Step 1.5: Auto-Generate Changelog (Armadillo Repo Only)

**This step only applies when working in the armadillo-cli repo.** Detect by checking:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf-8')).name)"
```
If the output is `@filenamedotexe/armadillo`, proceed. Otherwise skip to Step 2.

**Step 1.5a: Identify changed skills.**

```bash
# Get the base branch merge-base
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)

# List changed skill files
git diff --name-only $BASE..HEAD -- .claude/skills/ skills.json
```

If no skill files changed, skip to Step 2.

**Step 1.5b: Analyze changes and generate entries.**

For each changed skill:
1. Read the diff: `git diff $BASE..HEAD -- <file>`
2. Determine the change type:
   - New file not in base → `added`
   - Modified existing file → `improved`
   - File deleted → `removed`
   - Bug fix (check commit messages for "fix") → `fixed`
3. Write a one-line `summary` describing what changed
4. Write an optional `details` field if the change is substantial
5. Set `breaking: true` if the change could break existing user customizations

**Step 1.5c: Read current CHANGELOG.json and append entries.**

1. Read `CHANGELOG.json` from repo root
2. Read current version from `package.json`
3. If the version key already exists in the changelog, append new entries to its `changes` array (don't duplicate — check if a similar entry already exists by matching `skill` + `files`)
4. If the version key doesn't exist, create it with today's date
5. Write the updated `CHANGELOG.json`
6. Stage it: `git add CHANGELOG.json`

**Step 1.5d: Commit the changelog update.**

```bash
git add CHANGELOG.json
git commit -m "docs: update CHANGELOG.json for <version>"
```

**Important:** This commit happens before Step 2 (base branch determination) and Step 3 (presenting options). The changelog should be part of the branch's commits before a PR is created.
```

**Step 2: Add a note to the "Integration" section**

At the bottom of the skill file, in the Integration section, add:

```markdown
**Auto-changelog:**
- When in the armadillo-cli repo, auto-generates `CHANGELOG.json` entries before creating PR
- Detects repo by checking `package.json` name is `@filenamedotexe/armadillo`
- Only runs when `.claude/skills/` or `skills.json` files changed
```

**Step 3: Read the file back and verify the new section exists**

Read `.claude/skills/finishing-a-development-branch/SKILL.md` and confirm:
- "Step 1.5: Auto-Generate Changelog" section is present
- It appears between Step 1 and Step 2
- The package.json name check is `@filenamedotexe/armadillo`
- The Integration section mentions auto-changelog

**Step 4: Commit**

```bash
git add .claude/skills/finishing-a-development-branch/SKILL.md
git commit -m "feat: add auto-changelog generation to finishing-a-development-branch skill"
```

---

### Task 4: Update updating-armadillo skill with "What's New" presentation

**Files:**
- Modify: `.claude/skills/updating-armadillo/SKILL.md`

**Step 1: Update the process flow diagram**

In the `digraph update` flowchart, add a new node and edge between `fetch_latest` and `classify`:

Add node:
```
whats_new [label="Fetch CHANGELOG.json\nPresent What's New"];
```

Update edges:
```
fetch_latest -> whats_new [label="new version"];
whats_new -> classify;
```

Remove the existing direct edge:
```
fetch_latest -> classify [label="new version"];
```

**Step 2: Add "Step 2.5: Present What's New" section**

Insert between existing Step 2 (Fetch Latest Version) and Step 3 (Classify Changes). The full text:

```markdown
## Step 2.5: Present What's New

> **Only runs when a new version is available** (Step 2 found a version mismatch).

1. **Fetch `CHANGELOG.json`** from GitHub:
   ```bash
   env -u GITHUB_TOKEN gh api repos/{owner}/{repo}/contents/CHANGELOG.json --jq '.content' | base64 -d
   ```

2. **Collect entries** for all versions between the user's current version and the latest. Parse the JSON, iterate version keys, and include any version that is newer than the manifest version. Use semantic version comparison (split on `.`, compare major/minor/patch numerically).

3. **Render "What's New" summary** grouped by change type. Breaking changes come first:

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

4. **If there are breaking changes**, use AskUserQuestion to confirm the user wants to proceed before continuing to Step 3.

5. **If no breaking changes**, show the summary and proceed to Step 3 automatically.

6. **If CHANGELOG.json doesn't exist** on the remote (older repo version), skip this step silently and proceed to Step 3. The file-level update mechanism still works without it.
```

**Step 3: Add changelog to the "Downloading Files from GitHub" note**

In the existing "Downloading Files from GitHub" section, add a note:

```markdown
- **CHANGELOG.json (Step 2.5):** Fetched from repo root (not `.claude/`), used for What's New display only — not written to user's project.
```

**Step 4: Add to Common Mistakes table**

Add this row:

```markdown
| Not showing What's New | Fetch CHANGELOG.json before classifying changes — users deserve context |
```

**Step 5: Read the file back and verify**

Read `.claude/skills/updating-armadillo/SKILL.md` and confirm:
- Flow diagram has `whats_new` node
- "Step 2.5: Present What's New" exists between Step 2 and Step 3
- It fetches from `{owner}/{repo}` (not hardcoded)
- Breaking changes use AskUserQuestion
- Graceful fallback when CHANGELOG.json doesn't exist
- Common Mistakes table has the new row

**Step 6: Commit**

```bash
git add .claude/skills/updating-armadillo/SKILL.md
git commit -m "feat: add What's New changelog presentation to updating-armadillo skill"
```

---

### Task 5: Verify end-to-end and final commit

**Files:**
- Read: all modified files for sanity check

**Step 1: Validate all JSON files**

Run: `node -e "['CHANGELOG.json','package.json','skills.json'].forEach(f=>{JSON.parse(require('fs').readFileSync(f,'utf-8'));console.log(f+' OK')})"`
Expected: All three print OK.

**Step 2: Run existing tests**

Run: `npm test`
Expected: All tests pass (no regressions from package.json change).

**Step 3: Verify CHANGELOG.json content**

Read `CHANGELOG.json` and confirm:
- Has `0.1.2` version key
- Each entry has: type, skill, files, summary, breaking
- Valid change types: added, improved, fixed, removed

**Step 4: Verify finishing skill has the new section**

Read `.claude/skills/finishing-a-development-branch/SKILL.md` and confirm Step 1.5 is present with armadillo repo detection.

**Step 5: Verify updating skill has the new section**

Read `.claude/skills/updating-armadillo/SKILL.md` and confirm Step 2.5 is present with What's New rendering and breaking change handling.

**Step 6: Final commit (if any uncommitted verification fixes)**

```bash
git add -A
git commit -m "chore: verify changelog system implementation"
```

Only commit if there are changes. If everything is clean, skip.
