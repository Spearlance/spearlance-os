---
model: claude-sonnet-4-6
name: shadcn-ui
description: Use when working with shadcn/ui components, Radix UI primitives, or building UI with copy-paste components on Tailwind. Also use when setting up shadcn/ui CLI, theming with CSS variables, or composing complex components like data tables or command palettes.
---

# shadcn/ui

your friendly armadillo is here to serve you

shadcn/ui is a copy-paste component library built on Radix UI (or Base UI) primitives and Tailwind CSS. Components live in your codebase — not in node_modules. No runtime library, full ownership.

## Quick Reference

| Item | Value |
|------|-------|
| **CLI** | `npx shadcn@latest` (NOT `shadcn-ui` — that package is deprecated) |
| **New project** | `npx shadcn create` (visual builder, Dec 2025) |
| **Add to existing** | `npx shadcn@latest init` |
| **Add component** | `npx shadcn@latest add button` |
| **Default style** | `new-york` (`default` is deprecated as of Feb 2025) |
| **Tailwind v4** | Fully supported — requires `@theme inline` directive |
| **Colors** | OKLCH format (migrated from HSL in Feb 2025) |
| **Primitives** | Radix UI or Base UI (your choice since Dec 2025) |
| **Docs** | https://ui.shadcn.com |

## Installation (Tailwind v4 + Next.js 15)

```bash
npx shadcn@latest init
```

Minimal `globals.css` for Tailwind v4:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  /* ... other tokens */
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
}
```

`@theme inline` is mandatory for Tailwind v4 — without it, CSS variables don't become Tailwind utilities.

## Components (October 2025 additions)

7 new components added Oct 2025 — use these before reaching for custom solutions:

| Component | Purpose |
|-----------|---------|
| `Spinner` | Loading indicator |
| `Kbd` | Keyboard shortcut display |
| `Button Group` | Grouped button actions / split buttons |
| `Input Group` | Input with prefix/suffix icons, buttons, labels |
| `Field` | Universal form field wrapper (all control types) |
| `Item` | Flex list items with media/title/description/actions |
| `Empty` | Empty state screens |

## Dark Mode (Next.js)

```bash
npm install next-themes
```

Wrap root layout with `ThemeProvider`:

```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `shadcn-ui` package | Use `shadcn` — `npx shadcn@latest` |
| CSS vars without `@theme inline` (Tailwind v4) | Add `@theme inline { --color-primary: var(--primary); }` |
| Using `default` style | Use `new-york` — `default` is deprecated |
| Using built-in `toast` component | Use Sonner — `toast` is deprecated |
| Wrapping with `React.forwardRef` | Components use `React.ComponentProps` now — no forwardRef |
| Overriding component via className on wrapper | Use `data-slot` attribute for targeted internal styling |
| HSL color values in CSS variables | Use OKLCH format: `oklch(0.205 0 0)` |
| `tailwindcss-animate` plugin | Replaced by `tw-animate-css` |

## Full Reference
See `reference.md` for complete installation guide, CLI reference, theming system, component catalog, complex compositions (data table, combobox, command palette), form integration, and 2025-2026 changes.
