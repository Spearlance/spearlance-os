# Frontend Pimp Ecosystem Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Expand the frontend pack from 10 to 16 skills with a pimp orchestrator, design thinking skills, and testing reference skills.

**Architecture:** 6 new skills added to `packs/frontend/skills/`. One orchestrator (frontend-pimp), two pattern skills (design-system, ui-craft), three reference skills (storybook, visual-regression, testing-library). Shepherd routing updated to funnel all frontend requests through frontend-pimp.

**Tech Stack:** Markdown skills (SKILL.md + optional reference.md), armadillo.json manifest, shepherd routing table.

**Design doc:** `.claude/docs/plans/2026-02-22-frontend-pimp-ecosystem-design.md`

---

## Task 1: Create frontend-pimp orchestrator

**REQUIRED SUB-SKILL:** Use armadillo:writing-skills for the RED/GREEN/REFACTOR cycle.

**Files:**
- Create: `packs/frontend/skills/frontend-pimp/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/frontend-pimp
```

**Step 2: Write SKILL.md**

Create `packs/frontend/skills/frontend-pimp/SKILL.md` with this content:

```markdown
---
model: claude-sonnet-4-6
name: frontend-pimp
description: Active router for ALL frontend, UI, styling, and component testing requests — classifies and routes to the correct frontend skill before any response. Use when anything involves styling, components, design systems, visual testing, UI patterns, or frontend frameworks.
---

<EXTREMELY-IMPORTANT>
If the request involves frontend in ANY way — styling, CSS, components, UI, layouts, design tokens, theming, animations, responsive design, accessibility, visual testing, Storybook, component testing, UI modernization, style guides, or anything else frontend/UI-related — you MUST route through this skill FIRST.

This is not optional. This is not negotiable. You cannot skip this.
</EXTREMELY-IMPORTANT>

# Frontend Pimp

The orchestration layer for all frontend expertise. Not documentation — an active router. Every frontend/UI/styling request flows through this routing table before any response.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

` ` `
┏━ 🎨 frontend-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what request/routing] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
` ` `

No exceptions. Box frame first, then route.

## Quick Context

The frontend pack is armadillo's UI/UX ecosystem — 16 skills covering frameworks, styling, design systems, animations, accessibility, component development, and visual testing. This pimp routes requests to the right skill based on what the user actually needs.

## Routing Table

Classify the request. Invoke the matching skill. No response before invocation.

| Request Pattern | Skill |
|----------------|-------|
| UI vibes, "make it look modern", style guide, aesthetic direction, UI audit | `ui-craft` |
| Design tokens, CSS architecture, theming, token layers, CSS debugging | `design-system` |
| Tailwind classes, utility CSS, @theme config, dark mode | `tailwind-css` |
| shadcn/ui components, Radix primitives, component library setup | `shadcn-ui` |
| React animations, mount/unmount, layout transitions, gestures | `framer-motion` |
| Scroll animations, timelines, SplitText, GSAP plugins | `gsap` |
| Responsive layout, mobile-first, viewport units, container queries | `responsive-design` |
| Accessibility, WCAG, ARIA, keyboard nav, screen readers, contrast | `accessibility` |
| Next.js pages, App Router, RSC, API routes, middleware | `nextjs` |
| Astro pages, content collections, islands, static sites | `astro` |
| React SPA, Vite config, client-side routing | `react-vite` |
| SvelteKit routes, form actions, load functions | `sveltekit` |
| Storybook setup, component stories, CSF, visual dev | `storybook` |
| Visual regression, screenshot testing, Chromatic, Argos | `visual-regression` |
| Component testing, @testing-library, DOM queries, render tests | `testing-library` |

## Cross-Cutting Rules

- If a request spans multiple skills, invoke the PRIMARY skill first (closest to the core question)
- Creative/aesthetic requests → `ui-craft` first, then implementation skills
- Technical CSS questions → `design-system` or `tailwind-css` (check if it's architectural or utility-level)
- "Make it look better" is ALWAYS `ui-craft` first, never jump straight to Tailwind
- Framework-specific questions → route to the framework skill directly
- If unclear which skill fits, default to `ui-craft` — it covers the broadest creative surface

## State Detection

Before routing, check project state to inform recommendations:

- **`stack.json`** → read framework, styling, testing choices. Don't ask what's already decided.
- **`package.json` deps** → detect Storybook, testing-library, Playwright, Tailwind presence
- **`brand.json`** → if exists, ui-craft should integrate brand guidelines
- **`tailwind.config.*` or `@import "tailwindcss"`** → Tailwind is in use
- **`.storybook/` directory** → Storybook is configured

| State | Recommendation |
|-------|---------------|
| No styling system detected | Suggest starting with `design-system` for token architecture |
| Tailwind present, no design tokens | Route to `design-system` for token layer setup |
| Components exist, no stories | Suggest `storybook` for component development |
| No visual testing | Suggest `visual-regression` after Storybook is set up |
| Everything configured | Route directly to the requested skill |

## Chaining Patterns

| User Says | Chain |
|-----------|-------|
| "Make this look modern" | `ui-craft` → `tailwind-css` / `shadcn-ui` |
| "Set up our design system" | `design-system` → `tailwind-css` |
| "Build this component" | `shadcn-ui` → `storybook` (for dev + testing) |
| "Set up component testing" | `storybook` + `testing-library` + `visual-regression` |
| "Add animation to this" | `framer-motion` or `gsap` (based on stack/complexity) |
| "This UI looks dated" | `ui-craft` (audit mode) → implementation skills |
| "Generate a style guide" | `ui-craft` (style guide mode) → `design-system` (tokens) |

## Animation Routing

| Signal | Route To |
|--------|----------|
| React component animation, mount/unmount, layout | `framer-motion` |
| Scroll-triggered, timeline, complex sequencing | `gsap` |
| Simple CSS transitions, hover states | `tailwind-css` (built-in transitions) |
| Both present in stack.json | Ask which the component needs, or recommend based on complexity |

## When Multiple Skills Apply

Priority order:
1. **ui-craft** — if the question involves aesthetics, vibes, or creative direction
2. **design-system** — if the question involves architecture, tokens, or CSS structure
3. **Framework skill** — if the question is framework-specific
4. **Tool skill** — if the question is about a specific tool (Tailwind, shadcn, etc.)
5. **Testing skill** — if the question is about testing components

## What This Skill Does NOT Route

- General coding questions (even if for a frontend project) → let armadillo-shepherd handle
- Backend API questions → not frontend-specific
- Database/ORM questions → not frontend-specific
- Non-UI testing (unit tests for utils, API tests) → vitest/playwright directly

## Hard Rules

- Never respond about frontend/UI before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If unclear, ask ONE clarifying question, then route
- The skill's content has the verified facts — always defer to it
- "Make it look good" is ui-craft territory — NEVER jump straight to Tailwind classes
```

