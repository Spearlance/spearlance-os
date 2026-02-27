# Responsive Design Reference

> **Last Verified:** February 2026
> Target stack: Next.js + Tailwind CSS v4

---

## 1. Mobile-First Strategy

### Core Rule

Default styles = smallest viewport. Override upward with breakpoint prefixes. Never write desktop-first overrides.

```html
<!-- Correct: mobile default, scale up -->
<div class="flex flex-col gap-4 md:flex-row md:gap-8">

<!-- Wrong: desktop default, override down -->
<div class="flex flex-row gap-8 max-md:flex-col max-md:gap-4">
```

The second pattern works but fights Tailwind's design intent and produces more CSS.

### Tailwind v4 Default Breakpoints

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile baseline |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Wide screens |

### Overriding Breakpoints in v4

```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 480px;   /* override sm */
  --breakpoint-3xl: 1920px; /* add new breakpoint */
}
```

### Content-Driven Breakpoints

Use standard Tailwind breakpoints for most decisions. Add custom breakpoints only when the content genuinely breaks at a non-standard width — not because a designer spec says "at 900px". Arbitrary breakpoints create maintenance debt.

---

## 2. Fluid Typography

### Why Fluid

Stepped typography (`text-base` on mobile, `md:text-lg` on desktop) produces a jarring size jump at the breakpoint. Fluid type scales smoothly across the entire range.

### The clamp() Formula

```
clamp(MIN, PREFERRED, MAX)
```

The `PREFERRED` value must be a linear function that hits `MIN` at `minViewport` and `MAX` at `maxViewport`:

```
slope     = (maxRem - minRem) / (maxVw - minVw)
intercept = minRem - (slope * minVw)
preferred = {intercept}rem + {slope * 100}vw
```

**Working example — 32px at 320px viewport → 64px at 1280px:**
```
Base: 16px = 1rem
minRem = 2,  minVw = 20  (320px / 16)
maxRem = 4,  maxVw = 80  (1280px / 16)

slope     = (4 - 2) / (80 - 20) = 0.03333
intercept = 2 - (0.03333 * 20) = 1.3333rem
preferred = 1.333rem + 3.333vw

Result: clamp(2rem, 1.333rem + 3.333vw, 4rem)
```

**Rules:**
- Always use `rem` for min/max, never `px` — `px` ignores user font-size preferences and breaks WCAG 1.4.4 (Resize text).
- Mix `rem + vw` in the preferred value — pure `vw` ignores font size, pure `rem` doesn't scale.
- Preferred value can go outside the clamp bounds at extreme viewports — that's the point of clamping.

### Complete Type Scale (Tailwind v4 @theme)

Define in your global CSS file (e.g. `app/globals.css`). These override Tailwind's default `--text-*` tokens.

```css
@theme {
  /* Base viewport range: 320px (20rem) → 1280px (80rem) */

  --text-xs:   clamp(0.75rem,  0.7rem + 0.25vw,  0.875rem); /* 12px → 14px */
  --text-sm:   clamp(0.875rem, 0.8rem + 0.375vw, 1rem);     /* 14px → 16px */
  --text-base: clamp(1rem,     0.95rem + 0.25vw, 1.125rem); /* 16px → 18px */
  --text-lg:   clamp(1.125rem, 1rem + 0.625vw,  1.25rem);   /* 18px → 20px */
  --text-xl:   clamp(1.25rem,  1.1rem + 0.75vw, 1.5rem);    /* 20px → 24px */
  --text-2xl:  clamp(1.5rem,   1.2rem + 1.5vw,  2rem);      /* 24px → 32px */
  --text-3xl:  clamp(1.875rem, 1.4rem + 2.375vw, 2.25rem);  /* 30px → 36px */
  --text-4xl:  clamp(2.25rem,  1.7rem + 2.75vw, 3.5rem);    /* 36px → 56px */
}
```

Usage in JSX — no breakpoint prefixes needed:
```jsx
<h1 className="text-4xl font-bold tracking-tight">Heading</h1>
<h2 className="text-2xl font-semibold">Subheading</h2>
<p className="text-base leading-relaxed">Body text</p>
```

### Tailwind Arbitrary Fluid Values

For one-off sizes that don't fit the scale:
```html
<p class="text-[clamp(1rem,0.9rem+0.5vw,1.25rem)]">Custom size</p>
```

### Line Height with Fluid Type

Line height should decrease as font size increases. Use Tailwind's `leading-*` utilities:

```html
<h1 class="text-4xl leading-tight">Large heading — tight</h1>
<h2 class="text-2xl leading-snug">Subheading — snug</h2>
<p class="text-base leading-relaxed">Body — relaxed</p>
<p class="text-sm leading-normal">Small — normal</p>
```

| Text Size | Recommended leading | Notes |
|-----------|--------------------|-|
| `text-4xl`+ | `leading-tight` (1.25) | Display text — tight |
| `text-2xl`–`3xl` | `leading-snug` (1.375) | Headings |
| `text-base`–`xl` | `leading-relaxed` (1.625) | Body copy |
| `text-sm`–`xs` | `leading-normal` (1.5) | UI labels |

### Accessibility

- Test fluid type at 200% browser zoom — WCAG 1.4.4 requires no loss of content
- Minimum readable size: 16px equivalent for body text
- Never clip text with `overflow: hidden` without a `text-overflow` strategy

---

## 3. Spacing Systems

### Tailwind v4 Spacing Model

Tailwind v4 generates all spacing utilities dynamically from a single base variable:

```css
/* Default (built-in — you don't need to write this) */
@theme {
  --spacing: 0.25rem; /* 4px */
}
```

Every utility like `p-4`, `mt-8`, `w-12` resolves to `calc(var(--spacing) * N)`. You get all integer multiples automatically.

### Extending the Scale

```css
@theme {
  /* Override the base unit (unusual — changes every spacing utility) */
  --spacing: 0.25rem;

  /* Add semantic spacing tokens */
  --spacing-section:  clamp(3rem, 5vw + 1rem, 6rem);  /* Page sections */
  --spacing-card:     clamp(1rem, 2vw, 1.5rem);         /* Card padding */
  --spacing-gutter:   clamp(1rem, 4vw, 2rem);           /* Outer margins */
  --spacing-stack:    clamp(1.5rem, 3vw, 2.5rem);       /* Vertical stack gaps */
}
```

Use semantic tokens:
```html
<section class="py-[--spacing-section] px-[--spacing-gutter]">
  <div class="grid gap-[--spacing-stack]">
    <article class="p-[--spacing-card] rounded-xl border">
```

### @theme vs :root

| Directive | Purpose | Generates Utilities? |
|-----------|---------|---------------------|
| `@theme` | Design tokens | YES — `p-[--spacing-card]` works |
| `:root` | Runtime variables | NO — just a CSS variable |

Use `@theme` for all spacing tokens that map to Tailwind utilities. Use `:root` for JS-readable runtime values (e.g., animation durations, theme-switching overrides).

### Vertical Rhythm

Consistent vertical spacing prevents the "designed by a developer" look. Apply at the component level:

```css
/* Prose/article vertical rhythm */
.prose {
  & h1, & h2, & h3 { margin-top: 2em; margin-bottom: 0.5em; }
  & p, & ul, & ol  { margin-bottom: 1.25em; }
  & pre            { margin: 1.5em 0; }
}
```

Or use Tailwind's `space-y-*` for component stacks:
```html
<div class="space-y-6">
  <h2 class="text-2xl font-bold">Title</h2>
  <p class="text-base">Paragraph one</p>
  <p class="text-base">Paragraph two</p>
</div>
```

---

## 4. Container Queries

### Why Container Queries

A card component in a sidebar (240px wide) should look different than the same card in a 3-column grid (380px wide). Media queries can't express this — they only know the viewport width, not where the component lives.

Container queries solve component-level responsiveness. The component reacts to its own available space, not the screen.

### Setup in Tailwind v4

No plugin installation needed. Built-in since v4.

```html
<!-- 1. Declare parent as container -->
<div class="@container">
  <!-- 2. Use @{size}: variants on children -->
  <div class="flex flex-col @md:flex-row gap-4">
    ...
  </div>
</div>
```

The `@container` class sets `container-type: inline-size` on the element.

### Tailwind v4 Container Breakpoints

| Variant | Min Width | Approx Use |
|---------|-----------|------------|
| `@xs:` | 20rem (320px) | Tiny containers |
| `@sm:` | 24rem (384px) | Small cards |
| `@md:` | 28rem (448px) | Medium cards |
| `@lg:` | 32rem (512px) | Wide cards |
| `@xl:` | 36rem (576px) | Large components |
| `@2xl:` | 42rem (672px) | Dashboard panels |
| `@3xl:` | 48rem (768px) | Full columns |
| `@4xl:` | 56rem (896px) | Wide columns |
| `@5xl:` | 64rem (1024px) | Large sections |
| `@6xl:` | 72rem (1152px) | — |
| `@7xl:` | 80rem (1280px) | — |

### Max-Width Container Variants

