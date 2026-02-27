# Tailwind CSS v4 — Reference

> **Last Verified:** February 2026
> **Version:** Tailwind CSS v4.x (released January 22, 2025)
> **Requires:** Node.js 20+, Safari 16.4+, Chrome 111+, Firefox 128+

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Installation & Configuration

### Next.js 15

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

```css
/* app/globals.css */
@import "tailwindcss";
```

No `tailwind.config.js` required. No `content` array. Files discovered automatically.

---

### Astro 5+

```bash
npm install tailwindcss @tailwindcss/vite
```

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

```css
/* src/styles/global.css */
@import "tailwindcss";
```

```astro
---
// src/layouts/Layout.astro
import "../styles/global.css";
---
```

Note: `@astrojs/tailwind` integration is deprecated for v4. Use the Vite plugin.

---

### Vite (React, Vue, Svelte, vanilla)

```bash
npm install tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

```css
/* src/index.css */
@import "tailwindcss";
```

---

### Content Detection

Tailwind v4 scans all files automatically. It respects `.gitignore`. No `content` configuration needed for standard projects.

To explicitly add source directories (e.g. node_modules UI library):

```css
@import "tailwindcss";
@source "../node_modules/@my-company/ui-lib/src";
```

To ignore a directory:

```css
@source not "../src/generated";
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. CSS-First Configuration

### @theme — Design Tokens

`@theme` defines tokens that generate utility classes. Every variable inside `@theme` becomes:
1. A CSS custom property on `:root`
2. One or more utility classes

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-brand: oklch(0.72 0.11 221.19);
  --color-brand-dark: oklch(0.55 0.14 221.19);
  --color-surface: #f8f9fa;

  /* Custom font family */
  --font-display: "Satoshi", "sans-serif";
  --font-mono: "JetBrains Mono", monospace;

  /* Custom font sizes */
  --text-display: 4.5rem;
  --text-display--line-height: 1.1;

  /* Spacing additions */
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;

  /* Custom breakpoints */
  --breakpoint-xs: 30rem;
  --breakpoint-3xl: 120rem;

  /* Border radius */
  --radius-2xl: 1.25rem;

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.4s cubic-bezier(0.3, 0, 0, 1);

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

### @theme Namespace → Utility Mapping

| Namespace | Utilities Generated | Example |
|---|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, `decoration-*`, `outline-*`, `accent-*`, `caret-*`, `shadow-*` | `bg-brand`, `text-brand-dark` |
| `--font-*` | `font-*` (font-family) | `font-display` |
| `--text-*` | `text-*` (font-size) | `text-display` |
| `--font-weight-*` | `font-*` (weight) | `font-bold` |
| `--tracking-*` | `tracking-*` | `tracking-wide` |
| `--leading-*` | `leading-*` | `leading-tight` |
| `--breakpoint-*` | `sm:`, `md:`, `lg:`, etc. | `3xl:grid-cols-4` |
| `--container-*` | `@sm:`, `@md:`, etc. | `@lg:flex-row` |
| `--spacing-*` or `--spacing` | `p-*`, `m-*`, `w-*`, `h-*`, `gap-*`, `inset-*`, `space-*`, `size-*` | `p-18`, `mt-128` |
| `--radius-*` | `rounded-*` | `rounded-2xl` |
| `--shadow-*` | `shadow-*` | `shadow-brand` |
| `--inset-shadow-*` | `inset-shadow-*` | `inset-shadow-sm` |
| `--drop-shadow-*` | `drop-shadow-*` | `drop-shadow-md` |
| `--blur-*` | `blur-*` | `blur-md` |
| `--animate-*` | `animate-*` | `animate-fade-in` |
| `--ease-*` | `ease-*` | `ease-fluid` |
| `--aspect-*` | `aspect-*` | `aspect-golden` |
| `--perspective-*` | `perspective-*` | `perspective-distant` |

### Resetting Namespaces

To replace all default colors with custom ones:

```css
@theme {
  --color-*: initial;         /* Clear all Tailwind defaults */
  --color-white: #ffffff;
  --color-black: #000000;
  --color-brand: oklch(0.72 0.11 221.19);
}
```

To clear everything and start fresh:

```css
@theme {
  --*: initial;
  /* Only your tokens from here */
  --color-primary: #3f3cbb;
  --font-body: Inter, sans-serif;
}
```

### @theme inline

Use when your theme variable references another CSS variable:

```css
@theme inline {
  /* References --font-inter from a Google Fonts import */
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}
```

Without `inline`, `font-sans` generates `font-family: var(--font-sans)` pointing to the Tailwind variable. With `inline`, it generates `font-family: var(--font-inter)` directly.

### @theme static

Forces all variables to appear in output CSS even if unused:

```css
@theme static {
  --color-primary: var(--color-blue-500);
  --color-secondary: var(--color-purple-500);
}
```

### Legacy JS Config (still supported)

If you need `tailwind.config.js` (e.g. for plugin compatibility):

```css
@import "tailwindcss";
@config "../../tailwind.config.js";
```

`resolveConfig()` is removed in v4. Use CSS variables directly:

```js
// v3
import resolveConfig from "tailwindcss/resolveConfig";
const config = resolveConfig(tailwindConfig);
const primary = config.theme.colors.primary;

// v4
const styles = getComputedStyle(document.documentElement);
const primary = styles.getPropertyValue("--color-primary");
```

### @variant — Apply Variants in CSS

Apply Tailwind variants within custom CSS:

```css
.card {
  background: white;

  @variant dark {
    background: var(--color-gray-900);
  }

  @variant hover {
    @variant dark {
      background: var(--color-gray-800);
    }
  }
}
```

### @custom-variant — Create Custom Variants

```css
/* Selector-based (element or ancestor) */
@custom-variant theme-ocean (&:where([data-theme="ocean"] *));

/* With nested media query */
@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}
```

Usage:
```tsx
<div data-theme="ocean">
  <button className="theme-ocean:bg-blue-600 any-hover:hover:underline">
    Click
  </button>
</div>
```

### @utility — Custom Utilities

```css
/* Simple utility */
@utility content-auto {
  content-visibility: auto;
}

/* Utility with pseudo-element */
@utility scrollbar-hidden {
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
}

/* Functional utility (matches theme values) */
@theme {
  --tab-size-2: 2;
  --tab-size-4: 4;
}

@utility tab-* {
  tab-size: --value(--tab-size-*);
}

/* Functional utility (bare integer) */
@utility columns-* {
  columns: --value(integer);
}

/* Functional utility (arbitrary value) */
@utility opacity-* {
  opacity: --value([percentage]);
  opacity: calc(--value(integer) * 1%);
  opacity: --value(--opacity-*);
}
```

Usage:
```tsx
<div className="content-auto lg:content-auto hover:scrollbar-hidden tab-4 columns-3 opacity-75">
```

### @plugin — Legacy Plugins

JavaScript plugins from v3 still work:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```

### @reference — Component Styles Without Duplication

For Vue, Svelte, CSS Modules, or any component with scoped `<style>`:

```vue
<style scoped>
  @reference "../../app.css";

  h1 {
    @apply text-2xl font-bold text-brand;
  }
</style>
```

Or reference Tailwind defaults without a project CSS file:

```css
@reference "tailwindcss";