**NOTE:** The triple backtick in the announcement section needs to be actual backticks, not escaped. The agent writing this should use proper markdown fencing.

**Step 3: Run writing-skills RED/GREEN cycle**

Follow armadillo:writing-skills TDD process:
- RED: Test a subagent with "style this component" and "make this UI modern" WITHOUT the skill
- GREEN: Test same prompts WITH the skill — verify it routes correctly
- REFACTOR: Close any loopholes found

**Step 4: Commit**

```bash
git add packs/frontend/skills/frontend-pimp/SKILL.md
git commit -m "feat(frontend): add frontend-pimp orchestrator skill"
```

---

## Task 2: Create ui-craft aesthetic skill

**REQUIRED SUB-SKILL:** Use armadillo:writing-skills for the RED/GREEN/REFACTOR cycle.

**Files:**
- Create: `packs/frontend/skills/ui-craft/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/ui-craft
```

**Step 2: Write SKILL.md**

Create `packs/frontend/skills/ui-craft/SKILL.md`. This is the "vibes skill" — the aesthetic/creative companion that knows modern UI trends and can generate style directions, sample components, and style guides.

**CRITICAL CONSTRAINT:** This skill must NOT default to "boring shadcn gray AI website." It has full aesthetic range. Corporate SaaS is ONE option among many, never the default.

Key sections to include:

1. **Frontmatter:** `name: ui-craft`, `description: Use when designing UI aesthetics, generating style guides, modernizing dated interfaces, or exploring visual direction. Also use for color palette generation, typography pairing, and component style samples. The "vibes skill" — creative direction before implementation.`