Apply styles below a container width:
```html
<div class="@container">
  <div class="@max-md:hidden">Hidden on narrow containers</div>
</div>
```

### Arbitrary Container Breakpoints

```html
<div class="@container">
  <div class="@[320px]:flex-row flex-col">
    <!-- Switches at exactly 320px container width -->
  </div>
</div>
```

### Named Containers

When nesting containers, name them to target the right ancestor:

```html
<aside class="@container/sidebar">
  <div class="@container/card">
    <p class="@md/sidebar:hidden @md/card:block">
      Hidden when sidebar is wide, shown when card is wide
    </p>
  </div>
</aside>
```

### container-type: inline-size vs size

`@container` in Tailwind uses `inline-size` (width-only containment). This is the correct default — it lets the container's block size (height) be determined normally by its content.

Only use `size` containment when you need height-based container queries. `size` containment requires the element to have an explicit height, otherwise height becomes 0.

### Full Card Example

```jsx
// ProductCard.tsx
export function ProductCard({ product }) {
  return (
    <div className="@container">
      <div className="flex flex-col @md:flex-row gap-4 p-4 rounded-xl border bg-white">
        <img
          src={product.image}
          alt={product.name}
          className="w-full @md:w-48 aspect-square object-cover rounded-lg"
        />
        <div className="flex flex-col gap-2 @md:justify-between">
          <div>
            <h3 className="text-base @lg:text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-600 @md:line-clamp-3">{product.description}</p>
          </div>
          <div className="flex items-center justify-between @md:flex-col @md:items-start gap-2">
            <span className="text-xl font-bold">${product.price}</span>
            <button className="btn-primary @md:w-full">Add to cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

This card works in a 3-column product grid AND in a sidebar recommendation widget — no media queries.

### When to Use Media Queries Instead

```css
/* Page-level layout: use media queries */
@media (min-width: 1024px) {
  .page-layout {
    grid-template-columns: 240px 1fr;
  }
}

/* OS/user preferences: always media queries */
@media (prefers-color-scheme: dark) { ... }
@media (prefers-reduced-motion: reduce) { ... }
```

---

## 5. Modern Viewport Units

### The Problem with vh

On mobile, browser chrome (address bar, navigation bar) shrinks and expands as the user scrolls. `100vh` uses the largest possible viewport height — which means on page load with full chrome visible, `100vh` content overflows behind the chrome.

### Unit Definitions

| Unit | Height Calculation | Chrome Changes? |
|------|-------------------|----------------|
| `vh` | % of initial containing block | No (static) |
| `svh` | % of smallest viewport (chrome fully visible) | No |
| `lvh` | % of largest viewport (chrome hidden) | No |
| `dvh` | % of current actual viewport | Yes (reflows on scroll) |

Same units exist for width: `svw`, `lvw`, `dvw`, and for the smaller dimension: `svi`, `lvi`, `dvi`.

### Browser Support

Baseline 2023: `svh`, `lvh`, `dvh` are fully supported in Chrome 108+, Safari 15.4+, Firefox 101+. Safe to use without fallback in 2026 for modern browsers. For IE or legacy Android WebView fallback, use `vh` as the default:

```css
.hero {
  height: 100vh;           /* fallback */
  height: 100svh;          /* override for supporting browsers */
}
```

### Decision Table

| Use Case | Correct Unit | Why |
|----------|-------------|-----|
| Sticky header height | `svh` | Must fit with chrome visible — no reflow |
| Fixed modal/overlay | `svh` | Same — stable, no jump |
| Bottom nav bar | `svh` | Use `env(safe-area-inset-bottom)` too |
| Full-height scroll container | `dvh` | Genuinely needs to fill current viewport |
| Hero section (static) | `svh` | Predictable — shows full content on load |
| Hero section (parallax) | `dvh` | Must update as chrome shifts |
| `lvh` | Almost never | Too aggressive — content hidden behind chrome on load |

### Mobile Layout Pattern (sticky header + bottom nav)

```html
<!-- meta tag (required for safe area insets) -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
/* Layout shell */
.app-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100svh;
}

/* Sticky header */
.header {
  position: sticky;
  top: 0;
  height: 56px;
  padding-top: env(safe-area-inset-top);
}

/* Scrollable content area */
.main {
  overflow-y: auto;
}

/* Bottom nav */
.bottom-nav {
  position: sticky;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
  background: white;
}
```

Tailwind equivalent:
```html
<div class="grid min-h-svh" style="grid-template-rows: auto 1fr auto">
  <header class="sticky top-0 h-14 z-50
                 pt-[env(safe-area-inset-top)]
                 bg-white border-b">
    ...
  </header>

  <main class="overflow-y-auto">
    ...
  </main>

  <nav class="sticky bottom-0
              pb-[env(safe-area-inset-bottom)]
              bg-white border-t">
    ...
  </nav>
