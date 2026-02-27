---
model: claude-opus-4-6
name: onboarding
description: Use when setting up armadillo in a new project, migrating an existing .claude/ setup to armadillo standard, or running armadillo for the first time in a project. Also use when the user says "onboard", "init", "setup", or "install armadillo".
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task, AskUserQuestion, WebFetch, Skill
context: fork
---

# Onboarding

## Overview

Intelligent project onboarding that installs armadillo from a GitHub repository into any project. For fresh installs, scans the codebase to recommend custom skills, agents, and documentation tailored to the tech stack. For migrations, scans existing `.claude/` content, classifies it semantically, handles conflicts intelligently, and installs armadillo as a git-native file copy. Leaves a clean slate with `.armadillo-manifest.json` for version tracking.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🛡 onboarding ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what project/context] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then work.

**Model requirement:** This skill involves deep classification and thinking. Use **Opus 4.6** (`claude-opus-4-6`) for any subagent dispatches.

## Arguments

This skill accepts an optional GitHub repo URL:

```
install armadillo from https://github.com/filenamedotexe/armadillo
```

If no URL is provided, default to `https://github.com/filenamedotexe/armadillo`.

## When to Use

- First time running armadillo in a project (no manifest)
- Project has existing `.claude/` directory without armadillo
- Project has old armadillo installation that needs re-onboarding
- User says "onboard", "init", "setup", or "install armadillo"

## When NOT to Use

- Project already has current armadillo installation → use `updating-armadillo` instead
- Just need to check health → use `updating-armadillo` (includes doctor functionality)

## Process Flow

```
Phase 0: Detect State
  ↳ has .claude/? → Migration path
  ↳ no .claude/ → Fresh install path

Phase 1: Scan & Classify (migrations only)
  ↳ Enumerate all files in .claude/
  ↳ Pass 1: path-based → Buckets A/C/D
  ↳ Pass 2: semantic → confirm B, promote to A

Phase 2: Auto-Upgrade
  ↳ Fetch armadillo repo from GitHub
  ↳ Copy core files: skills, agents, hooks, rules, lib
  ↳ Pack selection (auto from stack.json or interactive)
  ↳ Copy selected pack skills
  ↳ Merge settings.json

Phase 3: Walk Through Unknowns (migrations only)
  ↳ Bucket B: one item at a time — keep/rebuild/delete
  ↳ Handle dropped content from partial semantic matches

Phase 4: Rebuild Kept Customs
  ↳ writing-skills TDD for each item user chose to rebuild

Phase 5: Clean Slate
  ↳ Delete orphaned files
  ↳ Write .armadillo-manifest.json
  ↳ Generate CLAUDE.md
  ↳ Wire hooks.json

Phase 6: Project Analysis (fresh installs only)
  ↳ Scan codebase for frameworks, tools, patterns
  ↳ Recommend custom skills, agents, docs
  ↳ Create approved content via writing-skills TDD
```

## Pre-flight Check

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

**If both pass:** Continue silently to Phase 0.

## Phase 0: Detect State

Read the project's current state:

1. **Check for `.claude/` directory** — does it exist?
2. **Check for manifest** — `.claude/.armadillo-manifest.json`
3. **Resume detection** — If `.claude/.armadillo-manifest.json` exists but the `completed` field is absent or `false`, this is an interrupted onboarding. Read the saved `phase` field and resume from there. Inform user: "Found interrupted onboarding at Phase [N]. Resuming."
4. **Check if user provided a GitHub repo URL** (e.g., `https://github.com/filenamedotexe/armadillo`) → Extract repo owner/name, proceed. If no repo URL is provided and no manifest exists, fall back to `filenamedotexe/armadillo`.
5. **Determine path:**
   - No `.claude/` → **Fresh install** (skip to Phase 2 pack selection, then Phase 6 project analysis)
   - `.claude/` with manifest AND `completed: true` → **Existing armadillo** (warn: use updating-armadillo skill instead, unless user wants full re-onboard)
   - `.claude/` without manifest → **Migration** (proceed to Phase 1)

## Phase 1: Scan & Classify

Use **Glob** (`**/{*,.*}` in `.claude/`) to enumerate all files (including dotfiles like `.armadillo-manifest.json`), then **Read** each file to classify it.

Scan every file in `.claude/` and classify each into one of four buckets:

### Classification Rules

Classification runs in two passes.

#### Pass 1 — Path-Based (Fast)

