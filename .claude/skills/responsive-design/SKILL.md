---
model: claude-sonnet-4-6
name: responsive-design
description: Use when implementing responsive layouts, fluid typography, spacing systems, container queries, or mobile-first design patterns. Also use when debugging viewport issues, sizing inconsistencies, or cross-device rendering problems.
---

# Responsive Design

## Overview

Mobile-first, component-driven, fluid everything. This skill encodes opinionated patterns for Next.js/Tailwind v4 projects. The goal is zero layout bugs across screen sizes without writing a breakpoint for every edge case.

**Core principles:**
- Mobile-first: default styles = smallest viewport. Scale up with `sm:`, `md:`, `lg:`.
- Container queries for components, media queries for page layout.
- Fluid type and spacing with `clamp()` — no stepped jumps.
- `svh` for fixed/sticky elements. `dvh` for scroll containers. Never raw `vh` on mobile.

---

## Quick Reference

### Viewport Unit Decision Table

| Unit | Behavior | Use For |
|------|----------|---------|
| `vh` | Static — ignores mobile chrome | Desktop-only layouts |
| `svh` | Small viewport — chrome fully visible | Sticky headers, fixed navs, modals |
| `lvh` | Large viewport — chrome hidden | Rarely used; hero sections if content must fill |
| `dvh` | Dynamic — updates as chrome shifts | Full-height scroll containers |

**Default:** Use `svh` for any fixed element. Use `dvh` only when the layout genuinely needs to respond to chrome show/hide.

### clamp() Formula

```
clamp(MIN, PREFERRED, MAX)

where PREFERRED = {intercept}rem + {slope}vw

slope     = (maxRem - minRem) / (maxVw - minVw)
intercept = minRem - slope * minVw
```

Example — 32px mobile → 64px at 1280px viewport, base 320px:
```css
/* slope = (4 - 2) / (80 - 20) = 0.0333... → 3.33vw */
/* intercept = 2 - 0.0333 * 20 = 1.333rem */
font-size: clamp(2rem, 1.333rem + 3.33vw, 4rem);
```

---

## Core Patterns

### Fluid Type Scale (Tailwind v4)

Define once in your global CSS. All text utilities map to these values.

```css
@theme {
  --text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm:   clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl:   clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-2xl:  clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --text-3xl:  clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
  --text-4xl:  clamp(2.25rem, 1.7rem + 2.75vw, 3.5rem);
}
```

Use: `<h1 class="text-4xl font-bold">` — scales automatically. No extra breakpoints.

### Container Query Pattern (Tailwind v4 — no plugin needed)

```html
<!-- Parent: declare as container -->
<div class="@container">
  <!-- Child: use @sm:, @md:, @lg: variants -->
  <div class="flex flex-col gap-4 @md:flex-row @md:items-center">
    <img class="w-full @md:w-48 rounded-lg" />
    <div class="space-y-2">
      <h3 class="text-base @md:text-lg font-semibold">Title</h3>
      <p class="text-sm text-gray-600">Description</p>
    </div>
  </div>
</div>
```

Tailwind v4 container breakpoints: `@xs` (20rem), `@sm` (24rem), `@md` (28rem), `@lg` (32rem), `@xl` (36rem), `@2xl` (42rem), `@3xl` (48rem), `@4xl` (56rem), `@5xl` (64rem), `@6xl` (72rem), `@7xl` (80rem).

### Spacing System (@theme)

```css
@theme {
  /* Override base spacing unit (default: 0.25rem = 4px) */
  --spacing: 0.25rem;

  /* Add named semantic tokens */
  --spacing-section: clamp(3rem, 5vw, 6rem);
  --spacing-card:    clamp(1rem, 2vw, 1.5rem);
  --spacing-gutter:  clamp(1rem, 4vw, 2rem);
}
```

Use: `py-[--spacing-section]`, `p-[--spacing-card]`. Standard numeric tokens (`p-4`, `mt-8`) auto-derive from `--spacing`.

---

## Container Queries

### Media Query vs Container Query

| Scenario | Use |
|----------|-----|
| Page-level layout shift (sidebar collapses) | Media query |
| OS preference (dark mode, reduced motion) | Media query |
| Component inside sidebar vs main content | Container query |
| Card grid item — same card, different contexts | Container query |
| `srcset`/`sizes` on `<img>` | Must be media query (CSS not available) |

### Named Containers

```html
<aside class="@container/sidebar w-64">
  <nav class="@md/sidebar:flex-col">...</nav>
</aside>
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `100vh` for full-screen mobile layout | Use `100svh` for fixed, `100dvh` for scroll |
| `px` values in `clamp()` min/max | Always use `rem` — px ignores user font size preferences |
| Installing `@tailwindcss/container-queries` in v4 | It's built-in since v4. Remove the plugin. |
| `tailwind.config.js` for spacing/fonts in v4 | Use `@theme` in your CSS file |
| Container queries without `container-type` | Parent needs `@container` class (which sets `container-type: inline-size`) |
| Breakpoints at `320px`, `768px`, `1024px` | Use Tailwind defaults: `sm=640`, `md=768`, `lg=1024`, `xl=1280`, `2xl=1536` |
| Bottom nav clipped on iPhone | Add `pb-[env(safe-area-inset-bottom)]` and `viewport-fit=cover` to meta tag |
| Touch targets smaller than 48px | `min-h-12 min-w-12` on all interactive elements |

---

## Read More

Full patterns, formulas, grid templates, responsive image setup, and touch/mobile patterns are in `reference.md`.