</div>
```

### Safe Area Insets

Required for notch devices (iPhone X+) and Android phones with rounded corners.

Must have `viewport-fit=cover` in the meta viewport tag. Without it, `env(safe-area-inset-*)` returns 0.

```css
/* Safe area inset variables */
env(safe-area-inset-top)     /* Space behind status bar / notch */
env(safe-area-inset-right)   /* Space on landscape right edge */
env(safe-area-inset-bottom)  /* Space above home indicator (~34px on iPhone) */
env(safe-area-inset-left)    /* Space on landscape left edge */

/* With fallback */
padding-bottom: max(1rem, env(safe-area-inset-bottom));
```

---

## 6. Responsive Images

### Strategy: Resolution Switching vs Art Direction

| Need | Solution |
|------|---------|
| Same image, different sizes | `<img srcset sizes>` |
| Different image at different viewport (crop/crop) | `<picture>` with `<source>` |
| Format optimization (WebP, AVIF) | `<picture>` with `type` attribute |
| Next.js project | `<Image>` from `next/image` — handles all of the above |

### srcset + sizes Pattern

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg  400w,
    hero-800.jpg  800w,
    hero-1200.jpg 1200w,
    hero-1600.jpg 1600w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Hero image"
  loading="lazy"
  decoding="async"
/>
```

`sizes` tells the browser how wide the image will be rendered (before CSS loads), so it can pick the right `srcset` candidate. Match your layout breakpoints exactly.

### Art Direction with `<picture>`

```html
<picture>
  <!-- Mobile: square crop -->
  <source
    media="(max-width: 640px)"
    srcset="hero-square-400.webp 400w, hero-square-800.webp 800w"
    type="image/webp"
  />
  <!-- Desktop: wide crop -->
  <source
    srcset="hero-wide-800.webp 800w, hero-wide-1600.webp 1600w"
    type="image/webp"
  />
  <!-- Fallback (required) -->
  <img src="hero-wide-800.jpg" alt="Hero" />
</picture>
```

### aspect-ratio for Layout Stability

Prevent cumulative layout shift (CLS) by reserving space before the image loads:

```html
<div class="aspect-video overflow-hidden rounded-xl">
  <img class="w-full h-full object-cover" src="..." alt="..." />
</div>
```

Common ratios: `aspect-square` (1/1), `aspect-video` (16/9), `aspect-[4/3]`, `aspect-[3/2]`.

### Next.js Image Component

```jsx
import Image from 'next/image'

// Full-width responsive image
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  priority  // above the fold — don't lazy load
  className="w-full h-auto"
/>

// Fill container
<div className="relative aspect-video">
  <Image
    src="/thumbnail.jpg"
    alt="Thumbnail"
    fill
    sizes="(max-width: 640px) 100vw, 400px"
    className="object-cover"
  />
</div>
```

`next/image` automatically generates WebP/AVIF variants, serves srcset, and prevents CLS via reserved layout space.

---

## 7. Grid Patterns

### auto-fill vs auto-fit

Both create a responsive grid without breakpoints. The difference is how they handle empty tracks:

```css
/* auto-fill: keeps empty tracks (maintains column count) */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit: collapses empty tracks (items stretch to fill) */
.grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

| | `auto-fill` | `auto-fit` |
|--|-------------|------------|
| 1 item in 3-column space | Item is 200px, 2 empty tracks exist | Item stretches to full width |
| Use when | Gallery, fixed-size cards | Feature list, stretchy layout |

Tailwind doesn't have `auto-fill/auto-fit` utilities. Use inline style or a CSS class:

```html
<!-- auto-fill grid -->
<div class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
  ...
</div>

<!-- Or define in CSS -->
<style>
  .card-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
</style>
```

### Common Responsive Grid Patterns

**3-up to 1-column:**
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
```

**Sidebar layout:**
```html
<div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
  <aside>Sidebar</aside>
  <main>Content</main>
</div>
```

**Holy grail layout:**
```html
<div class="grid min-h-screen grid-rows-[auto_1fr_auto]">
  <header>Header</header>
  <div class="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6">
    <nav>Left nav</nav>
    <main>Main content</main>
    <aside>Right sidebar</aside>
  </div>
  <footer>Footer</footer>
</div>
```