**Bucket A — "Armadillo covers this"** (auto-upgrade, no questions asked):
- Any skill directory matching an armadillo skill name (e.g., `skills/brainstorming/`, `skills/writing-plans/`, `skills/executing-plans/`, `skills/test-driven-development/`, `skills/systematic-debugging/`, `skills/verification-before-completion/`, `skills/requesting-code-review/`, `skills/receiving-code-review/`, `skills/subagent-driven-development/`, `skills/dispatching-parallel-agents/`, `skills/using-git-worktrees/`, `skills/finishing-a-development-branch/`, `skills/writing-prs/`, `skills/onboarding/`, `skills/updating-armadillo/`, `skills/writing-skills/`, `skills/writing-reference-skills/`, `skills/armadillo-shepherd/`)
- Any agent file matching an armadillo agent name (e.g., `agents/code-reviewer.md`, `agents/brand-strategist.md`)
- `hooks/hooks.json` → armadillo's hook config
- `hooks/session-start.sh` → armadillo's session start
- `hooks/reinject-after-compact.sh` → armadillo's compact hook
- `hooks/run-hook.cmd` → armadillo's Windows hook runner
- `hooks/task-completed.sh` → armadillo's task completion hook
- `lib/skills-core.js` → armadillo's shared lib
- `settings.json` → armadillo's settings template
- `CLAUDE.md` content between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` markers

**Bucket B — "Pass 2 candidate"** (path didn't match — send to semantic analysis):
- Custom skills not in the armadillo skill list (e.g., `skills/cleanup/`, `skills/commit-helper/`)
- Custom agents not in the armadillo agent list (e.g., `agents/api-reviewer.md`, `agents/planner.md`)
- Custom hooks not in armadillo's hook list (e.g., `hooks/block-destructive.sh`)
- `rules/` directory contents, `docs/` contents, filled-in `knowledge/` files
- `CLAUDE.md` content OUTSIDE armadillo markers
- Any `.claude/` files/dirs not matching armadillo paths

**Bucket D — "Sacred: preserve exactly as-is"** (never touch, never classify, never overwrite):
- `agent-memory/*/MEMORY.md` — accumulated agent knowledge (rankings, API gotchas, baselines, bug fixes)
- `docs/` with real content (brand guides, education docs, architecture references, research)
- `context/` directory — runtime state written by hooks (SWARM-STATE.md, logs, audit snapshots)
- `progress/` directory — handoffs, plans, designs, optimization logs
- Any file with `owner: "user"` in the manifest

**Bucket C — "Safe to delete"** (empty/obsolete):
- Empty template files (knowledge base templates with only placeholder text)
- `.gitkeep` files
- Empty directories
- Old manifest files (will be replaced with new format)

#### Pass 2 — Semantic Analysis

For each Bucket B candidate from Pass 1, read its **full content** and compare it against armadillo's skill and agent descriptions. Ask: *"Does this file's core purpose overlap with any armadillo skill or agent?"*

**Full semantic match** (core function 100% covered by an armadillo equivalent):
- Promote to Bucket A
- Label with the armadillo equivalent: e.g., `skills/commit-helper/ → finishing-a-development-branch`
- No unique content to extract

**Partial semantic match** (core function covered, but file has additional behavior not in the armadillo equivalent):
- Promote to Bucket A
- Label with the armadillo equivalent
- Extract the unique portions (not covered by the armadillo skill) into the **dropped content buffer** — a list of snippets with their source file, to be processed in Phase 2's Dropped Content Processing step

**No match** (does something armadillo has no equivalent for):
- Remains Bucket B (confirmed) — will surface in Phase 3

### Classification Output

Present a summary table to the user:

```
## Scan Results

### Auto-Upgrade (Armadillo covers these — will be replaced):
- skills/brainstorming/SKILL.md (armadillo skill — path match)
- skills/test-driven-development/SKILL.md (armadillo skill — path match)
- agents/code-reviewer.md (armadillo agent — path match)
- hooks/hooks.json (armadillo hooks config — path match)
- ... [N files total]

### Semantic Match → Auto-Upgrade (different name, same function):
- skills/commit-helper/SKILL.md → finishing-a-development-branch
  (unique content extracted: Heroku deploy commands, Slack step)
- agents/reviewer.md → code-reviewer (armadillo agent)
  (identical function — nothing unique)
- ... [N files total]

### Needs Your Decision (Custom content — no armadillo equivalent):
- skills/cleanup/SKILL.md (custom skill — no armadillo equivalent)
- hooks/block-destructive.sh (custom hook — no armadillo equivalent)
- rules/code-style.md (custom rules — armadillo has no rules concept)
- docs/data-structure.md (project documentation)
- ... [N files total]

### Safe to Delete:
- knowledge/client/audience-profiles.md (empty template)
- docs/archive/.gitkeep
- ... [N files total]
```

Ask user: **"This is what I found. Ready to proceed? Path matches and semantic matches will all be replaced with armadillo's latest versions — this is non-negotiable. Unique content from partial matches will be handled automatically. I'll walk you through the remaining truly custom items next."**

**Git health check:** After classification, check if the project has `.githooks/` or `.claude/rules/git-workflow.md`. If neither exists, note it for Phase 2 — git-setup will be invoked after the migration completes.

**Checkpoint:** Write partial manifest with classification results to `.claude/.armadillo-manifest.json` (include `phase: 1` field).

## Phase 2: Install Armadillo

**Armadillo is THE standard.** Anything it covers gets replaced. No negotiation.

### Fetching from GitHub

All armadillo files are fetched from the GitHub repository. The repo URL must be known — either provided by the user at first install, or read from `repoUrl` in an existing manifest. Default: `https://github.com/filenamedotexe/armadillo`.

**Method 1 — GitHub CLI** (preferred if `gh` is available):
```bash
env -u GITHUB_TOKEN gh api repos/filenamedotexe/armadillo/contents/.claude/skills/brainstorming/SKILL.md --jq '.content' | base64 -d
```

**Method 2 — WebFetch** (fallback if `gh` is unavailable):
Use **WebFetch** on raw GitHub URLs:
`https://raw.githubusercontent.com/filenamedotexe/armadillo/main/.claude/skills/brainstorming/SKILL.md`

Use the **Write** tool to write fetched content to the matching local `.claude/` path.

### Core Files to Install

Fetch and write these core files from the armadillo repo:

**Skills** (always install these — core skill set):
- `.claude/skills/brainstorming/SKILL.md`
- `.claude/skills/writing-plans/SKILL.md`
- `.claude/skills/executing-plans/SKILL.md`
- `.claude/skills/test-driven-development/SKILL.md`
- `.claude/skills/systematic-debugging/SKILL.md`
- `.claude/skills/verification-before-completion/SKILL.md`
- `.claude/skills/requesting-code-review/SKILL.md`
- `.claude/skills/receiving-code-review/SKILL.md`
- `.claude/skills/subagent-driven-development/SKILL.md`
- `.claude/skills/dispatching-parallel-agents/SKILL.md`
- `.claude/skills/using-git-worktrees/SKILL.md`
- `.claude/skills/finishing-a-development-branch/SKILL.md`
- `.claude/skills/writing-prs/SKILL.md`
- `.claude/skills/onboarding/SKILL.md`
- `.claude/skills/updating-armadillo/SKILL.md`
- `.claude/skills/writing-skills/SKILL.md`
- `.claude/skills/writing-reference-skills/SKILL.md`
- `.claude/skills/armadillo-shepherd/SKILL.md`
- `.claude/skills/git-setup/SKILL.md`

**Agents:**
- `.claude/agents/code-reviewer.md`
- (fetch the full agents directory listing via `gh api repos/filenamedotexe/armadillo/contents/.claude/agents` to discover all agents)

**Hooks:**
- `.claude/hooks/hooks.json`
- `.claude/hooks/session-start.sh`
- `.claude/hooks/reinject-after-compact.sh`
- `.claude/hooks/run-hook.cmd`
- `.claude/hooks/task-completed.sh`

**Lib:**
- `.claude/lib/skills-core.js`

**Rules:**
- `.claude/rules/coding-standards.md`
- `.claude/rules/git-workflow.md`
- `.claude/rules/output-style.md`
- `.claude/rules/pr-format.md`
- `.claude/rules/project-context.md`

**Create runtime directories:**
```bash
mkdir -p .claude/context
```
Then create `.claude/context/.gitkeep` with a comment explaining it's for runtime state.

**Store the repo URL** in the manifest (`repoUrl` field) so `updating-armadillo` can use it later without asking.

### Pack Installation

**Install ALL packs unconditionally.** Every Armadilloer gets the complete skill library. Skills that don't match their stack sit dormant with zero overhead.

No interactive selection. No prompting. Full install.

**Fetch all packs from the armadillo repo:**

For each pack directory in `packs/`:
1. Read pack's skill files from `packs/<pack-name>/skills/<skill-name>/SKILL.md`
2. Write to `.claude/skills/<skill-name>/SKILL.md`
3. Copy any additional files (prompt templates, test files, etc.)

**Log what was installed:**

```
Installed skill packs:
  ✓ core (29 skills)
  ✓ frontend (16 skills)
  ✓ google-apis (8 skills)
  ✓ backend (4 skills)
  ...
  ✓ dns (7 skills)

Total: <N> skills across <N> packs
```

### Settings Merge

Fetch armadillo's `settings.json` template from the repo. Merge with any existing `.claude/settings.json`:
- Preserve all user customizations
- Add armadillo defaults for any missing keys
- Write the merged result to `.claude/settings.json`

### Permission Mode Selection

armadillo works best with bypassPermissions. Ask the user:

Use **AskUserQuestion** with these options:
```
armadillo works best with bypassPermissions mode.

What this means:
▪ Claude auto-approves all tool calls except the deny-list
▪ Faster iteration — no permission prompts for safe commands
▪ Deny-list still blocks catastrophic commands (rm -rf /, force push, etc.)

▸ Enable bypassPermissions?
```
- **"Yes, enable it" (Recommended)** — set `defaultMode` to `"bypassPermissions"` in settings.json
- **"No, keep acceptEdits"** — leave as-is; session-start will nudge each session

If yes → use **Edit** tool to change `"defaultMode": "acceptEdits"` to `"defaultMode": "bypassPermissions"` in the project's `.claude/settings.json`.

### Git Workflow Setup

Invoke the `git-setup` skill to detect and configure the project's git strategy:

```
Invoke Skill tool with skill="git-setup"
```

This checks for branch protection, git-workflow rule, conventional commits, and version-bump automation. The user walks through each component — nothing is forced.

If `.githooks/` already exists or `.claude/rules/git-workflow.md` already exists, git-setup detects them and skips those steps.

### For Fresh Installs:

1. Install core files (above)
2. Pack selection (auto-detect or interactive)
3. Settings merge
4. Permission mode selection
5. Git workflow setup
6. Knowledge base — ask if they want brand knowledge base templates (agency/client/both/skip)

### For Migrations:

1. **Delete all Bucket A files** — they're being replaced (both path-matched and semantic-matched); for semantic matches, their original directory may differ from any armadillo path — step 6 handles those deletions
2. **Delete all Bucket C files** — they're empty/obsolete
3. **Install armadillo files** — core files + selected pack skills
4. **Preserve Bucket B files** — don't touch content yet (Phase 3); step 6 will relocate any that live at non-standard paths
5. **Pack selection** — for migrations, auto-select packs that cover existing skills, then offer additional optional packs
6. **Structural normalization:**
   - **Delete misplaced originals** — for every file promoted to Bucket A via semantic match, delete it from its original location (step 1 handled path-matched deletions; this covers the remainder). If `skills/commit-helper/` was semantically matched to `finishing-a-development-branch`, delete the entire `skills/commit-helper/` directory — don't leave it alongside the new armadillo version.
   - **Fix non-standard directories** — scan `.claude/` for directories that don't match armadillo's expected layout (`skills/`, `agents/`, `hooks/`, `lib/`, `rules/`, `docs/`). Bucket B files living in wrong locations (e.g., a custom skill at `.claude/my-skill.md`) get moved to the correct path (`.claude/skills/my-skill/SKILL.md`) before Phase 3 walkthrough.
   - **Prune empty directories** — after all moves and deletes, remove any empty directories under `.claude/`.

### Hook Merging (Critical)

A common problem with manual setup is overwriting `hooks.json` and orphaning custom hooks. The onboarding skill must:

1. **Write armadillo's hooks.json** — the standard SessionStart configuration
2. **Detect custom hooks** from Bucket B (e.g., `block-destructive.sh`, `protect-main-branch.sh`)
3. **These go to Phase 3** for user decision — if kept, they get integrated into hooks.json properly in Phase 5

### Dropped Content Processing

For each unique snippet in the **dropped content buffer** (extracted during Pass 2 of Phase 1 from partial semantic matches), determine the right home and handle it immediately — no passive summaries, no "you may want to keep this":

| Unique content type | Action |
|---------------------|--------|
| Project-specific workflow or multi-step process | Write a custom skill via `armadillo:writing-skills` TDD process |
| One-liner command, alias, or project convention | Add to project-specific section of `CLAUDE.md` |
| Protection, enforcement, or blocking behavior | Write a hook script and wire it into `hooks.json` immediately (these are new scripts, not pre-existing Bucket B hooks — no Phase 3 deferral) |
| Reference information (endpoints, env vars, API key formats) | Write to `.claude/docs/<name>.md` |
| Trivial or redundant (armadillo already handles it) | Discard silently |
| Ambiguous (cannot confidently categorize) | Surface as a Bucket B item for the Phase 3 walkthrough — don't guess |

All custom artifacts created here (skills, CLAUDE.md additions, hooks, docs) are tracked in the manifest as `owner: "user"` with SHA-256 hash immediately after writing.

**Checkpoint:** Update manifest with installed files and `phase: 2`.

## Phase 3: Walk Through Custom Unknowns

For each Bucket B item, one at a time:

### For Custom Skills

Read the skill file. Present to user:

```
## Custom Skill: cleanup

**Current content:** [brief summary of what it does]

**Options:**
1. **Keep & rebuild** — I'll rewrite this to armadillo quality using the writing-skills TDD process
2. **Keep as-is** — preserve exactly, track as user-owned in manifest
3. **Delete** — this is covered by armadillo's [closest skill] or no longer needed
```

Use **AskUserQuestion** to present options.

If they choose "Keep & rebuild" → add to Phase 4 queue.
If they choose "Keep as-is" → mark for manifest tracking as `owner: 'user'`.
If they choose "Delete" → mark for deletion.

### For Custom Agents

Same pattern. Read agent, summarize, present options.

Use **AskUserQuestion** to present options.

### For Custom Hooks

Read the hook script. Present:

```
## Custom Hook: block-destructive.sh

**What it does:** [summary — blocks destructive git commands]
**Currently:** Orphaned — hooks.json was overwritten so this never runs

**Options:**
1. **Integrate** — add this hook to armadillo's hooks.json so it actually runs
2. **Keep file only** — preserve the script but don't wire it up
3. **Delete** — no longer needed
```

Use **AskUserQuestion** to present options.

If they choose "Integrate" → queue for hooks.json integration in Phase 5.

### For Rules, Docs, Other

```
## Custom File: rules/code-style.md

**Content:** [summary]
**Armadillo equivalent:** No direct equivalent — armadillo uses CLAUDE.md principles section

**Options:**
1. **Merge into CLAUDE.md** — I'll extract the rules and add them to the project-specific section of CLAUDE.md
2. **Keep as-is** — preserve the file, track in manifest
3. **Delete** — no longer needed
```

Use **AskUserQuestion** to present options.

### For CLAUDE.md Custom Content

If the existing CLAUDE.md has content outside armadillo markers:

```
## Custom CLAUDE.md Content

**Found outside armadillo markers:**
[show the custom content]

**Options:**
1. **Preserve below armadillo section** — keep your custom content after the armadillo-managed block
2. **Rewrite to armadillo quality** — I'll restructure this following armadillo conventions
3. **Delete** — start fresh with just armadillo defaults
```

Use **AskUserQuestion** to present options.

### For Knowledge Base (Filled-In Templates)

If knowledge base files have actual content (not just templates):

```
## Knowledge Base: audience-profiles.md

**Status:** Has real content (not a template)

This will be preserved as-is (owner: user). Armadillo never overwrites filled-in knowledge base files.
```

No question needed — filled-in KB files are always preserved.

### For Agent Memory Files (`agent-memory/*/MEMORY.md`)

These are **sacred**. Never present them as a decision. Never overwrite. Never suggest deleting.

```
## Agent Memory: seo-specialist/MEMORY.md

