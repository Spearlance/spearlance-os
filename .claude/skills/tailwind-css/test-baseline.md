# Tailwind CSS Skill — Baseline Test Results

## RED Phase: Without Skill

Date: 2026-02-19
Model: claude-sonnet-4-6 (self-assessment before web research)

Pre-research answers recorded honestly from training knowledge alone.

---

## Query 1: Next.js 15 Setup + Breaking Changes

### Prompt
"How do I set up Tailwind CSS v4 in a Next.js 15 project? What are the breaking changes from v3?"

### Pre-Research Response Summary
Install `tailwindcss` and `@tailwindcss/postcss`, configure postcss with the new plugin, replace `@tailwind base/components/utilities` with `@import "tailwindcss"`. Breaking changes vaguely recalled: CSS-first config, JIT always-on, content array moved to CSS, prefix system changed.

### Assessment

| Criterion | Result | Notes |
|---|---|---|
| Correct PostCSS plugin name? | PARTIAL | Knew `@tailwindcss/postcss` but uncertain |
| Correct CSS import syntax? | YES | `@import "tailwindcss"` recalled correctly |
| No `tailwind.config.js` needed? | PARTIAL | Unclear whether config was still required |
| Correct PostCSS config filename? | NO | Did not know `.mjs` format was required |
| Remove `postcss-import` / `autoprefixer`? | NO | Not recalled — these are now built in |
| Specific renamed utilities (shadow scale shift)? | NO | Not known that `shadow` → `shadow-sm`, `shadow-sm` → `shadow-xs` etc. |
| `outline-none` removal? | NO | Missed — now `outline-hidden` |
| Ring default change (3px → 1px)? | NO | Not known |
| Border default change (gray-200 → currentColor)? | NO | Not known |
| `!important` modifier suffix change? | NO | Missed that `!flex` becomes `flex!` |
| Stacked variant order change? | NO | `first:*:` → `*:first:` not recalled |
| CSS variable arbitrary value syntax change? | NO | `bg-[--var]` → `bg-(--var)` not recalled |
| Preprocessor incompatibility? | NO | Not known |

### What Was Wrong or Missing
- Did not know `postcss.config.mjs` (ESM) is the correct format
- Did not know `postcss-import` and `autoprefixer` are no longer needed
- Shadow/blur/rounded scale shift completely unknown (`shadow` → `shadow-sm`, etc.)
- `outline-none` replaced by `outline-hidden` — critical accessibility change
- Ring default changed from 3px to 1px
- Border default changed from `gray-200` to `currentColor`
- Important modifier moved from prefix (`!flex`) to suffix (`flex!`)
- Stacked variant order reversed (`first:*:pt-0` → `*:first:pt-0`)
- CSS variable arbitrary syntax changed (`[--var]` → `(--var)`)
- Sass/Less/Stylus incompatibility not known
- `space-*` / `divide-*` selector behavior change not known

---

## Query 2: Container Queries + @theme Custom Colors

### Prompt
"Show me how to create a responsive card with container queries and @theme custom colors in Tailwind v4."

### Pre-Research Response Summary
Knew `@container` class on parent and `@md:` prefix on children for container queries. Knew `@theme {}` block with `--color-*` variables. Directionally correct but lacked precision on container query size values, named containers, and `@theme inline` for variable references.

### Assessment

| Criterion | Result | Notes |
|---|---|---|
| `@container` parent class? | YES | Recalled correctly |
| `@md:flex-row` child variant syntax? | YES | Approximately correct |
| `@theme { --color-*: }` syntax? | YES | Recalled correctly |
| Container query size table? | NO | Did not know `@3xs` through `@7xl` values in rem |
| Named containers (`@container/name`)? | NO | Not recalled |
| `@max-*` container query variants? | NO | Not recalled |
| Container query units (`cqw`, `cqh`)? | NO | Not recalled |
| `@theme inline` for CSS variable refs? | NO | Not recalled |
| `@theme static` modifier? | NO | Not recalled |
| Exact namespace-to-utility mapping table? | PARTIAL | Knew colors but not spacing, radius, shadow mappings |

### What Was Wrong or Missing
- Container query sizes are fixed rem values (`@3xs` = 16rem through `@7xl` = 80rem) — did not know specifics
- Named containers (`@container/sidebar`, `@lg/sidebar:flex-col`) not known
- `@max-*` container query max-width variants not known
- `@theme inline` needed when referencing other CSS variables (e.g. Next.js font variables)
- Container query length units (`cqw`, `cqh`) not recalled
- Full namespace mapping (all 17 `@theme` namespaces) not known

