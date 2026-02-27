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

The orchestration layer for all frontend expertise. Not documentation — an active router. Every frontend request flows through this routing table before any response.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🎨 frontend-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what request/routing] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then route.

## Quick Context

The frontend pack is armadillo's UI ecosystem — 16 skills covering frameworks, styling, design systems, animations, accessibility, component development, and visual testing. Takes a project from raw UI to a polished, tested, accessible frontend.

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

## Package-First Principle

Before generating ANY custom component, utility, or UI element:

1. **Check shadcn/ui registry** — `npx shadcn@latest add [component]` or search at ui.shadcn.com
2. **Check npm** — search for existing, well-maintained packages (10k+ weekly downloads, recent updates)
3. **Check project deps** — is something already installed that handles this?
4. **Only then generate custom code** — when nothing suitable exists or needs heavy customization

This applies to ALL routed skills. The system should LEVERAGE existing packages, not recreate them.

Examples:
- Need a date picker? → `npx shadcn@latest add calendar` (not custom)
- Need a toast? → `npx shadcn@latest add sonner` (not custom)
- Need charts? → recharts or tremor (not custom SVG)
- Need a carousel? → embla-carousel (not custom)
- Need form validation? → zod + react-hook-form (not custom)
- Need icons? → lucide-react (not custom SVG)

## Cross-Cutting Rules

- If a request spans multiple skills, invoke the PRIMARY skill first (closest to the core question)
- Creative/aesthetic requests → `ui-craft` first, then implementation skills
- Technical CSS questions → `design-system` or `tailwind-css` (check if architectural or utility-level)
- "Make it look better" is ALWAYS `ui-craft` first, never jump straight to Tailwind
- Framework-specific questions → route to the framework skill directly
- If unclear which skill fits, default to `ui-craft` — it covers the broadest creative surface

## State Detection

Before routing, check project state to inform the recommendation:

- `stack.json` → read framework, styling, testing choices
- `package.json` deps → detect Storybook, testing-library, Playwright, Tailwind
- `brand.json` → if exists, ui-craft should integrate brand guidelines
- `tailwind.config.*` or `@import "tailwindcss"` → Tailwind is in use
- `.storybook/` directory → Storybook is configured

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
| Both present in stack.json | Ask which, or recommend based on complexity |

## Priority Order (when multiple skills apply)

1. ui-craft — aesthetics, vibes, creative direction
2. design-system — architecture, tokens, CSS structure
3. Framework skill — framework-specific questions
4. Tool skill — specific tool (Tailwind, shadcn, etc.)
5. Testing skill — testing components

## What This Skill Does NOT Route

- General coding (even if frontend project) → shepherd handles
- Backend API questions → not frontend-specific
- Database/ORM questions → not frontend-specific
- Non-UI testing (unit tests for utils) → vitest/playwright directly

## Hard Rules

- Never respond about frontend/UI before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If unclear, ask ONE clarifying question, then route
- The skill's content has the verified facts — always defer to it
- "Make it look good" is ui-craft territory — NEVER jump straight to Tailwind classes
- ALWAYS check Package-First Principle before generating custom components
