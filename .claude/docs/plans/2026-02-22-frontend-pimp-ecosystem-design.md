# Frontend Pimp Ecosystem Design

**Date:** 2026-02-22
**Status:** Approved
**Scope:** Expand frontend pack from 10 to 16 skills with pimp orchestrator

## Problem

The frontend pack has 10 tool/framework reference skills but:
- No orchestrator (pimp) to route between them intelligently
- No design thinking skills (tokens, CSS architecture, theming)
- No aesthetic/creative skills (UI trends, style guides, modernization)
- No component testing library reference
- No Storybook reference
- No visual regression testing reference

Compare: brand pack (7 skills + pimp), opencode pack (6 skills + pimp). Frontend is the biggest pack with zero orchestration.

## Solution

Add 6 new skills to the frontend pack. One pimp, two pattern/creative skills, three reference skills.

## Architecture

### Frontend Pack (16 skills total)

**Existing (unchanged):**
1. tailwind-css — Tailwind v4 reference
2. shadcn-ui — shadcn/ui + Radix reference
3. nextjs — Next.js 15+ reference
4. astro — Astro reference
5. react-vite — React + Vite reference
6. sveltekit — SvelteKit reference
7. framer-motion — Motion for React reference
8. gsap — GSAP 3.14.x reference
9. responsive-design — Mobile-first patterns
10. accessibility — WCAG 2.2 patterns + axe-core reference

**New:**
11. **frontend-pimp** — Orchestrator (routes all frontend/UI/styling/testing)
12. **design-system** — Structural pattern skill (tokens, CSS architecture, theming)
13. **ui-craft** — Aesthetic creative skill (trends, vibes, style guides, modernization)
14. **storybook** — Storybook 10.x reference
15. **visual-regression** — Visual testing reference (Playwright, Chromatic, Argos)
16. **testing-library** — @testing-library/react v16.x reference

### No new packs

Frontend stays one pack (16 skills). Precedent: SEO has 15.

### No testing-pimp

Core testing skills (TDD, test-debug, systematic-debugging) remain in core. Shepherd routes testing requests. A pimp would add indirection without value.

## Skill Specifications

### frontend-pimp (Orchestrator)

**Model:** claude-sonnet-4-6
**Pattern:** brand-pimp / opencode-pimp

**Routing table:**

| Request Pattern | Routes To |
|----------------|-----------|
| "Style this", CSS question, theming | stack.json detection → tailwind-css or design-system |
| "Make it look modern", UI vibes, style guide | ui-craft |
| Design tokens, CSS architecture, token layers | design-system |
| "Add animation", motion, transition | framer-motion or gsap (based on stack.json) |
| "Make responsive", viewport, mobile | responsive-design |
| "Fix the layout", CSS debugging | design-system (CSS debugging section) |
| "Add component", component library | shadcn-ui or storybook |
| "Test component", DOM queries, render test | testing-library |
| Visual regression, screenshot testing | visual-regression |
| Accessibility, a11y, contrast, keyboard nav | accessibility |
| Framework-specific (Next.js, Astro, etc.) | nextjs/astro/sveltekit/react-vite |

**State detection:**
- Reads `stack.json` to know framework, styling, testing choices
- Reads project deps to detect Storybook, testing-library, Playwright presence
- Avoids redundant questions when stack is decided

**Chaining:**
- "Make this look better" → ui-craft (aesthetic direction) → tailwind-css/shadcn-ui (implementation)
- "Set up component testing" → storybook + testing-library + visual-regression

### design-system (Pattern skill)

**Model:** claude-sonnet-4-6
**File:** SKILL.md only (self-contained pattern skill)

**Covers:**
- Design token architecture (CSS custom properties as the standard)
- Token layers: primitive → semantic → component
- Tailwind v4 `@theme` as token system (CSS-first, not JS config)
- CSS architecture decision tree: Tailwind v4 > CSS Modules > Vanilla Extract > Panda CSS
- Runtime CSS-in-JS declining (Emotion, styled-components not for new RSC projects)
- Theming strategy (light/dark, multi-brand, system preference)
- Component API patterns (variant composition with cva, slot patterns)
- CSS debugging patterns (specificity, cascade, stacking context, z-index, overflow)
- Spacing systems (fluid scales with clamp(), consistent rhythm)
- CSS Layers (@layer) for specificity management

### ui-craft (Creative/Pattern skill)

**Model:** claude-sonnet-4-6
**File:** SKILL.md only (self-contained)

**CRITICAL CONSTRAINT:** This skill must NOT default to "boring shadcn gray AI website." It has aesthetic range across the full spectrum.

**Covers:**
- Modern UI patterns (2025-2026): bento grids, glass morphism, editorial layouts, aurora gradients, fluid shapes, parallax depth, kinetic typography
- Dead patterns to avoid: flat 2018 corporate, neumorphism (faded), skeuomorphism
- Aesthetic spectrum with no default bias:
  - Brutalist (raw, typographic, anti-design)
  - Editorial (magazine-inspired, type-driven, asymmetric grids)
  - Playful (rounded, colorful, bouncy animations, illustrated)
  - Maximalist (bold gradients, layered, dense, visually loud)
  - Minimalist (whitespace-heavy, monochrome, type-focused)
  - Retro/Y2K (pixel fonts, neon, chrome, gradients)
  - Corporate SaaS (clean, professional — ONE option among many)
  - Organic (natural textures, earthy palettes, flowing shapes)
  - Experimental (generative, interactive, WebGL-infused)