---

## Query 3: CSS-First Configuration

### Prompt
"How does Tailwind v4's CSS-first configuration work? Show @theme for custom spacing, colors, fonts. What happened to tailwind.config.js?"

### Pre-Research Response Summary
Knew `@theme {}` defines tokens, `--color-*` → color utilities, `--font-*` → font-family utilities, `--spacing-*` → spacing utilities. Knew `tailwind.config.js` is still supported via `@config` directive. Gaps in namespace specifics, `@theme inline`/`static` modifiers, and replacing entire namespaces.

### Assessment

| Criterion | Result | Notes |
|---|---|---|
| `@theme {}` syntax? | YES | Recalled correctly |
| `--color-*` → `bg-*`, `text-*`, etc.? | YES | Recalled correctly |
| `--font-*` → `font-*` (family)? | YES | Recalled correctly |
| `--spacing-*` → all spacing utilities? | PARTIAL | Knew `p-*`, `m-*` but not full list |
| `--breakpoint-*` → responsive variants? | PARTIAL | Approximately knew |
| `--container-*` → container query variants? | NO | Not recalled |
| Replacing entire namespace (`--color-*: initial`)? | NO | Not recalled |
| `@theme inline` for referencing other vars? | NO | Not recalled |
| `@theme static` modifier? | NO | Not recalled |
| Keyframes inside `@theme`? | NO | Not recalled |
| `@config "path"` for JS config? | PARTIAL | Knew it existed but not exact syntax |
| `resolveConfig()` removed? | NO | Not recalled — critical for JS consumers |

### What Was Wrong or Missing
- Namespace clearing syntax (`--color-*: initial`) not known
- Full namespace-to-utility mapping not known (`--text-*` → font-size, `--tracking-*` → tracking, `--leading-*` → leading)
- Keyframes can be nested inside `@theme` block
- `@theme inline` is required when `@theme` variables reference other CSS variables (e.g. Next.js font variables from `next/font`)
- `resolveConfig()` is removed — JS consumers must use `getComputedStyle` on CSS variables
- `@theme static` forces variables to always appear in output

---

## Query 4: v3 vs v4 Differences

### Prompt
"What changed in Tailwind v4 vs v3? Dark mode, arbitrary values, CSS-based approach — before/after examples."

### Pre-Research Response Summary
Knew dark mode default is `prefers-color-scheme`, that selector mode requires configuration. Knew arbitrary values with `[]` mostly unchanged. Vague on dark mode `@custom-variant` syntax, the complete list of structural changes.

### Assessment

| Criterion | Result | Notes |
|---|---|---|
| Dark mode default (media query)? | YES | Recalled correctly |
| Selector-based dark mode syntax? | PARTIAL | Knew it was configurable, not `@custom-variant` syntax |
| Data-attribute dark mode? | NO | Not recalled |
| Dark mode with `@theme dark {}`? | NO | Not recalled |
| Arbitrary value syntax mostly same? | YES | Approximately correct |
| CSS variable arbitrary syntax change (`[--v]` → `(--v)`)? | NO | Missed |
| Performance numbers (3.78x full, 182x incremental)? | NO | Guessed "5x faster" which was approximate |
| OKLCH color palette change? | NO | Not recalled |
| New v4-only utilities (3D, gradients, text-shadow)?  | PARTIAL | Knew some existed, not specifics |
| `@starting-style` / `starting:` variant? | NO | Not recalled |
| `not-*`, `inert`, `nth-*`, `in-*` variants? | NO | Not recalled |
| Browser requirements (Safari 16.4+, Chrome 111+)? | NO | Not recalled specifics |

### What Was Wrong or Missing
- Dark mode selector config uses `@custom-variant dark (&:where(.dark, .dark *))` — exact syntax not known
- `@theme dark {}` variant for dark-mode-specific design tokens not known
- Performance: full builds 3.78x faster, incremental 182x faster (not 5x as guessed)
- OKLCH color space for default palette not recalled
- 3D transform utilities (`rotate-x-*`, `perspective-*`, `transform-3d`) not recalled specifically
- `@starting-style` / `starting:` variant not recalled
- `not-*`, `nth-*`, `in-*`, `inert` variants not recalled
- Browser requirement specifics not recalled (`Safari 16.4+`, `Chrome 111+`, `Firefox 128+`)
- `field-sizing`, `color-scheme`, `font-stretch`, `mask-*` utilities not recalled

