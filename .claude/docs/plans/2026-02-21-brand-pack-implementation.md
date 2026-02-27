# Brand Pack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Build the brand pack from 2 skills + 1 agent → 7 skills + 1 agent, with an orchestrator + domain skills pipeline for producing brand asset packages from scratch.

**Architecture:** Orchestrator pattern (mirrors opencode-pimp). `brand-pimp` routes all brand requests to 5 domain skills: discovery, knowledge-builder (enhanced), asset-organizer, export, compliance. All skills live in `packs/brand/skills/`. The `brand-strategist` agent is enhanced to consume `brand.json`.

**Tech Stack:** Markdown skill files (SKILL.md), armadillo.json manifest, armadillo-shepherd routing, build-claude-md.js pipeline.

**Design doc:** `.claude/docs/plans/2026-02-21-brand-pack-design.md`

---

### Task 1: Create `brand-pimp` orchestrator skill

**Files:**
- Create: `packs/brand/skills/brand-pimp/SKILL.md`

**Step 1: Create directory and write SKILL.md**

Create `packs/brand/skills/brand-pimp/SKILL.md` with:

**Frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: brand-pimp
description: Active router for ALL brand requests — classifies and routes to the correct brand-* skill before any response. Use when anything involves brand assets, brand voice, brand guidelines, brand audit, brand export, or brand compliance.
---
```

**Content requirements (write the full skill):**
- Mandatory announcement box with 🎨 emoji: `┏━ 🎨 brand-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`
- `<EXTREMELY-IMPORTANT>` gate block requiring routing before any response
- Quick Context section explaining what the brand pack does
- Routing table mapping requests to sub-skills:

| Request Pattern | Skill |
|----------------|-------|
| Brand audit, asset scan, gap report, "what brand stuff do we have" | `brand-discovery` |
| Brand interview, build knowledge, process brand docs, process audio | `brand-knowledge-builder` |
| Organize assets, set up brand.json, organize logos/images | `brand-asset-organizer` |
| Export brand package, generate PDF, create asset zip, client deliverables | `brand-export` |
| Brand compliance check, is this on-brand, content review | `brand-compliance` |
| Creative work, copywriting, content creation, brand strategy | → `brand-strategist` agent |

- Cross-cutting rules section (how to handle multi-skill requests, priorities)
- Full pipeline mode: when user says "build my brand from scratch" → chain: `discovery` → `knowledge-builder` → `asset-organizer` → `export`
- State detection section: check for `brand.json`, `.claude/knowledge/config.json`, `brand-assets/` directory to determine what exists
- Hard rules: never respond before routing, no summarizing, ask ONE clarifying question if unclear
- Mirror the structure of `packs/opencode/skills/opencode-pimp/SKILL.md` closely

**Step 2: Verify frontmatter**

Run: `node -e "const fs = require('fs'); const c = fs.readFileSync('packs/brand/skills/brand-pimp/SKILL.md','utf8'); const m = c.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'VALID frontmatter' : 'MISSING frontmatter'); if(m) { console.log(m[1].includes('name: brand-pimp') ? '✓ name' : '✗ name'); console.log(m[1].includes('model:') ? '✓ model' : '✗ model'); console.log(m[1].includes('description:') ? '✓ desc' : '✗ desc'); }"`
Expected: All ✓

**Step 3: Commit**

```bash
git add packs/brand/skills/brand-pimp/SKILL.md
git commit -m "feat(brand): add brand-pimp orchestrator skill"
```

---

### Task 2: Create `brand-discovery` skill

**Files:**
- Create: `packs/brand/skills/brand-discovery/SKILL.md`

**Step 1: Create directory and write SKILL.md**

Create `packs/brand/skills/brand-discovery/SKILL.md` with:

**Frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: brand-discovery
description: Use when auditing a project for existing brand assets, scanning for logos, fonts, colors, product images, brand docs, or generating a brand gap report. Also use when starting brand work to understand current state.
---
```

**Content requirements (write the full skill):**
- Mandatory announcement box with 🔍 emoji
- Overview: scans project for existing brand assets and generates a gap report
- Scan categories table:

| Category | What to scan for |
|----------|-----------------|
| Knowledge base | `.claude/knowledge/` — list files, check which are populated vs empty |
| Brand config | `brand.json` at project root, `business.json`, `brand-assets/` directory |
| Logos | Glob for `*.svg`, `*.png`, `*.jpg`, `*.ai`, `*.eps`, `*.pdf` in `/assets`, `/public`, `/images`, `/brand`, `/static`, project root |
| Fonts | Glob for `*.woff`, `*.woff2`, `*.ttf`, `*.otf` + grep for `@font-face` in CSS/SCSS files |
| Colors | Check `tailwind.config.*` for color definitions, grep for CSS `--color-` variables, check for design tokens files |
| Product images | Image files with product-like naming (e.g., contains pack, product, hero, front, variant names) |
| Brand docs | PDFs and markdown containing "brand", "voice", "guidelines", "style" in filename |

- Step-by-step scan process (use Glob and Grep tools)
- Output format: status table using armadillo markers (✓/✗/◐) for each category
- Recommendation engine: based on what's missing, suggest next steps (which brand skill to run)
- Key behaviors:
  - NEVER modify any files — read-only audit
  - Report counts and locations, not just existence
  - Distinguish between "empty file exists" and "no file"
  - Check `.claude/knowledge/config.json` for enabled/disabled sections

**Step 2: Verify frontmatter**

Run: `node -e "const fs = require('fs'); const c = fs.readFileSync('packs/brand/skills/brand-discovery/SKILL.md','utf8'); const m = c.match(/^---\n([\s\S]*?)\n---/); console.log(m ? 'VALID' : 'MISSING'); if(m) { console.log(m[1].includes('name: brand-discovery') ? '✓' : '✗'); }"`
Expected: VALID ✓

**Step 3: Commit**

```bash
git add packs/brand/skills/brand-discovery/SKILL.md
git commit -m "feat(brand): add brand-discovery audit skill"
```

---

### Task 3: Enhance `brand-knowledge-builder` skill

**Files:**
- Modify: `packs/brand/skills/brand-knowledge-builder/SKILL.md`

**Step 1: Read the existing SKILL.md carefully**

Read: `packs/brand/skills/brand-knowledge-builder/SKILL.md`
Understand the full existing structure (243 lines), especially the section templates, interview flow, and gap detection.

**Step 2: Add three new knowledge base sections**

Add to the section table and interview question banks:

1. **`visual-identity.md`** — new template section:
   - Colors: primary palette (name + hex + RGB), product/variant colors (name + hex), background colors, text colors
   - Fonts: header (family + weight), subheader (family + weight), body (family + weight), accent/decorative
   - Logo usage: primary logo description, secondary logo, horizontal, square, minimum size, clear space rules, prohibited usage
   - Image style: photography style, illustration style, icon style, mood/atmosphere

   Interview questions for visual identity:
   - What are your brand's primary colors? (provide hex codes if known)
   - Do different products/variants have their own colors?
   - What fonts does your brand use for headings vs body text?
   - Describe your logo variants (primary, secondary, icon-only)
   - What's the overall visual style? (modern/classic, minimal/bold, etc.)

2. **`brand-dictionary.md`** — new template section:
   - Approved phrases: slogans, taglines, catchphrases with usage context
   - Terminology: brand-specific terms and their definitions
   - What not to say: forbidden phrases, topics to avoid, legal restrictions
   - Competitor terms: words/phrases to never associate with the brand

   Interview questions for brand dictionary:
   - What are your brand's key slogans or catchphrases?
   - Are there specific terms or phrases unique to your brand?
   - What topics or phrases should NEVER be used in brand communications?
   - Are there legal/compliance restrictions on what can be said?

3. **`product-catalog.md`** — new template section:
   - Product lines: name, description, target audience
   - SKUs/variants: name, SKU code, associated color, hero image reference
   - Pricing tiers (if public)
   - Product hierarchy (categories → products → variants)

   Interview questions for product catalog:
   - What are your main product lines?
   - What variants/flavors/sizes exist for each?
   - Do products have associated colors or visual identifiers?

**Step 3: Add brand.json generation step**

After Step 8 (Write Knowledge Base Files) and before Step 9 (Update Config), add a new step:

**Step 8.5: Generate brand.json**

After writing all knowledge base files, generate `brand.json` at the project root with structured, machine-readable data extracted from the knowledge base:

```json
{
  "name": "",
  "tagline": "",
  "colors": {
    "primary": {},
    "products": {}
  },
  "fonts": {
    "header": "",
    "subheader": "",
    "body": ""
  },
  "logos": {},
  "products": []
}
```

