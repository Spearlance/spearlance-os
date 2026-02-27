---
model: claude-sonnet-4-6
name: ui-craft
description: Use when designing UI aesthetics, generating style guides, modernizing dated interfaces, or exploring visual direction. Also use for color palette generation, typography pairing, and component style samples. The "vibes skill" — creative direction before implementation.
---

# ui-craft

Creative direction, aesthetic exploration, and visual system generation. Use this skill before writing a single line of CSS — it finds the right vibe first, then produces implementation-ready tokens and component samples. Works across the full aesthetic spectrum from brutalist to editorial to maximalist. Never defaults to generic corporate SaaS gray.

## Announcement

```
┏━ 🎨 ui-craft ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of aesthetic task]        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<EXTREMELY-IMPORTANT>
This skill has FULL aesthetic range. Corporate SaaS gray is ONE option among many — never the default.

Before proposing any visual direction, you MUST run Socratic Discovery Mode to understand what the user actually wants. Do not assume minimalist. Do not assume shadcn defaults. Do not assume corporate. Do not assume "clean and modern" means Inter + gray palette.

The goal is to surface what the user is actually imagining — often they can't articulate it until you ask the right questions.
</EXTREMELY-IMPORTANT>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Socratic Discovery Mode — MANDATORY

Run this before proposing ANY visual direction. Ask one question at a time. Use multiple choice where possible to accelerate the conversation.

**Step 1 — Context check:** If `brand.json` exists at project root, read it. Skip color and font questions — the brand already answered them. If `stack.json` exists, note the framework for component output format.

**Step 2 — Ask these in order, stopping when you have enough signal:**

▸ Who is the target audience?
  a) General consumer / broad public
  b) Tech-savvy / developer / startup
  c) Enterprise / corporate / B2B
  d) Creative / artist / designer
  e) Youth / Gen Z / culture
  f) Professional niche (medical, legal, finance, etc.)

▸ What's the brand personality?
  a) Bold and provocative
  b) Refined and sophisticated
  c) Warm and approachable
  d) Playful and energetic
  e) Raw and authentic
  f) Authoritative and trustworthy

▸ What mood/energy should the UI have?
  a) Calm and focused
  b) Energetic and exciting
  c) Dark and dramatic
  d) Light and airy
  e) Dense and information-rich
  f) Sparse and editorial

▸ Do you have reference sites or aesthetics you admire? (Paste URLs or names — e.g., "Linear, Vercel, Notion" or "Awwwards winners, early 2000s web, brutalist sites")

▸ Any hard constraints?
  a) Existing brand colors I can't change
  b) Specific accessibility requirements (WCAG AA/AAA)
  c) Framework limitations
  d) Must match existing design system
  e) No constraints — full creative freedom

▸ What type of content/product?
  a) Marketing / landing page
  b) App dashboard / productivity tool
  c) E-commerce / product catalog
  d) Portfolio / showcase
  e) Blog / publication / editorial
  f) SaaS platform

**Step 3 — After 3-5 questions with clear signal:** Propose 2-3 aesthetic directions with visual rationale. Each direction should have a name, visual description, example reference, and brief rationale for why it fits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Aesthetic Spectrum

Nine distinct directions. Know all of them. Corporate SaaS is one row — treat it that way.

| Direction | Visual Signature | Color | Typography | Components | When to Use |
|-----------|-----------------|-------|------------|------------|-------------|
| **Brutalist** | Raw, exposed structure, anti-design, stark contrast, intentional ugliness as aesthetic | Black/white, single acid accent (yellow, red, green) | Monospace, system fonts, oversized bold, courier | Exposed borders, zero border-radius, raw forms, visible grid lines | Portfolios, creative agencies, art/culture, anti-brand brands |
| **Editorial** | Magazine-inspired, type-driven, asymmetric grids, generous whitespace | Muted sophisticated palette, limited to 2-3 colors, cream + ink | Serif headlines (Cormorant, Playfair), elegant sans body, expressive sizing | Large whitespace blocks, pull quotes, full-bleed images, inline figures | Publications, luxury brands, food/lifestyle, long-form storytelling |
| **Playful** | Rounded, colorful, bouncy, illustrated elements, friendly | Saturated multi-color, warm primaries, high contrast accents | Rounded sans-serif (Nunito, Fredoka), variable weight, large scale | Pill buttons, soft shadows, bouncy hover animations, illustrated mascots | Kids products, casual apps, creative tools, consumer social |
| **Maximalist** | Bold gradients, layered depth, dense information, visually loud, glass/blur | Multi-gradient, neon over dark, high saturation, holographic | Mixed display + body, large scale, layered z-index text | Overlapping elements, bento grids, bold hero CTAs, blur cards | Music platforms, fashion, entertainment, culture, nightlife |
| **Minimalist** | Whitespace-heavy, monochrome base, type-focused, quiet interactions | Monochrome + single accent, near-white backgrounds, subtle borders | Clean sans-serif (Inter, Geist), tight modular scale | Simple card frames, thin borders, subtle hover states, no decoration | SaaS dashboards, productivity tools, documentation, B2B |
| **Retro/Y2K** | Pixel fonts, chrome effects, gradients, nostalgia, internet archaeology | Neon over black, chrome silver, hot pink, acid green | Pixel fonts, blocky display, retro condensed | Chunky buttons, metallic/chrome effects, glow borders, scanlines | Gaming, music culture, youth brands, fashion streetwear |
| **Corporate SaaS** | Clean, professional, trust-signaling, predictable patterns | Blue-gray palette, conservative accents, white backgrounds | Inter, system UI stack, professional weight range | Standard cards, clean data tables, formal CTAs, sidebar nav | Enterprise software, B2B SaaS, finance, legal, healthcare (one option among many — not the default) |
| **Organic** | Natural textures, flowing shapes, earthy warmth, imperfect | Earth tones, forest greens, warm neutrals, muted terracotta | Humanist serif/sans, organic letterforms, variable weight | Rounded organic shapes, natural imagery, grain textures, soft edges | Wellness, sustainability, food & beverage, nature brands |
| **Experimental** | Generative art, interactive, WebGL, canvas-driven, code-as-aesthetic | Any — often monochrome or vivid single-channel | Custom variable fonts, expressive type-as-image | 3D elements, cursor effects, generative backgrounds, scroll-driven art | Creative agencies, tech art, interactive portfolios, award-bait sites |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Dated vs Modern Detector

When asked to modernize existing UI, scan for these signals first.

| Dated Signal | Why It Reads Old | Modern Alternative |
|-------------|-----------------|-------------------|
| Heavy drop shadows everywhere | Skeuomorphic era holdover | Subtle/none, or colored shadows matching the element's color |
| 4px border-radius on everything | One-size-fits-all rounding | Mixed: pill buttons, sharp cards, rounded avatars — intentional per element |
| Pure saturated colors (#ff0000, #00ff00) | Garish, harsh on eyes | Muted/desaturated or OKLCH-perceptual colors with consistent chroma |
| System fonts only, no type scale | No typographic personality | Intentional font pairing with modular scale |
| Random spacing values | No visual rhythm | Rhythm-based spacing (4/8px grid, `clamp()` for fluid) |
| Linear top-to-bottom gradients | Generic gradient era | Mesh gradients, aurora, radial, conic, grain texture overlay |
| Generic line icons (feather/heroicons mismatched) | Inconsistent visual language | Cohesive icon set (lucide, phosphor) with consistent stroke weight |
| Centered 1200px box only | Rigid, dated layout model | Full-bleed sections, bento grids, asymmetric composition |
| Instant state changes, no animation | Abrupt, zero delight | Spring physics, staggered reveals, meaningful micro-interactions |
| Card soup (identical cards repeated) | No visual hierarchy | Mixed component hierarchy, featured cards, visual rhythm variation |
| Navbar with full-width underline on active state | Web 2.0 indicator | Pill indicator, bold weight shift, or no indicator with other affordance |
| CTA button with full-width gradient | Loud, distrust-signaling | Sized-to-content, clean fill with subtle hover, or ghost variant |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Color Palette Generation

Use OKLCH for all color generation. OKLCH is perceptually uniform — steps feel equal, gradients look clean, and dark/light variants stay predictable.

### Process

1. Identify brand primary (via Socratic mode or `brand.json`)
2. Generate semantic scale: lightness 0.97 → 0.15 across 11 steps (50–950)
3. Hold chroma constant per hue family, vary lightness
4. Check contrast: 4.5:1 for text (WCAG AA), 3:1 for UI elements
5. Generate secondary, accent, and semantic colors from same hue family or complementary

### Output Format — Tailwind v4 `@theme`

```css
@theme {
  /* Primary scale — adjust hue (H) and chroma (C) per brand */
  --color-primary-50:  oklch(0.97 0.01 250);
  --color-primary-100: oklch(0.93 0.03 250);
  --color-primary-200: oklch(0.88 0.05 250);
  --color-primary-300: oklch(0.80 0.09 250);
  --color-primary-400: oklch(0.70 0.14 250);
  --color-primary-500: oklch(0.55 0.20 250);
  --color-primary-600: oklch(0.45 0.20 250);
  --color-primary-700: oklch(0.38 0.18 250);
  --color-primary-800: oklch(0.28 0.13 250);
  --color-primary-900: oklch(0.20 0.09 250);
  --color-primary-950: oklch(0.15 0.06 250);

  /* Semantic tokens */
  --color-background:   oklch(0.99 0.00 0);
  --color-foreground:   oklch(0.15 0.01 250);
  --color-muted:        oklch(0.96 0.01 250);
  --color-muted-fg:     oklch(0.55 0.04 250);
  --color-accent:       oklch(0.55 0.20 180);   /* complementary hue */
  --color-success:      oklch(0.55 0.18 145);
  --color-warning:      oklch(0.75 0.18 80);
  --color-destructive:  oklch(0.55 0.22 25);
  --color-border:       oklch(0.90 0.01 250);
}
```

### Hue Reference (OKLCH H values)

| Hue | H value |
|-----|---------|
| Red | 25 |
| Orange | 55 |
| Yellow | 85 |
| Green | 145 |
| Teal | 185 |
| Cyan | 200 |
| Blue | 250 |
| Indigo | 280 |
| Purple | 310 |
| Pink | 350 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Typography System

### Scale Ratios

| Ratio | Name | Best For |
|-------|------|----------|
| 1.200 | Minor Third | Dense dashboards, data-heavy UIs, tight editorial |
| 1.250 | Major Second | General purpose — balanced scale |
| 1.333 | Perfect Fourth | Dramatic editorial, landing pages, marketing |
| 1.500 | Perfect Fifth | Hero-focused pages, single statement layouts |

### Font Weight Rules

Max 3 weights per font family. More creates noise, not hierarchy.

| Weight | Use |
|--------|-----|
| 400 Regular | Body text, captions, secondary labels |
| 500/600 Medium | UI labels, subheadings, navigation |
| 700/800 Bold | Display headings, hero text, CTAs |

### Line Height and Spacing

```css
/* Headings: tight — visual mass matters more than legibility */
--leading-display: 1.05;
--leading-heading: 1.15;