**Status:** Accumulated agent knowledge — preserved automatically.
Armadillo never touches agent memory files. They contain irreplaceable domain knowledge
built up over real sessions (rankings, API gotchas, bug fixes, performance baselines).
```

No question needed — always Bucket D. Report in summary as preserved.

### For `docs/` with Real Content

Any `docs/` file with actual content (not empty templates) is Bucket D:

```
## Project Docs: docs/brand-voice.md (560 lines)

**Status:** Real content — preserved automatically.
```

After Phase 3, register key docs as references in CLAUDE.md:
- Brand voice guide, CLAUDE.md-level reference docs
- Knowledge base index (if multi-chapter KB exists, add the index file)
- Architecture/codebase reference if it exists

### For `context/` Directory

The `context/` directory is a **runtime state layer** written by hooks and read by agents. Always Bucket D:

```
## Runtime Context: .claude/context/

**Status:** Runtime state directory — preserved automatically.
Contains: SWARM-STATE.md (agent coordination), per-domain logs, audit snapshots.
Will be documented in CLAUDE.md.
```

After Phase 3, add a **Runtime State** section to CLAUDE.md (below armadillo markers) documenting what's in `context/`.

### For `progress/` Directory

Progress tracking (handoffs, plans, designs, optimization logs) is always Bucket D:

```
## Progress Tracking: .claude/progress/