.title {
  @apply text-3xl font-semibold;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Migration from v3

### Automated Migration Tool

```bash
npx @tailwindcss/upgrade
```

Requires Node.js 20+. Run on a new branch. The tool:
- Updates dependencies
- Converts `tailwind.config.js` theme to `@theme` in CSS
- Renames deprecated utility classes
- Converts `@tailwind` directives to `@import`
- Handles PostCSS config

### Breaking Change: CSS Import

```css
/* v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* v4 */
@import "tailwindcss";
```

### Breaking Change: PostCSS Plugin

```js
// v3 — postcss.config.js
module.exports = {
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};

// v4 — postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

`postcss-import` and `autoprefixer` are no longer needed — built into `@tailwindcss/postcss`.

### Breaking Change: Removed Deprecated Utilities

These utilities were deprecated in v3 and removed in v4:

| Removed (v3) | Replacement (v4) |
|---|---|
| `bg-opacity-*` | `bg-black/50` (slash opacity) |
| `text-opacity-*` | `text-black/50` |
| `border-opacity-*` | `border-black/50` |
| `divide-opacity-*` | `divide-black/50` |
| `ring-opacity-*` | `ring-black/50` |
| `placeholder-opacity-*` | `placeholder-black/50` |
| `flex-shrink-*` | `shrink-*` |
| `flex-grow-*` | `grow-*` |
| `overflow-ellipsis` | `text-ellipsis` |
| `decoration-slice` | `box-decoration-slice` |
| `decoration-clone` | `box-decoration-clone` |

### Breaking Change: Renamed Scale Utilities

Tailwind v4 shifted the scale down by one step, adding `xs` at the bottom:

| v3 | v4 |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` (bare) | `shadow-sm` |
| `drop-shadow-sm` | `drop-shadow-xs` |
| `drop-shadow` (bare) | `drop-shadow-sm` |
| `blur-sm` | `blur-xs` |
| `blur` (bare) | `blur-sm` |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `backdrop-blur` (bare) | `backdrop-blur-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` (bare) | `rounded-sm` |

### Breaking Change: Outline Utilities

```html
<!-- v3 -->
<input class="outline outline-2" />
<input class="focus:outline-none" />

<!-- v4 -->
<input class="outline-2" />
<input class="focus:outline-hidden" />
```

`outline-none` is removed. `outline-hidden` sets `outline: 2px solid transparent` (preserves accessibility).

### Breaking Change: Ring Width Default

```html
<!-- v3: ring = 3px blue -->
<input class="ring ring-blue-500" />

<!-- v4: ring = 1px currentColor — be explicit -->
<input class="ring-3 ring-blue-500" />
```

### Breaking Change: Border and Ring Default Colors

```css
/* v3 defaults */
border-*: gray-200
ring: blue-500

/* v4 defaults */
border-*: currentColor
ring: currentColor
```

Fix by being explicit:

```html
<div class="border border-gray-200">
<button class="focus:ring-3 focus:ring-blue-500">
```

Or restore v3 behavior globally:

```css
@layer base {
  *, ::after, ::before {
    border-color: var(--color-gray-200, currentColor);
  }
}

@theme {
  --default-ring-width: 3px;
  --default-ring-color: var(--color-blue-500);
}
```

### Breaking Change: Important Modifier Position

```html
<!-- v3: prefix -->
<div class="!flex !bg-red-500 hover:!text-white">

<!-- v4: suffix -->
<div class="flex! bg-red-500! hover:text-white!">
```

### Breaking Change: Stacked Variant Order

```html
<!-- v3: direct child first -->
<ul class="first:*:pt-0 last:*:pb-0">

<!-- v4: variant first -->
<ul class="*:first:pt-0 *:last:pb-0">
```

### Breaking Change: CSS Variable Arbitrary Syntax

```html
<!-- v3 -->
<div class="bg-[--brand-color] text-[--text-color]">

<!-- v4: use parentheses -->
<div class="bg-(--brand-color) text-(--text-color)">
```

### Breaking Change: Custom Utilities API

```css
/* v3 */
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}

/* v4 */
@utility tab-4 {
  tab-size: 4;
}
```

### Breaking Change: space-* and divide-* Selectors

v4 changed the selector from `:not([hidden]) ~ :not([hidden])` to `:not(:last-child)`. This affects flex/grid ordering and RTL layouts.

**Recommendation:** Replace `space-*` and `divide-*` with `flex`/`grid` + `gap`:

```html
<!-- Old -->
<div class="space-y-4">

<!-- New (preferred) -->
<div class="flex flex-col gap-4">
```

### Breaking Change: Preprocessors Not Supported

Tailwind v4 is incompatible with Sass, Less, and Stylus. Tailwind is now its own preprocessor. Remove preprocessor setup entirely.

### Breaking Change: Placeholder and Button Preflight

- **Placeholder color:** Was `gray-400`, now `currentColor` at 50% opacity
- **Button cursor:** Was `cursor: pointer`, now `cursor: default` (browser default)
- **Dialog margins:** Default `margin: auto` removed from `<dialog>`

### Breaking Change: Prefix Syntax

```html
<!-- v3 -->
<div class="tw-flex tw-bg-red-500">

<!-- v4 -->
<div class="tw:flex tw:bg-red-500 tw:hover:bg-red-600">
```

```css
/* v4 prefix configuration */
@import "tailwindcss" prefix(tw);
```

### Breaking Change: theme() CSS Function Syntax

```css
/* v3 */
@media (width >= theme(screens.xl)) { }
.foo { color: theme(colors.blue.500); }

/* v4 */
@media (width >= theme(--breakpoint-xl)) { }
.foo { color: theme(--color-blue-500); }

/* v4 preferred: use CSS variables directly */
@media (width >= var(--breakpoint-xl)) { }
.foo { color: var(--color-blue-500); }
```

### Summary Migration Checklist

- [ ] Run `npx @tailwindcss/upgrade` (Node.js 20+)
- [ ] Replace `@tailwind` directives with `@import "tailwindcss"`
- [ ] Replace `tailwindcss` PostCSS plugin with `@tailwindcss/postcss`
- [ ] Remove `postcss-import` and `autoprefixer`
- [ ] Move theme config from `tailwind.config.js` to `@theme {}` in CSS
- [ ] Rename shadow/blur/rounded/drop-shadow utilities (scale shift)
- [ ] Replace `outline-none` with `outline-hidden`
- [ ] Add explicit colors to `border-*` and `ring-*` calls
- [ ] Switch `!important` from prefix (`!flex`) to suffix (`flex!`)
- [ ] Update stacked variant order (`first:*:` → `*:first:`)
- [ ] Replace `bg-[--var]` with `bg-(--var)`
- [ ] Replace `@layer utilities {}` with `@utility {}`
- [ ] Remove Sass/Less/Stylus preprocessors
- [ ] Replace `space-*` / `divide-*` with `gap` in flex/grid
- [ ] Test in Safari 16.4+, Chrome 111+, Firefox 128+

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Utility Reference

### Spacing

v4 uses a single `--spacing` variable as the base unit (default: `0.25rem`).

```css
/* Override the base spacing unit */
@theme {
  --spacing: 0.3rem;  /* all spacing derived from this */
}

/* Add specific sizes */
@theme {
  --spacing-18: 4.5rem;
  --spacing-128: 32rem;
}
```

Standard scale: `0`, `px`, `0.5`, `1`–`96` in steps, `auto`, and all sizing utilities (`w-*`, `h-*`, `p-*`, `m-*`, `gap-*`, `inset-*`, `space-*`) accept the same tokens.

### Typography

```tsx
<p className="text-sm font-medium leading-5 tracking-wide text-gray-700">
<h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900">
<code className="font-mono text-xs">
```

Font size scale: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`–`text-9xl`.

Font weight: `font-thin` (100), `font-extralight` (200), `font-light` (300), `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800), `font-black` (900).

