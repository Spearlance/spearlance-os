---
model: claude-sonnet-4-6
name: brand-asset-organizer
description: Use when organizing brand assets (logos, product images, fonts) into a standard directory structure. Also use when setting up brand-assets/ directory, generating asset README, or updating brand.json with file paths.
---

```
┏━ 📁 brand-asset-organizer ━━━━━━━━━━━━━━━━━━┓
┃ your friendly armadillo is here to serve you ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Overview

Takes scattered brand assets — logos, product images, fonts — and organizes them into a standard `brand-assets/` directory structure. Updates `brand.json` with correct file paths. Preserves originals by always copying, never moving.

Runs after `brand-knowledge-builder` (which creates `brand.json`) and before `brand-export` (which generates PDFs and delivery zips).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Target Directory Structure

```
brand-assets/
├── logos/
│   ├── primary/
│   │   ├── logo-primary-black.svg
│   │   ├── logo-primary-white.svg
│   │   ├── logo-primary-color.svg
│   │   └── logo-primary-black.png
│   ├── secondary/
│   ├── horizontal/
│   └── square/
├── product-images/
│   ├── {product-slug}/
│   │   ├── 48ct-front.png
│   │   └── 3pack-front.png
│   └── ...
├── fonts/
│   ├── FuturaPT-ExtraBold.woff2
│   └── FuturaPT-Demi.woff2
├── guidelines/
│   └── (generated PDFs land here)
└── README.md  ← auto-generated asset index
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step-by-Step Process

### Step 1 — Locate source assets

Ask the user where assets currently live. Accept any of:
- A folder path (e.g., `~/Downloads/Brand Assets/`)
- A zip file path (e.g., `~/Downloads/brand-kit.zip`)
- A list of scattered locations

▸ "Where are your brand assets right now? (folder path, zip file, or list of locations)"

### Step 2 — Extract zip if needed

If the source is a zip file, extract it to a temp directory before scanning:

```bash
mkdir -p /tmp/brand-assets-extract
unzip -q "path/to/brand-kit.zip" -d /tmp/brand-assets-extract
```

Proceed with `/tmp/brand-assets-extract` as the source.

### Step 3 — Scan and classify

Recursively scan the source location(s). List every found file with its detected type:

```
Found 14 files:
logo_black.svg         → logo
logo_white.svg         → logo
logo_horizontal.ai     → logo (AI — will skip, unsupported format)
product_48ct.png       → product image
product_trio_front.jpg → product image
FuturaPT-ExtraBold.otf → font
brand_guidelines.pdf   → guidelines
```

Supported formats: `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.pdf`

Unsupported formats (`.ai`, `.psd`, `.eps`, `.sketch`): list them and skip — do not copy.

### Step 4 — Auto-detect asset types

Normalize all filenames to lowercase before pattern matching.

**Logo detection** — filename contains any of:
- Identity tokens: `logo`, `mark`, `icon`, `wordmark`, `lockup`, `badge`
- Variant tokens: `primary`, `secondary`, `horizontal`, `square`, `stacked`, `vertical`
- Color tokens: `black`, `white`, `color`, `colour`, `dark`, `light`, `mono`, `grayscale`

**Product image detection** — filename contains any of:
- Product names from `brand.json` `products[]` array (if available)
- Generic tokens: `hero`, `front`, `back`, `side`, `angle`, `lifestyle`, `pack`, `bundle`
- Size identifiers: `48ct`, `3pack`, `12ct`, `single`, any number + `ct`/`oz`/`ml`/`pack`

**Font detection** — filename ends in `.woff`, `.woff2`, `.ttf`, `.otf` OR contains common weight tokens: `bold`, `medium`, `regular`, `light`, `thin`, `heavy`, `demi`, `semi`, `black`, `italic`

**Guidelines** — filename ends in `.pdf` or contains `guideline`, `brand guide`, `style guide`

When type is ambiguous, ask before proceeding:

▸ "I couldn't auto-classify `tribal_pattern.png` — is this a logo, product image, or something else?"

### Step 5 — Present mapping table

Before touching any files, show the full source → destination mapping:

```
Source                              → Destination
────────────────────────────────────────────────────────────────────────────
logo_black.svg                      → brand-assets/logos/primary/logo-primary-black.svg
logo_white.svg                      → brand-assets/logos/primary/logo-primary-white.svg
product_48ct_front.png              → brand-assets/product-images/fragrance-free/48ct-front.png
FuturaPT-ExtraBold.woff2            → brand-assets/fonts/FuturaPT-ExtraBold.woff2
brand_guidelines.pdf                → brand-assets/guidelines/brand-guidelines.pdf

⚠ Skipped (unsupported format):
logo_horizontal.ai                  → (AI files not supported — copy manually if needed)
```

### Step 6 — Get confirmation

▸ "Does this mapping look right? (yes/no — or tell me what to change)"

Do NOT proceed with file operations until the user confirms.

### Step 7 — Create directory structure

```bash
mkdir -p brand-assets/logos/primary
mkdir -p brand-assets/logos/secondary
mkdir -p brand-assets/logos/horizontal
mkdir -p brand-assets/logos/square
mkdir -p brand-assets/product-images
mkdir -p brand-assets/fonts
mkdir -p brand-assets/guidelines
```

Create product image subdirectories dynamically based on detected products.

### Step 8 — Copy files

ALWAYS use `cp`, NEVER `mv`. Preserve originals.

```bash
cp "source/logo_black.svg" "brand-assets/logos/primary/logo-primary-black.svg"
```

**Before overwriting an existing file**, prompt:

▸ "`brand-assets/logos/primary/logo-primary-black.svg` already exists. Overwrite? (yes/no/all)"

Accept `all` to overwrite all conflicts without further prompting.

Apply naming conventions during copy (rename on copy):
- Logos: `logo-{variant}-{color}.{ext}`
- Product images: `{product-slug}/{size}-{view}.{ext}`
- Fonts: `{FamilyName}-{Weight}.{ext}`

### Step 9 — Generate brand-assets/README.md

Auto-generate an asset index after copying:

```markdown
# Brand Assets

_Auto-generated by armadillo brand-asset-organizer — do not edit manually._

## Logos

| Variant | Color | Format | Path |
|---------|-------|--------|------|
| Primary | Black | SVG | logos/primary/logo-primary-black.svg |
| Primary | White | SVG | logos/primary/logo-primary-white.svg |
| Primary | Color | PNG | logos/primary/logo-primary-color.png |

## Product Images

| Product | File | Format | Path |
|---------|------|--------|------|
| Fragrance Free 48ct | 48ct-front | PNG | product-images/fragrance-free/48ct-front.png |

## Fonts

| Font Family | Weight | Format | Path |
|-------------|--------|--------|------|
| Futura PT | Extra Bold | WOFF2 | fonts/FuturaPT-ExtraBold.woff2 |
| Futura PT | Demi | WOFF2 | fonts/FuturaPT-Demi.woff2 |

## Guidelines

| Document | Path |
|----------|------|
| Brand Guidelines | guidelines/brand-guidelines.pdf |
```

### Step 10 — Update brand.json

If `brand.json` exists, update the `logos` and `products` sections with organized file paths.

**NEVER create brand.json from scratch** — that is `brand-knowledge-builder`'s job. If it doesn't exist, note it and skip this step.

Logo path update:

```json
{
  "logos": {
    "primary": {
      "svg": "brand-assets/logos/primary/logo-primary-black.svg",
      "svg_white": "brand-assets/logos/primary/logo-primary-white.svg",
      "svg_color": "brand-assets/logos/primary/logo-primary-color.svg",
      "png": "brand-assets/logos/primary/logo-primary-black.png"
    },
    "horizontal": {
      "svg": "brand-assets/logos/horizontal/logo-horizontal-black.svg"
    },
    "square": {
      "svg": "brand-assets/logos/square/logo-square-color.svg"
    }
  }
}
```

Product image path update (merge into existing products array):

```json
{
  "products": [
    {
      "name": "Fragrance Free",
      "slug": "fragrance-free",
      "images": {
        "48ct_front": "brand-assets/product-images/fragrance-free/48ct-front.png",
        "3pack_front": "brand-assets/product-images/fragrance-free/3pack-front.png"
      }
    }
  ]
}
```

Only update paths for files that were actually copied. Do not remove existing fields.

### Step 11 — Report and gap analysis

After completing all file operations, print a summary:

```
Organized 11 files → brand-assets/

logos/primary/    ✓  4 files
logos/horizontal/ ✓  2 files
logos/square/     ✓  1 file
product-images/   ✓  4 files
fonts/            ✓  2 files
guidelines/       ○  0 files (none found)

⚠ Missing variants detected:
  logo-primary-white.png   ✗  (have SVG, no PNG)
  logo-horizontal-white.*  ✗  (no white variant for horizontal)
  logo-square-black.*      ✗  (no black/white variants for square)

brand-assets/README.md    ✓  generated
brand.json logos section  ✓  updated
brand.json products       ◐  fragrance-free updated, 2 other products have no images
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Naming Conventions

| Asset Type | Pattern | Example |
|------------|---------|---------|
| Logo | `logo-{variant}-{color}.{ext}` | `logo-primary-black.svg` |
| Logo (square) | `logo-square-{color}.{ext}` | `logo-square-color.png` |
| Logo (horizontal) | `logo-horizontal-{color}.{ext}` | `logo-horizontal-white.svg` |
| Product image | `{product-slug}/{size}-{view}.{ext}` | `fragrance-free/48ct-front.png` |
| Font | `{FamilyName}-{Weight}.{ext}` | `FuturaPT-ExtraBold.woff2` |
| Guidelines PDF | `{descriptive-name}.pdf` | `brand-guidelines.pdf` |

**Slugification rules for product directories:**
- Lowercase everything
- Replace spaces and underscores with hyphens
- Remove special characters
- Example: `"Fragrance Free (48ct)"` → `fragrance-free`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Moving files instead of copying | ALWAYS use `cp`, never `mv` |
| Overwriting without asking | Prompt user before overwriting any existing file |
| Creating brand.json from scratch | Only update existing `brand.json`; creation is `brand-knowledge-builder`'s job |
| Ignoring case in filename detection | Normalize to lowercase before all pattern matching |
| Flat structure (all files in one dir) | Always create the full nested directory structure |
| Not reporting missing variants | Always run gap analysis and report what's missing |
| Copying unsupported formats (.ai, .psd) | Skip and list them — don't fail silently |
| Overwriting README.md without regenerating | Always regenerate README.md from current state after copying |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Context

This skill is part of the armadillo brand pack. It sits between:

- **Before:** `brand-knowledge-builder` — creates `brand.json` with brand identity data
- **This skill:** organizes physical asset files into standard structure, updates paths in `brand.json`
- **After:** `brand-export` — generates PDFs, brand guidelines, and delivery zips using the organized assets

If `brand.json` does not exist, suggest running `brand-knowledge-builder` first, then return here to organize assets.