**Status:** Session continuity data — preserved automatically.
SessionStart hook references this directory for handoff detection.
```

No question needed.

**Checkpoint:** Update manifest with each user decision as it is made (`phase: 3`).

## Phase 4: Rebuild Kept Customs

For each item the user chose "Keep & rebuild":

**REQUIRED SUB-SKILL:** Use armadillo:writing-skills

1. **Read the original** content
2. **Apply writing-skills TDD process:**
   - Understand what the skill/agent/hook does
   - Rewrite to armadillo quality standards (proper frontmatter, description, flowcharts where appropriate)
   - For skills: proper SKILL.md structure with frontmatter, overview, when to use, core pattern, quick reference, common mistakes
   - For agents: proper agent frontmatter (name, description, model), clear system prompt
   - For hooks: proper shell script with error handling, integration points
3. **Present the rewrite** to the user for approval before writing
4. **Write the rebuilt file** to the correct location

## Phase 5: Clean Slate

### 5a. Delete Orphaned Files

Remove everything marked for deletion in Phases 1-3. Clean up empty directories.

### 5b. Write Manifest

> **Hashing:** File hashes are SHA-256 hex digests. Compute with: `shasum -a 256 path/to/file | cut -d' ' -f1`

Create `.claude/.armadillo-manifest.json` with this structure:

```json
{
  "version": "<commit SHA from latest GitHub release>",
  "repoUrl": "https://github.com/filenamedotexe/armadillo",
  "installedAt": "2026-02-20T00:00:00Z",
  "updatedAt": "2026-02-20T00:00:00Z",
  "completed": true,
  "installedPacks": ["frontend", "database"],
  "files": {
    "skills/brainstorming/SKILL.md": {
      "owner": "armadillo",
      "hash": "a1b2c3d4e5f6..."
    },
    "skills/custom-skill/SKILL.md": {
      "owner": "user",
      "hash": "e5f6a7b8c9d0..."
    }
  }
}
```

Field reference:
- `version`: commit SHA from the latest GitHub release (fetch via `gh api repos/filenamedotexe/armadillo/releases/latest --jq '.target_commitish'` or use the tag SHA)
- `repoUrl`: the GitHub repository URL used for fetching
- `installedAt`: ISO 8601 timestamp of first install
- `updatedAt`: ISO 8601 timestamp of this write
- `completed`: `true` when onboarding finished successfully (absent during in-progress onboarding)
- `installedPacks`: array of installed pack names (short names, e.g., `["frontend", "database"]`)
- `files`: object keyed by relative path (from `.claude/`), each with `owner` (`"armadillo"` or `"user"`) and SHA-256 `hash`

Track ALL files — both armadillo-owned and user-owned customs.

### 5c. Generate CLAUDE.md

1. **Write armadillo section** between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` markers:
   - Skills list (organized by category)
   - Pack table listing installed packs
   - Rules table
   - Model selection table
   - Permissions section