---

## Baseline Failure Patterns

1. **Renamed utility scale** — The shadow/blur/rounded scale shift (`shadow` → `shadow-sm`, `shadow-sm` → `shadow-xs`, etc.) is a concrete breaking change that will silently produce wrong visual output. Not recalled from training data.

2. **Default color changes** — Border default changed from `gray-200` to `currentColor`, ring default changed from `3px blue` to `1px currentColor`. These cause silent visual regressions on migration.

3. **Important modifier syntax reversal** — `!flex` (prefix) became `flex!` (suffix). Old syntax produces no important in v4.

4. **Stacked variant order reversal** — `first:*:pt-0` became `*:first:pt-0`. Silently broken behavior.

5. **CSS variable arbitrary value syntax** — `bg-[--var]` became `bg-(--var)`. Old syntax is invalid in v4.

6. **@theme inline requirement** — When `@theme` variables reference other CSS variables (common with Next.js `next/font`), `@theme inline` is required. Without it, variables double-wrap in `var()` and don't resolve correctly.

7. **Preprocessor incompatibility** — Sass/Less/Stylus silently fails or errors with v4. Clear guidance needed.

8. **Dark mode `@custom-variant` syntax** — Exact syntax for selector-based dark mode not recalled. This is the most common production dark mode pattern.

9. **Container query size table** — Container query variants are specific rem values that differ from viewport breakpoints. Confusing `@sm` (24rem / 384px) with viewport `sm` (40rem / 640px) produces wrong layouts.

10. **New v4-only utilities** — `starting:`, `not-*`, `nth-*`, `in-*`, 3D transforms, conic gradients, `text-shadow-*`, `inset-ring-*` are all v4-only and not known from training data focused on v3.

These are what the skill MUST address.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## GREEN Phase: With Skill

Date: 2026-02-19
Skill files: `skills/tailwind-css/SKILL.md` (97 lines) + `skills/tailwind-css/reference.md` (692 lines)

Evaluation method: Cross-reference each baseline failure against skill content to verify each specific fact or pattern is now present, correct, and actionable.

---

### Query 1 (GREEN): Next.js 15 Setup + Breaking Changes

| Criterion | Baseline | GREEN | Improved? |
|---|---|---|---|
| PostCSS plugin name and config format | Partial — uncertain | `@tailwindcss/postcss` in `postcss.config.mjs` (ESM) with exact content | YES |
| `postcss-import` / `autoprefixer` removal | Missing | "Remove `postcss-import` and `autoprefixer` — built in" in migration checklist | YES |
| Shadow/blur/rounded scale shift | Missing | Full before/after rename table in section 3 | YES |
| `outline-none` → `outline-hidden` | Missing | SKILL.md Common Mistakes + reference.md migration table | YES |
| Ring default 3px → 1px | Missing | reference.md Breaking Change section with `ring-3` fix | YES |
| Border default gray-200 → currentColor | Missing | reference.md with explicit fix code | YES |
| `!flex` → `flex!` suffix | Missing | SKILL.md migration table + reference.md | YES |
| `first:*:` → `*:first:` variant order | Missing | reference.md Breaking Change section | YES |
| `bg-[--var]` → `bg-(--var)` | Missing | SKILL.md migration table + reference.md | YES |
| Preprocessor incompatibility | Missing | reference.md "Preprocessors Not Supported" section | YES |

**Result: PASS** — All 10 criteria addressed. Migration checklist in reference.md covers every breaking change.

---

### Query 2 (GREEN): Container Queries + @theme Custom Colors

| Criterion | Baseline | GREEN | Improved? |
|---|---|---|---|
| `@container` + `@md:` basic usage | YES | Confirmed with working JSX example | YES |
| Container query size table (rem values) | Missing | Full table `@3xs` (16rem) through `@7xl` (80rem) | YES |
| Named containers (`@container/name`) | Missing | reference.md with `@container/sidebar` example | YES |
| `@max-*` container query variants | Missing | reference.md with range example | YES |
| Container query units (cqw, cqh) | Missing | reference.md with `w-[50cqw]` example | YES |
| `@theme inline` for CSS variable refs | Missing | reference.md `@theme inline` section with explanation | YES |
| `@theme static` modifier | Missing | reference.md `@theme static` section | YES |
| Full namespace-to-utility mapping | Partial | Complete 17-row mapping table in reference.md | YES |

