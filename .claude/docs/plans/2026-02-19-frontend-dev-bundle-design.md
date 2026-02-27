# Frontend Development Bundle — Design

**Date:** 2026-02-19
**Status:** Approved

## Overview

Create a `frontend-dev` bundle containing 8 skills (6 reference, 2 pattern) plus 1 umbrella agent. Covers the full frontend stack: CSS frameworks, component libraries, frameworks, animation, responsive design, and accessibility.

## Stack Context

| Layer | Primary Tool | Notes |
|-------|-------------|-------|
| CSS | Tailwind v4 | CSS-first config, `@theme`, `@variant` |
| Components | shadcn/ui | Radix primitives + Tailwind, varies by project |
| Frameworks | Next.js + Astro | Next.js for apps, Astro for content sites |
| Animation | Framer Motion, GSAP, CSS | All three, project-dependent |
| Quality | Responsive + a11y | Pixel-perfect on all viewports |

## Deliverables

### 8 Skills

| # | Skill | Type | SKILL.md | reference.md |
|---|-------|------|----------|--------------|
| 1 | `tailwind-css` | Reference | ~80 lines | ~600-800 lines |
| 2 | `shadcn-ui` | Reference | ~80 lines | ~600-800 lines |
| 3 | `nextjs` | Reference | ~80 lines | ~600-800 lines |
| 4 | `astro` | Reference | ~80 lines | ~600-800 lines |
| 5 | `framer-motion` | Reference | ~80 lines | ~600-800 lines |
| 6 | `gsap` | Reference | ~80 lines | ~600-800 lines |
| 7 | `responsive-design` | Pattern | ~80 lines | ~400-600 lines |
| 8 | `accessibility` | Pattern | ~80 lines | ~400-600 lines |

### 1 Umbrella Agent

- **Name:** `frontend-dev-guide`
- **Model:** `claude-sonnet-4-6`
- **Role:** Routes generic frontend requests to the right skill based on project detection
- **Behavior:**
  1. Checks project for existing setup (package.json, config files, installed deps)
  2. If tool already in use → routes to that tool's skill
  3. If no tool → recommends based on context
  4. Has access to all 8 skill reference docs

### Bundle Registration

```json
"frontend-dev": {
  "name": "Frontend Development",
  "description": "Tailwind v4, shadcn/ui, Next.js, Astro, Framer Motion, GSAP, responsive design, accessibility",
  "default": false,
  "skills": [
    "tailwind-css", "shadcn-ui", "nextjs", "astro",
    "framer-motion", "gsap", "responsive-design", "accessibility"
  ]
}
```

## Skill Scope

### tailwind-css (Reference)
- Tailwind v4 CSS-first configuration (`@theme`, `@variant`, `@custom-variant`)
- Migration from v3 (no more `tailwind.config.js`, PostCSS changes)
- Utility class reference (spacing, typography, colors, layout, flexbox, grid)
- Responsive prefixes and container queries
- Dark mode, custom themes, design tokens
- Integration with Next.js, Astro, Vite

### shadcn-ui (Reference)
- Component catalog with correct props and APIs
- CLI usage (`npx shadcn@latest add`)
- Radix UI primitives underneath (accessibility built-in)
- Theming with CSS variables and Tailwind
- Form patterns (react-hook-form + zod integration)
- Common composition patterns (data tables, combobox, command palette)

### nextjs (Reference)
- App Router architecture (RSC, client/server boundaries)
- Layouts, templates, loading/error states
- Server Actions and mutations
- Metadata API and SEO
- Caching layers (Request Memoization, Data Cache, Full Route Cache, Router Cache)
- Image optimization, fonts, scripts
- Middleware and route handlers

### astro (Reference)
- Content Collections (type-safe, schema validation)
- Islands architecture (partial hydration)
- View Transitions API
- SSR/SSG/hybrid rendering
- Integrations (React, Tailwind, MDX)
- Astro DB, Actions, Server Islands

### framer-motion (Reference)
- Core: `motion` components, `animate`, `initial`, `exit`
- Layout animations and `layoutId`
- `AnimatePresence` for mount/unmount
- Spring physics and easing (`useSpring`, `useMotionValue`)
- Gestures (`drag`, `whileHover`, `whileTap`)
- Scroll animations (`useScroll`, `useTransform`)
- Variants and orchestration (`staggerChildren`, `delayChildren`)

