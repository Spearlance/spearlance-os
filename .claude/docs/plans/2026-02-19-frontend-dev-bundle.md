# Frontend Development Bundle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 8 frontend reference/pattern skills + 1 umbrella agent + bundle registration in skills.json

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle (RED baseline → web research → GREEN write → REFACTOR gaps). Pattern skills (responsive-design, accessibility) follow the same cycle but test pattern application rather than fact accuracy. All skills share a frontend-dev-guide umbrella agent.

**Tech Stack:** Tailwind v4, shadcn/ui, Next.js 15 (App Router), Astro 5, Framer Motion, GSAP, WCAG 2.2

**Process for every skill (Tasks 1-8):** Each task follows the same 6-step process. The writing-reference-skills skill documents this in detail — read it before starting. Summary:

1. **RED (baseline):** Dispatch a haiku subagent with 4 questions, NO skill loaded. Document what it gets wrong.
2. **Research:** WebSearch + WebFetch for current facts. Verify versions, APIs, breaking changes.
3. **GREEN (write):** Write SKILL.md (<100 lines) + reference.md (400-800 lines). Address every baseline failure.
4. **GREEN (verify):** Cross-reference skill content against each baseline failure. Document in test-baseline.md.
5. **REFACTOR:** Identify gaps, fix them, re-verify.
6. **Commit:** `git add` skill files + test-baseline.md, commit with conventional message.

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: tailwind-css

**Files:**
- Create: `.claude/skills/tailwind-css/SKILL.md`
- Create: `.claude/skills/tailwind-css/reference.md`
- Create: `.claude/skills/tailwind-css/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: tailwind-css
description: Use when working with Tailwind CSS for utility-first styling, responsive design, theming, or dark mode. Also use when migrating from Tailwind v3 to v4, configuring @theme directives, or troubleshooting class specificity issues.
---
```

### Step 1: RED baseline — dispatch haiku subagent with these 4 questions (NO skill):

**Q1 (Setup/Migration):** "I'm starting a new Next.js 15 project and want to use Tailwind CSS v4. How do I set it up? Show me the configuration. Also, I have an existing project on Tailwind v3 — what are the breaking changes I need to handle when migrating?"

**Q2 (Common Operation):** "Show me how to create a responsive card component using Tailwind v4. It should have a photo, title, description, and a CTA button. Use modern Tailwind features like container queries and the @theme directive for custom colors."

**Q3 (Gotcha/Limits):** "How does Tailwind v4's CSS-first configuration work? Show me how to define custom spacing, colors, and fonts using @theme. What happened to tailwind.config.js?"

**Q4 (Recent Change):** "What changed in Tailwind v4 compared to v3? Specifically, what's different about dark mode, arbitrary values, and the new CSS-based approach? Give me concrete before/after examples."

Save baseline results to `test-baseline.md`.

### Step 2: Web research — search for:

- `"Tailwind CSS v4" changelog breaking changes 2025 2026`
- `"Tailwind CSS v4" @theme directive configuration`
- `"Tailwind CSS" v3 to v4 migration guide`
- `"Tailwind CSS v4" container queries @container`
- `"Tailwind CSS v4" dark mode configuration`
- `"Tailwind CSS v4" Next.js setup installation`
- `site:tailwindcss.com` — verify via WebFetch on official docs

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (version, install, config), Setup (CSS import), Common Operations (responsive card, dark mode), Migration from v3, Common Mistakes, Full Reference pointer.

**reference.md sections:**
1. Installation & Configuration (Next.js, Astro, Vite)
2. CSS-First Configuration (@theme, @variant, @custom-variant)
3. Migration from v3 (before/after for every breaking change)
4. Utility Reference (spacing, typography, colors, layout, flexbox, grid)
5. Responsive Design (breakpoints, container queries, fluid sizing)
6. Dark Mode
7. Custom Theming (design tokens via @theme)
8. Plugins and Extensions
9. Common Mistakes
10. Recent Changes and Deprecations

### Step 4: GREEN verification — cross-reference against baseline failures

### Step 5: REFACTOR — close gaps

### Step 6: Commit