### Colors

Default palette: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

Scale: `50`, `100`–`900`, `950`.

v4 uses OKLCH color space for the default palette — more vivid colors on wide-gamut displays.

Opacity modifier: `bg-blue-500/50`, `text-white/80`, `border-gray-200/40`.

### Layout

```tsx
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-6">
<div className="grid grid-cols-[1fr_2fr_1fr] gap-4">
<div className="absolute inset-0 flex items-center justify-center">
```

### Flexbox

```tsx
<div className="flex flex-row flex-wrap items-start justify-end gap-2">
<div className="flex flex-col items-stretch gap-4">
<div className="flex-1 min-w-0">         {/* flex-grow, allow shrinking */}
<div className="shrink-0">               {/* no flex shrink */}
```

### Grid

```tsx
<div className="grid grid-cols-12 gap-4">
<div className="col-span-8 col-start-3">
<div className="grid grid-rows-[auto_1fr_auto] min-h-screen">

{/* Dynamic columns — no config needed */}
<div className="grid grid-cols-4">       {/* any integer */}
<div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Responsive Design

### Default Breakpoints

| Variant | Min Width | CSS |
|---|---|---|
| `sm:` | 40rem (640px) | `@media (width >= 40rem)` |
| `md:` | 48rem (768px) | `@media (width >= 48rem)` |
| `lg:` | 64rem (1024px) | `@media (width >= 64rem)` |
| `xl:` | 80rem (1280px) | `@media (width >= 80rem)` |
| `2xl:` | 96rem (1536px) | `@media (width >= 96rem)` |

Mobile-first: unprefixed classes apply at all sizes, prefixed apply at that breakpoint and above.

### Max-Width Variants

```html
<div class="block max-md:hidden">   <!-- hidden below md -->
<div class="hidden max-md:block">   <!-- visible only below md -->
<div class="md:max-lg:flex">        <!-- only between md and lg -->
```

### Arbitrary Breakpoints

```html
<div class="min-[320px]:text-center max-[600px]:bg-sky-300">
```

### Custom Breakpoints

```css
@theme {
  --breakpoint-xs: 30rem;
  --breakpoint-3xl: 120rem;
}