2. **Aesthetic Spectrum** — a table of 9+ aesthetic directions (brutalist, editorial, playful, maximalist, minimalist, retro/Y2K, corporate SaaS, organic, experimental) each with:
   - Visual signature (what makes it recognizable)
   - Color characteristics
   - Typography characteristics
   - Component characteristics
   - When to use (audience/brand fit)
   - Example sites/references for each

3. **Socratic Discovery Mode** — MANDATORY before proposing any visual direction:
   - Ask about target audience (age, tech-savvy, industry)
   - Ask about brand personality (if brand.json exists, read it instead of asking)
   - Ask about mood/energy (calm, energetic, bold, refined, raw)
   - Ask about reference sites or aesthetics they admire
   - Ask about constraints (existing brand colors, framework limitations)
   - ONLY after understanding context → propose 2-3 aesthetic directions with rationale

4. **Dated vs Modern Detector** — rules for identifying what ages a UI:
   - Shadow styles: heavy drop shadows → subtle/none or colored shadows
   - Border radius: 4px everywhere → mixed (pill buttons, sharp cards, rounded avatars)
   - Colors: pure saturated → muted/desaturated or OKLCH-perceptual
   - Typography: system fonts only → intentional font pairing with scale
   - Spacing: inconsistent → rhythm-based (4/8px grid, fluid clamp())
   - Gradients: linear top-to-bottom → mesh gradients, aurora, radial
   - Icons: generic line icons → custom or cohesive icon set
   - Layout: centered 1200px box → full-bleed, bento, asymmetric grids
   - Interactions: instant state changes → spring physics, staggered reveals

5. **Color Palette Generation** — OKLCH-based approach:
   - Start with brand primary (or discover it)
   - Generate semantic scale: 50-950 lightness variants
   - Ensure WCAG AA contrast ratios (4.5:1 text, 3:1 UI elements)
   - Include accent, success, warning, error, neutral
   - Output as CSS custom properties ready for Tailwind v4 @theme

6. **Typography System** — pairing rules:
   - Type scale ratios (1.2 minor third → 1.333 perfect fourth)
   - Font weight usage (max 3 weights per font)
   - Line-height rules (1.1-1.2 headings, 1.5-1.7 body)
   - Letter-spacing adjustments for large/small text
   - Variable font recommendations (Inter, Plus Jakarta Sans, Geist, Satoshi)

7. **Style Guide Generator** — outputs:
   - Color palette with CSS custom properties
   - Typography scale with font stacks
   - Spacing scale
   - Border radius tokens
   - Shadow tokens
   - Sample components: button, card, input, hero section
   - All in Tailwind v4 / CSS custom properties format

8. **Sample Component Generator** — can produce:
   - Hero sections in the chosen aesthetic
   - Card components with variants
   - Navigation patterns
   - Form elements
   - CTAs and buttons
   - Each with Tailwind classes matching the chosen direction

9. **Integration points:**
   - If `brand.json` exists → use brand colors/fonts as constraints
   - If `stack.json` exists → use framework-appropriate component syntax
   - Always outputs implementation-ready code (not just descriptions)

**Step 3: Run writing-skills RED/GREEN cycle**

- RED: Ask a subagent "modernize this component" without the skill. Watch it default to gray/shadcn.
- GREEN: Same prompt with skill. Verify it asks about vibes first, proposes aesthetic range.
- REFACTOR: Close loopholes (e.g., skipping Socratic mode, defaulting to minimalist).

**Step 4: Commit**

```bash
git add packs/frontend/skills/ui-craft/SKILL.md
git commit -m "feat(frontend): add ui-craft aesthetic/vibes skill"
```

---

## Task 3: Create design-system pattern skill

**REQUIRED SUB-SKILL:** Use armadillo:writing-skills for the RED/GREEN/REFACTOR cycle.

**Files:**
- Create: `packs/frontend/skills/design-system/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/design-system
```

**Step 2: Write SKILL.md**

Create `packs/frontend/skills/design-system/SKILL.md`. This is the structural/technical companion to ui-craft — focuses on HOW to organize and architect the design system, not what it looks like.

Key sections to include:

1. **Frontmatter:** `name: design-system`, `description: Use when architecting design tokens, setting up CSS custom properties, organizing theme systems, debugging CSS specificity issues, or establishing component API patterns. Also use for CSS architecture decisions (Tailwind vs Modules vs Vanilla Extract) and token layer organization.`