- Only populate fields that have data from the knowledge base
- Colors use hex values as strings
- Fonts use full family + weight names
- Logos reference file paths (populated later by brand-asset-organizer)
- Products array includes name, sku, color, description

**Step 4: Update the file mapping table (Step 3: Import Pre-Structured Folder)**

Add keyword mappings for the new sections:

| Path contains... | Maps to KB file |
|---|---|
| `visual`, `design`, `color`, `font`, `logo`, `style-guide` | `visual-identity.md` |
| `dictionary`, `glossary`, `terminology`, `phrase`, `slogan` | `brand-dictionary.md` |
| `product`, `catalog`, `sku`, `inventory`, `lineup` | `product-catalog.md` |

**Step 5: Update the section count references**

Change "7 knowledge sections" references to "10 knowledge sections" throughout the file.

**Step 6: Verify the enhanced skill**

Run: `node -e "const fs = require('fs'); const c = fs.readFileSync('packs/brand/skills/brand-knowledge-builder/SKILL.md','utf8'); console.log(c.includes('visual-identity') ? '✓ visual-identity' : '✗'); console.log(c.includes('brand-dictionary') ? '✓ brand-dictionary' : '✗'); console.log(c.includes('product-catalog') ? '✓ product-catalog' : '✗'); console.log(c.includes('brand.json') ? '✓ brand.json' : '✗');"`
Expected: All ✓

**Step 7: Commit**

```bash
git add packs/brand/skills/brand-knowledge-builder/SKILL.md
git commit -m "feat(brand): enhance knowledge-builder with visual-identity, dictionary, product-catalog + brand.json generation"
```

---

### Task 4: Create `brand-asset-organizer` skill

**Files:**
- Create: `packs/brand/skills/brand-asset-organizer/SKILL.md`

**Step 1: Create directory and write SKILL.md**

**Frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: brand-asset-organizer
description: Use when organizing brand assets (logos, product images, fonts) into a standard directory structure. Also use when setting up brand-assets/ directory, generating asset README, or updating brand.json with file paths.
---
```

**Content requirements (write the full skill):**
- Mandatory announcement box with 📁 emoji
- Overview: takes scattered brand assets and organizes them into a standard `brand-assets/` directory structure
- Target directory structure (from design doc):

```
brand-assets/
├── logos/
│   ├── primary/
│   ├── secondary/
│   ├── horizontal/
│   └── square/
├── product-images/
│   └── {product-name}/
├── fonts/
├── guidelines/
└── README.md
```

- Step-by-step process:
  1. Ask user where assets currently live (path to folder, zip, or scattered locations)
  2. Scan source location for asset files (images, fonts, vectors)
  3. Present a mapping: "Found X → will organize as Y" with table showing source → destination
  4. Get user confirmation before any file operations
  5. Copy (NEVER move) files to `brand-assets/` with consistent naming
  6. Generate `brand-assets/README.md` with asset index table
  7. Update `brand.json` logo and product image paths
  8. Report what was organized and what's missing

- Naming conventions:
  - Logos: `logo-{variant}-{color}.{ext}` (e.g., `logo-primary-black.svg`)
  - Product images: `{product-slug}/{size}-{view}.{ext}` (e.g., `fragrance-free/48ct-front.png`)
  - Fonts: `{FamilyName}-{Weight}.{ext}` (e.g., `FuturaPT-ExtraBold.woff2`)

- Key behaviors:
  - ALWAYS copy, NEVER move (preserve originals)
  - Ask before overwriting existing files
  - Handle zip files: extract to temp dir first, then organize
  - Identify missing variants and report them
  - Auto-detect logo variants from filename patterns (black, white, color, horizontal, square, etc.)
  - Auto-detect product names from filename patterns

- Common mistakes table (mistakes to avoid)

**Step 2: Verify frontmatter**

Run: same frontmatter check pattern as Task 1
Expected: VALID ✓

**Step 3: Commit**

```bash
git add packs/brand/skills/brand-asset-organizer/SKILL.md
git commit -m "feat(brand): add brand-asset-organizer skill"
```

---

### Task 5: Create `brand-export` skill

**Files:**
- Create: `packs/brand/skills/brand-export/SKILL.md`

**Step 1: Create directory and write SKILL.md**

**Frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: brand-export
description: Use when generating client-facing brand deliverables — brand voice PDF, brand guidelines 1-pager PDF, or a complete asset package zip. Also use when exporting brand assets for external use.
---
```

