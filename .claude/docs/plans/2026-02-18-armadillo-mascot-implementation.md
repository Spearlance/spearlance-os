# Armadillo Brand Mascot — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Add skateboarding armadillo mascot and 5 brand phrases to CLI outputs.

**Architecture:** ascii-art agent generates 3 mascot variants first; output-style.md becomes the canonical reference; hooks and output-style.md are updated to inject phrases in context.

**Tech Stack:** Bash hooks, Markdown (output-style.md), ASCII art

---

### Task 1 — Generate 3 Mascot Variants via ascii-art skill

**Files:** None — output is captured and used in Task 2.

**Context:** The ascii-art skill orchestrates an `ascii-art-creator` agent. All three variants must be produced before any other task begins — they are the canonical art that gets pasted into output-style.md.

**Step 1: Invoke the ascii-art skill**

Use the Skill tool:
```
skill: "ascii-art"
```

**Step 2: Provide this brief to the ascii-art agent**

```
Subject:     Armadillo mascot — 3 variants for armadillo-cli
Style:       ASCII only (chars 32-126), no Unicode, no emoji, monospace terminal safe
Personality: skateboard culture — shreds, has attitude, dry humor, zero pretense

VARIANT 1 — Profile / Skating  (MOST IMPORTANT)
  Max: 1 line, max 20 chars wide
  Use: lives inline inside skill box frame header
       ┌─ (art here) armadillo · skill-name ─────┐
  Gesture: side profile, implied motion/speed, board energy
  Goal: recognizable armadillo silhouette moving forward

VARIANT 2 — Front-Facing / Chillin
  Max: 2 lines, max 24 chars wide
  Use: agent announcement headers
  Gesture: facing forward, neutral confidence, relaxed

VARIANT 3 — Stoked / Arms Up
  Max: 3 lines, max 28 chars wide
  Use: completion sign-off above "shell yeah."
  Gesture: arms/claws raised, full energy, celebrating

Quality bar: Each variant must be immediately recognizable as an armadillo
(hint at armored shell, snout, head shape). Not just abstract glyphs.
Produce all 3 variants in a single response with clear labels.
```

**Step 3: Collect and verify output**

- Variant 1: single line, ≤20 chars
- Variant 2: ≤2 lines, ≤24 chars wide
- Variant 3: ≤3 lines, ≤28 chars wide
- All three: zero emoji, zero Unicode, pure ASCII 32-126
- Recognizable as armadillo

If any variant fails, request one targeted iteration before proceeding.

---

### Task 2 — Update output-style.md

**File:** `.claude/rules/output-style.md`

**Step 1: Insert `## Mascot` section between `## Voice` and `## Skill Announcements`**

```markdown
## Mascot

The armadillo is Tony Hawk if he got a CS degree and never stopped shredding.
Short. Cool. Funny at the right times. Always helpful. Never lets anything slide.
Always hella chill about it.

### Variants

| Variant | Art | Max Size | Context |
|---------|-----|----------|---------|
| Profile / Skating | `[VARIANT_1]` | 1 line, 20 chars | Skill box frame header (inline) |
| Front-Facing / Chillin | `[VARIANT_2]` | 2 lines, 24 chars | Agent announcements |
| Stoked / Arms Up | `[VARIANT_3]` | 3 lines, 28 chars | Completion sign-off with `shell yeah.` |

Replace `[VARIANT_1/2/3]` with exact ASCII from Task 1.

### Phrases

| Phrase | When |
|--------|------|
| `shell yeah.` | Completion — always with Stoked variant |
| `your friendly armadillo is here to serve you` | Session start / skill intro |
| `where my real dillas at?!` | Onboarding / update announcements only |
| `i may be an armadillo but i'll be damned if i let bad code slide` | TDD gate block (task-completed.sh exit 2) |
| `brother, even real dillas make mistakes... don't worry i got u` | Actual crash / unexpected failure only |

**Rules:** Always lowercase. Quality + empathy phrases are context-gated — never casual use.
```

**Step 2: Update `## Skill Announcements` box example**

Replace the current box example with the mascot-integrated version (Variant 1 inline in header line):

```
┌─ [VARIANT_1] armadillo · skill-name ──────────┐
│                                                 │
│  One sentence: what's happening and why.        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Step 3: Update agents section**

Replace:
```
**armadillo** · agent-name
```

With Variant 2 above the bold header:
```
[VARIANT_2_LINE_1]
[VARIANT_2_LINE_2]
**armadillo** · agent-name
```

**Step 4: Update `## Completion` example**

Add Variant 3 + `shell yeah.` before `▸ PR?`:

```
6 commits · feat/form-validation · 94% coverage

[VARIANT_3_LINE_1]
[VARIANT_3_LINE_2]
[VARIANT_3_LINE_3]  shell yeah.

▸ PR?
```

