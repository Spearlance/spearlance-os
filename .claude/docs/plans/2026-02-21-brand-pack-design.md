# Brand Pack Design

**Date:** 2026-02-21
**Status:** Approved
**Scope:** Redesign the brand pack from 2 skills + 1 agent → 7 skills + 1 agent with full asset package production pipeline

## Problem

The current brand pack has:
- `brand-knowledge-builder` — interview/doc processing → `.claude/knowledge/` prose markdown
- `deepgram-transcription` — audio transcription reference
- `brand-strategist` agent — creative work from knowledge base

**What's missing:** There's no pipeline for producing a complete brand asset package — the kind of zip file (logos, brand voice PDF, guidelines 1-pager, product images) a client hands a partner. The knowledge builder writes prose but doesn't extract structured data (colors, fonts, logo variants, phrase dictionaries). There's no asset discovery, no file organization, no export, and no compliance checking.

## Goal

A brand pack that takes a project from **zero brand assets → complete brand system**:
- **Internal:** `brand.json` + `.claude/knowledge/` + organized `/brand-assets/` directory
- **External:** Exportable client-facing asset package (PDFs + organized asset zip)

**Input sources:** Socratic interview + existing scattered assets + documents (PDFs, slides) + audio recordings — full mix.

## Architecture: Orchestrator + Domain Skills

Mirrors the `opencode-pimp` pattern — one orchestrator routes to specialized domain skills.

### Pack Structure

```
packs/brand/
├── skills/
│   ├── brand-pimp/              ← NEW orchestrator
│   │   └── SKILL.md
│   ├── brand-discovery/         ← NEW audit/scan
│   │   └── SKILL.md
│   ├── brand-knowledge-builder/ ← ENHANCE existing
│   │   └── SKILL.md
│   ├── brand-asset-organizer/   ← NEW file organization + brand.json
│   │   └── SKILL.md
│   ├── brand-export/            ← NEW deliverable generation
│   │   └── SKILL.md
│   ├── brand-compliance/        ← NEW content checking
│   │   └── SKILL.md
│   └── deepgram-transcription/  ← EXISTS (unchanged)
│       ├── SKILL.md
│       └── reference.md
```

**Agent** (in `.claude/agents/`):
- `brand-strategist.md` — enhanced to also consume `brand.json` and visual identity

### Component Summary

| Component | Type | Status | Role |
|-----------|------|--------|------|
| `brand-pimp` | Orchestrator skill | NEW | Routes all brand requests to the right sub-skill |
| `brand-discovery` | Workflow skill | NEW | Scans project for existing brand assets, generates gap report |
| `brand-knowledge-builder` | Workflow skill | ENHANCE | Interview + docs + audio → knowledge base (add visual identity, dictionary, product catalog sections) |
| `brand-asset-organizer` | Workflow skill | NEW | Organizes physical files into standard `/brand-assets/` directory + generates `brand.json` |
| `brand-export` | Workflow skill | NEW | Generates client-facing deliverables — brand voice PDF, guidelines 1-pager, organized asset zip |
| `brand-compliance` | Workflow skill | NEW | Checks content/code against brand guidelines |
| `deepgram-transcription` | Reference skill | EXISTS | Audio transcription API reference |
| `brand-strategist` | Agent | ENHANCE | Creative work consuming knowledge base + brand.json |

## Skill Details

### brand-pimp — Orchestrator

Routes all brand requests. Checks project state and routes accordingly.

**Routing table:**

| User says... | Routes to |
|-------------|-----------|
| "audit brand assets", "what brand stuff do we have" | `brand-discovery` |
| "build brand knowledge", "brand interview", "process brand docs" | `brand-knowledge-builder` |
| "organize brand assets", "set up brand.json" | `brand-asset-organizer` |
| "export brand package", "generate brand PDF", "create asset zip" | `brand-export` |
| "check brand compliance", "is this on-brand" | `brand-compliance` |
| Creative/content work | `brand-strategist` agent |

**Full pipeline mode:** If user says "build my brand from scratch" → chains: `discovery` → `knowledge-builder` → `asset-organizer` → `export`.

**State detection:**
- No brand system at all → suggests full pipeline
- Parts exist → routes to what's needed
- Everything exists → routes to strategist for creative work