### gsap (Reference)
- Core: `gsap.to()`, `gsap.from()`, `gsap.fromTo()`
- Timeline orchestration (`gsap.timeline()`)
- ScrollTrigger plugin (pin, scrub, snap, batch)
- SplitText plugin for text animations
- Flip plugin for layout transitions
- React/Next.js integration (`useGSAP` hook, `gsap.context()`)
- Performance: `will-change`, GPU acceleration, batch operations

### responsive-design (Pattern)
- Fluid typography (`clamp()`, viewport-relative sizing)
- Spacing systems (consistent scale, Tailwind's spacing)
- Container queries vs media queries
- Modern viewport units (`dvh`, `svh`, `lvh`)
- Mobile-first breakpoint strategy
- Touch targets, tap areas, mobile UX patterns
- Grid and flexbox responsive patterns
- Image responsive patterns (`srcset`, `sizes`, `<picture>`)

### accessibility (Pattern)
- WCAG 2.2 Level AA requirements
- ARIA roles, states, and properties
- Keyboard navigation patterns (focus trapping, roving tabindex)
- Focus management (skip links, focus restoration)
- Color contrast requirements
- Screen reader testing approach
- Common component a11y patterns (modals, dropdowns, tabs, accordions)
- Forms: labels, errors, validation messaging

## Agent Design

### frontend-dev-guide

```
User request arrives
  ↓
Check package.json + config files
  ↓
┌─ Framework detected?
│  Next.js → read nextjs skill
│  Astro → read astro skill
│
├─ CSS framework detected?
│  Tailwind → read tailwind-css skill
│
├─ Component library detected?
│  shadcn/ui → read shadcn-ui skill
│
├─ Animation library detected?
│  framer-motion → read framer-motion skill
│  gsap → read gsap skill
│
├─ Responsive concern?
│  → read responsive-design skill
│
├─ Accessibility concern?
│  → read accessibility skill
│
└─ Generic/unclear → recommend based on project context
```

Multiple skills can be loaded for a single request (e.g., "make this component responsive" loads both the component library skill AND responsive-design).

## Freshness Model

Reference skills use the `writing-reference-skills` process (mandatory web research). Freshness is maintained through:

1. **Authoring:** Web research required every time a reference skill is created or updated
2. **Tracking:** Each SKILL.md includes `## Last Verified: YYYY-MM-DD`
3. **Distribution:** Armadilloers get latest docs via `/updating-armadillo`
4. **Re-verification trigger:** Major version releases (Tailwind v5, Next.js 16, etc.)

No client-side auto-update mechanism needed — the update skill already handles this.

## CLAUDE.md Integration

After installation, the armadillo-managed section of CLAUDE.md gets:

```markdown
### Frontend Development
- **tailwind-css** — Tailwind v4 reference
- **shadcn-ui** — shadcn/ui component reference
- **nextjs** — Next.js App Router reference
- **astro** — Astro 5 reference
- **framer-motion** — Framer Motion animation reference
- **gsap** — GSAP/ScrollTrigger reference
- **responsive-design** — Responsive design patterns
- **accessibility** — WCAG 2.2 and ARIA patterns
```

## Implementation Order

Skills should be created in dependency order:

1. **tailwind-css** — foundation, referenced by shadcn-ui and responsive-design
2. **responsive-design** — pattern skill, uses Tailwind examples
3. **shadcn-ui** — depends on Tailwind context
4. **nextjs** — framework reference
5. **astro** — framework reference
6. **framer-motion** — animation reference
7. **gsap** — animation reference
8. **accessibility** — pattern skill, cross-cutting
9. **frontend-dev-guide agent** — umbrella, needs all skills to exist
10. **skills.json + CLAUDE.md** — bundle registration

## Success Criteria

- All 8 skills pass the writing-reference-skills TDD cycle
- Reference skills have web-verified facts (no training-data-only content)
- Pattern skills encode opinionated best practices, not generic advice
- Agent correctly routes to the right skill(s) based on project detection
- Bundle installs cleanly via onboarding
- `/updating-armadillo` pulls latest versions