**Masonry-style (CSS-only, no JS):**
```html
<div class="columns-1 sm:columns-2 lg:columns-3 gap-4">
  <div class="break-inside-avoid mb-4">...</div>
  <div class="break-inside-avoid mb-4">...</div>
</div>
```

Note: CSS `columns` is not true masonry (items flow top-to-bottom in columns, not by shortest column). For true masonry, use a library or CSS `masonry` (2026: experimental, not widely supported).

---

## 8. Touch and Mobile Patterns

### Tap Target Sizing

WCAG 2.5.5 (AAA) requires 44×44px minimum tap targets. WCAG 2.5.8 (AA, added in WCAG 2.2) requires 24×24px minimum.

**Target 48×48px minimum for comfort:**

```html
<!-- Button — ensure min height and width -->
<button class="min-h-12 min-w-12 px-4 py-2 flex items-center justify-center">
  Click me
</button>

<!-- Icon button — pad it out -->
<button class="p-3 rounded-full">
  <svg class="w-5 h-5">...</svg>
</button>

<!-- Link in text — doesn't need 48px, but standalone links do -->
<a class="inline-flex items-center min-h-12 px-3">
  View details
</a>
```

### Touch Event Considerations

```css
/* Remove 300ms tap delay on iOS (now default, but worth knowing) */
touch-action: manipulation;

/* Prevent text selection on buttons */
user-select: none;

/* Smooth momentum scrolling on iOS */
-webkit-overflow-scrolling: touch;  /* deprecated but harmless */
overflow-y: scroll;
```

Tailwind equivalents: `touch-manipulation`, `select-none`.

### Scroll Containers

```html
<!-- Horizontal scroll list (swipeable) -->
<div class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4
            scrollbar-hide"> <!-- custom utility or plugin -->
  <div class="snap-start flex-none w-72">Card 1</div>
  <div class="snap-start flex-none w-72">Card 2</div>
  <div class="snap-start flex-none w-72">Card 3</div>
</div>
```

```html
<!-- Vertical scroll with overscroll containment -->
<div class="overflow-y-auto overscroll-contain h-[60svh]">
  ...long content...
</div>
```

`overscroll-contain` prevents scroll chaining to the body when the inner scroll container reaches its bounds. Essential for modals and drawers.

### Mobile-Optimized Form Inputs

Trigger the correct keyboard on mobile:

```html
<input type="email"    inputmode="email"   autocomplete="email">
<input type="tel"      inputmode="tel"     autocomplete="tel">
<input type="number"   inputmode="numeric" pattern="[0-9]*">
<input type="text"     inputmode="search"  enterkeyhint="search">
<input type="text"     inputmode="decimal" pattern="[0-9.]*">
```

```html
<!-- Prevent zoom on focus in iOS (requires 16px font-size) -->
<input class="text-base ..." />  <!-- text-base = 1rem = 16px at minimum -->
```

iOS Safari zooms in when a focused input has `font-size < 16px`. Set `text-base` (or larger) on all form inputs.

---

## 9. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `100vh` on mobile | Layout extends behind chrome on page load | Use `100svh` for fixed, `100dvh` for scroll |
| `px` in clamp() min/max | Font ignores user zoom (WCAG fail) | Always `rem` in clamp bounds |
| Installing `@tailwindcss/container-queries` in v4 | Plugin works but is redundant | Remove — it's built-in since v4 |
| `tailwind.config.js` for font/spacing in v4 | Config ignored silently | Migrate to `@theme` in CSS |
| No `viewport-fit=cover` | `env(safe-area-inset-*)` returns 0px | Add `viewport-fit=cover` to meta viewport |
| Tap targets under 44px | Missed taps, bad mobile UX | `min-h-12 min-w-12` on all interactive elements |
| Input `font-size < 16px` | iOS zooms in on focus | `text-base` minimum on all inputs |
| Breakpoints in container queries | Container queries ignore viewport width | Match container widths to component needs, not viewport breakpoints |
| `grid-template-columns: repeat(auto-fill, minmax(0, 1fr))` | All columns collapse to 0 | Minimum must be a non-zero value, e.g. `minmax(200px, 1fr)` |
| `overscroll` not contained on modals | Scrolling modal scrolls body behind it | `overscroll-contain` on the scroll container |
| Missing `sizes` attribute on `srcset` | Browser picks wrong image size | Always pair `srcset` with `sizes` |
| Empty `alt` omitted (not `alt=""`) | Screen reader reads filename | Decorative images need `alt=""`, meaningful images need descriptive text |
| `aspect-ratio` without explicit width | Collapses to 0 height | Ensure container has a defined width or use `aspect-*` on the img itself |
