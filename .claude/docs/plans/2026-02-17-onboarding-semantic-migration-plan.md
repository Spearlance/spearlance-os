# Onboarding Semantic Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Replace name-based classification in the onboarding skill with content-aware semantic matching so that files serving the same function as armadillo skills are always auto-upgraded, unique content from partial matches is fully handled, and the `.claude/` folder structure is normalized.

**Architecture:** All changes are in one file: `.claude/skills/onboarding/SKILL.md`. Phase 1 gets a new "Pass 2 (Semantic)" subsection. Phase 2 gets two new subsections: "Structural Normalization" and "Dropped Content Processing". Key Rules and Common Mistakes are updated to match.

**Tech Stack:** Markdown only — no code files touched.

---

## Task 1: Restructure Phase 1 Classification Rules into Two Passes

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (lines 82–112)

**Step 1: Verify current content (baseline)**

Run:
```bash
grep -n "Classification Rules" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match at line 82.

**Step 2: Replace the Classification Rules section**

Replace the entire `### Classification Rules` block (lines 82–112) with the two-pass version below. The Bucket A, B, C definitions stay — Pass 1 wraps the existing path-based Bucket A criteria, Pass 2 adds the semantic layer.

Replace this:
```
### Classification Rules

**Bucket A — "Armadillo covers this"** (auto-upgrade, no questions asked):
- Any file that exists in `skills.json` → skill files, agent files, shared files
- `hooks/hooks.json` → armadillo's hook config
- `hooks/session-start.sh` → armadillo's session start
- `hooks/reinject-after-compact.sh` → armadillo's compact hook
- `hooks/run-hook.cmd` → armadillo's Windows hook runner
- `lib/skills-core.js` → armadillo's shared lib
- `settings.json` → armadillo's settings
- `CLAUDE.md` content between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` markers
- Any skill directory matching an armadillo skill name (e.g., `skills/brainstorming/`)
- Any agent file matching an armadillo agent name (e.g., `agents/code-reviewer.md`)
- `tests/` directory contents matching armadillo test paths