```bash
git add .claude/skills/tailwind-css/
git commit -m "feat: add tailwind-css reference skill (v4)"
```

---

## Task 2: responsive-design

**Files:**
- Create: `.claude/skills/responsive-design/SKILL.md`
- Create: `.claude/skills/responsive-design/reference.md`
- Create: `.claude/skills/responsive-design/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: responsive-design
description: Use when implementing responsive layouts, fluid typography, spacing systems, container queries, or mobile-first design patterns. Also use when debugging viewport issues, sizing inconsistencies, or cross-device rendering problems.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Fluid Typography):** "I need a heading that's 32px on mobile and 64px on desktop, scaling smoothly between breakpoints. Show me the modern CSS approach using clamp() with Tailwind. Also show me a complete fluid type scale for a marketing site."

**Q2 (Container Queries):** "Explain container queries vs media queries. When should I use each? Show me a Tailwind v4 card component that responds to its container width, not the viewport. Include the @container setup."

**Q3 (Spacing System):** "Design a spacing system for a Next.js app using Tailwind. I want consistent spacing across all components — margins, padding, gaps. Show me how to define a spacing scale in Tailwind v4's @theme and use it throughout. Include vertical rhythm."

**Q4 (Viewport Units):** "What's the difference between vh, dvh, svh, and lvh? When should I use each? I'm building a mobile app with a sticky header and bottom nav — show me how to handle the viewport height correctly so content doesn't get hidden behind browser chrome."

### Step 2: Web research — search for:

- `"fluid typography" clamp CSS 2025 2026 best practices`
- `"container queries" CSS support browser compatibility 2025 2026`
- `"container queries" Tailwind CSS v4`
- `dvh svh lvh viewport units browser support`
- `"spacing system" design tokens CSS 2025`
- `"responsive design" best practices modern CSS 2025 2026`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (viewport units, clamp formula), Core Patterns (fluid type, spacing scale), When to Use Container Queries, Common Mistakes.

**reference.md sections:**
1. Mobile-First Strategy (breakpoints, Tailwind defaults)
2. Fluid Typography (clamp() formulas, type scales, Tailwind integration)
3. Spacing Systems (scale definition, @theme config, vertical rhythm)
4. Container Queries (@container, Tailwind @container variants)
5. Modern Viewport Units (vh/dvh/svh/lvh, when to use each)
6. Responsive Images (srcset, sizes, picture, Tailwind aspect-ratio)
7. Grid Patterns (auto-fill, auto-fit, responsive grid templates)
8. Touch & Mobile Patterns (tap targets 48px, safe areas, scroll behavior)
9. Common Mistakes

### Steps 4-6: Same as Task 1

```bash
git add .claude/skills/responsive-design/
git commit -m "feat: add responsive-design pattern skill"
```

---

## Task 3: shadcn-ui

**Files:**
- Create: `.claude/skills/shadcn-ui/SKILL.md`
- Create: `.claude/skills/shadcn-ui/reference.md`
- Create: `.claude/skills/shadcn-ui/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: shadcn-ui
description: Use when working with shadcn/ui components, Radix UI primitives, or building UI with copy-paste components on Tailwind. Also use when setting up shadcn/ui CLI, theming with CSS variables, or composing complex components like data tables or command palettes.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Setup):** "I'm adding shadcn/ui to an existing Next.js 15 + Tailwind v4 project. Walk me through the setup process. What's the CLI command? What files does it create? Show me the components.json and how theming works."

**Q2 (Common Operation):** "Build me a data table with shadcn/ui that has sorting, filtering, pagination, and row selection. Use the TanStack Table integration. Show the complete component code."

**Q3 (Gotcha):** "How do I customize shadcn/ui component styles? I want to change the default border radius, font, and primary color across all components. Also, how do I override styles for a single component instance without breaking the theme?"

**Q4 (Recent Change):** "What's new in shadcn/ui in 2025-2026? Any new components, CLI changes, or Tailwind v4 compatibility updates? Show me the current way to add a component."

### Step 2: Web research:

- `"shadcn/ui" changelog updates 2025 2026`
- `"shadcn/ui" Tailwind v4 compatibility setup`
- `"shadcn/ui" CLI "npx shadcn" latest`
- `"shadcn/ui" theming CSS variables customization`
- `"shadcn/ui" data table TanStack Table`
- `"shadcn/ui" new components 2025 2026`
- WebFetch: `https://ui.shadcn.com/docs`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (CLI, install), Setup, Adding Components, Theming, Common Mistakes, Full Reference pointer.

**reference.md sections:**
1. Installation & Configuration (init, components.json, Tailwind v4)
2. CLI Reference (add, diff, init commands)
3. Theming System (CSS variables, color tokens, border-radius, fonts)
4. Component Catalog (full list with key props)
5. Radix UI Primitives (underlying accessibility, keyboard nav)
6. Complex Compositions (Data Table, Combobox, Command Palette, Sheet)
7. Form Integration (react-hook-form + zod patterns)
8. Dark Mode Integration
9. Common Mistakes
10. Recent Changes

### Steps 4-6: Same pattern

```bash
git add .claude/skills/shadcn-ui/
git commit -m "feat: add shadcn-ui reference skill"
```

---

## Task 4: nextjs

**Files:**
- Create: `.claude/skills/nextjs/SKILL.md`
- Create: `.claude/skills/nextjs/reference.md`
- Create: `.claude/skills/nextjs/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: nextjs
description: Use when working with Next.js App Router, React Server Components, server actions, layouts, metadata API, or caching. Also use when configuring Next.js middleware, optimizing images/fonts, or debugging hydration errors.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Setup/Architecture):** "Explain the Next.js 15 App Router file conventions. What are the differences between layout.tsx, template.tsx, page.tsx, loading.tsx, error.tsx, and not-found.tsx? When do I use each? Show me a real folder structure for an e-commerce site."

**Q2 (Common Operation):** "Show me how to build a form with Server Actions in Next.js 15. Include validation with zod, error handling, loading states, and optimistic updates using useOptimistic. The form should create a new product."

**Q3 (Caching):** "Explain all 4 caching layers in Next.js 15: Request Memoization, Data Cache, Full Route Cache, and Router Cache. When does each layer apply? How do I opt out of caching? Show me how to revalidate data with revalidateTag and revalidatePath."

**Q4 (Recent Change):** "What changed in Next.js 15 compared to Next.js 14? What about the latest canary/stable releases in 2025-2026? Cover async request APIs, caching defaults, turbopack, and any breaking changes."

### Step 2: Web research:

- `Next.js 15 changelog breaking changes 2025 2026`
- `Next.js 15 App Router caching revalidation`
- `Next.js 15 Server Actions useOptimistic`
- `Next.js 15 turbopack stable`
- `Next.js 15 metadata API generateMetadata`
- `Next.js 15 middleware edge runtime`
- WebFetch: `https://nextjs.org/docs` and `https://nextjs.org/blog`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (version, create-next-app), File Conventions, Server vs Client Components, Common Operations (fetch, forms), Common Mistakes.

**reference.md sections:**
1. Project Structure & File Conventions
2. Server Components vs Client Components (boundaries, 'use client', 'use server')
3. Routing (dynamic routes, groups, parallel routes, intercepting routes)
4. Layouts & Templates
5. Data Fetching (fetch, server components, streaming)
6. Server Actions & Mutations
7. Caching (4 layers, revalidation strategies)
8. Metadata API (static, dynamic, generateMetadata)
9. Image Optimization (next/image)
10. Fonts (next/font)
11. Middleware
12. Error Handling (error.tsx, global-error)
13. Recent Changes and Deprecations

### Steps 4-6: Same pattern

```bash
git add .claude/skills/nextjs/
git commit -m "feat: add nextjs reference skill (App Router)"
```

---

## Task 5: astro