**Content requirements (write the full skill):**
- Mandatory announcement box with 📦 emoji
- Overview: generates exportable client-facing brand deliverables from the knowledge base and organized assets

- Prerequisites check (must exist before export):
  - `.claude/knowledge/config.json` with enabled sections
  - `brand.json` at project root
  - `brand-assets/` directory (for full package export; optional for PDF-only)

- Three export modes:
  1. **Brand Voice Document (PDF)** — multi-page PDF from knowledge base:
     - Page 1: Brand positioning (from `brand-identity.md`)
     - Page 2: Reason to believe / value props (from `messaging-framework.md`)
     - Page 3-4: Brand dictionary — approved phrases, terminology (from `brand-dictionary.md`)
     - Page 5: What not to say / legal restrictions (from `brand-dictionary.md`)
     - Page 6: Call-out examples / social media style (from `voice-and-tone.md`)

  2. **Brand Guidelines 1-Pager (PDF)** — single-page visual reference:
     - Logo usage section (primary, secondary, variants — from `visual-identity.md` + `brand.json`)
     - Font section (header, subheader, body — from `brand.json`)
     - Color palette (primary colors + product colors with hex swatches — from `brand.json`)
     - Product pack images (from `brand-assets/product-images/`)

  3. **Complete Asset Package (ZIP)** — everything bundled:
     - Brand Voice Document PDF
     - Brand Guidelines 1-Pager PDF
     - Organized `brand-assets/` contents (logos, product images, fonts)
     - `README.md` with asset index

- PDF generation approach:
  - Build HTML page with inline CSS (no external dependencies)
  - Use `puppeteer` skill for HTML → PDF conversion
  - A4 landscape for guidelines 1-pager, A4 portrait for voice document
  - Template uses brand colors from `brand.json` for styling
  - Include logo images inline (base64 encoded from `brand-assets/`)

- Step-by-step process:
  1. Read `brand.json` and knowledge base files
  2. Ask user which deliverable(s) to generate (voice PDF, guidelines PDF, full zip)
  3. Generate HTML for selected PDFs
  4. Convert HTML → PDF via puppeteer
  5. Save PDFs to `brand-assets/guidelines/`
  6. If full zip: bundle everything into a zip file
  7. Report output locations

- ZIP generation: use Node.js `child_process` with system `zip` command (available on macOS/Linux)