**Bucket B — "Custom content armadillo doesn't cover"** (needs user decision):
- Custom skills not in `skills.json` (e.g., sticker-maker's `skills/cleanup/`, `skills/commit/`)
- Custom agents not in `skills.json` (e.g., `agents/api-reviewer.md`, `agents/planner.md`)
- Custom hooks not in armadillo's hook list (e.g., `hooks/block-destructive.sh`, `hooks/protect-main-branch.sh`)
- `rules/` directory (armadillo has no rules concept)
- `docs/` directory contents (project-specific documentation)
- `knowledge/` files that have been filled in (not empty templates)
- `CLAUDE.md` content OUTSIDE the armadillo markers
- Any `.claude/` files/dirs not matching armadillo paths

**Bucket C — "Safe to delete"** (empty/obsolete):
- Empty template files (knowledge base templates with only placeholder text)
- `.gitkeep` files
- Empty directories
- Manifest from old armadillo version (will be replaced)
```

With this:
```
### Classification Rules

Classification runs in two passes.

#### Pass 1 — Path-Based (Fast)

**Bucket A — "Armadillo covers this"** (auto-upgrade, no questions asked):
- Any file that exists in `skills.json` → skill files, agent files, shared files
- `hooks/hooks.json` → armadillo's hook config
- `hooks/session-start.sh` → armadillo's session start
- `hooks/reinject-after-compact.sh` → armadillo's compact hook
- `hooks/run-hook.cmd` → armadillo's Windows hook runner
- `lib/skills-core.js` → armadillo's shared lib
- `settings.json` → armadillo's settings
- `CLAUDE.md` content between `<!-- armadillo:start -->` and `<!-- armadillo:end -->` markers
- Any skill directory matching an armadillo skill name (e.g., `skills/brainstorming/`)
- Any agent file matching an armadillo agent name (e.g., `agents/code-reviewer.md`)
- `tests/` directory contents matching armadillo test paths

**Bucket B candidate** (path didn't match — send to Pass 2):
- Custom skills not in `skills.json` (e.g., `skills/cleanup/`, `skills/commit-helper/`)
- Custom agents not in `skills.json` (e.g., `agents/api-reviewer.md`, `agents/planner.md`)
- Custom hooks not in armadillo's hook list (e.g., `hooks/block-destructive.sh`)
- `rules/` directory, `docs/` contents, filled-in `knowledge/` files
- `CLAUDE.md` content OUTSIDE armadillo markers
- Any `.claude/` files/dirs not matching armadillo paths

**Bucket C — "Safe to delete"** (empty/obsolete):
- Empty template files (knowledge base templates with only placeholder text)
- `.gitkeep` files
- Empty directories
- Manifest from old armadillo version (will be replaced)

#### Pass 2 — Semantic Analysis

For each Bucket B candidate from Pass 1, read its **full content** and compare it against armadillo's skill and agent descriptions (available in the fetched `skills.json` descriptions and the installed SKILL.md files). Ask: *"Does this file's core purpose overlap with any armadillo skill or agent?"*

**Full semantic match** (core function 100% covered by an armadillo equivalent):
- Promote to Bucket A
- Label with the armadillo equivalent: e.g., `skills/commit-helper/ → finishing-a-development-branch`
- No unique content to extract

**Partial semantic match** (core function covered, but file has additional behavior not in the armadillo equivalent):
- Promote to Bucket A
- Label with the armadillo equivalent
- Extract the unique portions (not covered by the armadillo skill) into the **dropped content buffer** — a list of snippets with their source file, to be processed in Phase 2's Dropped Content Processing step

**No match** (does something armadillo has no equivalent for):
- Confirmed Bucket B — will surface in Phase 3
```

**Step 3: Verify the change**

Run:
```bash
grep -n "Pass 1 — Path-Based" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Pass 2 — Semantic Analysis" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "dropped content buffer" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each, in that order.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): add two-pass classification with semantic analysis"
```

---

## Task 2: Update Phase 1 Summary Table

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (the Classification Output block)

**Step 1: Verify baseline**

Run:
```bash
grep -n "Semantic Match" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: no matches.

**Step 2: Update the summary table example**

Find the Classification Output code block (currently starts with `## Scan Results`). Replace:
```
```
## Scan Results

### Auto-Upgrade (Armadillo covers these — will be replaced):
- skills/brainstorming/SKILL.md (armadillo skill)
- skills/test-driven-development/SKILL.md (armadillo skill)
- agents/code-reviewer.md (armadillo agent)
- hooks/hooks.json (armadillo hooks config)
- ... [N files total]

### Needs Your Decision (Custom content):
- skills/cleanup/SKILL.md (custom skill — not in armadillo)
- agents/api-reviewer.md (custom agent — not in armadillo)
- hooks/block-destructive.sh (custom hook — orphaned)
- rules/code-style.md (custom rules — armadillo has no rules concept)
- docs/data-structure.md (project documentation)
- ... [N files total]

### Safe to Delete:
- knowledge/client/audience-profiles.md (empty template)
- docs/archive/.gitkeep
- ... [N files total]
```
```

With:
```
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
  (unique content noted: Heroku deploy commands, Slack step)
- agents/reviewer.md → code-reviewer.md
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
```

Also update the user prompt after the table to reflect that semantic matches are also non-negotiable:

Replace:
```
Ask user: **"This is what I found. Ready to proceed? The auto-upgrade items will be replaced with armadillo's latest versions — this is non-negotiable. I'll walk you through each custom item next."**
```

With:
```
Ask user: **"This is what I found. Ready to proceed? Path matches and semantic matches will all be replaced with armadillo's latest versions — this is non-negotiable. Unique content from partial matches will be handled automatically. I'll walk you through the remaining truly custom items next."**
```

**Step 3: Verify**

Run:
```bash
grep -n "Semantic Match → Auto-Upgrade" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "no armadillo equivalent" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): update scan results table with semantic match section"
```

---

## Task 3: Add Structural Normalization to Phase 2 (For Migrations)

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (Phase 2 → For Migrations section)

**Step 1: Verify baseline**

Run:
```bash
grep -n "Structural normalization" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: no matches.

**Step 2: Add structural normalization step**

Find the "For Migrations" section. After step 5 (`Bundle selection`), add step 6:

Replace:
```
### For Migrations:

1. **Delete all Bucket A files** — they're being replaced
2. **Delete all Bucket C files** — they're empty/obsolete
3. **Install armadillo files:**
   - All skill files for selected bundles (from `skills.json` registry)
   - All agent files referenced by selected skills
   - All shared files (hooks, lib, tests, settings)
4. **Preserve Bucket B files** — don't touch them yet (Phase 3)
5. **Bundle selection** — for migrations, auto-select bundles that cover existing skills, then offer additional bundles
```

With:
```
### For Migrations:

1. **Delete all Bucket A files** — they're being replaced (both path-matched and semantic-matched)
2. **Delete all Bucket C files** — they're empty/obsolete
3. **Install armadillo files:**
   - All skill files for selected bundles (from `skills.json` registry)
   - All agent files referenced by selected skills
   - All shared files (hooks, lib, tests, settings)
4. **Preserve Bucket B files** — don't touch them yet (Phase 3)
5. **Bundle selection** — for migrations, auto-select bundles that cover existing skills, then offer additional bundles
6. **Structural normalization:**
   - **Delete misplaced originals** — for every file promoted to Bucket A (path-based or semantic), delete it from wherever it lived. If `skills/commit-helper/` was semantically matched to `finishing-a-development-branch`, delete the entire `skills/commit-helper/` directory — don't leave it alongside the new armadillo version.
   - **Fix non-standard directories** — scan `.claude/` for directories that don't match armadillo's expected layout (`skills/`, `agents/`, `hooks/`, `lib/`, `tests/`, `docs/`). Bucket B files living in wrong locations (e.g., a custom skill at `.claude/my-skill.md`) get moved to the correct path (`.claude/skills/my-skill/SKILL.md`) before Phase 3 walkthrough.
   - **Prune empty directories** — after all moves and deletes, remove any empty directories under `.claude/`.
```

**Step 3: Verify**

Run:
```bash
grep -n "Structural normalization" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Prune empty directories" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): add structural normalization step to Phase 2 migrations"
```

---

## Task 4: Add Dropped Content Processing to Phase 2

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (Phase 2, after Hook Merging section)

**Step 1: Verify baseline**

Run:
```bash
grep -n "Dropped Content Processing" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: no matches.

**Step 2: Add Dropped Content Processing subsection**

Find the Hook Merging section. It ends with:
```
3. **These go to Phase 3** for user decision — if kept, they get integrated into hooks.json properly in Phase 5

**Checkpoint:** Update manifest with installed files and `phase: 2`.
```

After the Hook Merging section and before the checkpoint, insert the new subsection:

Replace:
```
### Hook Merging (Critical)

A common problem with manual setup is overwriting `hooks.json` and orphaning custom hooks. The onboarding skill must:

1. **Read armadillo's hooks.json** — the standard SessionStart configuration
2. **Detect custom hooks** from Bucket B (e.g., `block-destructive.sh`, `protect-main-branch.sh`)
3. **These go to Phase 3** for user decision — if kept, they get integrated into hooks.json properly in Phase 5

**Checkpoint:** Update manifest with installed files and `phase: 2`.
```

With:
```
### Hook Merging (Critical)

A common problem with manual setup is overwriting `hooks.json` and orphaning custom hooks. The onboarding skill must:

1. **Read armadillo's hooks.json** — the standard SessionStart configuration
2. **Detect custom hooks** from Bucket B (e.g., `block-destructive.sh`, `protect-main-branch.sh`)
3. **These go to Phase 3** for user decision — if kept, they get integrated into hooks.json properly in Phase 5

### Dropped Content Processing

For each unique snippet in the **dropped content buffer** (extracted during Pass 2 of Phase 1 from partial semantic matches), determine the right home and handle it immediately — no passive summaries, no "you may want to keep this":

| Unique content type | Action |
|---------------------|--------|
| Project-specific workflow or multi-step process | Write a custom skill via `armadillo:writing-skills` TDD process |
| One-liner command, alias, or project convention | Add to project-specific section of `CLAUDE.md` |
| Protection, enforcement, or blocking behavior | Write a hook script, wire into `hooks.json` |
| Reference information (endpoints, env vars, API key formats) | Write to `.claude/docs/<name>.md` |
| Trivial or redundant (armadillo already handles it) | Discard silently |

**If a snippet is ambiguous** (cannot confidently categorize it), surface it as a Bucket B item for the Phase 3 walkthrough — don't guess.

All custom artifacts created here are tracked in the manifest as `owner: "user"` with SHA-256 hash immediately after writing.

**Checkpoint:** Update manifest with installed files and `phase: 2`.
```

**Step 3: Verify**

Run:
```bash
grep -n "Dropped Content Processing" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "no passive summaries" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): add dropped content processing to Phase 2"
```

---

## Task 5: Update Key Rules

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (Key Rules section)

**Step 1: Verify baseline**

Run:
```bash
grep -n "Read before classifying" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match.

**Step 2: Replace Key Rules section**

Replace the entire Key Rules list:
```
1. **Armadillo is THE standard** — anything it covers gets replaced, no negotiation
2. **One custom item at a time** — never batch custom decisions
3. **Read before classifying** — always read file content, don't just match filenames
4. **Save progress incrementally** — write manifest after each phase so progress isn't lost if session ends
5. **Never orphan hooks** — if custom hooks exist, explicitly handle them (integrate, keep, or delete)
6. **Preserve filled knowledge base** — user-written KB content is sacred
7. **Track everything in manifest** — no file in `.claude/` should be untracked
8. **Use Opus 4.6** for classification subagents — this is thinking-heavy work
9. **Phase 6 is fresh installs only** — migrations already handle custom content in Phases 3-4; don't double-scan
10. **Recommend, don't auto-create** — always present recommendations and let user choose; never create custom content without explicit approval
11. **Full writing-skills TDD for each item** — no shortcuts, no "quick drafts", every custom skill gets the full treatment
```

With:
```
1. **Armadillo is THE standard** — anything it covers gets replaced, no negotiation
2. **One custom item at a time** — never batch custom decisions
3. **Read before classifying** — always read file content and run the semantic pass; name matching alone is not enough
4. **Semantic matches are Bucket A** — if content analysis shows functional equivalence, auto-upgrade without asking; don't send semantic matches to Bucket B
5. **Handle dropped content, don't note it** — unique content from partial semantic matches gets fully processed (written to spec or discarded) in Phase 2; never leave it as a passive summary
6. **Save progress incrementally** — write manifest after each phase so progress isn't lost if session ends
7. **Never orphan hooks** — if custom hooks exist, explicitly handle them (integrate, keep, or delete)
8. **Preserve filled knowledge base** — user-written KB content is sacred
9. **Track everything in manifest** — no file in `.claude/` should be untracked
10. **Use Opus 4.6** for classification subagents — this is thinking-heavy work
11. **Phase 6 is fresh installs only** — migrations already handle custom content in Phases 2-4; don't double-scan
12. **Recommend, don't auto-create (Phase 6 only)** — Phase 6 recommendations always go through AskUserQuestion; but dropped content processing in Phase 2 is automatic, not a recommendation
13. **Full writing-skills TDD for each item** — no shortcuts, no "quick drafts", every custom skill created in dropped content processing or Phase 4 gets the full treatment
14. **Normalize folder structure** — after migration, `.claude/` must have armadillo's expected layout; misplaced files get moved, empty dirs get pruned
```

**Step 3: Verify**

Run:
```bash
grep -n "Semantic matches are Bucket A" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Handle dropped content, don't note it" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Normalize folder structure" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): update key rules for semantic matching and dropped content"
```

---

## Task 6: Update Common Mistakes

**Files:**
- Modify: `.claude/skills/onboarding/SKILL.md` (Common Mistakes table)

**Step 1: Verify baseline**

Run:
```bash
grep -n "Not reading file content" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match.

**Step 2: Replace Common Mistakes table**

Replace the entire Common Mistakes table:
```
| Mistake | Fix |
|---------|-----|
| Overwriting custom hooks without asking | Classify as Bucket B, walk through in Phase 3 |
| Deleting filled-in knowledge base files | Always preserve as owner: user |
| Batch-asking about custom content | One item at a time with full context |
| Not reading file content before classifying | Read first 50 lines minimum for classification |
| Forgetting to update hooks.json for integrated customs | Phase 5d explicitly handles hook wiring |
| Losing progress on session end | Save manifest after each phase |
| Asking permission for armadillo-covered items | Non-negotiable — auto-upgrade without asking |
| Not tracking user-owned files in manifest | Every .claude/ file goes in manifest with correct owner |
| Running Phase 6 on migrations | Phase 6 is for fresh installs only — migrations use Phases 3-4 |
| Auto-creating custom content without asking | Always present recommendations via AskUserQuestion with multiSelect |
| Skipping writing-skills TDD for custom content | Every custom skill/agent gets full TDD process — no shortcuts |
| Recommending generic content that doesn't use codebase findings | Recommendations must reference specific things found in the scan |
| Scanning node_modules, .git, or other excluded dirs | Skip all directories listed in 6a's exclusion list |
```

With:
```
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
```

**Step 3: Verify**

Run:
```bash
grep -n "Matching files by filename" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Leaving unique content as a passive summary" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
grep -n "Non-standard.*layout after migration" "/Users/zachwieder/Documents/AGENCY/Zach Tools/armadillo-cli/.claude/skills/onboarding/SKILL.md"
```
Expected: one match each.

**Step 4: Commit**

```bash
git add ".claude/skills/onboarding/SKILL.md"
git commit -m "feat(onboarding): update common mistakes for semantic matching and structural cleanup"
```

---

## Task 7: Update CHANGELOG.json

**Files:**
- Modify: `CHANGELOG.json`

**Step 1: Read current CHANGELOG.json**

Read `CHANGELOG.json` and the current version from `package.json`.

**Step 2: Add changelog entry**

Add to the `0.1.2` version's `changes` array:

```json
{
  "type": "improved",
  "skill": "onboarding",
  "files": ["skills/onboarding/SKILL.md"],
  "summary": "Semantic content matching replaces name-only classification during migration",
  "details": "Phase 1 now runs a two-pass classification: path-based first, then semantic analysis of content against armadillo skill descriptions. Files with the same function as an armadillo skill are auto-upgraded regardless of name. Unique content from partial matches is fully handled in Phase 2 (written to spec or discarded) rather than noted passively. Structural normalization ensures .claude/ folder layout matches armadillo's expected structure after migration.",
  "breaking": false
}
```

**Step 3: Verify**

Run:
```bash
node -e "const c = JSON.parse(require('fs').readFileSync('CHANGELOG.json','utf-8')); console.log(JSON.stringify(c['0.1.2'].changes.slice(-1), null, 2))"
```
Expected: the new entry printed cleanly.

**Step 4: Commit**

```bash
git add CHANGELOG.json
git commit -m "docs: update CHANGELOG.json for onboarding semantic migration"
```