/* Remove a breakpoint */
@theme {
  --breakpoint-2xl: initial;
}

/* Replace all breakpoints */
@theme {
  --breakpoint-*: initial;
  --breakpoint-tablet: 48rem;
  --breakpoint-desktop: 80rem;
}
```

### Container Queries

Container queries style elements based on their parent container's size — not the viewport. Built into v4 core, no plugin needed.

```tsx
{/* Parent must have @container */}
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    <div className="@md:flex-row flex-col">...</div>
  </div>
</div>
```

### Container Query Sizes

| Variant | Min Width |
|---|---|
| `@3xs:` | 16rem (256px) |
| `@2xs:` | 18rem (288px) |
| `@xs:` | 20rem (320px) |
| `@sm:` | 24rem (384px) |
| `@md:` | 28rem (448px) |
| `@lg:` | 32rem (512px) |
| `@xl:` | 36rem (576px) |
| `@2xl:` | 42rem (672px) |
| `@3xl:` | 48rem (768px) |
| `@4xl:` | 56rem (896px) |
| `@5xl:` | 64rem (1024px) |
| `@6xl:` | 72rem (1152px) |
| `@7xl:` | 80rem (1280px) |

### Max-Width Container Queries

```html
<div class="@container">
  <div class="flex-row @max-md:flex-col">...</div>
</div>
```

### Named Containers

```html
<div class="@container/sidebar">
  <nav class="@lg/sidebar:flex-col">...</nav>
</div>
```

### Container Query Units

```html
<div class="@container">
  <div class="w-[50cqw]">   <!-- 50% of container width -->
  <div class="h-[30cqh]">   <!-- 30% of container height -->
</div>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Dark Mode

### Strategy 1: Media Query (Default)

No configuration needed. Uses `prefers-color-scheme`:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### Strategy 2: Selector (Class-based)

Override the `dark` variant with `@custom-variant`:

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<html class="dark">
  <div class="bg-white dark:bg-gray-900">...</div>
</html>
```

Toggle in JavaScript:

```ts
document.documentElement.classList.toggle("dark");
```

### Strategy 3: Data Attribute

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```html
<html data-theme="dark">
```

### Strategy 4: System + localStorage (Three-way Toggle)

```ts
// On load — add to <head> to prevent FOUC
const saved = localStorage.theme;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (saved === "dark" || (!saved && prefersDark)) {
  document.documentElement.classList.add("dark");
}

// Toggle functions
const setLight = () => { localStorage.theme = "light"; document.documentElement.classList.remove("dark"); };
const setDark  = () => { localStorage.theme = "dark";  document.documentElement.classList.add("dark"); };
const setSystem = () => { localStorage.removeItem("theme"); /* re-run load logic */ };
```

### Dark Mode with @theme Variables

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-bg: #ffffff;
  --color-fg: #111111;
}

@theme dark {
  --color-bg: #111111;
  --color-fg: #ffffff;
}
```

```tsx
<div className="bg-[--color-bg] text-[--color-fg]">
```

### next-themes Integration (Next.js)

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Custom Theming — Design Tokens

### Complete Design System Example

