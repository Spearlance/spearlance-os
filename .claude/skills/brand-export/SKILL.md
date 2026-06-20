---
model: claude-sonnet-4-6
name: brand-export
description: Use when generating client-facing brand deliverables — brand voice PDF, brand guidelines 1-pager PDF, or a complete asset package zip. Also use when exporting brand assets for external use.
---

# Brand Export

## Overview

Generates exportable client-facing brand deliverables from the knowledge base and organized assets. Produces PDFs and zip packages matching the quality of professional brand asset packages. This is the final step in the brand pipeline — runs after `brand-knowledge-builder` (knowledge base + `brand.json`) and `brand-asset-organizer` (organized assets).

## Prerequisites

Verify these exist before starting any export:

| Prerequisite | Required For | If Missing |
|---|---|---|
| `.claude/knowledge/config.json` with enabled sections | Any export | Run `brand-knowledge-builder` first |
| `brand.json` at project root | Guidelines PDF | Run `brand-knowledge-builder` first |
| `brand-assets/` directory | Full package ZIP | Run `brand-asset-organizer` first (optional for PDF-only) |

If prerequisites are missing, tell the user exactly which skill to run first. Do not proceed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Export Modes

### Mode 1: Brand Voice Document (multi-page PDF)

A4 portrait format. Each knowledge base file maps to one or more pages:

| Source File | PDF Output |
|---|---|
| `brand-identity.md` | Page 1 — Brand positioning: mission, values, personality |
| `messaging-framework.md` | Page 2 — Reason to believe / value propositions |
| `brand-dictionary.md` | Pages 3–4 — Approved phrases, terminology, brand dictionary |
| `brand-dictionary.md` (what not to say section) | Page 5 — Restrictions and legal guidelines |
| `voice-and-tone.md` | Page 6 — Voice guide, call-out examples, social media style |

Output: `brand-assets/guidelines/Brand-Voice-Document.pdf`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Mode 2: Brand Guidelines 1-Pager (single-page PDF)

A4 landscape format. All sections on one page:

| Section | Source |
|---|---|
| Logo usage (primary, secondary, horizontal, square) | `visual-identity.md` + `brand-assets/logos/` |
| Fonts: header, subheader, body with examples | `brand.json` |
| Color palette: primary + product variant colors with hex swatches | `brand.json` |
| Product pack images | `brand-assets/product-images/` |

Output: `brand-assets/guidelines/Brand-Guidelines.pdf`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Mode 3: Complete Asset Package (ZIP)

Bundle all deliverables into a single client handoff:

```
{BrandName}-Asset-Package.zip
├── Brand Voice Document.pdf
├── Brand Guidelines 1-Pager.pdf
├── logos/
├── product-images/
├── fonts/
└── README.md              ← auto-generated asset index
```

Output: `{BrandName}-Asset-Package.zip` at project root
Brand name comes from `brand.json` name field — slugified (`"DUDE Wipes"` → `"DUDE-Wipes"`)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PDF Generation Approach

Build HTML with everything inline — no external dependencies:

- **All styles inline** — no external CSS, no CDN links, no `<link>` tags
- **All images base64** — embed logos and product images as data URIs
- **Brand colors from `brand.json`** — use for headers, accents, color swatches
- **Color swatches** — render actual colored `<div>` rectangles with hex labels underneath
- **Font sections** — show font name + weight + sample sentence
- **Page numbers** — included in multi-page PDFs (CSS counter or explicit labels)

Use the `puppeteer` skill for HTML → PDF conversion:

```bash
# Launch headless Chrome, navigate to the temp HTML file, print to PDF
# A4 portrait:  { width: '210mm', height: '297mm' }
# A4 landscape: { width: '297mm', height: '210mm' }
```

Save all generated PDFs to `brand-assets/guidelines/`. Create the directory if it doesn't exist:

```bash
mkdir -p brand-assets/guidelines
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step-by-Step Process

**Step 1 — Read source data**

Read `brand.json` and all enabled knowledge base files from `.claude/knowledge/`. Never use cached data — always re-read fresh.

**Step 2 — Ask user which deliverables to generate**

```
▸ Which deliverables?
  [1] Brand Voice Document (multi-page PDF)
  [2] Brand Guidelines 1-Pager (single-page PDF)
  [3] Complete Asset Package (ZIP — includes both PDFs + all assets)
  [4] All of the above
```

**Step 3 — Generate each selected deliverable**

For each deliverable:

a. Build HTML string with inline CSS and base64-encoded images
b. Write HTML to a temp file (e.g., `/tmp/brand-voice.html`)
c. Use puppeteer to convert HTML → PDF at the correct paper size
d. Save PDF to `brand-assets/guidelines/`

**Step 4 — If full ZIP selected, bundle with system zip**

```bash
cd brand-assets && zip -r "../{BrandName}-Asset-Package.zip" . -x "*.DS_Store"
```

Include the auto-generated `README.md` asset index inside the zip before bundling.

**Step 5 — Report results**

Show output file locations and sizes:

```
Brand Voice Document.pdf      ✓  brand-assets/guidelines/  (142 KB)
Brand Guidelines 1-Pager.pdf  ✓  brand-assets/guidelines/  (89 KB)
DUDE-Wipes-Asset-Package.zip  ✓  project root              (4.2 MB)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Behaviors

- Always re-read knowledge base and `brand.json` on every run — never cache between runs
- Fail gracefully on missing sections — generate what's available, note gaps in output
- Brand name in filenames comes from `brand.json` name field
- If `brand.json` has product variant colors, render each as a labeled hex swatch
- If `brand-assets/guidelines/` doesn't exist, create it with `mkdir -p` before saving

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| External CSS/image references in HTML | All styles inline, all images base64 |
| Generating without reading fresh data | Always re-read `brand.json` and knowledge base |
| Failing hard on missing sections | Generate what's available, note gaps in output |
| Not creating `guidelines/` directory | `mkdir -p brand-assets/guidelines` before saving PDFs |
| Using brand name with spaces in zip filename | Slugify: `"DUDE Wipes"` → `"DUDE-Wipes"` |
| Forgetting to exclude `.DS_Store` from zip | Always use `-x "*.DS_Store"` flag |
