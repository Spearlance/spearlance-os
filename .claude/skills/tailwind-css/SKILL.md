---
model: claude-sonnet-4-6
name: tailwind-css
description: Use when working with Tailwind CSS for utility-first styling, responsive design, theming, or dark mode. Also use when migrating from Tailwind v3 to v4, configuring @theme directives, or troubleshooting class specificity issues.
---

# Tailwind CSS v4

CSS-first utility framework. Config lives in CSS via `@theme`. No `tailwind.config.js` needed. Oxide engine: 3.78x faster full builds, 182x faster incremental.

**Requires:** Safari 16.4+, Chrome 111+, Firefox 128+.

## Quick Reference

| Item | v4 |
|---|---|
| CSS import | `@import "tailwindcss"` |
| PostCSS plugin | `@tailwindcss/postcss` in `postcss.config.mjs` |
| Vite plugin | `@tailwindcss/vite` |
| Theme config | `@theme { --color-*: value; }` |
| Custom utility | `@utility name { css }` |
| Custom variant | `@custom-variant name (selector)` |
| Migration tool | `npx @tailwindcss/upgrade` (Node 20+) |
| Container query | `@container` parent + `@md:flex-row` child |
| Dark mode default | `prefers-color-scheme` media query |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Setup

**Next.js 15:** `npm install tailwindcss @tailwindcss/postcss postcss`
```js
// postcss.config.mjs — no postcss-import or autoprefixer needed
export default { plugins: { "@tailwindcss/postcss": {} } };
```
```css
/* app/globals.css */
@import "tailwindcss";
```

**Astro / Vite:** `npm install tailwindcss @tailwindcss/vite`
```js
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ vite: { plugins: [tailwindcss()] } });
```
Then `@import "tailwindcss"` in your global CSS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## @theme — CSS-First Config

```css
@import "tailwindcss";
@theme {
  --color-brand: oklch(0.72 0.11 221.19); /* → bg-brand, text-brand */
  --spacing-18: 4.5rem;                   /* → p-18, m-18, w-18 */
  --font-display: "Satoshi", sans-serif;  /* → font-display */
  --breakpoint-3xl: 120rem;               /* → 3xl:* variants */
  --animate-fade-in: fade-in 0.3s ease-out;
  @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
}
```

| `@theme` namespace | Generated utilities |
|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*` |
| `--spacing-*` | `p-*`, `m-*`, `w-*`, `h-*`, `gap-*` |
| `--font-*` / `--text-*` | `font-*` family / `text-*` size |
| `--breakpoint-*` / `--container-*` | `md:*` / `@md:*` |
| `--radius-*` / `--shadow-*` | `rounded-*` / `shadow-*` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Operations

**Container queries:**
```tsx
<div className="@container">
  <div className="flex flex-col gap-4 @md:flex-row">...</div>
</div>
```

**Selector dark mode (next-themes):**
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```
```tsx
<div className="bg-white dark:bg-gray-900">
```

**Custom utility:**
```css
@utility scrollbar-hidden {
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Migration from v3

`npx @tailwindcss/upgrade` automates most changes (Node 20+).

Critical manual fixes:

| v3 | v4 |
|---|---|
| `shadow` / `shadow-sm` | `shadow-sm` / `shadow-xs` |
| `rounded` / `rounded-sm` | `rounded-sm` / `rounded-xs` |
| `blur` / `blur-sm` | `blur-sm` / `blur-xs` |
| `ring` (was 3px) | `ring-3` (default now 1px) |
| `border` (was gray-200) | `border border-gray-200` |
| `outline-none` | `outline-hidden` |
| `flex-shrink-*` / `flex-grow-*` | `shrink-*` / `grow-*` |
| `bg-opacity-50` | `bg-black/50` |
| `!flex` prefix | `flex!` suffix |
| `bg-[--var]` | `bg-(--var)` |
| `first:*:pt-0` | `*:first:pt-0` |
| `@layer utilities {}` | `@utility {}` |
| `addVariant()` in JS | `@custom-variant` in CSS |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---|---|
| `@tailwind base/utilities` | `@import "tailwindcss"` |
| `tailwindcss` PostCSS plugin | `@tailwindcss/postcss` |
| Sass/Less/Stylus | Not compatible — remove preprocessor |
| `@astrojs/tailwind` in Astro | Use `@tailwindcss/vite` |
| `resolveConfig()` in JS | `getComputedStyle(document.documentElement)` |

## Full Reference

See `reference.md` for: framework setup, all 17 `@theme` namespaces, every breaking change with before/after code, breakpoints, all container query sizes, 4 dark mode strategies, plugins, `@reference`/`@source`/`@apply`, new v4 utilities (3D transforms, gradients, `starting:`, `not-*`, `nth-*`, text-shadow).