**Files:**
- Create: `.claude/skills/astro/SKILL.md`
- Create: `.claude/skills/astro/reference.md`
- Create: `.claude/skills/astro/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: astro
description: Use when working with Astro for content-focused websites, islands architecture, content collections, view transitions, or hybrid SSR/SSG rendering. Also use when integrating React/Vue/Svelte components into Astro or configuring Astro DB.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Setup/Architecture):** "I'm building a blog with Astro 5. Set up content collections with type-safe schemas for blog posts (title, date, tags, draft status, cover image). Show me the collection definition, a sample post, and how to query/render them."

**Q2 (Islands):** "Explain Astro's islands architecture. How does partial hydration work? Show me a page with a static header, a React interactive carousel (client:visible), and a Vue counter (client:load). When should I use each client directive?"

**Q3 (View Transitions):** "How do View Transitions work in Astro? Show me how to add smooth page transitions to a multi-page site. Include the persistent elements pattern for a music player that keeps playing across navigations."

**Q4 (Recent Change):** "What's new in Astro 5 compared to Astro 4? Cover content layer changes, server islands, Astro DB, and any breaking changes in the upgrade."

### Step 2: Web research:

- `Astro 5 changelog release notes breaking changes`
- `Astro 5 content collections content layer`
- `Astro 5 server islands`
- `Astro view transitions persistent elements`
- `Astro DB setup SQLite`
- `Astro 5 React integration islands`
- WebFetch: `https://docs.astro.build` and `https://astro.build/blog`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (version, create astro), Content Collections, Islands (client directives), Common Mistakes.

**reference.md sections:**
1. Project Structure
2. Components (.astro template syntax, props, slots)
3. Content Collections (schema, querying, rendering)
4. Islands Architecture (client directives, partial hydration)
5. Routing (file-based, dynamic, rest params)
6. View Transitions (setup, persistent elements, lifecycle events)
7. SSR/SSG/Hybrid Rendering
8. Integrations (React, Tailwind, MDX, Sitemap)
9. Server Islands (Astro 5)
10. Astro DB
11. Astro Actions
12. Image Optimization (astro:assets)
13. Recent Changes and Deprecations

### Steps 4-6: Same pattern

```bash
git add .claude/skills/astro/
git commit -m "feat: add astro reference skill (v5)"
```

---

## Task 6: framer-motion

**Files:**
- Create: `.claude/skills/framer-motion/SKILL.md`
- Create: `.claude/skills/framer-motion/reference.md`
- Create: `.claude/skills/framer-motion/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: framer-motion
description: Use when working with Framer Motion for React animations, layout transitions, gestures, scroll-driven animations, or mount/unmount transitions with AnimatePresence. Also use when debugging spring physics, animation performance, or layout animation issues.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Setup/Basic):** "Show me how to set up Framer Motion in a Next.js 15 App Router project. Create an animated card that fades in on mount, scales on hover, and slides out on unmount. Use AnimatePresence for the exit animation."

**Q2 (Layout Animations):** "I have a grid of items. When I remove one, I want the remaining items to smoothly reflow into their new positions. Show me layout animations with layoutId. Also show a shared layout animation where clicking a card expands it into a full modal."

**Q3 (Scroll):** "Build a scroll-driven animation using Framer Motion. I want a progress bar that fills as the user scrolls, a parallax hero image, and elements that fade/slide in when they enter the viewport. Use useScroll and useTransform."

**Q4 (Recent Change):** "What's the current version of Framer Motion? Has the API changed recently — especially around the motion component, AnimatePresence, or scroll animations? Any deprecations or new features in 2025-2026?"

### Step 2: Web research:

- `"framer-motion" latest version changelog 2025 2026`
- `"framer-motion" "motion/react" import change`
- `"framer-motion" useScroll useTransform scroll animation`
- `"framer-motion" layout animation layoutId`
- `"framer-motion" AnimatePresence exit animation`
- `"framer-motion" Next.js App Router "use client"`
- `"framer-motion" spring physics configuration`
- WebFetch: `https://motion.dev/docs`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (version, install, import), Setup with Next.js, Basic Animation, Common Mistakes.

**reference.md sections:**
1. Installation & Setup (Next.js App Router, 'use client' requirement)
2. Core: motion Components (animate, initial, exit, transition)
3. Transition Types (spring, tween, inertia — config options)
4. AnimatePresence (mount/unmount, mode="wait"|"sync"|"popLayout")
5. Layout Animations (layout prop, layoutId, shared layout)
6. Gestures (whileHover, whileTap, whileDrag, drag constraints)
7. Scroll Animations (useScroll, useTransform, useMotionValueEvent)
8. Variants & Orchestration (staggerChildren, delayChildren, when)
9. Motion Values (useMotionValue, useSpring, useVelocity)
10. Performance (will-change, GPU layers, reduce motion preference)
11. Common Mistakes
12. Recent Changes