2. **Token Architecture** — three-layer system:
   - **Primitive tokens:** Raw values (`--color-blue-500: oklch(0.55 0.2 260)`)
   - **Semantic tokens:** Purpose-mapped (`--color-primary: var(--color-blue-500)`)
   - **Component tokens:** Scoped (`--button-bg: var(--color-primary)`)
   - Show how Tailwind v4 `@theme` maps to this with CSS custom properties
   - Include complete example of all three layers

3. **CSS Architecture Decision Tree:**

   ```
   New project?
   ├── Yes → Tailwind v4 (default recommendation)
   │   ├── Need component library? → shadcn/ui
   │   └── Need design system tooling? → Tailwind @theme + CSS custom properties
   ├── Existing Tailwind project → Stay on Tailwind, migrate to v4 if on v3
   ├── Need type-safe CSS? → Vanilla Extract (zero-runtime, TypeScript)
   ├── Need utility + token system? → Panda CSS (zero-runtime, type-safe)
   ├── React Server Components? → NEVER runtime CSS-in-JS (Emotion, styled-components)
   └── Legacy CSS-in-JS? → Keep if working, migrate to Tailwind/Vanilla Extract on rewrites
   ```

4. **Theming Strategy:**
   - Light/dark using `prefers-color-scheme` + class toggle
   - Tailwind v4: `@custom-variant dark (&:is(.dark *))` pattern
   - Multi-brand theming with CSS custom property swap
   - System preference detection with JS hydration
   - Complete code example for light/dark toggle

5. **Component API Patterns:**
   - Variant composition with `cva` (class-variance-authority)
   - Slot pattern for compound components
   - `cn()` utility for className merging (clsx + twMerge)
   - Prop spreading patterns
   - Forward ref patterns

6. **CSS Debugging Patterns:**
   - Specificity issues: cascade layers (`@layer`), `!important` as last resort
   - Stacking context: when `z-index` doesn't work (transform, opacity, filter create new contexts)
   - Overflow: hidden vs clip, scroll containment
   - Layout shifts: intrinsic sizing, aspect-ratio, content-visibility
   - Flexbox vs Grid decision: flex for 1D, grid for 2D, grid for unknown item counts

7. **Spacing System:**
   - 4px base grid (0.25rem)
   - Tailwind's scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, ...
   - Fluid spacing with clamp() for responsive
   - Vertical rhythm: consistent line-height multiples

8. **CSS Layers:**
   - `@layer base, components, utilities` ordering
   - How Tailwind v4 uses layers internally
   - When to create custom layers for third-party CSS

**Step 3: Run writing-skills RED/GREEN cycle**

- RED: Ask a subagent "set up design tokens for this project" without skill. Watch it use ad-hoc approach.
- GREEN: Same prompt with skill. Verify it follows three-layer token architecture.
- REFACTOR: Close loopholes.

**Step 4: Commit**

```bash
git add packs/frontend/skills/design-system/SKILL.md
git commit -m "feat(frontend): add design-system token/architecture skill"
```

---

## Task 4: Create storybook reference skill

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills for mandatory web research + RED/GREEN cycle.

**Files:**
- Create: `packs/frontend/skills/storybook/SKILL.md`
- Create: `packs/frontend/skills/storybook/reference.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/storybook
```

**Step 2: Research phase (MANDATORY)**

Per writing-reference-skills, search for current facts before writing:

```
WebSearch: "Storybook 10 changelog 2026"
WebSearch: "Storybook addon-vitest setup configuration"
WebSearch: "Storybook CSF factories TypeScript"
WebSearch: "Storybook 10 breaking changes migration"
WebSearch: "Storybook module mocking automock"
WebFetch: https://storybook.js.org/docs (official docs)
```

**Known facts from design phase (verify during research):**
- Version: 10.2.10 (Feb 2026)
- ESM-only architecture, 29% smaller install
- @storybook/addon-vitest replaces test runner
- CSF Factories: TypeScript-first CSF evolution
- Module automocking for component isolation
- Supports Next.js 16, Vitest 4, Svelte async

**Step 3: Write SKILL.md** (~80 lines)