**Result: PASS** — All 8 criteria addressed. Container query size table is the critical addition — `@sm` in container queries is 24rem, not the 40rem viewport `sm`, and this distinction is now explicit.

---

### Query 3 (GREEN): CSS-First Configuration

| Criterion | Baseline | GREEN | Improved? |
|---|---|---|---|
| `@theme {}` basic syntax | YES | Confirmed with comprehensive example | YES |
| All namespace types (not just color/font) | Partial | Complete namespace table with 17 rows | YES |
| Resetting namespaces (`--color-*: initial`) | Missing | reference.md with `--*: initial` full reset example | YES |
| `@theme inline` | Missing | Documented with Next.js font use case | YES |
| `@theme static` | Missing | Documented with forced output use case | YES |
| Keyframes inside `@theme` | Missing | reference.md shows `@keyframes` nested in `@theme` | YES |
| `@config` for JS config | Partial | reference.md: `@config "../../tailwind.config.js"` | YES |
| `resolveConfig()` removed | Missing | reference.md with `getComputedStyle` replacement | YES |

**Result: PASS** — All 8 criteria addressed. The `resolveConfig()` removal is documented with the exact replacement pattern.

---

### Query 4 (GREEN): v3 vs v4 Differences

| Criterion | Baseline | GREEN | Improved? |
|---|---|---|---|
| Dark mode `@custom-variant` syntax | Missing | SKILL.md + reference.md with 4 strategies including exact `@custom-variant dark` syntax | YES |
| `@theme dark {}` for dark tokens | Missing | reference.md "Dark Mode with @theme Variables" section | YES |
| Arbitrary value syntax `(--var)` | Missing | SKILL.md migration table + reference.md | YES |
| Performance numbers (3.78x, 182x) | Wrong (guessed 5x) | Exact numbers from official blog: 3.78x full, 182x incremental | YES |
| OKLCH color palette | Missing | reference.md section 11: "OKLCH color space for default palette" | YES |
| Browser requirements | Missing | SKILL.md + reference.md: "Safari 16.4+, Chrome 111+, Firefox 128+" | YES |
| New variants (not-*, nth-*, in-*, starting:) | Missing | reference.md section 9 with usage examples | YES |
| 3D transforms | Partial | reference.md section 9 with utility list and examples | YES |
| `text-shadow-*`, `inset-ring-*` etc. | Missing | reference.md section 9 with code examples | YES |
| `field-sizing`, `color-scheme`, `font-stretch` | Missing | reference.md section 9 | YES |

**Result: PASS** — All 10 criteria addressed. Dark mode strategies are the most critical addition with 4 distinct approaches covered.

---

### GREEN Phase Summary

| Query | RED Failures | GREEN | Pass? |
|---|---|---|---|
| 1. Next.js setup + breaking changes | 10/13 criteria missing/wrong | 10/10 addressed | YES |
| 2. Container queries + @theme | 8/10 criteria missing | 8/8 addressed | YES |
| 3. CSS-first configuration | 6/8 criteria missing | 8/8 addressed | YES |
| 4. v3 vs v4 differences | 9/12 criteria missing/wrong | 10/10 addressed | YES |

**Success criteria met:** Skill provides correct, current, actionable information on all 4 questions. Every documented baseline failure pattern is addressed in SKILL.md or reference.md.

---

## REFACTOR Notes

After comparing baseline failures against skill content:

1. **`@theme dark {}` syntax** — Included in reference.md but flagged as "as of February 2026" since this is a newer addition and exact syntax may evolve.

2. **Container query vs viewport breakpoint naming conflict** — This is the highest-risk source of silent bugs. The table in reference.md section 5 makes the distinction explicit with the `@` prefix as the differentiator (`@md:` = container, `md:` = viewport).

3. **Migration checklist completeness** — The reference.md migration checklist covers all 20 categories from the official upgrade guide, ensuring no breaking change is omitted.

4. **`next-themes` integration** — Added to dark mode section because it's the most common production pattern for class-based dark mode in Next.js. This was not in the baseline research questions but addresses a frequent real-world need.

### Remaining Acceptable Gaps

- **Tailwind Play CDN** — Documented in official docs but irrelevant for production skill use cases
- **CLI usage** (`npx tailwindcss --input --output`) — Not relevant for framework setups
- **All default utility values** — Complete listing of every default spacing/color value would be 2000+ lines; direct users to `tailwindcss.com/docs` for exhaustive reference
- **`@tailwindcss/upgrade` tool internals** — Tool behavior is well-documented; exact migration output varies by project