### brand-discovery — Audit & Gap Report

Scans the project and reports what brand assets exist vs what's missing.

**What it scans for:**

| Category | Files it looks for |
|----------|-------------------|
| Knowledge base | `.claude/knowledge/` — which files exist, which are populated |
| Brand config | `brand.json`, `business.json`, `brand-assets/` directory |
| Logos | `*.svg`, `*.png`, `*.jpg`, `*.ai`, `*.eps`, `*.pdf` in common dirs (`/assets`, `/public`, `/images`, `/brand`) |
| Fonts | `*.woff`, `*.woff2`, `*.ttf`, `*.otf` + CSS `@font-face` declarations |
| Colors | Tailwind config, CSS variables, design tokens — extract hex values |
| Product images | Image files with product-like naming patterns |
| Brand docs | PDFs, markdown with brand/voice/guidelines in the name |

**Output format:**

```
Brand Discovery Report
━━━━━━━━━━━━━━━━━━━━━
Knowledge Base    ◐  3/7 sections populated
brand.json        ✗  not found
Logo files        ✓  4 SVGs in /public
Font files        ✗  none found (using Google Fonts CDN?)
Color system      ✓  12 colors in tailwind.config
Product images    ◐  2 PNGs, missing hero shots
Brand voice doc   ✗  not found
Guidelines PDF    ✗  not found

▸ Recommended: run brand-knowledge-builder to fill gaps
```

### brand-knowledge-builder — Enhanced

**New sections added (10 total, up from 7):**

| Section | Status | Description |
|---------|--------|-------------|
| `brand-identity.md` | EXISTS | Mission, values, personality, story |
| `audience-profiles.md` | EXISTS | Personas, pain points, channels |
| `voice-and-tone.md` | EXISTS | How the brand communicates |
| `messaging-framework.md` | EXISTS | Value props, elevator pitch, proof points |
| `competitive-landscape.md` | EXISTS | Competitors, differentiation |
| `content-strategy.md` | EXISTS | Topics, channels, cadence |
| `business-model.md` | EXISTS | Revenue, pricing, engagement model |
| `visual-identity.md` | **NEW** | Colors (primary + product variants with hex/RGB), fonts (header/subheader/body with weights), logo usage rules, image style guide |
| `brand-dictionary.md` | **NEW** | Approved phrases, slogans, terminology, things to never say, legal restrictions |
| `product-catalog.md` | **NEW** | Product lines, SKUs, variants, descriptions, hero image mappings |

**New output: `brand.json`** — machine-readable structured data generated alongside the knowledge base:

```json
{
  "name": "DUDE Wipes",
  "tagline": "Best clean, pants down.",
  "colors": {
    "primary": { "black": "#000000", "white": "#FFFFFF", "brand-blue": "#43C7FF" },
    "products": {
      "fragrance-free": "#43C7FF",
      "mint-chill": "#16DFD5",
      "shea-butter-smooth": "#FFD676"
    }
  },
  "fonts": {
    "header": "Futura PT Extra Bold",
    "subheader": "Futura PT Bold",
    "body": "Futura PT Demi"
  },
  "logos": {
    "primary": { "svg": "brand-assets/logos/primary/logo.svg", "png": "..." },
    "secondary": { "svg": "...", "png": "..." },
    "square": { "svg": "...", "png": "..." }
  },
  "products": [
    { "name": "Fragrance Free", "sku": "48ct-FF", "color": "#43C7FF" }
  ]
}
```

### brand-asset-organizer — File Structure

Takes scattered assets and organizes them into a standard directory.

**Target structure:**

```
brand-assets/
├── logos/
│   ├── primary/
│   │   ├── logo-black.svg
│   │   ├── logo-white.svg
│   │   ├── logo-color.svg
│   │   └── logo-black.png
│   ├── secondary/
│   ├── horizontal/
│   └── square/
├── product-images/
│   ├── fragrance-free/
│   │   ├── 48ct-front.png
│   │   └── 3pack-front.png
│   └── mint-chill/
├── fonts/
│   ├── FuturaPT-ExtraBold.woff2
│   └── FuturaPT-Demi.woff2
├── guidelines/
│   └── (generated PDFs land here)
└── README.md  ← auto-generated asset index
```

