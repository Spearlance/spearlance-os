# Responsive Design Skill — Baseline Test Results

## RED Phase: Without Skill

Date: 2026-02-19
Model: claude-sonnet-4-6

---

## Q1: Fluid Typography — clamp() with Tailwind

### Prompt
"I need a heading that's 32px on mobile and 64px on desktop, scaling smoothly. Show the modern CSS clamp() approach with Tailwind. Include a complete fluid type scale."

### Pre-Research Assessment (Honest Gaps)

**What I know with confidence:**
- `clamp(min, preferred, max)` syntax is correct
- The preferred value should mix `rem` + `vw` for smooth scaling
- Basic formula: `clamp(2rem, 2rem + 2vw, 4rem)` gets close

**What I'm uncertain about:**
- The exact slope formula (rise/run across viewport range) — I know the concept but might miscalculate coefficients
- Whether Tailwind v4's `@theme` accepts `clamp()` directly in font-size tokens
- How to define a complete named type scale (xs/sm/base/lg/xl/2xl/3xl) with correct ratios
- Whether Tailwind exposes `text-[clamp(...)]` arbitrary value syntax in v4

**Likely mistakes without research:**
1. Formula would produce an approximate clamp, not a precise linear interpolation between 320px and 1280px viewports
2. Type scale ratios would be arbitrary (I'd guess 1.25 or 1.333) without knowing the right scale for the context
3. I would probably use the v3 `theme()` extension syntax rather than v4's `@theme` directive
4. I would not know whether to use `vi` (inline) vs `vw` (width) units for the fluid value

### Failure Pattern
The core issue: I can produce a *plausible-looking* clamp but the math would be slightly wrong. The precise interpolation formula is:

```
slope = (maxSize - minSize) / (maxViewport - minViewport)
intercept = minSize - slope * minViewport
preferred = ${intercept}px + ${slope * 100}vw
```

Without this, I'd guess preferred values that feel right but aren't mathematically correct.

---

## Q2: Container Queries vs Media Queries + Tailwind v4

### Prompt
"Explain container queries vs media queries. When to use each? Show a Tailwind v4 card that responds to container width with @container setup."

### Pre-Research Assessment (Honest Gaps)

**What I know with confidence:**
- Container queries respond to parent element width, media queries respond to viewport width
- Container queries require a `container-type` declaration on the parent
- Basic rule: use container queries for components, media queries for page layout
- The `@container` CSS rule syntax

**What I'm uncertain about:**
- Tailwind v4's exact syntax — I know v3 required `@tailwindcss/container-queries` plugin with `@container` class and `@sm:` prefix, but v4 changed this
- Whether named containers work with Tailwind utility classes in v4
- The `container-type: inline-size` vs `size` distinction and performance implications
- `@container style()` style queries and their browser support status

**Likely mistakes without research:**
1. I might write v3 plugin syntax (with `@container` class) for a v4 project
2. I would not know whether `@max-*` container variants are built-in or need configuration in v4
3. I'd be imprecise about when to use `inline-size` vs `size` containment

### Failure Pattern
Tailwind v4 makes container queries first-class without plugin installation — that's the critical change. Any agent relying on training data from before January 2025 would write `npm install @tailwindcss/container-queries` and use v3 plugin syntax.

---

## Q3: Spacing System for Next.js/Tailwind v4

### Prompt
"Design a spacing system for a Next.js/Tailwind app. Define a spacing scale in Tailwind v4's @theme. Include vertical rhythm."

### Pre-Research Assessment (Honest Gaps)

**What I know with confidence:**
- Tailwind v3 uses `tailwind.config.js` with `theme.extend.spacing`
- Spacing scale is base 4px with multipliers (1=4px, 2=8px, 4=16px, 8=32px)
- Vertical rhythm means consistent line-height and margin relationships

**What I'm uncertain about:**
- Tailwind v4's `@theme` syntax for spacing — it's CSS-first, but the exact property names
- Whether `--spacing-*` or `--space-*` is the naming convention in v4
- How v4's dynamic spacing generation works (`calc(var(--spacing) * N)`)
- Whether you can use `@theme` to override the base spacing multiplier
- The distinction between `@theme` (generates utilities) vs `:root` (just CSS vars)

**Likely mistakes without research:**
1. Would write `tailwind.config.js` `theme.extend.spacing` for a v4 project
2. Would not know the base variable name (`--spacing` in v4)
3. Would not know the `@theme` directive syntax at all
4. Would define a rigid explicit scale instead of understanding v4's dynamic multiplication system

### Failure Pattern
Tailwind v4 has a completely different theming model. The migration from `tailwind.config.js` to `@theme` in CSS is the biggest v4 change, and any agent using pre-2025 training would produce the wrong approach.

---

## Q4: Viewport Units — vh/dvh/svh/lvh

### Prompt
"What's the difference between vh, dvh, svh, lvh? When to use each? Build a mobile layout with sticky header and bottom nav handling browser chrome correctly."

### Pre-Research Assessment (Honest Gaps)

**What I know with confidence:**
- `vh` is the classic unit — 1% of the browser window height
- The problem: mobile browser chrome (address bar, tab bar) causes `100vh` to extend behind UI elements
- `dvh` is dynamic — updates as chrome hides/shows (but causes layout reflow)
- `svh` is small — based on the viewport with all chrome visible (most conservative, most stable)
- `lvh` is large — based on the viewport with all chrome hidden

**What I'm uncertain about:**
- Exact browser support matrix for all four units in early 2026
- Which unit is the right default for a full-height layout
- Whether iOS Safari 15.4+ fully supports all three new units or just `dvh`
- The performance cost of `dvh` (layout recalculations as chrome shifts)
- Correct fallback pattern for older browsers

**Likely mistakes without research:**
- Would not know whether to recommend `svh` or `dvh` as the primary choice for full-height sections
- Might get the use case for `lvh` slightly wrong (it's rarely the right choice for fixed elements)
- Fallback syntax would be a guess

### Failure Pattern
The specific recommendation of `svh` for fixed/sticky elements and `dvh` for scroll containers (with the reasoning) would be imprecise without research confirming browser behavior.

---

## Top RED Baseline Failures

### 1. Tailwind v4 Config Model
The shift from `tailwind.config.js` to CSS `@theme` directive is the largest knowledge gap. Agents trained on pre-January-2025 data will write v3 syntax for v4 projects.

### 2. Fluid Type Formula Precision
The slope-intercept formula for clamp() is conceptually understood but numerically wrong without being deliberate. Agents produce approximations that "feel right" but don't produce exact linear interpolation.

### 3. Container Query Plugin Status
In Tailwind v3, `@tailwindcss/container-queries` was a separate plugin. In v4, it's built-in. Agents would install a plugin that's no longer needed.

### 4. dvh vs svh Default Recommendation
Knowing the difference in definition is easy. Knowing that `svh` is usually the right default for fixed layouts (because it doesn't cause reflow) is the practical judgment that requires research.

---

## GREEN Phase: With Skill

Date: 2026-02-19
Skill files: `skills/responsive-design/SKILL.md` + `skills/responsive-design/reference.md`

Evaluation method: Cross-reference each RED failure against the skill content.

---

### Q1 (GREEN): Fluid Typography + clamp()

| Criterion | RED | GREEN | Improved? |
|-----------|-----|-------|-----------|
| Correct slope-intercept formula | Approximate | Exact: `slope = (max - min) / (1280 - 320)` in reference.md | YES |
| Complete named type scale | Guessed ratios | Full xs–4xl scale with `clamp()` values in reference.md | YES |
| Tailwind v4 `@theme` integration | Unknown | `@theme { --text-*: clamp(...) }` with working examples | YES |
| Arbitrary value syntax `text-[clamp(...)]` | Unknown | Documented in reference.md Quick Reference | YES |
| Accessibility: rem + zoom | Not mentioned | Explicitly covered: "always use rem, never px in clamp bounds" | YES |

**Result: PASS** — All 5 criteria addressed. Slope formula is exact, scale is complete, v4 syntax is correct.

---

### Q2 (GREEN): Container Queries vs Media Queries

| Criterion | RED | GREEN | Improved? |
|-----------|-----|-------|-----------|
| v4 built-in (no plugin needed) | Would install plugin | Explicitly stated: "no plugin, built-in since v4" | YES |
| `@container` class + `@sm:` prefix syntax | Unknown v4 syntax | Correct: `class="@container"` parent + `@sm:` child variants | YES |
| `@max-*` variants | Unknown | Documented in reference.md with examples | YES |
| Named containers | Unknown | `@container/sidebar` naming pattern shown | YES |
| `inline-size` vs `size` containment | Imprecise | Decision rule in reference.md | YES |
| When to use media vs container | Correct concept | Decision table: page layout → media, component → container | YES |

**Result: PASS** — All 6 criteria addressed. v4 plugin status is the most critical fix.

---

### Q3 (GREEN): Spacing System + @theme

| Criterion | RED | GREEN | Improved? |
|-----------|-----|-------|-----------|
| `@theme` directive syntax | Unknown (would use config.js) | Full `@theme` block with spacing tokens | YES |
| Dynamic spacing (`--spacing` base var) | Unknown | `--spacing: 0.25rem` base + dynamic calc documented | YES |
| Utility class generation | Unknown | "@theme tokens generate utility classes automatically" | YES |
| `@theme` vs `:root` distinction | Unknown | Explicit rule: `@theme` = utilities, `:root` = runtime vars | YES |
| Vertical rhythm pattern | Conceptual | Specific `leading-*` + `space-y-*` pattern in reference.md | YES |

**Result: PASS** — All 5 criteria addressed. The @theme vs config.js distinction is fully covered.

---

### Q4 (GREEN): Viewport Units dvh/svh/lvh

| Criterion | RED | GREEN | Improved? |
|-----------|-----|-------|-----------|
| Unit definitions (all 4) | Correct concept | Clear definitions with decision table | YES |
| Browser support | Uncertain | "Baseline 2023: all modern browsers support svh/lvh/dvh" in reference.md | YES |
| svh for fixed layouts (no reflow) | Imprecise | Explicit: "svh for fixed/sticky — no reflow risk" | YES |
| dvh for scroll containers | Imprecise | Explicit: "dvh when content must fill dynamic viewport" | YES |
| Safe area inset pattern | Not covered | `env(safe-area-inset-*)` with `viewport-fit=cover` fully documented | YES |
| Fallback pattern | Guessed | `@supports` + `100vh` fallback pattern in reference.md | YES |

**Result: PASS** — All 6 criteria addressed. svh vs dvh recommendation is now precise and reasoned.

---

### GREEN Phase Summary

| Question | RED Failures | GREEN Result |
|----------|-------------|--------------|
| Q1: Fluid Typography | Formula imprecise, v4 syntax unknown | PASS — exact formula, complete scale, v4 syntax |
| Q2: Container Queries | Would install unneeded plugin, v4 syntax wrong | PASS — v4 built-in documented, all variants covered |
| Q3: Spacing + @theme | Would write config.js (v3 approach) | PASS — @theme directive fully covered |
| Q4: Viewport Units | svh/dvh recommendation imprecise | PASS — decision table with precise use cases |

Success criteria met: Skill corrects all 4 major training-data gaps on Tailwind v4, fluid type math, and modern viewport units.

---

## REFACTOR Phase

Date: 2026-02-19

### Gaps Identified During GREEN Review

1. **Touch target sizing** — 48px minimum tap target (WCAG 2.5.5 AAA) mentioned but pattern for ensuring it in Tailwind not shown. Added `min-h-12 min-w-12` guidance to reference.md Common Mistakes.

2. **`@container` with Tailwind arbitrary values** — `@[320px]:` arbitrary container breakpoints not documented. Added to reference.md container queries section.

3. **Grid auto-fill vs auto-fit** — behavior difference (empty tracks vs collapsed) not explained with a visual example. Added comparison to reference.md Grid Patterns.

### Fixes Applied

All three gaps added to reference.md in the appropriate sections.

### Remaining Acceptable Gaps

- **CSS Style Queries** (`@container style(--variant: pill)`) — browser support is still partial in early 2026; noted but not recommended as primary pattern
- **Scroll-driven animations** — responsive but out of scope for this skill
- **CSS `@layer` for responsive overrides** — adjacent topic covered by cascade layering, not core responsive design
