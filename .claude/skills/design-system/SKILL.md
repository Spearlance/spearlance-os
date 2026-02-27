---
model: claude-sonnet-4-6
name: design-system
description: Use when architecting design tokens, setting up CSS custom properties, organizing theme systems, debugging CSS specificity issues, or establishing component API patterns. Also use for CSS architecture decisions (Tailwind vs Modules vs Vanilla Extract) and token layer organization.
---

# Design System

This skill handles the structural and technical architecture of design systems — token layers, CSS architecture decisions, theming strategies, component API patterns, and CSS debugging. It's the "how" to ui-craft's "what." Where ui-craft answers "what should this look like," design-system answers "how should it be organized and maintained."

## Announcement

```
┏━ 🎨 design-system ━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of design system task]    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Token Architecture — Three-Layer System

```
┌─────────────────────────────────────────┐
│ Component Tokens (scoped)               │
│ --button-bg: var(--color-primary)       │
│ --card-border: var(--color-border)      │
├─────────────────────────────────────────┤
│ Semantic Tokens (purpose-mapped)        │
│ --color-primary: var(--color-blue-500)  │
│ --color-border: var(--color-gray-200)   │
├─────────────────────────────────────────┤
│ Primitive Tokens (raw values)           │
│ --color-blue-500: oklch(0.55 0.2 260)  │
│ --space-4: 1rem                         │
└─────────────────────────────────────────┘
```

- **Primitives** — raw design values, no semantic meaning, never used directly in components
- **Semantic** — map purpose to primitive, enable theming (dark mode, brand swaps)
- **Component** — scoped to one component, reference semantic tokens only

### Full Example

```css
/* Primitive tokens — raw design values */
:root {
  --color-blue-50: oklch(0.97 0.01 250);
  --color-blue-500: oklch(0.55 0.2 250);
  --color-blue-900: oklch(0.25 0.08 250);
  --color-gray-50: oklch(0.98 0 0);
  --color-gray-200: oklch(0.90 0 0);
  --color-gray-900: oklch(0.20 0 0);
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
}

/* Semantic tokens — purpose-mapped */
:root {
  --color-primary: var(--color-blue-500);
  --color-primary-foreground: var(--color-blue-50);
  --color-background: white;
  --color-foreground: var(--color-gray-900);
  --color-muted: var(--color-gray-50);
  --color-border: var(--color-gray-200);
  --radius-button: var(--radius-md);
  --radius-card: var(--radius-lg);
}

/* Component tokens — scoped to components */
.button {
  --button-bg: var(--color-primary);
  --button-text: var(--color-primary-foreground);
  --button-radius: var(--radius-button);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
}
```

### How Tailwind v4 Maps to This

```css
/* Tailwind v4 uses @theme directive for CSS-first config */
@import "tailwindcss";

@theme {
  /* These ARE your primitive + semantic tokens */
  --color-primary: oklch(0.55 0.2 250);
  --color-primary-foreground: oklch(0.97 0.01 250);
  --radius-lg: 1rem;
  --radius-md: 0.5rem;
  /* Tailwind auto-generates utility classes from these */
  /* bg-primary, text-primary-foreground, rounded-lg, etc. */
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CSS Architecture Decision Tree

```
New project?
├── Yes → Tailwind v4 (default recommendation)
│   ├── Need component library? → shadcn/ui (uses Tailwind + CSS vars)
│   └── Need design system tooling? → Tailwind @theme + CSS custom properties
├── Existing Tailwind v3 project? → Migrate to v4 (CSS-first config)
├── Need type-safe CSS? → Vanilla Extract (zero-runtime, TypeScript)
├── Need utility + token system without Tailwind? → Panda CSS (zero-runtime)
├── React Server Components? → NEVER runtime CSS-in-JS
│   ├── Emotion → AVOID in new RSC projects (runtime overhead)
│   └── styled-components → AVOID in new RSC projects (runtime overhead)
└── Legacy CSS-in-JS? → Keep if working, plan migration to zero-runtime
```

**Key 2025-2026 consensus:**
- Zero-runtime wins: Tailwind v4 > CSS Modules > Vanilla Extract > Panda CSS
- Runtime CSS-in-JS declining: Emotion and styled-components not recommended for new projects with RSC
- CSS custom properties are THE standard for design tokens (no JS config files)

| Approach | Bundle Impact | RSC Safe | Type Safety | Token Support |
|----------|--------------|----------|-------------|---------------|
| Tailwind v4 | Minimal | ✓ | Partial | ✓ via @theme |
| CSS Modules | Zero | ✓ | ✗ | Manual |
| Vanilla Extract | Zero | ✓ | ✓ | ✓ |
| Panda CSS | Zero | ✓ | ✓ | ✓ |
| Emotion | Runtime | ✗ | ✓ | ✓ |
| styled-components | Runtime | ✗ | Partial | ✓ |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Theming Strategy

### Light / Dark Mode

```css
/* System preference detection */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-foreground: var(--color-gray-50);
    --color-border: var(--color-gray-700);
  }
}

/* Manual toggle with class */
.dark {
  --color-background: var(--color-gray-900);
  --color-foreground: var(--color-gray-50);
  --color-border: var(--color-gray-700);
}
```

Tailwind v4 dark mode (class-based):
```css
@custom-variant dark (&:is(.dark *));
```

### Multi-Brand Theming

```css
/* Brand A */
[data-brand="acme"] {
  --color-primary: oklch(0.55 0.2 260); /* blue */
}

/* Brand B */
[data-brand="rocket"] {
  --color-primary: oklch(0.55 0.2 30); /* orange */
}
```

Only swap semantic tokens per brand — primitives stay shared. Never define brand colors directly in component styles.

### System Preference Detection (JS)

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
// Set class on html element for Tailwind dark mode
document.documentElement.classList.toggle('dark', prefersDark);

// Watch for changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    document.documentElement.classList.toggle('dark', e.matches);
  });
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Component API Patterns