**Step 5: Read back the file and verify all variants appear (no placeholder text)**

**Step 6: Commit**
```bash
git add .claude/rules/output-style.md
git commit -m "feat(output-style): add mascot section with 3 ASCII variants and brand phrase reference"
```

---

### Task 3 — Update task-completed.sh

**File:** `.claude/hooks/task-completed.sh`

**Step 1: Read the current file** — confirm lines 56-61 read:
```bash
if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | tail -20)
  echo "Tests failing — fix before completing '${TASK_SUBJECT}':" >&2
  echo "$TRIMMED" >&2
  exit 2
fi
```

**Step 2: Replace the failure block**

```bash
if [ $EXIT_CODE -ne 0 ]; then
  TRIMMED=$(echo "$OUTPUT" | tail -20)
  echo "i may be an armadillo but i'll be damned if i let bad code slide" >&2
  echo "" >&2
  echo "Tests failing — fix before completing '${TASK_SUBJECT}':" >&2
  echo "$TRIMMED" >&2
  exit 2
fi
```

**Step 3: Verify bash syntax**
```bash
bash -n .claude/hooks/task-completed.sh
```
Expected: no output.

**Step 4: Read back lines 56-63 to confirm the two new echo lines are present**

**Step 5: Commit**
```bash
git add .claude/hooks/task-completed.sh
git commit -m "feat(hooks): inject quality phrase to TDD gate failure output"
```

---

### Task 4 — Update session-start.sh

**File:** `.claude/hooks/session-start.sh`

**Step 1: Read the file** — confirm the `cat <<EOF` heredoc structure (lines 70-77).

**Step 2: Add `greeting_context` variable**

After the memory_context block (around line 67), add:
```bash
# Inject armadillo greeting at session start
greeting_context="\\n\\n<armadillo-greeting>Start your first reply with the mascot front-facing art followed by: \"your friendly armadillo is here to serve you\" — then get straight to work.</armadillo-greeting>"
```

**Step 3: Append `${greeting_context}` to the additionalContext string**

On the line containing `"additionalContext":`, append `${greeting_context}` at the end, before the closing `"`:

Change:
```
...${memory_context}"
```
To:
```
...${memory_context}${greeting_context}"
```

**Step 4: Verify bash syntax**
```bash
bash -n .claude/hooks/session-start.sh
```
Expected: no output.

**Step 5: Smoke test — verify greeting appears in JSON output**
```bash
bash .claude/hooks/session-start.sh | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.hookSpecificOutput.additionalContext.includes('armadillo-greeting') ? 'PASS' : 'FAIL')"
```
Expected: `PASS`

**Step 6: Commit**
```bash
git add .claude/hooks/session-start.sh
git commit -m "feat(hooks): inject armadillo greeting phrase at session start"
```

---

### Task 5 — Version Bump + CHANGELOG

**Files:** `package.json`, `CHANGELOG.json`

**Step 1: Bump package.json** — change `"version": "0.5.0"` to `"version": "0.5.1"`

**Step 2: Insert 0.5.1 entry at TOP of CHANGELOG.json** (before the existing `"0.5.0"` key):

```json
"0.5.1": {
  "date": "2026-02-19",
  "changes": [
    { "type": "added", "summary": "Armadillo mascot — 3 ASCII variants for skill boxes, agent headers, completion", "breaking": false },
    { "type": "added", "summary": "5 brand phrases: shell yeah, friendly greeting, real dillas, quality enforcer, empathy", "breaking": false },
    { "type": "improved", "summary": "output-style.md: brand voice + mascot reference section", "breaking": false },
    { "type": "improved", "summary": "task-completed.sh: quality phrase on TDD gate failure", "breaking": false },
    { "type": "improved", "summary": "session-start.sh: greeting phrase injected at session start", "breaking": false }
  ]
},
```

**Step 3: Validate JSON**
```bash
node -e "JSON.parse(require('fs').readFileSync('CHANGELOG.json','utf8')); console.log('CHANGELOG: valid')"
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json: valid')"
```

**Step 4: Run version consistency check**
```bash
node scripts/update-readme.js
```
Expected: `✓ Version consistency: 0.5.1 ✓`

**Step 5: Commit**
```bash
git add package.json CHANGELOG.json
git commit -m "chore(release): bump to 0.5.1 — armadillo mascot and brand phrases"
```

---

### Task 6 — Push to Main

**Step 1: Verify clean working tree**
```bash
git status
```
Expected: nothing to commit.

**Step 2: Push**
```bash
env -u GITHUB_TOKEN git push origin main
```

**Step 3: Confirm**
```bash
git log --oneline -5
```
Expected: Tasks 2-5 commits at top.