2. **Preserve/add custom section** below the markers:
   - If user had custom CLAUDE.md content they chose to keep → place it below
   - If rules were merged into CLAUDE.md → add them here
   - Add comment: `<!-- Add your project-specific instructions below this line -->`

### 5d. Wire Up Hooks

Build `hooks.json` that includes:
- Armadillo's standard SessionStart hook (session-start.sh)
- Any custom hooks the user chose to integrate (Phase 3)
- Proper matcher patterns for each hook

### 5e. Quality Audit

After installing and before completing, run a quality audit on all user-owned custom skills and agents in the manifest. Score each on 8 signals:

| Signal | What to check |
|--------|---------------|
| **1. Frontmatter** | Has `model`, `name`, `description` fields |
| **2. Description quality** | Description is specific and useful (not generic) |
| **3. Announcement box** | Has the `┏━` announcement box |
| **4. When to use / not use** | Has clear scope boundaries |
| **5. Process clarity** | Steps are numbered and actionable |
| **6. Error handling** | Addresses what to do when things go wrong |
| **7. Common mistakes** | Has a mistakes/pitfalls table |
| **8. Output format** | Specifies expected output format |

Score each skill 0-8. Present the audit:

```
## Quality Audit — Custom Skills

skills/cleanup/SKILL.md       ◐ 5/8 — missing: announcement box, common mistakes, output format
skills/api-tester/SKILL.md    ✗ 2/8 — missing: most structure
agents/planner.md             ✓ 7/8 — solid

▸ Rebuild low-scoring items? (Select to rebuild via writing-skills TDD)
```

