# ASCII Art Skill — Baseline Test Results

## RED Phase: Without Skill or Agent

Date: 2026-02-16
Model: claude-opus-4-6 (subagent)

---

## Scenario 1: Simple Request — "Create ASCII art of a cat sitting. Make it high quality."

### Art Produced

~38 cols x 25 rows. Cat with semicolon-textured head, @ eyes, tapered body, tucked paws. No tail.

### Assessment

| Criterion | Result | Notes |
|-----------|--------|-------|
| Planned dimensions before drawing? | Claimed yes | Said "aimed for 30x25" but produced 38x25 — planning was vague |
| Shading/density techniques? | Minimal | Used `;` for fur texture and `@` for eyes, but no systematic density gradient |
| Monospace proportions (2:1)? | Claimed yes | Said they stretched horizontally, but result is hard to verify — no reference grid |
| Overall quality | Medium | Recognizable cat silhouette, decent structure, but missing tail, rough ears, no real depth |

### Failure Patterns

1. **Vague planning** — "aimed for roughly 30x25" is not a plan. No layout sketch, no character palette selection, no composition strategy.
2. **No density gradient** — Used a few characters (`;`, `@`, `.`, `-`) but didn't apply a systematic light-to-dark scale.
3. **Missing features** — No tail, ears implied but not distinct. Self-identified these issues but didn't fix them.
4. **Self-assessment after the fact** — Assessed quality post-creation rather than checking against standards during creation.

---

## Scenario 2: Ambiguous CLI Request — "Building a CLI tool called 'neptune'... need some cool ASCII art"

### Art Produced

4 options provided:
1. Large figlet-style block letter banner with Unicode box drawing frame (~70 cols)
2. Compact figlet-style banner (~42 cols x 6 rows)
3. Hand-drawn trident logo + name (~35 cols x 14 rows)
4. Minimal inline trident (~28 cols x 3 rows)

Also included TypeScript code-ready snippets for Options 2 and 4.

### Assessment

| Criterion | Result | Notes |
|-----------|--------|-------|
| Asked clarifying questions? | No | Jumped straight to producing 4 options (told not to ask, but skill should drive discovery) |
| Considered use context? | Yes | Mapped each option to a use case (splash, help, logo, inline) |
| Code-ready output? | Partial | TypeScript snippets for 2 of 4 options, with proper escaping |
| Offered size/style options? | Yes | 4 distinct options at different sizes |
| Overall quality | Mixed | Good practical approach, but art quality is uneven |

### Failure Patterns

1. **No discovery process** — Produced 4 guesses instead of understanding what the user actually needs. Real questions: Where does the art appear? What's the tool's personality? Terminal width constraints? Color support?
2. **Unicode compatibility not flagged** — Option 1 uses `█`, `╗`, `║` Unicode box drawing. Works in modern terminals but will break in some environments. No warning provided.
3. **Emoji in terminal art** — Used 🔱 emoji in Option 1. Emojis have inconsistent width in terminals and can break alignment.
4. **Option 1 alignment issues** — The Unicode block letter banner doesn't fit cleanly inside its box frame (lines extend past the border).
5. **Trident art (Option 3) is rough** — Hand-drawn but the proportions are off, asymmetric, doesn't clearly read as a trident.
6. **No style discussion** — Neptune could be regal, techy, minimal, playful — agent made assumptions without exploring.

---

## Scenario 3: Complex Scene — "Detailed landscape with mountains, lake, trees. 60+ cols, 30+ rows."

### Art Produced

~80 cols x 33 rows. Three-layer composition: background mountains with overlapping ridgelines, mid-ground lake with `~` patterns, foreground tree canopy with dense `@` fills.

### Assessment

| Criterion | Result | Notes |
|-----------|--------|-------|
| Hit dimensions? | Yes | ~80x33, exceeded 60x30 requirement |
| Depth/layering? | Good concept | 3 distinct layers with different character density. Mountains overlap. |
| Character density variation? | Yes | Sparse `/\|` for mountains, `~` for water, dense `@` for trees |
| Proportional compensation? | Partial | Mountains widened, but self-admitted could be wider. Trees are blob-shaped. |
| Overall quality | Self-rated 6.5/10 | Recognizable scene but rough in execution |

### Failure Patterns

