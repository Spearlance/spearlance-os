# ASCII Art Skill Bundle — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.
>
> **REQUIRED SUB-SKILL:** Use armadillo:writing-skills for the TDD cycle (RED-GREEN-REFACTOR) when creating SKILL.md and the agent file. This plan is structured around that cycle.
>
> **NOT needed:** armadillo:writing-reference-skills — the techniques.md teaches art principles, not external API docs with version-sensitive facts.

**Goal:** Create an armadillo bundle (skill + agent + reference doc) for high-quality ASCII art creation and CLI visual elements.

**Architecture:** Three files — a lightweight orchestrator skill (Socratic discovery + dispatch), a dedicated subagent (art director that plans and produces art), and a heavy reference doc (techniques, palettes, examples). Registered as the `ascii-art` bundle in skills.json.

**Tech Stack:** Markdown skill/agent files, JSON registry update.

**Sub-skill applicability:**
- Tasks 1, 5, 6 → `armadillo:writing-skills` TDD cycle (baseline → write → test → refactor)
- Tasks 2, 3, 4 → Standard file creation following patterns from existing skills/agents
- Task 7 → Registry update following existing `skills.json` patterns
- Task 8 → `armadillo:verification-before-completion`

---

## Task 1: RED — Baseline Testing (No Skill Present)

**Purpose:** Document how Claude handles ASCII art requests WITHOUT any skill or agent. Identify specific failures to target.

**Files:**
- Create: `.claude/skills/ascii-art/test-baseline.md` (document results)

**Step 1: Run baseline scenario — simple request**

Dispatch a subagent with this prompt (no skill loaded):
```
Create ASCII art of a cat sitting. Make it high quality.
```

Document:
- Did it plan dimensions before drawing?
- What size did it produce?
- Did it use shading/density techniques?
- Did it consider monospace proportions (chars are ~2:1 height:width)?
- Overall quality assessment

**Step 2: Run baseline scenario — ambiguous CLI request**

Dispatch a subagent with this prompt (no skill loaded):
```
I'm building a CLI tool called "neptune" for managing Docker containers. I need some cool ASCII art for it. Help me out.
```

Document:
- Did it ask clarifying questions or just produce something?
- Did it consider where the art would be used (banner? help? error?)?
- Did it provide code-ready output with proper escaping?
- Did it offer size/style options?

**Step 3: Run baseline scenario — complex scene**

Dispatch a subagent with this prompt (no skill loaded):
```
Create a detailed ASCII art landscape scene with mountains, a lake, and trees. Make it at least 60 columns wide and 30 rows tall. High quality.
```

Document:
- Did it hit the requested dimensions?
- Depth/layering techniques used?
- Character density variation?
- Proportional accuracy?

**Step 4: Document baseline failures**

Write up findings in `test-baseline.md`:
- List each specific failure pattern observed
- Note verbatim rationalizations if any ("this is good enough", "ASCII art is inherently limited", etc.)
- Identify the top 3-5 issues the skill/agent must address

**Step 5: Commit baseline results**

```bash
git add .claude/skills/ascii-art/test-baseline.md
git commit -m "test: add ASCII art skill baseline results (RED phase)"
```

---

## Task 2: GREEN — Create the Agent

**Purpose:** Write the ascii-art-creator agent targeting specific baseline failures.

**Files:**
- Create: `.claude/agents/ascii-art-creator.md`

**Step 1: Write the agent file**

The agent should be modeled after the remotion-creator agent pattern (YAML frontmatter + system prompt). Must address baseline failures from Task 1.

Core sections:
- YAML frontmatter: name, description (triggering conditions only — NOT workflow summary), model: inherit
- Role statement: focused ASCII art craftsperson
- Before starting: load techniques.md reference, understand the brief
- Planning protocol: ALWAYS plan dimensions, layout, character palette before drawing
- Size tiers: small (16-30 cols), medium (40-60 cols), large (60-80 cols)
- Technique application: reference techniques.md for palettes, shading, proportions
- Proportional awareness: monospace chars are ~2:1 height:width — compensate
- CLI integration mode: when brief says "for CLI", wrap in code-ready format with escaping
- Quality self-check: proportions correct? shading consistent? no broken lines? dimensions match request?
- Iteration protocol: identify specific changes rather than regenerating from scratch
- Output format: art in code block + dimensions + technique notes + variant suggestions
- What it doesn't do: doesn't ask discovery questions (that's the skill's job), doesn't guess requirements

**Step 2: Verify agent file structure**

Check that YAML frontmatter is valid, description starts with "Use when..." and is under 500 chars, no workflow summary in description.

**Step 3: Commit**