- Key behaviors:
  - Always read fresh data from knowledge base (don't cache)
  - Fail gracefully if knowledge base sections are incomplete (generate what's available, note gaps)
  - Color swatches in guidelines PDF should display the actual hex color
  - Logo images embedded as base64 in HTML (no external file references in PDF)

**Step 2: Verify frontmatter**

Run: same pattern as Task 1
Expected: VALID ✓

**Step 3: Commit**

```bash
git add packs/brand/skills/brand-export/SKILL.md
git commit -m "feat(brand): add brand-export deliverable generation skill"
```

---

### Task 6: Create `brand-compliance` skill

**Files:**
- Create: `packs/brand/skills/brand-compliance/SKILL.md`

**Step 1: Create directory and write SKILL.md**

**Frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: brand-compliance
description: Use when checking content, code, or components against brand guidelines. Also use when verifying brand voice compliance, color usage, font usage, logo usage, or messaging alignment.
---
```

**Content requirements (write the full skill):**
- Mandatory announcement box with ✅ emoji
- Overview: checks content against brand rules from knowledge base and brand.json

- Prerequisites: knowledge base must exist with at least some enabled sections

- Compliance checks table:

| Check | Source | What it validates |
|-------|--------|------------------|
| Voice/tone | `voice-and-tone.md` | Writing style matches brand voice guide |
| Dictionary | `brand-dictionary.md` | Uses approved phrases, avoids forbidden terms |
| Colors | `brand.json` colors | Only brand-approved colors in code/design |
| Fonts | `brand.json` fonts | Only brand-approved fonts in code/CSS |
| Logos | `visual-identity.md` | Logo usage follows rules (size, clear space, variants) |
| Messaging | `messaging-framework.md` | Content hits value props, stays on-message |
| Legal | `brand-dictionary.md` (what not to say) | No forbidden topics or restricted claims |

- Input modes:
  1. **Content check** — paste text, check voice/tone/dictionary/messaging/legal
  2. **Code check** — provide file path, check colors/fonts/logo usage in code
  3. **Full audit** — scan entire project for brand violations

- Output: compliance report table:

```
Brand Compliance Report
━━━━━━━━━━━━━━━━━━━━━
Voice/tone     ✓  matches casual, confident style
Dictionary     ✗  uses "flushable discussion" (forbidden)
Colors         ✓  all colors match brand.json
Fonts          ◐  body font correct, header using system font
Messaging      ✓  hits 2/3 value props
Legal          ✗  mentions competitor by name (restricted)

Score: 4/6 checks passed
```

- Step-by-step process:
  1. Read knowledge base and brand.json
  2. Determine check type (content, code, full audit)
  3. Run applicable checks
  4. Generate report with specific findings per category
  5. Recommend fixes for failures

- Key behaviors:
  - Always cite the specific rule being violated with source reference
  - Provide suggested replacement text for dictionary violations
  - For code checks, provide file:line references
  - Score is informational, not a gate (no blocking)
  - Can be used proactively by brand-strategist agent before delivering work

**Step 2: Verify frontmatter**

Expected: VALID ✓

**Step 3: Commit**

```bash
git add packs/brand/skills/brand-compliance/SKILL.md
git commit -m "feat(brand): add brand-compliance content checking skill"
```

---

### Task 7: Enhance `brand-strategist` agent

**Files:**
- Modify: `.claude/agents/brand-strategist.md`

**Step 1: Read existing agent file**

Read: `.claude/agents/brand-strategist.md`
Current: 80 lines, loads knowledge base, does creative work.

**Step 2: Add brand.json consumption**

In the "Before Starting Any Task" section, add between step 1 and step 2:

```markdown
1.5. **Check if brand.json exists**
   - Look for `brand.json` at the project root
   - If it exists, read it for structured brand data (colors, fonts, logos, products)
   - Use brand.json as the source of truth for any visual/structural brand data
   - If it doesn't exist but knowledge base does, work from knowledge base only
```

**Step 3: Add brand-compliance integration**

In the "Output Standards" section, add:

```markdown
6. **Pre-delivery compliance** — Before presenting final work, mentally run the brand-compliance checks: voice match, dictionary compliance, messaging alignment, legal restrictions. Flag any potential violations in your output.
```

**Step 4: Add visual identity awareness**

In the "Internalize the knowledge" subsection, add:
- `visual-identity.md` informs color choices, font recommendations, and image style
- `brand-dictionary.md` provides the exact phrases to use and avoid
- `product-catalog.md` maps products to their visual identifiers and descriptions
- `brand.json` provides machine-readable structured data for any visual decisions

**Step 5: Add brand-export awareness**

In the "What You Don't Do" section, add:
- Export brand packages or generate PDFs (use brand-export skill)
- Organize physical brand assets (use brand-asset-organizer skill)
- Audit brand assets (use brand-discovery skill)

**Step 6: Add new skills to the frontmatter skills list**

Update the `skills:` list in frontmatter to include:
```yaml
skills:
  - brand-knowledge-builder
  - brand-compliance
```

**Step 7: Verify agent file**

Run: `node -e "const fs = require('fs'); const c = fs.readFileSync('.claude/agents/brand-strategist.md','utf8'); console.log(c.includes('brand.json') ? '✓ brand.json' : '✗'); console.log(c.includes('visual-identity') ? '✓ visual-identity' : '✗'); console.log(c.includes('brand-dictionary') ? '✓ brand-dictionary' : '✗'); console.log(c.includes('brand-compliance') ? '✓ brand-compliance' : '✗');"`
Expected: All ✓

**Step 8: Commit**

```bash
git add .claude/agents/brand-strategist.md
git commit -m "feat(brand): enhance brand-strategist agent with brand.json, visual identity, and compliance awareness"
```

---

### Task 8: Update armadillo.json — register new brand pack skills

**Files:**
- Modify: `armadillo.json`

**Step 1: Read current brand pack entry**

Current (line 124-129):
```json
"brand": {
  "description": "Knowledge base builder and Deepgram audio transcription",
  "skills": [
    "brand-knowledge-builder",
    "deepgram-transcription"
  ]
}
```

**Step 2: Update brand pack entry**

Replace with:
```json
"brand": {
  "description": "Brand asset pipeline — discovery, knowledge building, asset organization, PDF export, compliance checking, and audio transcription",
  "skills": [
    "brand-pimp",
    "brand-discovery",
    "brand-knowledge-builder",
    "brand-asset-organizer",
    "brand-export",
    "brand-compliance",
    "deepgram-transcription"
  ]
}
```

**Step 3: Run armadillo.json tests**

Run: `node --test tests/armadillo-json.test.js`
Expected: All pass (top-level fields, core structure, packs structure, each pack has description)

**Step 4: Commit**

```bash
git add armadillo.json
git commit -m "feat(brand): register 5 new skills in brand pack manifest"
```

---

### Task 9: Update armadillo-shepherd routing table

**Files:**
- Modify: `.claude/skills/armadillo-shepherd/SKILL.md`

**Step 1: Read current shepherd SKILL.md**

Find the "Content & Creative" section which currently has:
```markdown
| Brand knowledge / voice | `brand-knowledge-builder` |
```

**Step 2: Replace the brand entry in Content & Creative with a new Brand section**

Remove the `brand-knowledge-builder` line from "Content & Creative" section.

Add a new "### Brand" section (place it after "Content & Creative" and before "Ads & Social"):

```markdown
### Brand

| Request | Skill |
|---------|-------|
| ANYTHING brand-related (brand audit, build, voice, assets, guidelines, export, compliance) | `brand-pimp` |
| Brand audit, what brand assets exist, brand gap report | `brand-pimp` → routes to `brand-discovery` |
| Brand interview, build brand knowledge, process brand docs, transcribe brand audio | `brand-pimp` → routes to `brand-knowledge-builder` |
| Organize brand assets, set up brand.json, organize logos/images | `brand-pimp` → routes to `brand-asset-organizer` |
| Export brand package, generate brand PDF, create asset zip, client deliverables | `brand-pimp` → routes to `brand-export` |
| Check brand compliance, is this on-brand, brand content review | `brand-pimp` → routes to `brand-compliance` |
| Audio transcription for brand interviews | `deepgram-transcription` |
```

**Step 3: Run shepherd content tests**

Run: `node --test tests/shepherd-content.test.js`
Expected: All pass

**Step 4: Commit**

```bash
git add .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat(brand): add Brand routing section to armadillo-shepherd"
```

---

### Task 10: Rebuild CLAUDE.md and update build script

**Files:**
- Modify: `scripts/build-claude-md.js` (add SKILL_DESCRIPTIONS for new pack skills — optional, only if the build script reads pack skill descriptions)
- Generate: `.claude/CLAUDE.md` (via build script)

**Step 1: Check if build script needs updates**

Read `scripts/build-claude-md.js` — the `SKILL_DESCRIPTIONS` object only contains core skills. Pack skills get their descriptions from `armadillo.json` `description` field. The build script uses `buildPacksTable()` which reads pack descriptions from `armadillo.json`.

Since we updated `armadillo.json` in Task 8, the pack table will automatically reflect the new brand pack description. No changes needed to `build-claude-md.js`.

**Step 2: Rebuild CLAUDE.md**

Run: `node scripts/build-claude-md.js`
Expected: `✓ .claude/CLAUDE.md updated — N core skills, M packs`

**Step 3: Verify brand pack appears in CLAUDE.md**

Run: `grep -A2 'brand' .claude/CLAUDE.md | head -5`
Expected: brand pack row with updated skill count (7) and description

**Step 4: Run full test suite**

Run: `node --test tests/armadillo-json.test.js tests/shepherd-content.test.js tests/repo-structure.test.js tests/agent-frontmatter.test.js`
Expected: All pass

**Step 5: Commit everything**

```bash
git add .claude/CLAUDE.md
git commit -m "chore(brand): rebuild CLAUDE.md with expanded brand pack"
```

---

## Execution Notes

**Parallelizable tasks:** Tasks 1, 2, 4, 5, 6 are independent (new skill files). They can be written in parallel via dispatching-parallel-agents.

**Sequential dependencies:**
- Task 3 (enhance knowledge-builder) should be done after reading the existing file carefully
- Task 7 (enhance agent) depends on knowing the new skill names (but they're defined in the design)
- Task 8 (armadillo.json) should be done after all skills exist
- Task 9 (shepherd) should be done after armadillo.json
- Task 10 (CLAUDE.md rebuild) must be last

**Test validation:** Each task validates frontmatter. Task 10 runs the full test suite as final gate.