1. **"Mount Peak" text inside mountain** — Literally put the words "Mount Peak" inside the mountain outline. This is a text label, not art.
2. **Mountains overlap poorly** — Where ridgelines cross there's an `X` character that looks like an error, not an intentional depth technique.
3. **Trees are uniform @-blobs** — All trees use identical `@` fill pattern. No variation in species, size, or shape. No trunks visible.
4. **Lake is just tildes** — No reflection, no shoreline detail, no depth variation in the water. Just rows of `~` with spacing.
5. **Abrupt transitions** — Mountain base → lake → trees have hard boundaries. No blending or transition elements.
6. **No atmospheric details** — No clouds, birds, sun, shadows, or weather elements. Scene feels flat despite the layering attempt.
7. **Self-rated honestly** — Gave 6.5/10, but the rationalizations ("could be improved further", "would elevate it") suggest awareness without action.

---

## Top Baseline Failures (Skill Must Address)

### 1. No Planning Protocol
Agents jump into drawing without structured planning. No dimension planning, layout sketch, character palette selection, or composition strategy before the first character is typed.

### 2. No Systematic Density Gradient
Characters chosen ad hoc. No reference to a light-to-dark density scale. Shading is binary (filled vs empty) rather than graduated.

### 3. No Discovery for Ambiguous Requests
Agent guesses instead of asking targeted questions. Produces multiple options hoping one fits, rather than understanding the actual need first.

### 4. Proportional Compensation Inconsistent
Acknowledged the 2:1 height:width ratio but application is spotty. No reference grid or proportional planning.

### 5. Quality Self-Check After the Fact
Agents assess quality AFTER producing art, identifying issues they don't fix. No quality gates DURING creation. Self-assessment becomes rationalization ("this is good enough", "could be improved").

### 6. CLI Integration Not Automatic
Code-ready output only provided when explicitly relevant (scenario 2). No automatic escaping awareness. Unicode/emoji compatibility issues not flagged.

### 7. No Iteration Mindset
Art produced once and delivered. No revision pass, no refinement, no "let me check this against the brief." One-shot production.

---

## GREEN Phase: With Skill + Agent + Reference

Date: 2026-02-16
Model: claude-opus-4-6 (subagent)
Bundle: SKILL.md + ascii-art-creator.md + reference.md

---

## Scenario 1 (GREEN): Simple Request — "Create ASCII art of a cat sitting. Make it high quality."

### Workflow Observed

- Assessed request as "clear" (specific subject: cat sitting)
- Noted "high quality" implies large/detailed — skipped deep exploration
- Built structured brief with all 6 fields (Subject, Size, Style, Context, Constraints, Notes)
- Followed 4-step planning protocol before drawing

### Art Produced

~50 cols x 32 rows. Cat with pointed ears, eyes as focal point, concentric density rings from chest center outward, whiskers, paws, curving tail.

### Comparison to Baseline

| Criterion | Baseline | GREEN | Improved? |
|-----------|----------|-------|-----------|
| Planned dimensions? | Vague ("aimed for 30x25") | Explicit ("50 cols x 35 rows" target, produced 50x32) | YES |
| Character palette declared? | No | Yes — 6 categories (background, light, medium, dense, outline, accent) | YES |
| Density gradient? | Minimal (3-4 chars) | Systematic concentric rings: space → `. ,` → `; '` → `# *` → `@` | YES |
| Quality gates during creation? | No (post-assessment only) | Yes — caught first attempt as "humanoid", iterated 4 times | YES |
| Proportional compensation? | Claimed but unverified | Documented: head 26 cols for round appearance, 2:1 calculations | YES |
| Iteration? | One-shot | 4 attempts, each checked against quality gates | YES |
| Missing features? | No tail, rough ears | Ears visible, whiskers present, tail included | YES |

### Remaining Issues

1. Interior shading pattern is somewhat decorative/repetitive rather than naturalistic fur
2. Tail is rudimentary (4 lines of `~` characters)
3. Self-rated 7/10 — honest but room for improvement

---

## Scenario 2 (GREEN): Ambiguous CLI Request — "Building a CLI tool called 'neptune'..."

### Workflow Observed

- Assessed request as "clear" (subject specific enough: CLI tool "neptune")
- Identified ONE sizing/style question would be asked (per SKILL.md: clear = 1 question max)
- Detected CLI context automatically from request ("CLI tool", "building")
- Built structured brief with CLI constraints (max cols, ASCII-safe, JS + Shell escaping)

### Art Produced

51 cols x 22 rows. Trident rising from waves, "NEPTUNE v0.1.0" banner below. JS template literal + shell heredoc provided.

### Comparison to Baseline