/* Body: generous — readability over density */
--leading-body: 1.6;
--leading-relaxed: 1.75;

/* Letter spacing: negative for large, wide for small */
/* Display (48px+): -0.02em to -0.04em */
/* Body (16-18px): 0em normal */
/* Labels/caps (11-12px): 0.08em to 0.12em */
```

### Font Pairings by Aesthetic

| Aesthetic | Display/Heading | Body | Label/UI |
|-----------|----------------|------|----------|
| Minimalist | Inter, Geist, Plus Jakarta Sans | Same family lighter weight | System UI |
| Editorial | Cormorant Garamond, Playfair Display, Libre Baskerville | Lato, Source Serif 4 | Inter |
| Playful | Fredoka, Nunito, Quicksand | Nunito, Poppins | Same |
| Brutalist | JetBrains Mono, Space Mono, IBM Plex Mono | Same | Same |
| Maximalist | Clash Display, Cabinet Grotesk, Satoshi | Inter, DM Sans | Mono accent |
| Retro/Y2K | Press Start 2P, VT323, Space Grotesk | Space Grotesk, Syne | Mono |
| Corporate | Inter, System UI | Inter | Inter |
| Organic | Recoleta, Playfair, DM Serif | DM Sans, Nunito | DM Sans |
| Experimental | Variable font (Recursive, Fraunces) | Mono or sans | Custom |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Visual Hierarchy Rules

**Size contrast:** 2:1 minimum between adjacent heading levels. If h2 is 32px, h3 is max 24px — not 30px.

**Whitespace rhythm:** Spacing values from a fixed scale only (4, 8, 12, 16, 24, 32, 48, 64, 96, 128px). Never ad-hoc values like 17px or 23px.

**Focal points:** One primary CTA per viewport. One visual entry point per page section. Everything else is supporting hierarchy.

**Density balance:**
- Too tight → reads as anxiety-inducing, low-trust
- Too sparse → reads as empty, low-value
- Target: 60% content area, 40% breathing room on marketing pages; invert for dashboards

**Color weight:** Darker and more saturated elements attract attention first. Use this to guide reading order — saturate CTAs, desaturate secondary actions.

**Motion hierarchy:** Only animate what needs attention. Static page + one animated element = that element owns focus. Animate everything = nothing has focus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Style Guide Generator

When a user says "generate a style guide" or "give me the design tokens," output the full system:

### Output Structure

**1. Color palette** — full primary scale + semantic tokens in `@theme` format (see Color section above)

**2. Typography scale** — CSS custom properties:
```css
@theme {
  --text-xs:   clamp(0.69rem, 0.66rem + 0.16vw, 0.75rem);
  --text-sm:   clamp(0.83rem, 0.78rem + 0.25vw, 0.875rem);
  --text-base: clamp(1rem,    0.95rem + 0.24vw, 1.063rem);
  --text-lg:   clamp(1.2rem,  1.1rem  + 0.5vw,  1.25rem);
  --text-xl:   clamp(1.44rem, 1.28rem + 0.8vw,  1.5rem);
  --text-2xl:  clamp(1.73rem, 1.5rem  + 1.1vw,  1.875rem);
  --text-3xl:  clamp(2.07rem, 1.8rem  + 1.4vw,  2.25rem);
  --text-4xl:  clamp(2.49rem, 2.1rem  + 1.9vw,  2.813rem);
  --text-5xl:  clamp(2.99rem, 2.5rem  + 2.4vw,  3.5rem);
  --text-display: clamp(3.5rem, 2.8rem + 3.5vw, 5rem);
}
```

**3. Spacing scale:**
```css
@theme {
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-24: 6rem;     /* 96px */
  --spacing-32: 8rem;     /* 128px */
}
```

**4. Border radius tokens:**
```css
@theme {
  --radius-none: 0;
  --radius-sm:   0.125rem;  /* 2px — inputs, sharp cards */
  --radius-md:   0.375rem;  /* 6px — cards, panels */
  --radius-lg:   0.75rem;   /* 12px — modals, large cards */
  --radius-xl:   1rem;      /* 16px — featured sections */
  --radius-2xl:  1.5rem;    /* 24px — hero sections */
  --radius-full: 9999px;    /* pills, avatars, tags */
}
```

**5. Shadow tokens:**
```css
@theme {
  --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.06);
  --shadow-md: 0 4px 6px oklch(0 0 0 / 0.07), 0 2px 4px oklch(0 0 0 / 0.06);
  --shadow-lg: 0 10px 15px oklch(0 0 0 / 0.1), 0 4px 6px oklch(0 0 0 / 0.05);
  --shadow-xl: 0 20px 25px oklch(0 0 0 / 0.1), 0 8px 10px oklch(0 0 0 / 0.04);
  /* Colored shadow example — match to brand primary */
  --shadow-brand: 0 8px 24px oklch(0.55 0.20 250 / 0.3);
}
```

**6. Sample components** — see Sample Component Generator below

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Sample Component Generator

Produce implementation-ready Tailwind v4 / React components matching the chosen aesthetic. Always output the full component, not a description.

### Button Variants

```tsx
{/* Primary — brand fill */}
<button className="px-6 py-2.5 bg-primary-500 text-white font-medium text-sm rounded-md
  hover:bg-primary-600 active:bg-primary-700 transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
  Get started