Follow the writing-reference-skills SKILL.md template:
- Quick reference table (version, install, CLI, docs URL)
- Authentication/setup (framework-specific: Next.js, Vite, Astro)
- Common operations (create story, add interaction test, run visual test)
- CSF3 template with TypeScript
- Common mistakes table
- Link to reference.md for full details

**Step 4: Write reference.md** (~500-700 lines)

Organized by feature area:
1. Setup & configuration (Next.js 15/16, Vite, Astro, SvelteKit)
2. Component Story Format (CSF3 + CSF Factories)
3. Vitest addon integration (setup, configuration, running tests)
4. Interaction testing (play functions, user-event)
5. Module mocking (automocking, manual mocks)
6. Accessibility testing (a11y addon)
7. Visual testing integration (Chromatic, Playwright)
8. Addon ecosystem (viewport, backgrounds, actions, controls)
9. CI configuration (build, test, deploy)
10. Common mistakes and debugging

**Step 5: Run writing-reference-skills RED/GREEN cycle**

- RED: Ask subagent "set up Storybook with Vitest testing" without skill. Document wrong setup steps.
- GREEN: Same with skill. Verify correct v10 setup with addon-vitest (not deprecated test runner).
- 4 test questions minimum per writing-reference-skills spec.

**Step 6: Commit**

```bash
git add packs/frontend/skills/storybook/
git commit -m "feat(frontend): add storybook 10.x reference skill"
```

---

## Task 5: Create visual-regression reference skill

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills for mandatory web research + RED/GREEN cycle.

**Files:**
- Create: `packs/frontend/skills/visual-regression/SKILL.md`
- Create: `packs/frontend/skills/visual-regression/reference.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/visual-regression
```

**Step 2: Research phase (MANDATORY)**

```
WebSearch: "Playwright toHaveScreenshot configuration 2026"
WebSearch: "Chromatic visual testing pricing free tier 2026"
WebSearch: "Argos CI visual regression open source"
WebSearch: "Lost Pixel visual testing setup"
WebSearch: "visual regression testing Docker CI consistency"
WebFetch: https://playwright.dev/docs/test-snapshots (Playwright docs)
WebFetch: https://www.chromatic.com/docs (Chromatic docs)
```

**Known facts from design phase (verify during research):**
- Playwright `toHaveScreenshot()` covers 80% of cases
- macOS vs Linux chromium rendering difference is the #1 gotcha
- Chromatic: 5000 snapshots/mo free, built by Storybook team
- Argos: open source, Playwright/Cypress native
- Lost Pixel: self-hosted open source alternative

**Step 3: Write SKILL.md** (~80 lines)

- Quick reference table (tools, pricing, best-for)
- Decision tree: which tool to use when
- Playwright toHaveScreenshot() basic setup
- Common mistakes (OS rendering differences, threshold config)
- Link to reference.md

**Step 4: Write reference.md** (~400-600 lines)

Organized by tool:
1. Playwright visual comparisons (setup, config, thresholds, CI Docker)
2. Chromatic (setup with Storybook, CI integration, review workflow)
3. Argos CI (setup, GitHub integration, Playwright plugin)
4. Lost Pixel (self-hosted setup, Storybook/page mode)
5. CI pipeline patterns (Docker for consistency, GitHub Actions examples)
6. Snapshot management (baseline updates, threshold tuning, ignoring regions)
7. Cross-browser strategies

**Step 5: Run writing-reference-skills RED/GREEN cycle**

- RED: Ask subagent "set up visual regression testing" without skill. Watch them miss Docker CI gotcha.
- GREEN: Same with skill. Verify CI Docker recommendation and correct tool selection.

**Step 6: Commit**

```bash
git add packs/frontend/skills/visual-regression/
git commit -m "feat(frontend): add visual-regression testing reference skill"
```

---

## Task 6: Create testing-library reference skill

**REQUIRED SUB-SKILL:** Use armadillo:writing-reference-skills for mandatory web research + RED/GREEN cycle.

**Files:**
- Create: `packs/frontend/skills/testing-library/SKILL.md`
- Create: `packs/frontend/skills/testing-library/reference.md`

**Step 1: Create skill directory**

```bash
mkdir -p packs/frontend/skills/testing-library
```

**Step 2: Research phase (MANDATORY)**

