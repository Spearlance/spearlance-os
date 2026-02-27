---
model: claude-sonnet-4-6
name: brand-pimp
description: Active router for ALL brand requests — classifies and routes to the correct brand-* skill before any response. Use when anything involves brand assets, brand voice, brand guidelines, brand audit, brand export, or brand compliance.
---

<EXTREMELY-IMPORTANT>
If the request involves brand in ANY way — brand audit, brand assets, brand voice, brand guidelines, brand knowledge, brand discovery, logo organization, brand export, brand compliance, brand package, client deliverables, brand interview, brand strategy, or anything else brand-related — you MUST route through this skill FIRST.

This is not optional. This is not negotiable. You cannot skip this.
</EXTREMELY-IMPORTANT>

# Brand Pimp

The orchestration layer for all brand expertise. Not documentation — an active router. Every brand request flows through this routing table before any response.

**Mandatory Announcement — FIRST OUTPUT before anything else:**

```
┏━ 🎨 brand-pimp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [one-line description of what request/routing]  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

No exceptions. Box frame first, then route.

## Quick Context

The brand pack is armadillo's brand asset pipeline — takes a project from zero brand assets to a complete brand system (internal structured files + exportable client-facing asset package). 7 skills covering discovery, knowledge building, asset organization, PDF export, and compliance checking.

## Routing Table

Classify the request. Invoke the matching skill. No response before invocation.

| Request Pattern | Skill |
|----------------|-------|
| Brand audit, asset scan, gap report, "what brand stuff do we have" | `brand-discovery` |
| Brand interview, build knowledge, process brand docs, process audio | `brand-knowledge-builder` |
| Organize assets, set up brand.json, organize logos/images | `brand-asset-organizer` |
| Export brand package, generate PDF, create asset zip, client deliverables | `brand-export` |
| Brand compliance check, is this on-brand, content review | `brand-compliance` |
| Creative work, copywriting, content creation, brand strategy | `brand-strategist` agent |

## Cross-Cutting Rules

- If a request spans multiple skills, invoke the PRIMARY skill first (the one closest to the core question)
- If unclear which skill fits, default to `brand-discovery` — it covers the broadest diagnostic surface
- "What brand assets do we have?" → `brand-discovery`
- "Help me build out our brand" → `brand-knowledge-builder` (discovery first if no brand.json exists)
- "Set up our brand files" → `brand-asset-organizer`
- "Export a client brand package" → `brand-export`
- "Is this copy on-brand?" → `brand-compliance`
- "Write copy for us" / "Develop our brand voice" → `brand-strategist` agent

## Full Pipeline Mode

When the request is "build my brand from scratch" or equivalent, chain the full pipeline in order:

1. `brand-discovery` — audit existing assets, identify gaps
2. `brand-knowledge-builder` — run brand interview, build brand.json
3. `brand-asset-organizer` — organize logos, images, set up asset structure
4. `brand-export` — generate PDF brand guide + client asset package

Each step informs the next. Do not skip steps unless the user explicitly requests a specific phase.

## State Detection

Before routing, check project state to inform the recommendation:

- **`brand.json` at project root** → brand knowledge exists; skip to `brand-asset-organizer` or later
- **`.claude/knowledge/config.json`** → knowledge base exists; check if brand knowledge is captured
- **`brand-assets/` directory** → asset structure exists; check if organized or raw

| State | Recommendation |
|-------|---------------|
| No brand system found | Suggest full pipeline starting with `brand-discovery` |
| Some pieces exist | Route to the next missing piece |
| Everything exists | Route to `brand-strategist` for creative/strategy work |

## When Multiple Skills Apply

Priority order:
1. **discovery** — if the question involves auditing or scanning existing brand assets
2. **knowledge-builder** — if the question involves capturing or building brand information
3. **asset-organizer** — if the question involves structuring or organizing brand files
4. **export** — if the question involves packaging or delivering brand assets
5. **compliance** — if the question involves checking content against brand standards

## What This Skill Does NOT Route

- General coding questions (even if for a branded project) → let armadillo-shepherd handle normally
- Non-brand content work (blog posts, product copy without brand context) → not brand-specific
- Audio transcription without brand context → use `deepgram-transcription` directly

## Hard Rules

- Never respond about brand before invoking the target skill
- No summarizing, planning to invoke, or explaining what you're about to do
- If unclear, ask ONE clarifying question, then route
- The skill's content has the verified facts — always defer to it