### Steps 4-6: Same pattern

```bash
git add .claude/skills/framer-motion/
git commit -m "feat: add framer-motion reference skill"
```

---

## Task 7: gsap

**Files:**
- Create: `.claude/skills/gsap/SKILL.md`
- Create: `.claude/skills/gsap/reference.md`
- Create: `.claude/skills/gsap/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: gsap
description: Use when working with GSAP for timeline-based animations, ScrollTrigger scroll effects, text splitting animations, or layout transitions with Flip plugin. Also use when integrating GSAP with React or Next.js using useGSAP hook.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (Setup/Basic):** "Set up GSAP in a Next.js 15 project. Show me how to animate elements using gsap.to(), gsap.from(), and gsap.fromTo(). How do I handle cleanup in React components? Show the useGSAP hook pattern."

**Q2 (ScrollTrigger):** "Build a scroll-triggered animation sequence: a hero section with parallax, text that reveals on scroll, sections that pin while content animates, and a horizontal scroll gallery. Use ScrollTrigger with scrub, pin, and snap."

**Q3 (Timeline):** "Create a complex multi-step animation using GSAP timelines. I want a page intro sequence: logo appears → text splits and reveals → background color morphs → CTA button bounces in. Show me timeline orchestration with labels and position parameters."

**Q4 (React Integration):** "What's the correct way to use GSAP in React/Next.js in 2025-2026? I've heard about gsap.context(), useGSAP, and cleanup patterns. What's the current best practice? Are there any gotchas with React 18+ and strict mode?"

### Step 2: Web research:

- `GSAP latest version changelog 2025 2026`
- `GSAP ScrollTrigger pin scrub snap`
- `GSAP useGSAP hook React Next.js`
- `GSAP gsap.context React cleanup`
- `GSAP SplitText plugin text animation`
- `GSAP Flip plugin layout animation`
- `GSAP licensing free vs paid plugins`
- WebFetch: `https://gsap.com/docs/v3/` and `https://gsap.com/blog`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (version, install, licensing), Setup with React/Next.js, Basic Animation, Common Mistakes.

**reference.md sections:**
1. Installation & Setup (npm, CDN, React/Next.js integration)
2. Core Methods (to, from, fromTo, set, killTweensOf)
3. Timeline Orchestration (timeline(), labels, position parameters)
4. ScrollTrigger (trigger, start, end, scrub, pin, snap, batch)
5. SplitText Plugin (chars, words, lines, revert)
6. Flip Plugin (layout transitions, getState, from)
7. React/Next.js Integration (useGSAP, gsap.context, cleanup, strict mode)
8. Easing (built-in, custom, RoughEase, SlowMo)
9. Performance (will-change, transforms, batch, lazy rendering)
10. Licensing (free core, paid plugins, pricing)
11. Common Mistakes
12. Recent Changes

### Steps 4-6: Same pattern

```bash
git add .claude/skills/gsap/
git commit -m "feat: add gsap reference skill"
```

---

## Task 8: accessibility

**Files:**
- Create: `.claude/skills/accessibility/SKILL.md`
- Create: `.claude/skills/accessibility/reference.md`
- Create: `.claude/skills/accessibility/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: accessibility
description: Use when implementing WCAG-compliant interfaces, ARIA patterns, keyboard navigation, focus management, or screen reader support. Also use when auditing component accessibility, fixing contrast issues, or building accessible forms, modals, and navigation.
---
```

### Step 1: RED baseline — 4 questions (NO skill):

**Q1 (ARIA Patterns):** "Build an accessible modal dialog using React. It should trap focus, restore focus on close, handle Escape key, and have correct ARIA roles and attributes. Show me the complete component with keyboard handling."

**Q2 (Forms):** "Make this form accessible: it has name, email, phone, a dropdown for country, and a submit button. Show me proper labels, error messaging, required field indicators, live validation announcements, and how to handle form submission errors accessibly."