```
WebSearch: "@testing-library/react v16 breaking changes"
WebSearch: "testing-library query priority 2026"
WebSearch: "testing-library react 19 suspense act workaround"
WebSearch: "@testing-library/user-event v14 setup"
WebFetch: https://testing-library.com/docs/react-testing-library/intro/ (official docs)
WebFetch: https://testing-library.com/docs/queries/about (query guide)
```

**Known facts from design phase (verify during research):**
- @testing-library/react v16.3.2
- @testing-library/dom moved to peer dep (must install explicitly)
- @testing-library/react-hooks merged into main package (remove if found)
- React 19 Suspense: wrap render in `await act()` to avoid fallback hang
- @types/react-dom needed separately for TypeScript

**Step 3: Write SKILL.md** (~80 lines)

- Quick reference table (packages, versions, install command)
- Query priority (getByRole > getByLabelText > getByText > getByTestId)
- Basic test template with Vitest
- React 19 act() pattern
- Common mistakes table
- Link to reference.md

**Step 4: Write reference.md** (~400-600 lines)

Organized by topic:
1. Installation & setup (Vitest, Jest, framework-specific)
2. Query types (getBy, queryBy, findBy — all variants)
3. Query priority guide with rationale
4. user-event v14 (setup, keyboard, pointer, clipboard)
5. Async utilities (waitFor, findBy, act)
6. React 19 patterns (Suspense, concurrent features, act wrapping)
7. Testing patterns (forms, modals, navigation, context providers)
8. Storybook interaction test reuse (portable stories)
9. Anti-patterns (implementation testing, container.querySelector, waitFor with side effects)
10. Accessibility testing integration (toHaveNoViolations)

**Step 5: Run writing-reference-skills RED/GREEN cycle**

- RED: Ask subagent "test this React component" without skill. Watch for wrong query types and missing act().
- GREEN: Same with skill. Verify correct query priority and React 19 patterns.

**Step 6: Commit**

```bash
git add packs/frontend/skills/testing-library/
git commit -m "feat(frontend): add testing-library v16 reference skill"
```

---

## Task 7: Update armadillo-shepherd routing table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md` — Frontend section (~lines 102-113)

**Step 1: Read current shepherd Frontend section**

```bash
# Current section to replace:
### Frontend

| Request | Skill |
|---------|-------|
| Styling / CSS | `tailwind-css` |
| UI components | `shadcn-ui` |
| Next.js / App Router | `nextjs` |
| Astro / content sites | `astro` |
| Animations (React) | `framer-motion` |
| Scroll / timeline animations | `gsap` |
| Responsive / mobile-first | `responsive-design` |
| Accessibility / WCAG | `accessibility` |
```

**Step 2: Replace with pimp-routed section**

Replace the `### Frontend` section with:

```markdown
### Frontend

| Request | Skill |
|---------|-------|
| ANYTHING frontend/UI/styling/design/component testing (style, layout, CSS, theme, visual, component, UI modernize) | `frontend-pimp` |
| Styling / CSS, Tailwind config, utility classes | `frontend-pimp` → routes to `tailwind-css` |
| UI components, shadcn/ui, Radix primitives | `frontend-pimp` → routes to `shadcn-ui` |
| Next.js / App Router, RSC, API routes | `frontend-pimp` → routes to `nextjs` |
| Astro / content sites, islands | `frontend-pimp` → routes to `astro` |
| React SPA, Vite setup, client-side app | `frontend-pimp` → routes to `react-vite` |
| SvelteKit, Svelte routing | `frontend-pimp` → routes to `sveltekit` |
| Animations (React), mount/unmount, gestures | `frontend-pimp` → routes to `framer-motion` |
| Scroll / timeline animations, GSAP plugins | `frontend-pimp` → routes to `gsap` |
| Responsive / mobile-first, viewport, container queries | `frontend-pimp` → routes to `responsive-design` |
| Accessibility / WCAG, ARIA, keyboard nav | `frontend-pimp` → routes to `accessibility` |
| Design tokens, CSS architecture, theming, CSS debugging | `frontend-pimp` → routes to `design-system` |
| UI vibes, style guide, modernize UI, aesthetic direction | `frontend-pimp` → routes to `ui-craft` |
| Storybook, component stories, CSF, visual dev environment | `frontend-pimp` → routes to `storybook` |
| Visual regression, screenshot testing, Chromatic, Argos | `frontend-pimp` → routes to `visual-regression` |
| Component testing, @testing-library, DOM queries, render tests | `frontend-pimp` → routes to `testing-library` |
```