</button>

{/* Secondary — outlined */}
<button className="px-6 py-2.5 border border-border text-foreground font-medium text-sm rounded-md
  hover:bg-muted transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
  Learn more
</button>

{/* Ghost — no border */}
<button className="px-6 py-2.5 text-muted-fg font-medium text-sm rounded-md
  hover:bg-muted hover:text-foreground transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
  Cancel
</button>
```

**Brutalist variant:**
```tsx
<button className="px-6 py-2.5 bg-black text-white font-mono font-bold text-sm uppercase tracking-widest
  border-2 border-black
  hover:bg-white hover:text-black transition-none
  focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black">
  DO IT
</button>
```

**Playful variant:**
```tsx
<button className="px-6 py-3 bg-primary-400 text-white font-bold text-sm rounded-full
  shadow-[0_4px_0_theme(colors.primary.600)]
  hover:translate-y-[2px] hover:shadow-[0_2px_0_theme(colors.primary.600)]
  active:translate-y-[4px] active:shadow-none
  transition-all duration-100">
  Let's go!
</button>
```

### Card Variants

```tsx
{/* Default card */}
<div className="rounded-lg border border-border bg-background p-6 shadow-sm">
  <h3 className="text-base font-semibold text-foreground mb-2">Card title</h3>
  <p className="text-sm text-muted-fg leading-relaxed">Supporting description text goes here.</p>