```css
@import "tailwindcss";

@theme {
  /* Color palette */
  --color-primary-50:  oklch(0.97 0.02 250);
  --color-primary-100: oklch(0.93 0.05 250);
  --color-primary-200: oklch(0.86 0.09 250);
  --color-primary-300: oklch(0.77 0.13 250);
  --color-primary-400: oklch(0.67 0.17 250);
  --color-primary-500: oklch(0.56 0.22 250);
  --color-primary-600: oklch(0.47 0.20 250);
  --color-primary-700: oklch(0.38 0.17 250);
  --color-primary-800: oklch(0.30 0.13 250);
  --color-primary-900: oklch(0.22 0.09 250);

  --color-surface:     #f8f9fa;
  --color-on-surface:  #1a1a2e;
  --color-muted:       #6b7280;

  /* Typography */
  --font-sans:    "Inter", system-ui, sans-serif;
  --font-display: "Cal Sans", "Inter", sans-serif;
  --font-mono:    "JetBrains Mono", monospace;

  /* Spacing */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
  --spacing-88: 22rem;

  /* Border radius */
  --radius-4xl: 2rem;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
  --shadow-elevated: 0 10px 40px rgba(0,0,0,.12);

  /* Animations */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --animate-enter: enter 0.2s ease-out;

  @keyframes enter {
    from { opacity: 0; transform: scale(0.95) translateY(4px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
}
```

### Sharing Theme Across Projects

```css
/* packages/design-system/theme.css */
@theme {
  --color-brand: oklch(0.72 0.11 221.19);
  --font-display: "Satoshi", sans-serif;
}
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "../packages/design-system/theme.css";
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. Plugins and Extensions

### First-Party v4 Plugins

| Plugin | Install | CSS |
|---|---|---|
| Typography | `@tailwindcss/typography` | `@plugin "@tailwindcss/typography"` |
| Forms | `@tailwindcss/forms` | `@plugin "@tailwindcss/forms"` |
| Aspect Ratio | built-in v4 | — |
| Container Queries | built-in v4 | — |
| Line Clamp | built-in v4 | — |

### Typography Plugin

```bash
npm install @tailwindcss/typography
```

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

```tsx
<article className="prose prose-lg prose-gray dark:prose-invert max-w-none">
  <h1>Title</h1>
  <p>Content...</p>
</article>
```

### Forms Plugin

```bash
npm install @tailwindcss/forms
```

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
```

### Writing Custom Plugins

v4 plugins are JavaScript functions returning CSS as a string or object. For most use cases, use `@utility` and `@custom-variant` in CSS instead.

```js
// my-plugin.js (legacy format still works via @plugin)
export default function myPlugin({ addUtilities, theme }) {
  addUtilities({
    ".no-scrollbar": {
      "-ms-overflow-style": "none",
      "scrollbar-width": "none",
      "&::-webkit-scrollbar": { display: "none" },
    },
  });
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. New v4-Only Utilities

### 3D Transforms

```tsx
<div className="perspective-distant transform-3d">
  <div className="rotate-x-45 rotate-y-12 translate-z-8">
    3D card
  </div>
</div>
```

New utilities: `perspective-*`, `rotate-x-*`, `rotate-y-*`, `rotate-z-*`, `scale-z-*`, `translate-z-*`, `transform-3d`, `backface-hidden`.

### Expanded Gradient APIs

```tsx
{/* Angle-based linear gradient */}
<div className="bg-linear-45 from-indigo-500 to-pink-500">

{/* Color space interpolation */}
<div className="bg-linear-to-r/oklch from-blue-500 to-teal-400">
<div className="bg-linear-to-r/srgb from-indigo-500 to-pink-500">

{/* Conic gradient */}
<div className="bg-conic from-red-500 via-yellow-500 to-red-500">

{/* Radial gradient with position */}
<div className="bg-radial-[at_50%_30%] from-white to-gray-900">
```

### @starting-style (Enter/Exit Transitions)

No JavaScript needed for appear/disappear transitions:

```tsx
<dialog className="
  opacity-0 scale-95
  open:opacity-100 open:scale-100
  transition-all duration-200
  starting:open:opacity-0 starting:open:scale-95
">
```

### New Variants

| Variant | When it applies |
|---|---|
| `not-*` | Does NOT match condition |
| `inert` | Element has `inert` attribute |
| `nth-*` | nth-child patterns |
| `in-*` | Ancestor has class (like group-*, no group class needed) |
| `starting:` | `@starting-style` — entry transitions |
| `:popover-open` | Popover is visible |
| `any-pointer-*` | Input device capability |
| `any-hover-*` | Hover capability |

```tsx
<li className="not-last:border-b border-gray-200">     {/* all except last */}
<span className="nth-2:bg-gray-100">                   {/* every 2nd */}
<div className="in-[.dark-section]:text-white">         {/* inside .dark-section */}
```

### New Utility Classes

```tsx
<p className="text-shadow-sm text-white">           {/* text shadow */}
<div className="inset-shadow-sm shadow-inner">      {/* inset box shadow */}
<div className="inset-ring-2 inset-ring-blue-500"> {/* inset ring */}
<input className="field-sizing-content">            {/* auto-resize input */}
<div className="color-scheme-dark">                 {/* OS color scheme hint */}
<p className="font-stretch-condensed">              {/* font-stretch */}
<div className="mask-radial-[closest-side]">        {/* CSS mask utilities */}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Common Mistakes