| Criterion | Baseline | GREEN | Improved? |
|-----------|----------|-------|-----------|
| Discovery process? | None — guessed 4 options | Assessed clarity, would ask 1 question, built brief | YES |
| CLI context detected? | Partially (provided some TS snippets) | Automatically set CLI context, included language in Constraints | YES |
| Unicode/emoji issues? | Used `█ ╗ ║` and 🔱 without warning | ASCII-safe only, no Unicode, no emoji | YES |
| Code-ready output? | 2 of 4 options | Both JS template literal and shell heredoc, properly escaped | YES |
| Planning protocol? | No | Full 4-step planning with dimension target, palette, layout | YES |
| Single focused output? | 4 scattered options | 1 focused piece matching the brief | YES |

### Remaining Issues

1. Trident design somewhat simplified — could have more ornamental detail
2. Wave section is symmetric where real waves would be more organic
3. Version number hard-coded (should note it's a placeholder)

---

## Scenario 3 (GREEN): Complex Scene — "Detailed landscape with mountains, lake, trees. 60+ cols, 30+ rows."

### Workflow Observed

- Assessed request as "clear" (specific subject, dimensions given)
- Built structured brief noting specific anti-patterns to avoid (from baseline failures)
- Followed full 4-step planning with row allocation for each scene layer
- Ran quality gates at 3 checkpoints (after sky+mountains, after lake, after foreground)

### Art Produced

70 cols x 37 rows. Three-layer scene: sparse sky with birds/stars, asymmetric mountain range with full density gradient, textured lake with reflections, foreground trees with concentric density rings.

### Comparison to Baseline

| Criterion | Baseline | GREEN | Improved? |
|-----------|----------|-------|-----------|
| Text labels in art? | "Mount Peak" inside mountain | None — all meaning through density/shape | YES |
| Mountain ridgelines? | Symmetric /\ with X overlap errors | Asymmetric peaks, varied slopes, no errors | YES |
| Tree rendering? | Uniform @-blobs | Concentric density rings: `,;*+#%@` center-out | YES |
| Water rendering? | Just tildes | Mixed `~ . , -` with mountain reflections fading downward | YES |
| Density transitions? | Abrupt (empty → filled) | Full gradient: `. , ' : ; = + * # % @`, no tier skips | YES |
| Atmospheric details? | None | Birds (`v`), star (`*`), dots in sky | YES |
| Scene layering? | Concept only | Measurable density difference across 3 layers | YES |
| Quality gates during creation? | None | 3 explicit checkpoint checks | YES |

### Remaining Issues

1. Mountain-to-water transition still slightly abrupt at the horizon line
2. Tree shapes are concentric but still somewhat formulaic (symmetric rings)
3. Right half of composition less detailed than left

---

## Baseline Failures: Resolution Status

| # | Failure | Status | Evidence |
|---|---------|--------|----------|
| 1 | No Planning Protocol | FIXED | All 3 scenarios: 4-step planning with dimensions, palette, layout, composition |
| 2 | No Systematic Density Gradient | FIXED | Full 12-tier gradient used in scenarios 1 and 3. Subject-appropriate palettes selected. |
| 3 | No Discovery for Ambiguous Requests | FIXED | SKILL.md discovery flow followed: clear vs ambiguous assessment, ONE question for clear, brief built before dispatch |
| 4 | Proportional Compensation Inconsistent | FIXED | Documented 2:1 calculations in planning. Head widths, mountain slopes, tree proportions all compensated. |
| 5 | Quality Self-Check After the Fact | FIXED | Quality gates run DURING creation at multiple checkpoints. Scenario 1: caught and restarted twice. |
| 6 | CLI Integration Not Automatic | FIXED | Scenario 2: CLI context auto-detected, JS + Shell output with proper escaping, ASCII-safe by default |
| 7 | No Iteration Mindset | FIXED | Scenario 1: 4 iterations. Scenario 3: refined after first draft. All checked against brief. |

## Remaining Gaps for REFACTOR

1. **Tree rendering still formulaic** — Concentric density rings are better than @-blobs, but shapes are symmetric and repetitive. Real trees have organic, irregular canopies.
2. **Interior shading can be decorative** — Especially in Scenario 1 (cat), the density rings create a pattern rather than naturalistic form.
3. **Hard horizon transitions** — Scenario 3 mountain-to-water boundary is still somewhat abrupt despite graduated density elsewhere.
4. **Composition balance** — Scenario 3 left side more detailed than right. No explicit composition balance check in quality gates.