**Step 3: Verify no broken routing**

Read the full shepherd SKILL.md and confirm no duplicate or conflicting routes.

**Step 4: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat(shepherd): route all frontend requests through frontend-pimp"
```

---

## Task 8: Update armadillo.json pack manifest

**Files:**
- Modify: `armadillo.json` — `packs.frontend.skills` array (~lines 193-205)

**Step 1: Read current frontend pack entry**

```json
"frontend": {
  "description": "Tailwind v4, shadcn/ui, Next.js, Astro, React+Vite, SvelteKit, Framer Motion, GSAP, responsive design, accessibility",
  "skills": [
    "tailwind-css",
    "shadcn-ui",
    "nextjs",
    "astro",
    "react-vite",
    "sveltekit",
    "framer-motion",
    "gsap",
    "responsive-design",
    "accessibility"
  ]
}
```

**Step 2: Update with 6 new skills**

Replace with:

```json
"frontend": {
  "description": "Frontend ecosystem with pimp orchestrator — Tailwind v4, shadcn/ui, Next.js, Astro, React+Vite, SvelteKit, Framer Motion, GSAP, responsive design, accessibility, design systems, UI craft, Storybook, visual regression, testing-library",
  "skills": [
    "frontend-pimp",
    "tailwind-css",
    "shadcn-ui",
    "nextjs",
    "astro",
    "react-vite",
    "sveltekit",
    "framer-motion",
    "gsap",
    "responsive-design",
    "accessibility",
    "design-system",
    "ui-craft",
    "storybook",
    "visual-regression",
    "testing-library"
  ]
}
```

**Step 3: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('armadillo.json','utf8')); console.log('valid')"
```

Expected: `valid`

**Step 4: Commit**

```bash
git add armadillo.json
git commit -m "feat(packs): add 6 new skills to frontend pack manifest"
```

---

## Task 9: Update CLAUDE.md pack table

**Files:**
- Modify: `.claude/CLAUDE.md` — frontend pack row in the Skill Packs table

**Step 1: Find and update frontend pack row**

Current row:
```
| frontend | 10 | Tailwind v4, shadcn/ui, Next.js, Astro, React+Vite, SvelteKit, Framer Motion, GSAP, responsive design, accessibility |
```

Replace with:
```
| frontend | 16 | Frontend ecosystem with pimp orchestrator — Tailwind v4, shadcn/ui, design systems, UI craft, Storybook, visual regression, testing-library, plus Next.js, Astro, React+Vite, SvelteKit, animations, responsive design, accessibility |
```

**Step 2: Verify CLAUDE.md still renders correctly**

Read the file and confirm the table isn't broken.

**Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update frontend pack description in CLAUDE.md (10 → 16 skills)"
```

---

## Dependency Graph

```
Tasks 1-6: Independent (can run in parallel batches)
  Task 1: frontend-pimp  ← no deps
  Task 2: ui-craft       ← no deps
  Task 3: design-system  ← no deps
  Task 4: storybook      ← no deps (web research needed)
  Task 5: visual-regression ← no deps (web research needed)
  Task 6: testing-library ← no deps (web research needed)

Task 7: Update shepherd  ← depends on Tasks 1-6 (skills must exist before routing to them)
Task 8: Update armadillo.json ← depends on Tasks 1-6
Task 9: Update CLAUDE.md ← depends on Task 8
```

**Parallelization opportunities:**
- Tasks 1-3 (pattern skills, no web research) can run in parallel
- Tasks 4-6 (reference skills, each needs independent web research) can run in parallel
- Tasks 7-9 are sequential

## Execution Notes

- Each skill task invokes `writing-skills` or `writing-reference-skills` — those handle the TDD cycle
- Reference skills (4-6) take longer due to mandatory web research
- Pattern skills (1-3) are faster — content comes from the design doc + domain knowledge
- The pimp (Task 1) should be written first even if others are parallel — it sets the routing pattern
- All skills use `model: claude-sonnet-4-6` per the design doc