| Mistake | Fix |
|---|---|
| `@tailwind base/utilities/components` | Use `@import "tailwindcss"` |
| `tailwindcss` PostCSS plugin | Use `@tailwindcss/postcss` |
| `postcss-import` still included | Remove it — built into `@tailwindcss/postcss` |
| Sass/Less/Stylus preprocessor | Remove — incompatible with v4 |
| `outline-none` | Use `outline-hidden` |
| `ring` (bare) expecting 3px | Use `ring-3` for 3px |
| `border` (bare) expecting gray | Add `border-gray-200` explicitly |
| `bg-opacity-50` | Use `bg-black/50` slash opacity |
| `flex-shrink-0` | Use `shrink-0` |
| `flex-grow` | Use `grow` |
| `!flex` important prefix | Use `flex!` suffix |
| `bg-[--var]` CSS variable | Use `bg-(--var)` |
| `first:*:pt-0` stacking | Use `*:first:pt-0` |
| `space-y-4` in complex layouts | Use `flex flex-col gap-4` |
| `resolveConfig()` in JS | Use `getComputedStyle` on CSS variables |
| `theme(colors.blue.500)` in CSS | Use `theme(--color-blue-500)` or `var(--color-blue-500)` |
| `@astrojs/tailwind` in Astro | Use `@tailwindcss/vite` plugin |
| `@layer utilities {}` for custom classes | Use `@utility {}` |
| Defining variants in JS plugins | Use `@custom-variant` in CSS |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. Recent Changes and Deprecations

### v4.0 (January 22, 2025) — Major Release

**Architecture:**
- New Oxide engine (Rust) — 3.78x faster full builds, 182x faster incremental builds
- CSS-first configuration — `@theme` replaces `tailwind.config.js`
- `@tailwindcss/postcss` and `@tailwindcss/vite` replace `tailwindcss` PostCSS plugin
- Modern CSS features: cascade layers, `@property`, `color-mix()`, logical properties

**New features:**
- Container queries built-in (no plugin)
- `@starting-style` support (`starting:` variant)
- 3D transform utilities (`rotate-x-*`, `perspective-*`, etc.)
- Expanded gradient API (conic, radial, angle-based, color space interpolation)
- `not-*`, `inert`, `nth-*`, `in-*` variants
- `text-shadow-*`, `inset-shadow-*`, `inset-ring-*` utilities
- `mask-*` utilities
- `field-sizing`, `color-scheme`, `font-stretch` utilities
- OKLCH color palette (wider gamut, more vivid)
- Dynamic utility values without config (e.g. `grid-cols-15`)
- `@utility` directive for custom utilities
- `@custom-variant` directive for custom variants
- `@source` directive for explicit file scanning

**Removed/renamed:**
- All deprecated v3 utilities removed (`bg-opacity-*`, `flex-shrink-*`, etc.)
- Shadow/blur/rounded scale shifted (`shadow` → `shadow-sm`, `shadow-sm` → `shadow-xs`, etc.)
- `outline-none` → `outline-hidden`
- Ring default changed: 3px → 1px
- Border default changed: `gray-200` → `currentColor`
- `resolveConfig()` removed — use CSS variables
- Preprocessors (Sass, Less, Stylus) no longer compatible

**Browser requirement:** Safari 16.4+, Chrome 111+, Firefox 128+

### Post-v4.0 Updates (as of February 2026)

- `@theme dark {}` syntax for dark-mode-specific theme variables
- `@theme static` modifier for forcing variable output
- `@source not` for excluding directories
- Continued improvements to Vite plugin performance
- Expanded `@utility` functional utilities with `--value()` syntax