**Q3 (Color & Contrast):** "What are the WCAG 2.2 color contrast requirements? What's the difference between AA and AAA? How do I test contrast for text, icons, and interactive elements? Show me how to handle focus indicators that meet the new WCAG 2.2 focus appearance criteria."

**Q4 (Testing):** "How do I test accessibility in a Next.js project? Show me automated testing with axe-core (jest-axe or vitest), manual testing checklist, and how to use screen readers for verification. What are the most commonly missed a11y issues?"

### Step 2: Web research:

- `"WCAG 2.2" new criteria 2025 2026`
- `"WCAG 2.2" focus appearance requirements`
- `ARIA APG patterns modal dialog 2025 2026`
- `"accessible forms" ARIA live regions error messaging`
- `"axe-core" vitest jest-axe testing`
- `WCAG color contrast ratio requirements AA AAA`
- WebFetch: `https://www.w3.org/WAI/ARIA/apg/patterns/`

### Step 3: Write SKILL.md + reference.md

**SKILL.md sections:** Overview, Quick Reference (WCAG levels, contrast ratios), Core Principles, Common Component Patterns, Common Mistakes.

**reference.md sections:**
1. WCAG 2.2 Overview (levels A, AA, AAA — what's required)
2. Semantic HTML (landmarks, headings, lists — foundation before ARIA)
3. ARIA Roles, States, Properties (when to use, when NOT to use)
4. Keyboard Navigation (tab order, roving tabindex, skip links)
5. Focus Management (trapping, restoration, visible indicators, WCAG 2.2 focus appearance)
6. Color & Contrast (ratios, non-text contrast, testing tools)
7. Component Patterns (modal, dropdown, tabs, accordion, combobox, toast)
8. Forms (labels, errors, required fields, live regions, validation)
9. Images & Media (alt text, decorative images, captions, audio descriptions)
10. Testing (axe-core, screen readers, manual checklist)
11. Common Mistakes

### Steps 4-6: Same pattern

```bash
git add .claude/skills/accessibility/
git commit -m "feat: add accessibility pattern skill (WCAG 2.2)"
```

---

## Task 9: frontend-dev-guide Agent

**Files:**
- Create: `.claude/agents/frontend-dev-guide.md`

**Depends on:** Tasks 1-8 (all skills must exist before the agent references them)

### Step 1: Write agent file

Model the agent on the existing `frontend-testing-guide.md` pattern. The agent needs:

**Frontmatter:**
```yaml
---
name: frontend-dev-guide
description: |
  Use this agent when the user asks about frontend development without specifying a tool,
  needs help choosing a CSS framework, component library, or animation approach, or wants
  responsive design and accessibility guidance. Also use for generic requests like "style this",
  "make it responsive", "add animation", or "fix the layout" when no specific tool is mentioned.
model: claude-sonnet-4-6
memory: user
maxTurns: 20
---
```

**Agent system prompt sections:**

1. **Tools You Cover** — list all 8 skills with one-line descriptions
2. **Your Approach:**
   - Detect existing setup (package.json, config files, installed deps)
   - Route to the right skill(s) based on detection
   - Recommendation decision matrix (table like frontend-testing-guide)
   - Read the relevant reference.md files before answering
3. **Recommendation Matrix:**

```
| Need | Recommended Skill | Why |
|------|------------------|-----|
| Utility-first CSS | tailwind-css | De facto standard, v4 with CSS-first config |
| Component library | shadcn-ui | Copy-paste, Radix primitives, Tailwind integration |
| React web apps | nextjs | App Router, RSC, server actions |
| Content/marketing sites | astro | Islands, content collections, fastest static |
| React animations | framer-motion | Best React DX, layout animations, gestures |
| Complex scroll/timeline animations | gsap | Most powerful, ScrollTrigger, works everywhere |
| Mobile/viewport responsiveness | responsive-design | Fluid type, container queries, spacing |
| WCAG compliance | accessibility | Patterns, keyboard nav, testing |
```

4. **Skill Reference Files** — paths to each skill directory
5. **Multi-Skill Loading** — note that requests often need 2+ skills (e.g., "responsive card" = shadcn-ui + responsive-design + tailwind-css)
6. **Output Format** — Direct answer, Code example, Important notes, Reference pointer

### Step 2: Commit

```bash
git add .claude/agents/frontend-dev-guide.md
git commit -m "feat: add frontend-dev-guide umbrella agent"
```

---

## Task 10: Bundle Registration

**Files:**
- Modify: `skills.json` — add `frontend-dev` bundle and 8 skill entries
- Modify: `.claude/CLAUDE.md` — add Frontend Development section to armadillo block

**Depends on:** Tasks 1-9

### Step 1: Add bundle to skills.json

Add to `bundles` object (after `database`):

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

### Step 2: Add 8 skill entries to `skills` object

Each skill entry follows this pattern:

```json
"tailwind-css": {
  "name": "Tailwind CSS",
  "description": "Tailwind v4 CSS-first configuration, utility classes, responsive design, theming",
  "files": ["skills/tailwind-css/SKILL.md", "skills/tailwind-css/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"shadcn-ui": {
  "name": "shadcn/ui",
  "description": "Copy-paste components on Radix + Tailwind — catalog, theming, CLI, form patterns",
  "files": ["skills/shadcn-ui/SKILL.md", "skills/shadcn-ui/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"nextjs": {
  "name": "Next.js",
  "description": "App Router, React Server Components, server actions, caching, metadata API",
  "files": ["skills/nextjs/SKILL.md", "skills/nextjs/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"astro": {
  "name": "Astro",
  "description": "Content collections, islands architecture, view transitions, hybrid rendering",
  "files": ["skills/astro/SKILL.md", "skills/astro/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"framer-motion": {
  "name": "Framer Motion",
  "description": "React animations — layout, gestures, scroll, AnimatePresence, spring physics",
  "files": ["skills/framer-motion/SKILL.md", "skills/framer-motion/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"gsap": {
  "name": "GSAP",
  "description": "Timeline animations, ScrollTrigger, SplitText, Flip plugin, React integration",
  "files": ["skills/gsap/SKILL.md", "skills/gsap/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"responsive-design": {
  "name": "Responsive Design",
  "description": "Fluid typography, container queries, spacing systems, viewport units, mobile-first patterns",
  "files": ["skills/responsive-design/SKILL.md", "skills/responsive-design/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
},
"accessibility": {
  "name": "Accessibility",
  "description": "WCAG 2.2, ARIA patterns, keyboard navigation, focus management, a11y testing",
  "files": ["skills/accessibility/SKILL.md", "skills/accessibility/reference.md"],
  "agents": ["agents/frontend-dev-guide.md"],
  "bundle": "frontend-dev"
}
```

### Step 3: Update CLAUDE.md armadillo block

Add between the Testing and Meta sections inside `<!-- armadillo:start -->`:

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

Also add `frontend-dev-guide` to the Sonnet tier in the Model Selection table.

### Step 4: Verify skills.json is valid JSON

```bash
node -e "JSON.parse(require('fs').readFileSync('skills.json','utf8')); console.log('valid')"
```

### Step 5: Commit

```bash
git add skills.json .claude/CLAUDE.md
git commit -m "feat: register frontend-dev bundle in skills.json and CLAUDE.md"
```

---

## Execution Notes

**Parallelization:** Tasks 1-8 can be partially parallelized. The dependency order from the design doc is:
- tailwind-css first (foundation)
- responsive-design second (uses Tailwind examples)
- shadcn-ui third (depends on Tailwind context)
- Tasks 4-8 are independent of each other

Maximum parallelism: run 4-8 concurrently after 1-3 complete sequentially.

**Estimated scope:** Each reference skill involves ~30 min of web research + writing. Total: 8 skills × ~30 min + agent + registration = significant session.

**Quality gate:** Each skill must pass the GREEN phase (skill adds correct, current, actionable information on at least 3 of 4 baseline questions) before moving to the next task.

**Test baseline files:** Keep `test-baseline.md` in each skill directory. These document the RED/GREEN/REFACTOR cycle and serve as evidence that the TDD process was followed.