Use **AskUserQuestion** with `multiSelect: true` to offer rebuild for any item scoring below 6.

### 5f. Summary

Present final summary:

```
## Onboarding Complete

**Installed:**
- armadillo core (24 skills)
- [N] skill packs: [list]
- [N] agents
- Hooks configured (armadillo + [N] custom)
- CLAUDE.md generated

**Custom content preserved:**
- [list of kept customs with owner: user]

**Deleted:**
- [N] obsolete files removed

**Project analysis:** (fresh installs only)
- Scanned codebase: [language] / [framework] / [test framework]
- Created: [N] custom skills, [N] agents, [N] docs
- CLAUDE.md updated with project-specific instructions

**IMPORTANT:** Exit this Claude Code session and start a new one before continuing.
↳ Hooks and settings only take effect after a fresh session start.

**Next steps (in the new session):**
- Use `/onboarding` to run project analysis and complete setup
- Use `/updating-armadillo` to add more skill packs or update existing ones
```

## Greenfield Detection (Between Phase 5 and Phase 6)

After fresh install completes (Phase 5), before Phase 6 project analysis:

1. **Check if directory is empty** — no package.json, no src/, no framework config, no source files
2. If empty, offer the fresh-project flow:

```
armadillo is installed and ready.

this is a blank canvas — no framework, no source, no config.

▸ got something you want to build?
```

Use **AskUserQuestion** with options:
- "Yes, let's build something" → invoke `fresh-project` skill (this replaces Phase 6)
- "No, just set up armadillo" → continue with standard Phase 6 or finish

If user chooses to build → the `fresh-project` skill takes over entirely. Onboarding is complete.

## Phase 6: Project Analysis (Fresh Installs Only)

**When:** This phase runs ONLY on fresh installs (no existing `.claude/` directory). Migrations skip this — they already handle custom content in Phases 2-4.

**Why:** A fresh armadillo install gives you the standard toolkit, but every project is different. Phase 6 scans the codebase to understand the project and recommends custom content tailored to what's actually here.

### 6a. Codebase Scan

Use **Glob** and **Read** to scan the project (NOT `.claude/` — the actual project codebase).

**Skip these directories entirely:**
- `.git/`, `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `.nuxt/`, `.svelte-kit/`, `__pycache__/`, `.venv/`, `target/`, `coverage/`

**Detect and read these signals:**

| Signal | Files to Check |
|--------|---------------|
| **Language** | `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Gemfile`, `pom.xml`, `build.gradle` |
| **Framework** | `next.config.*`, `nuxt.config.*`, `astro.config.*`, `svelte.config.*`, `angular.json`, `remix.config.*`, `vite.config.*` |
| **Test framework** | `jest.config.*`, `vitest.config.*`, `pytest.ini`, `setup.cfg [tool.pytest]`, `.mocharc.*`, `playwright.config.*`, `cypress.config.*` |
| **CI/CD** | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`, `bitbucket-pipelines.yml` |
| **Deploy target** | `vercel.json`, `netlify.toml`, `fly.toml`, `Dockerfile`, `docker-compose.yml`, `railway.json`, `render.yaml`, `Procfile` |
| **Database** | Prisma schema, Drizzle config, Sequelize config, `DATABASE_URL` in `.env.example` (never read actual `.env` files) |
| **API style** | GraphQL schemas (`.graphql`), OpenAPI specs (`openapi.yaml`/`swagger.json`), tRPC routers |
| **Monorepo** | `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`, root `workspaces` in package.json |