```bash
git add .claude/agents/ascii-art-creator.md
git commit -m "feat: add ascii-art-creator agent"
```

---

## Task 3: GREEN — Create the Techniques Reference

**Purpose:** Heavy reference doc the agent loads for craft knowledge.

**Files:**
- Create: `.claude/skills/ascii-art/techniques.md`

**Step 1: Write the techniques reference**

Sections (each addressing specific baseline gaps):

1. **Character Density Palette**
   - Light to dark scale: ` .,-':;!|/\(){}[]<>~^"=+*#%@&$`
   - How to create smooth gradients (transition through adjacent density levels)
   - When to use which characters

2. **Line Art Characters**
   - Straight lines: `| - _ / \`
   - Corners and curves: `. ' , ` and combinations like `._/`
   - Box drawing: ASCII `+-+|` style vs Unicode `┌─┐│` (note compatibility tradeoffs)

3. **Proportional Rules** (THE #1 issue in amateur ASCII art)
   - Monospace characters are approximately 2:1 height:width
   - A visual "square" needs roughly 2 columns per row
   - A visual "circle" is an ellipse in character space
   - Include a reference grid showing proportional compensation

4. **Size Templates**
   - Small (16-30 cols x 8-15 rows): icons, decorators, inline accents
   - Medium (40-60 cols x 15-30 rows): banners, illustrations, logos
   - Large (60-80 cols x 30-50 rows): detailed scenes, portraits, splash screens
   - Always plan dimensions BEFORE starting

5. **Composition Techniques**
   - Silhouette: outline only, interior whitespace
   - Filled: shaded interior using density palette
   - Mixed: outline + selective shading for depth
   - Scene layering: dense foreground, sparse background

6. **Category Quick-Reference**
   - Animals: start with the eye, build head outward, use curves for body
   - Text/Logos: block letter construction patterns, banner framing
   - Borders/Frames: repeating patterns, corner pieces, decorative rules
   - Faces/People: symmetry, expression with minimal characters
   - Scenes/Landscapes: horizon lines, depth through density gradients

7. **CLI-Specific Patterns**
   - Banner headers: centered, framed, tool name prominent
   - Box components: for help text, status output, grouped info
   - Error/warning art: skull for fatal, caution triangle, X for error
   - Proper string escaping: JS template literals (backtick escaping), Python raw strings, shell heredocs

8. **Quality Checklist**
   - [ ] Dimensions match the requested size tier?
   - [ ] Proportions compensated for 2:1 character aspect ratio?
   - [ ] Shading gradient smooth (no abrupt density jumps)?
   - [ ] No broken lines or misaligned characters?
   - [ ] Renders correctly in monospace font?
   - [ ] If CLI mode: proper escaping, ready to paste?

**Step 2: Commit**

```bash
git add .claude/skills/ascii-art/techniques.md
git commit -m "feat: add ASCII art techniques reference"
```

---

## Task 4: GREEN — Create the Skill

**Purpose:** Orchestrator skill — adaptive Socratic discovery + agent dispatch.

**Files:**
- Create: `.claude/skills/ascii-art/SKILL.md`

**Step 1: Write the SKILL.md**

Structure per writing-skills conventions:

```yaml
---
name: ascii-art
description: Use when creating ASCII art, CLI banners, text-based illustrations, or decorating command-line tool output with visual elements.
---
```

Sections:

1. **Overview** — Create high-quality ASCII art for standalone use or CLI integration. Dispatches to ascii-art-creator agent for production.

2. **Adaptive Discovery Flow** — Flowchart (dot notation):
   - Assess request clarity
   - Clear request (subject is specific) → 1 quick sizing/style question → build brief → dispatch
   - Ambiguous request → explore: what's it for? mood/tone? where does it appear? size constraints? style preference? → build brief → dispatch
   - After agent returns art → present to user → iterate if needed (dispatch again with refinement notes)

3. **Structured Brief Format** — What gets sent to the agent:
   - Subject: what to draw
   - Size: small/medium/large (or specific dimensions)
   - Style: silhouette/filled/mixed/scene
   - Context: standalone piece / CLI banner / error art / etc.
   - Constraints: max width, no Unicode, specific escaping needs, etc.

4. **Dispatch Instructions** — Use Task tool with subagent to dispatch ascii-art-creator agent. Include the structured brief and reference to techniques.md.

5. **Iteration** — When user wants changes, update the brief with specific refinements and re-dispatch. Don't start from scratch unless user requests it.

**Step 2: Verify SKILL.md structure**

- YAML frontmatter valid, description under 500 chars, starts with "Use when..."
- No workflow summary in description (CSO compliance)
- Flowchart only for the non-obvious adaptive decision
- Content focused and concise

**Step 3: Commit**

```bash
git add .claude/skills/ascii-art/SKILL.md
git commit -m "feat: add ascii-art skill"
```

---

## Task 5: GREEN — Test With Skill Present

**Purpose:** Run the same baseline scenarios WITH the skill and agent present. Verify improvement.

**Files:**
- Update: `.claude/skills/ascii-art/test-baseline.md` (add GREEN results)

**Step 1: Re-run scenario — simple request**

Same prompt as baseline: "Create ASCII art of a cat sitting. Make it high quality."
This time with skill + agent loaded.

Compare against baseline. Document improvements and remaining issues.

**Step 2: Re-run scenario — ambiguous CLI request**

Same prompt as baseline: "I'm building a CLI tool called neptune..."
Compare against baseline.

**Step 3: Re-run scenario — complex scene**

Same prompt as baseline: "Create a detailed ASCII art landscape..."
Compare against baseline.

**Step 4: Document GREEN results**

Update test-baseline.md with:
- Side-by-side comparison (baseline vs with-skill)
- Which baseline failures are now fixed
- Any NEW issues discovered
- Remaining gaps to address in REFACTOR

**Step 5: Commit**

```bash
git add .claude/skills/ascii-art/test-baseline.md
git commit -m "test: add GREEN phase results for ASCII art skill"
```

---

## Task 6: REFACTOR — Close Loopholes

**Purpose:** Address remaining issues from GREEN testing. Tighten the skill/agent/reference.

**Files:**
- Modify: whichever files need tightening based on GREEN results

**Step 1: Review GREEN results**

Identify:
- Did the agent skip planning and jump to drawing?
- Did proportions still come out wrong?
- Did it ignore the techniques reference?
- Did the skill ask too many/too few discovery questions?
- Any rationalizations? ("ASCII art is inherently limited", "this size is fine")

**Step 2: Add explicit counters**

For each remaining issue, add explicit instructions in the agent or skill:
- If agent skips planning → add "STOP: Plan layout on paper before typing a single character"
- If proportions wrong → add proportional grid example in techniques.md
- If too few questions for ambiguous requests → add more decision criteria in skill flowchart

**Step 3: Re-test**

Run scenarios again. Repeat REFACTOR until quality meets bar.

**Step 4: Commit**

```bash
git add -A .claude/skills/ascii-art/ .claude/agents/ascii-art-creator.md
git commit -m "refactor: close loopholes in ASCII art skill after testing"
```

---

## Task 7: Register Bundle in skills.json

**Purpose:** Wire the skill into the armadillo registry so users can install it.

**Files:**
- Modify: `skills.json`

**Step 1: Add bundle definition**

Add to `bundles` section:
```json
"ascii-art": {
  "name": "ASCII Art",
  "description": "Create high-quality ASCII art and CLI visual elements",
  "default": false,
  "skills": ["ascii-art"]
}
```

**Step 2: Add skill definition**

Add to `skills` section:
```json
"ascii-art": {
  "name": "ASCII Art",
  "description": "High-quality ASCII art creation and CLI visual elements",
  "files": [
    "skills/ascii-art/SKILL.md",
    "skills/ascii-art/techniques.md"
  ],
  "agents": ["agents/ascii-art-creator.md"],
  "bundle": "ascii-art"
}
```

**Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('skills.json', 'utf8')); console.log('valid')"
```

Expected: `valid`

**Step 4: Commit**

```bash
git add skills.json
git commit -m "feat: register ascii-art bundle in skills.json"
```

---

## Task 8: Final Verification

**Purpose:** Verify everything is wired correctly.

**Files:** None (verification only)

**Step 1: Run armadillo doctor equivalent checks**

- Verify all three files exist: `SKILL.md`, `techniques.md`, `ascii-art-creator.md`
- Verify skills.json references are correct
- Verify YAML frontmatter is valid in SKILL.md and agent
- Verify no test artifacts left in shipped files (test-baseline.md should NOT be in the files array)

**Step 2: Clean up test artifacts**

Decide: keep test-baseline.md for reference or remove. If keeping, don't include in the bundle files array.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete ascii-art skill bundle"
```

---

## Execution Handoff

Plan complete and saved to `.claude/docs/plans/2026-02-16-ascii-art-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration. Best for this plan since the RED/GREEN/REFACTOR cycle needs interactive judgment.
- **REQUIRED SUB-SKILL:** Use armadillo:subagent-driven-development

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints.
- **REQUIRED SUB-SKILL:** New session uses armadillo:executing-plans
