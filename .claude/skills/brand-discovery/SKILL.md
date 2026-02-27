---
model: claude-sonnet-4-6
name: brand-discovery
description: Use when auditing a project for existing brand assets, scanning for logos, fonts, colors, product images, brand docs, or generating a brand gap report. Also use when starting brand work to understand current state.
---

# Brand Discovery

```
┏━ 🔍 brand-discovery ━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Scanning project for brand assets and gaps  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Overview

Read-only audit skill. Scans the project for existing brand assets and generates a gap report showing what exists vs what's missing. Output determines which brand skill to run next.

This is the entry point for all brand work. Run it before anything else.

## Scan Categories

| Category | What to scan for | How to scan |
|----------|-----------------|-------------|
| Knowledge base | `.claude/knowledge/` — list files, check which are populated vs empty | Glob for `.claude/knowledge/**/*.md`, read `config.json` |
| Brand config | `brand.json` at project root, `business.json`, `brand-assets/` directory | Check file existence |
| Logos | `*.svg`, `*.png`, `*.jpg`, `*.ai`, `*.eps`, `*.pdf` in `/assets`, `/public`, `/images`, `/brand`, `/static` | Glob with multiple patterns |
| Fonts | `*.woff`, `*.woff2`, `*.ttf`, `*.otf` + CSS `@font-face` declarations | Glob + Grep in CSS/SCSS |
| Colors | Tailwind config color definitions, CSS `--color-` variables, design tokens | Read tailwind config, Grep CSS vars |
| Product images | Image files with product-like naming (pack, product, hero, front, variant) | Glob + filename pattern matching |
| Brand docs | PDFs and markdown with "brand", "voice", "guidelines", "style" in filename | Glob with name patterns |

## Step-by-Step Process

### Step 1: Check Knowledge Base State

1. Glob for `.claude/knowledge/**/*.md`
2. If no files found → knowledge base does not exist
3. If files exist → read `.claude/knowledge/config.json` to get section list
4. For each section in config: read the file and check if it has substantive content (not just template headers/placeholders)
5. Count: total sections, populated sections, empty sections

**Populated vs empty distinction:** A file is "populated" only if it contains real content beyond template boilerplate. An empty file that exists is reported as empty — not as present.

### Step 2: Check Brand Config Files

Check existence of:
- `brand.json` at project root
- `business.json` at project root
- `brand-assets/` directory
- `brand-assets/config.json` (if directory exists)

For each that exists: note whether it has real content or is an empty/stub file.

### Step 3: Scan for Logo Files

Glob these patterns across `/assets`, `/public`, `/images`, `/brand`, `/static`, and project root:
- `**/*.svg`
- `**/*.ai`
- `**/*.eps`

Then filter results for logo-like filenames: files containing "logo", "wordmark", "icon", "mark", "badge", or "lockup" in the filename.

Also check for generic image files (`*.png`, `*.jpg`, `*.jpeg`) with those same naming patterns.

Report: count by type, exact paths, which directories they live in.

### Step 4: Scan for Font Files

Glob for font files:
- `**/*.woff`
- `**/*.woff2`
- `**/*.ttf`
- `**/*.otf`

Then Grep CSS and SCSS files for `@font-face` declarations to catch CDN-loaded fonts (Google Fonts, Adobe Fonts, etc.):

```
pattern: @font-face
glob: **/*.{css,scss,sass}
```

Also Grep for Google Fonts `<link>` tags in HTML/JSX:

```
pattern: fonts\.googleapis\.com
glob: **/*.{html,jsx,tsx,astro,svelte}
```

Report: local font files found, CDN font families detected, or "none found."

### Step 5: Scan for Color Definitions

Check for Tailwind config:
- `tailwind.config.js`
- `tailwind.config.ts`
- `tailwind.config.mjs`

If found, read it and extract the `theme.colors` and `theme.extend.colors` blocks. Count unique color definitions.

Grep for CSS custom properties:

```
pattern: --color-
glob: **/*.{css,scss,sass}
output_mode: count
```

Also check for design token files:
- `tokens.json`
- `design-tokens.json`
- `tokens/` directory

Report: color count by source (tailwind, CSS vars, tokens).

### Step 6: Scan for Product Images

Glob for images with product-like naming across `/assets`, `/public`, `/images`, `/static`:

Filename patterns to match (case-insensitive): `product`, `pack`, `hero`, `front`, `back`, `variant`, `swatch`, `lifestyle`, `pdp`, `sku`

```
**/*product*.*
**/*pack*.*
**/*hero*.*
**/*front*.*
**/*variant*.*
```

Report: count by type, flag if "hero" images are missing (common gap).

### Step 7: Scan for Brand Documents

Glob for PDFs and markdown files with brand-related names:

```
**/*brand*.*
**/*voice*.*
**/*guidelines*.*
**/*style-guide*.*
**/*identity*.*
**/*playbook*.*
```

Check both `.pdf` and `.md` extensions. Also check `.claude/knowledge/` for brand docs already imported.

Report: file names and locations found.

### Step 8: Generate Gap Report

After completing all scans, compile and output the full discovery report:

```
Brand Discovery Report
━━━━━━━━━━━━━━━━━━━━━
Knowledge Base    ◐  3/10 sections populated
brand.json        ✗  not found
Logo files        ✓  4 SVGs in /public
Font files        ✗  none found (using Google Fonts CDN?)
Color system      ✓  12 colors in tailwind.config
Product images    ◐  2 PNGs, missing hero shots
Brand voice doc   ✗  not found
Guidelines PDF    ✗  not found

▸ Recommended: run brand-knowledge-builder to fill gaps
```

Use these markers:
- `✓` — present and has real content
- `◐` — partially present (some found, some missing)
- `✗` — not found or empty

Always include specific counts and file paths, not just existence.

### Step 9: Recommend Next Steps

Apply the recommendation engine rules (exactly one recommendation, the most relevant one):

| Condition | Recommendation |
|-----------|---------------|
| No knowledge base at all | Run `brand-knowledge-builder` to create brand knowledge base |
| Knowledge base exists but no `brand.json` | Run `brand-knowledge-builder` to generate `brand.json` from knowledge base |
| Assets found but scattered across multiple directories | Run `brand-asset-organizer` to organize into `brand-assets/` |
| Knowledge base and assets complete but no PDF deliverables | Run `brand-export` to generate deliverables |
| Everything present and populated | Brand system complete. Use `brand-strategist` for creative work |

## Output Format

The discovery report is always the final output. No fluff before it — scan silently, report once.

```
Brand Discovery Report
━━━━━━━━━━━━━━━━━━━━━
Knowledge Base    ◐  3/10 sections populated
                     ✓ brand-identity, audience-profiles, voice-and-tone
                     ✗ messaging-framework, competitive-landscape, content-strategy (+ 4 more)
brand.json        ✗  not found
business.json     ✓  present with content
brand-assets/     ✗  directory not found
Logo files        ✓  4 files — /public/logo.svg, /public/logo-dark.svg, /assets/icon.svg, /brand/wordmark.ai
Font files        ◐  0 local files — Google Fonts detected (Inter, Playfair Display)
Color system      ✓  12 colors in tailwind.config.js
Product images    ◐  2 PNGs in /public/images — missing hero shots
Brand voice doc   ✗  not found
Guidelines PDF    ✗  not found

▸ Recommended: run brand-knowledge-builder to populate remaining 7 sections
```

## Key Behaviors

- **NEVER modify any files** — this skill is read-only. No writes, no creates, no deletes.
- **Report counts and locations**, not just existence. "4 SVGs in /public" beats "logos found."
- **Distinguish empty-exists from not-found.** A file with only template headers is empty.
- **Check `config.json` for section status** — a section disabled in config is a choice, not a gap. Note it as "disabled" not "missing."
- **For knowledge base, list specific sections** — which are populated vs empty, by name.
- **Scan silently** — run all 7 scans before outputting anything. Don't narrate each step.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reporting a file as "present" when it's empty or stub | Read the file — check for real content beyond headers |
| Treating CDN fonts as "no fonts" | Grep for Google Fonts / Adobe Fonts CDN links — report what's detected |
| Modifying or creating any files during the audit | This skill is read-only — discovery only |
| Running scans one-at-a-time with output between each | Scan all categories first, then generate one consolidated report |
| Giving multiple recommendations | Pick the single most relevant next step |
| Ignoring `config.json` disabled sections | A disabled section is intentional — don't flag it as a gap |
| Reporting relative paths | Always report full paths from project root |
| Skipping the knowledge base section count | List exactly which sections are populated and which are empty — by name |