**Read key files** (first 100 lines is sufficient for most):
- `README.md` — project description, setup instructions
- `package.json` — dependencies, scripts
- Main config file for detected framework
- CI config files
- Test config files

### 6b. Build Project Profile

Summarize findings into a structured profile:

```
## Project Profile

**Project:** [name from package.json/README or directory name]
**Language:** TypeScript (Node 20)
**Framework:** Next.js 14 (App Router)
**Package manager:** pnpm
**Test framework:** Vitest + Playwright (e2e)
**CI/CD:** GitHub Actions (lint → test → deploy)
**Deploy:** Vercel
**Database:** Postgres via Prisma
**API:** tRPC
**Monorepo:** No
**Key dependencies:** [top 5-10 notable deps]
```

Present this profile to the user: **"Here's what I found in your codebase. Does this look right? Anything I missed?"**

### 6c. Generate Recommendations

Based on the project profile, recommend custom content. Each recommendation must include:
- **Type:** skill, agent, or documentation
- **Name:** proposed name (kebab-case for skills/agents)
- **Why:** one sentence explaining why this project would benefit
- **What it covers:** 2-3 bullet points of scope

**Recommendation categories:**

**Project-specific skills** (how to do things in THIS project):
- Deploy workflow (if CI/CD detected)
- Test suite patterns (if test framework detected)
- Database migrations (if ORM detected)
- API patterns (if API style detected)
- Monorepo navigation (if monorepo detected)