</div>

{/* Featured card — elevated */}
<div className="rounded-xl border border-primary-200 bg-primary-50 p-6 shadow-brand">
  <span className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-3 block">Featured</span>
  <h3 className="text-lg font-bold text-foreground mb-2">Featured item</h3>
  <p className="text-sm text-muted-fg leading-relaxed">This card draws the eye first.</p>
</div>

{/* Minimal card — no border */}
<div className="p-6">
  <h3 className="text-base font-semibold text-foreground mb-2">Minimal</h3>
  <p className="text-sm text-muted-fg leading-relaxed">Whitespace does the heavy lifting.</p>
</div>
```

### Hero Section

```tsx
{/* Minimalist hero */}
<section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-24">
  <span className="text-xs font-semibold text-primary-500 uppercase tracking-[0.2em] mb-6">
    Introducing v2.0
  </span>
  <h1 className="text-display font-bold text-foreground max-w-3xl leading-[1.05] tracking-[-0.03em] mb-6">
    Build something worth shipping
  </h1>
  <p className="text-xl text-muted-fg max-w-xl leading-relaxed mb-10">
    The toolkit that gets out of your way and lets you build.
  </p>
  <div className="flex gap-4 flex-wrap justify-center">
    <button className="px-8 py-3 bg-foreground text-background font-semibold rounded-lg hover:opacity-80 transition-opacity">
      Start building
    </button>
    <button className="px-8 py-3 text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
      See the docs →
    </button>
  </div>