### Variant Composition with cva

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
);
```

### The `cn()` Utility

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` handles conditional classes. `twMerge` resolves Tailwind conflicts (`p-4 p-6` → `p-6`). Always use both together.

### Slot Pattern for Compound Components

```typescript
// Compound component pattern
const Card = ({ children, className }: CardProps) => (
  <div className={cn("rounded-lg border bg-card", className)}>{children}</div>
);
Card.Header = ({ children, className }: CardHeaderProps) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);
Card.Content = ({ children, className }: CardContentProps) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Content>Body</Card.Content>
</Card>
```

Use compound components when subparts need coordinated styling. Avoid for simple one-off components.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CSS Debugging Patterns

| Problem | Cause | Fix |
|---------|-------|-----|
| z-index not working | Element not in a stacking context | Check parent for `transform`, `opacity`, `filter`, `will-change` — these create new stacking contexts |
| Overflow hidden clips wrong | Overflow on wrong container | Check which ancestor has `overflow:hidden`; use `overflow:clip` to clip in one axis only |
| Specificity fight | Multiple selectors targeting same element | Use `@layer` for ordering; avoid `!important` except as absolute last resort |
| Layout shift on load | Missing dimensions on images/embeds | Always set `width`/`height` or `aspect-ratio` on replaced elements |
| Flexbox item won't shrink | `min-width` defaults to `auto` | Add `min-w-0` to flex children that should shrink |
| Grid item overflow | Grid tracks sized by content | Use `minmax(0, 1fr)` instead of `1fr` |
| Margin collapse | Block margins collapsing between siblings | Use padding or gap instead of margin for spacing between flex/grid children |
| Font not loading | FOUT or incorrect format | Use `font-display: swap` and preload critical fonts |

### Specificity Management with CSS Layers

```css
@layer base, components, utilities;

@layer base {
  /* Reset and base styles — lowest priority */
  * { box-sizing: border-box; margin: 0; }
}

@layer components {
  /* Component styles — middle priority */
  .card { border-radius: var(--radius-lg); }
}

@layer utilities {
  /* Utility overrides — highest priority */
  /* Tailwind v4 puts utilities here automatically */
}
```

`@layer` ordering beats specificity. A low-specificity rule in `utilities` overrides a high-specificity rule in `base`. This eliminates 99% of specificity fights.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Spacing System

- 4px base grid (0.25rem)
- Tailwind's scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
- Always use the scale — no arbitrary pixel values in components

**Fluid spacing with clamp():**
```css
/* Responsive padding that scales with viewport */
padding: clamp(1rem, 2vw + 0.5rem, 3rem);

/* Fluid type scale */
font-size: clamp(1rem, 1.5vw + 0.5rem, 1.25rem);
```

**Semantic spacing tokens:**
```css
:root {
  --space-component-gap: var(--space-4);   /* gap between elements in a component */
  --space-section-gap: var(--space-16);    /* gap between page sections */
  --space-page-padding: var(--space-6);    /* page edge padding */
}
```

**Vertical rhythm:** Use consistent `line-height` multiples (1.5 for body, 1.2 for headings). Set via `leading-*` in Tailwind.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Use Existing Tools First

Before building custom token systems, check what's already there:

| Check | Why |
|-------|-----|
| Tailwind v4 `@theme` | Handles most token needs; auto-generates utility classes |
| shadcn/ui's CSS variables | Already defines semantic tokens for all shadcn components |
| Project's `globals.css` | May already have custom properties you should extend, not replace |
| `brand.json` | If it exists, use brand values as primitive tokens |

Only create custom token files when the existing system is insufficient. Extending > replacing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Integration

| Skill | Relationship |
|-------|-------------|
| `ui-craft` | ui-craft defines WHAT it looks like, design-system defines HOW it's structured |
| `tailwind-css` | design-system defines tokens, Tailwind consumes them via `@theme` |
| `shadcn-ui` | shadcn uses CSS variables that follow this three-layer token architecture |
| `brand` | brand.json values become primitive tokens; never hardcode brand colors |
| `nap-ninja` | same centralization principle — source of truth over duplication |