**Custom agents** (specialized reviewers/workers):
- Framework-specific code reviewer (e.g., "Next.js App Router reviewer" that knows RSC rules)
- Test reviewer (knows the project's test patterns)

**Project documentation** (for `.claude/docs/`):
- Architecture overview (always recommended for non-trivial projects)
- API reference (if project has APIs)
- Environment setup guide (if complex setup detected)

**CLAUDE.md additions** (project-specific instructions):
- Build/test/lint commands (from `package.json` scripts or equivalent)
- Project conventions detected from codebase
- Environment variable requirements

### 6d. Present Recommendations

Use **AskUserQuestion** with `multiSelect: true` to let the user pick which recommendations to create:

```
## Recommended Custom Content

Based on your project profile, I recommend creating:

**Skills:**
☐ vercel-deploy — Deploy workflow for your Vercel + GitHub Actions setup
☐ prisma-migrations — Database migration patterns for your Prisma setup

**Agents:**
☐ nextjs-reviewer — Code reviewer that knows Next.js App Router patterns (RSC, server actions, etc.)

**Documentation:**
☐ architecture-overview — High-level architecture doc for .claude/docs/

**CLAUDE.md additions:**
☐ Project commands and conventions

Which would you like me to create? (Select all that apply, or skip to finish)
```

If user selects none or skips → proceed to Done.

### 6e. Create Approved Content

For each approved item, in order:

**For skills:**
1. **REQUIRED SUB-SKILL:** Use armadillo:writing-skills
2. Create the skill following full TDD process (baseline test → write skill → verify → refactor)
3. Write to `.claude/skills/<skill-name>/SKILL.md`
4. Add to manifest as `owner: "user"`
5. Add to CLAUDE.md skills list (in the project-specific section below armadillo markers)

**For agents:**
1. Create agent file at `.claude/agents/<agent-name>.md`
2. Include proper frontmatter (name, description, model)
3. Write clear system prompt based on codebase analysis
4. Add to manifest as `owner: "user"`

**For documentation:**
1. Write to `.claude/docs/<doc-name>.md`
2. Base content on actual codebase analysis (not generic templates)
3. Add to manifest as `owner: "user"`

**For CLAUDE.md additions:**
1. Add project-specific instructions below the `<!-- Add your project-specific instructions below this line -->` comment
2. Include actual commands from `package.json` scripts
3. Include conventions detected from codebase

**After each item:** Commit with descriptive message and update the manifest immediately (add the file entry with `owner: "user"` and SHA-256 hash, update `updatedAt`). This ensures progress is saved if the session is interrupted.

**Baseline test for Phase 6 skills:** The TDD baseline test prompt should describe a realistic task the skill addresses, drawn from the project's actual codebase patterns discovered in 6a (not generic scenarios).

### 6f. Update Manifest

After all items are created, verify the manifest is up to date:
- All new files should already be in `files` (added after each item in 6e)
- Verify `owner: "user"` and correct SHA-256 hashes for each

**Checkpoint:** Update manifest with `phase: 6`.

**Resuming Phase 6:** If resuming an interrupted session (manifest has `phase: 6` but `completed` is false), check which approved files already exist in the manifest before re-scanning. Skip items that were already created.

## Key Rules

1. **Armadillo is THE standard** — anything it covers gets replaced, no negotiation
2. **Bucket D is sacred** — agent-memory/, docs/ (with real content), context/, progress/ are NEVER touched, NEVER classified for replacement, NEVER deleted
3. **One custom item at a time** — never batch custom decisions
4. **Read before classifying** — always read file content and run the semantic pass; name matching alone is not enough
5. **Semantic matches are Bucket A** — if content analysis shows functional equivalence, auto-upgrade without asking; don't send semantic matches to Bucket B
6. **Handle dropped content, don't note it** — unique content from partial semantic matches gets fully processed (written to spec or discarded) in Phase 2; never leave it as a passive summary
7. **Save progress incrementally** — write manifest after each phase so progress isn't lost if session ends
8. **Never orphan hooks** — if custom hooks exist, explicitly handle them (integrate, keep, or delete)
9. **Preserve filled knowledge base and all real docs** — user-written content is sacred
10. **Document context/ in CLAUDE.md** — add a Runtime State section below armadillo markers explaining what lives in context/ and when to read it
11. **Track everything in manifest** — no file in `.claude/` should be untracked
12. **Use Opus 4.6** for classification subagents — this is thinking-heavy work
13. **Phase 6 is fresh installs only** — migrations already handle custom content in Phases 2-4; don't double-scan
14. **Recommend, don't auto-create (Phase 6 only)** — Phase 6 recommendations always go through AskUserQuestion; but dropped content processing in Phase 2 is automatic, not a recommendation
15. **Full writing-skills TDD for each item** — no shortcuts, no "quick drafts", every custom skill created in dropped content processing or Phase 4 gets the full treatment
16. **Normalize folder structure** — after migration, `.claude/` must have armadillo's expected layout; misplaced files get moved, empty dirs get pruned
17. **Rewrite skills to armadillo spec** — for "Keep & rebuild" decisions in Phase 4, rewrite to full armadillo SKILL.md spec (proper frontmatter, description, flowcharts, rationalization tables). Use writing-skills TDD process for each.
18. **Create reference skills for external APIs** — if project uses version-sensitive APIs (Meta, Google Ads, Stripe, Pinterest, etc.), trigger writing-reference-skills for each to create proper reference docs
19. **Quality audit before completion** — run 8-signal quality scoring on all user-owned skills and offer to rebuild low-scoring ones (below 6/8)
20. **Git-native install only** — fetch files from GitHub, copy to .claude/, write manifest. No plugin registration, no marketplace entries. Session restart required after initial install so hooks and settings take effect.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Matching files by filename/path only | Run Pass 2: read content and compare to armadillo skill purposes — a `commit-helper` skill should be caught semantically |
| Sending semantic matches to Bucket B | If content analysis shows functional equivalence, promote to Bucket A — no user decision needed |
| Leaving unique content as a passive summary | Process all dropped content inline in Phase 2: write skills/CLAUDE.md/hooks/docs or discard — never just note it |
| Leaving old files in place after semantic upgrade | Delete originals from their original location; a semantically-matched `skills/commit-helper/` directory must be deleted entirely |
| Non-standard `.claude/` layout after migration | Run structural normalization step: move misplaced files, prune empty dirs |
| Overwriting custom hooks without asking | Classify as Bucket B, walk through in Phase 3 |
| Deleting filled-in knowledge base files | Always preserve as owner: user |
| Batch-asking about custom content | One item at a time with full context |
| Not reading file content before classifying | Read full content for semantic pass — 50 lines is not enough for semantic analysis |
| Forgetting to update hooks.json for integrated customs | Phase 5d explicitly handles hook wiring |
| Losing progress on session end | Save manifest after each phase |
| Asking permission for armadillo-covered items | Non-negotiable — auto-upgrade without asking |
| Not tracking user-owned files in manifest | Every .claude/ file goes in manifest with correct owner |
| Running Phase 6 on migrations | Phase 6 is for fresh installs only — migrations use Phases 2-4 |
| Auto-creating custom Phase 6 content without asking | Phase 6 recommendations always go through AskUserQuestion with multiSelect — dropped content processing in Phase 2 is different (automatic) |
| Skipping writing-skills TDD for custom content | Every custom skill/agent gets full TDD process — no shortcuts |
| Recommending generic content that doesn't use codebase findings | Recommendations must reference specific things found in the scan |
| Scanning node_modules, .git, or other excluded dirs | Skip all directories listed in 6a's exclusion list |
| Touching agent-memory/ files during migration | agent-memory/*/MEMORY.md is Bucket D — sacred, never classified, never overwritten, never deleted |
| Overwriting docs/ with real content | Any docs/ file with actual content is Bucket D — check file length/content before assuming it's a template |
| Clearing or resetting context/ directory | context/ is written by hooks at runtime — preserve entirely as Bucket D, never touch during onboarding |
| Forgetting to add Runtime State section to CLAUDE.md | context/ directory must be documented in CLAUDE.md with a Runtime State section |
| Not creating reference skills for version-sensitive APIs | If the project uses Meta, Google Ads, Pinterest, Stripe, etc., trigger writing-reference-skills for each |
| Treating progress/ as deletable cache | progress/ contains handoffs, plans, and optimization logs — always Bucket D, never touched |
| Skipping quality audit | Always run 8-signal scoring on user-owned skills before marking onboarding complete |