**Key behaviors:**
- Copies (never moves) files from their current locations
- Renames to consistent naming convention
- Generates `README.md` with asset index
- Updates `brand.json` with correct file paths
- Identifies missing variants (e.g., "you have SVG but no PNG")

### brand-export — Client Deliverables

Generates the exportable asset package (like the DUDE Wipes zip).

**What it produces:**

1. **Brand Voice Document (multi-page PDF)** — from `brand-dictionary.md`, `voice-and-tone.md`, `messaging-framework.md`
   - Brand positioning
   - Reason to believe
   - Phrase dictionary
   - What not to say / legal restrictions

2. **Brand Guidelines 1-Pager (PDF)** — from `visual-identity.md`, `brand.json`
   - Logo usage (primary, secondary, variants)
   - Fonts (header, subheader, body)
   - Color palette (primary + product colors)
   - Product pack images

3. **Organized asset zip** — the `brand-assets/` directory zipped with PDFs included

**PDF generation:** HTML templates + `puppeteer` (existing skill) for HTML→PDF conversion.

### brand-compliance — Content Checking

Given content (copy, component, page), checks against brand rules.

**What it checks:**

| Check | Source |
|-------|--------|
| Voice/tone match | `voice-and-tone.md` |
| Forbidden phrases | `brand-dictionary.md` (what not to say) |
| Color usage | `brand.json` colors vs what's in the code |
| Font usage | `brand.json` fonts vs what's in CSS |
| Logo usage | Logo rules from `visual-identity.md` |
| On-message | `messaging-framework.md` value props |

**Output:** Compliance report with pass/fail per category.

## Reference Skills

| Skill | Status | Why |
|-------|--------|-----|
| `deepgram-transcription` | EXISTS | Audio processing |
| `puppeteer` | EXISTS (separate pack) | HTML→PDF for brand export |
| New reference skills | **None needed** | Puppeteer covers PDF gen, file ops are native, zip is trivial |

## Shepherd Routing Updates

Add to the routing table:

```markdown
### Brand

| Request | Skill |
|---------|-------|
| ANYTHING brand-related (brand audit, build, voice, assets, guidelines) | `brand-pimp` |
| Brand audit, what brand assets exist | `brand-pimp` → `brand-discovery` |
| Brand interview, build brand, process brand docs | `brand-pimp` → `brand-knowledge-builder` |
| Organize brand assets, set up brand.json | `brand-pimp` → `brand-asset-organizer` |
| Export brand package, generate brand PDF | `brand-pimp` → `brand-export` |
| Check brand compliance, is this on-brand | `brand-pimp` → `brand-compliance` |
```

## DUDE Wipes Example Walkthrough

To illustrate how this pack would produce the DUDE Wipes asset package:

1. **brand-discovery** → scans project, finds nothing → "clean slate, recommend full pipeline"
2. **brand-knowledge-builder** → Socratic interview builds:
   - Brand positioning: "For Dudes who are tired of the worries toilet paper leaves behind..."
   - Visual identity: Futura PT fonts, hex colors per product line, logo usage rules
   - Brand dictionary: "Best clean, pants down", "Don't be an A-hole to your B-hole", etc.
   - What not to say: flushability narrative, intimacy use cases
   - Product catalog: 48ct and 3-pack variants across 6 product lines
   - Generates `brand.json` with all structured data
3. **brand-asset-organizer** → user provides logo files and product images → organizes into `brand-assets/` directory, updates `brand.json` paths
4. **brand-export** → generates:
   - `Brand Voice Document.pdf` (multi-page, matches the 26-page DUDE Wipes example)
   - `Brand Guidelines 1-Pager.pdf` (matches the DUDE Wipes guidelines format)
   - `DUDE-Wipes-Asset-Package.zip` with everything organized

## Alternatives Considered

**Approach B: Enhanced Monolith** — beef up `brand-knowledge-builder` to do everything. Rejected: 800+ line skill, violates single responsibility.

**Approach C: Minimal** — just add export and discovery. Rejected: knowledge builder stays prose-only, no structured visual identity, no asset organization.