</section>
```

### Input / Form Elements

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-foreground" htmlFor="email">
    Email address
  </label>
  <input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-md
      text-foreground placeholder:text-muted-fg
      hover:border-primary-400
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-primary-500
      transition-colors duration-150"
  />
  <p className="text-xs text-muted-fg">We'll never share your email.</p>
</div>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Leverage, Don't Recreate — Package-First

Before generating custom components, check what already exists. shadcn/ui is the default component layer for React projects. Propose modification/theming over building from scratch.

| Need | Don't Build Custom | Use Instead |
|------|-------------------|-------------|
| Modal/Dialog | Custom overlay + focus trap | `npx shadcn@latest add dialog` |
| Toast notifications | Custom toast system | `npx shadcn@latest add sonner` |
| Data table | Custom table with sort/filter | `npx shadcn@latest add table` + `@tanstack/react-table` |
| Charts/graphs | Custom SVG | `recharts` or `tremor` |
| Carousel/slider | Custom slider | `embla-carousel-react` |
| Date picker | Custom calendar | `npx shadcn@latest add calendar` |
| Icons | Custom SVGs | `lucide-react` (Lucide) or `@phosphor-icons/react` |
| Combobox/autocomplete | Custom dropdown | `npx shadcn@latest add combobox` |
| Command palette | Custom search UI | `npx shadcn@latest add command` |
| Tooltip | Custom hover overlay | `npx shadcn@latest add tooltip` |
| Tabs | Custom tab switcher | `npx shadcn@latest add tabs` |
| Accordion | Custom expand/collapse | `npx shadcn@latest add accordion` |
| Rich text editor | Custom contenteditable | `tiptap` or `lexical` |
| Drag and drop | Custom drag handlers | `@dnd-kit/core` |
| Virtualized lists | Custom windowing | `@tanstack/react-virtual` |

When recommending a package: link the repo, name the install command, and explain how to theme it to match the chosen aesthetic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Before/After Mode

When modernizing an existing UI:

**Step 1 — Scan for dated signals** using the Dated vs Modern Detector table.

**Step 2 — Score the damage:**
- 1-3 dated signals → targeted fixes
- 4-6 dated signals → aesthetic refresh
- 7+ dated signals → full redesign direction

**Step 3 — Propose 2-3 modernization directions** with rationale. Each direction:
- Names the aesthetic direction
- Lists what changes (not what stays)
- Shows a before/after component example
- Estimates implementation scope (1 day / 1 week / 1 sprint)

**Step 4 — Output specific changes** once direction is chosen:
- CSS custom property overrides
- Tailwind class replacements
- Component rewrites (only what needs full rewrite vs. class swap)
- Animation additions via Framer Motion or CSS transitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Integration Points

| Condition | Behavior |
|-----------|----------|
| `brand.json` exists | Read brand colors, fonts, personality — skip those Socratic questions |
| `stack.json` exists | Use framework-appropriate syntax (React/Svelte/Astro/etc.) in component output |
| Tailwind detected | All tokens output as `@theme` CSS custom properties |
| shadcn detected | Extend/customize shadcn components, don't replace them |
| No framework context | Output vanilla CSS + HTML as default, React as secondary |

### Skill Chains

After ui-craft sets the visual direction:

- → `tailwind-css` for deep Tailwind v4 implementation details
- → `shadcn-ui` for component theming and installation
- → `responsive-design` for layout and breakpoint system
- → `framer-motion` for animation system matching the aesthetic
- → `accessibility` to verify contrast ratios and ARIA patterns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Completion Pattern

After delivering a style direction or style guide, always end with a summary:

```
Direction chosen: [Aesthetic Name]
Palette:          ✓  [N] color tokens
Typography:       ✓  [font pairing]
Components:       ✓  button, card, hero, input
Tokens:           ✓  ready for @theme

● ahh, that felt good didn't it?

▸ Ship the tokens to tailwind-css, or want component variants first?
```