- "Dated vs modern" detector — identifies what ages a design (shadow styles, border radii, color saturation, type choices, spacing density)
- Color palette generation (OKLCH-based for perceptual uniformity, contrast-aware for a11y)
- Typography pairing (type scale ratios, font weight usage, line-height/letter-spacing rules)
- Visual hierarchy rules (size contrast, whitespace rhythm, focal points, density balance)
- Style guide generator — outputs a living style reference for the project
- Sample component generator — produces example components showing proposed direction
- **Socratic mode** — asks about audience, brand personality, mood, energy level, references/inspiration BEFORE proposing anything
- Integrates with brand-compliance when brand.json exists
- Can generate before/after comparisons for modernization proposals

### storybook (Reference skill)

**Model:** claude-sonnet-4-6
**Files:** SKILL.md + reference.md (two-file structure per writing-reference-skills)

**Research required (writing-reference-skills process):**

| Fact | Current Value |
|------|--------------|
| Version | 10.2.10 (Feb 2026) |
| Architecture | ESM-only, 29% smaller install |
| Test approach | @storybook/addon-vitest (replaces test runner) |
| CSF | CSF3 standard, CSF Factories for TypeScript-first |
| Framework support | Next.js 16, Vitest 4, Svelte async |

**SKILL.md covers:** Quick setup, CSF3 template, Vitest addon config, common mistakes
**reference.md covers:** Full addon ecosystem, CSF Factories, interaction testing, accessibility testing, visual testing integration, module mocking, CI configuration

### visual-regression (Reference skill)

**Model:** claude-sonnet-4-6
**Files:** SKILL.md + reference.md

**Covers:**
- Playwright `toHaveScreenshot()` as default approach (free, built-in)
- CI setup with Docker for consistent rendering (macOS vs Linux chromium gotcha)
- Chromatic for Storybook-native visual testing (5000 snapshots/mo free)
- Argos for open-source Playwright/Cypress visual CI
- Lost Pixel as self-hosted alternative
- Decision tree: when to use each tool
- Snapshot management, threshold config, baseline updates
- Cross-browser screenshot strategies

### testing-library (Reference skill)

**Model:** claude-sonnet-4-6
**Files:** SKILL.md + reference.md

| Fact | Current Value |
|------|--------------|
| @testing-library/react | v16.3.2 |
| @testing-library/dom | Peer dep (install separately) |
| @testing-library/user-event | v14.x |
| React support | 18+, React 19 with act() gotcha |

**SKILL.md covers:** Install, query priority, basic test template, common mistakes
**reference.md covers:** All query types, user-event patterns, async utilities, Suspense/React 19 patterns, Vitest integration, Storybook interaction test reuse, anti-patterns, accessibility testing patterns

## Shepherd Updates

New routing entries added to armadillo-shepherd:

### Frontend section (updated)

| Request | Skill |
|---------|-------|
| ANYTHING frontend/UI/styling/testing/components | `frontend-pimp` |
| Styling / CSS (existing, now routes through pimp) | `frontend-pimp` → `tailwind-css` |
| UI components (existing, now routes through pimp) | `frontend-pimp` → `shadcn-ui` |
| Next.js / App Router (existing) | `frontend-pimp` → `nextjs` |
| Astro / content sites (existing) | `frontend-pimp` → `astro` |
| Animations React (existing) | `frontend-pimp` → `framer-motion` |
| Scroll / timeline animations (existing) | `frontend-pimp` → `gsap` |
| Responsive / mobile-first (existing) | `frontend-pimp` → `responsive-design` |
| Accessibility / WCAG (existing) | `frontend-pimp` → `accessibility` |
| Design tokens, CSS architecture, theming | `frontend-pimp` → `design-system` |
| UI vibes, style guide, modernize UI | `frontend-pimp` → `ui-craft` |
| Storybook, component stories, CSF | `frontend-pimp` → `storybook` |
| Visual regression, screenshot testing | `frontend-pimp` → `visual-regression` |
| Component testing, testing-library, DOM queries | `frontend-pimp` → `testing-library` |

## Implementation Order

1. frontend-pimp (orchestrator — must exist before sub-skills are useful)
2. ui-craft (the vibes skill — creative, no external research needed)
3. design-system (structural patterns — no external research needed)
4. storybook (reference — requires web research via writing-reference-skills)
5. visual-regression (reference — requires web research)
6. testing-library (reference — requires web research)
7. Update armadillo-shepherd routing table
8. Update armadillo.json pack manifest
9. Update CLAUDE.md pack table

## Success Criteria

- frontend-pimp correctly routes 10+ different request types to the right skill
- ui-craft generates style guides with aesthetic range (not locked to shadcn gray)
- design-system covers token architecture and CSS debugging
- storybook has correct v10.2.x setup code and CSF Factories examples
- visual-regression covers Playwright screenshots + CI Docker setup
- testing-library has correct v16.x install, query priority, React 19 act() pattern
- All skills pass RED/GREEN testing cycle per writing-skills/writing-reference-skills
