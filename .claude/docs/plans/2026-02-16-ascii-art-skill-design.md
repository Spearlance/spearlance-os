# ASCII Art Skill Bundle — Design

## Overview

A three-piece skill bundle for creating high-quality ASCII art, both as standalone pieces and integrated into CLI tools. Ships as an armadillo bundle.

## Architecture

| File | Role |
|------|------|
| `skills/ascii-art/SKILL.md` | Orchestrator — adaptive Socratic discovery, dispatches to agent, handles iteration |
| `skills/ascii-art/techniques.md` | Heavy reference — character palettes, proportional rules, composition, CLI patterns, curated examples |
| `agents/ascii-art-creator.md` | Art director subagent — plans layout, applies techniques, produces art, self-checks quality |

## Workflow

1. User triggers skill (request for ASCII art or CLI visual elements)
2. Skill assesses ambiguity of request
3. Adaptive discovery: 1 question for clear requests, 3-5 for ambiguous ones
4. Skill builds structured brief (subject, size, style, context, constraints)
5. Dispatches to `ascii-art-creator` agent
6. Agent plans dimensions/layout, selects techniques, produces art
7. Art returned to user with dimensions and technique notes
8. Iteration if needed (refinement dispatched back to agent)

## Skill: `ascii-art`

**Description:** `Use when creating ASCII art, CLI banners, text-based illustrations, or decorating command-line tool output with visual elements.`

**Adaptive discovery logic:**
- Clear request ("draw me a skull") — 1 quick question (size/style) then dispatch
- Ambiguous request ("I need something cool for my CLI") — explore: what the tool does, mood/tone, where art appears, size constraints, style preferences

**Dispatches to agent with structured brief containing:** subject, size tier, style, purpose/context, constraints

## Agent: `ascii-art-creator`

A focused ASCII art craftsperson. Receives structured brief, produces art.

**Core behaviors:**
- Plans dimensions, layout, and character palette before drawing
- References techniques.md for craft knowledge
- Works in three size tiers: small (16-30 cols), medium (40-60 cols), large (60-80 cols)
- CLI integration mode: wraps art in ready-to-paste code with proper escaping
- Self-checks: proportions, shading consistency, line integrity, monospace rendering
- Iterates by identifying specific changes rather than regenerating from scratch

**Returns:** Finished art in code block, dimensions, technique used, variant suggestions

## Reference: `techniques.md`

Heavy reference doc with:

1. **Character density palette** — shading scale light to dark, gradient techniques
2. **Line art characters** — structural characters for outlines, curves, boxes
3. **Proportional rules** — monospace 2:1 height:width compensation
4. **Composition techniques** — silhouette, filled, mixed, scene layering
5. **Category quick-reference** — tips for animals, text/logos, borders, faces, scenes
6. **CLI-specific patterns** — banners, boxes, progress indicators, error art, escaping
7. **Curated examples** — 5-8 annotated pieces demonstrating techniques

## Bundle Registration

```json
"ascii-art": {
  "label": "ASCII Art",
  "description": "Create high-quality ASCII art and CLI visual elements",
  "skills": ["ascii-art"],
  "agents": ["ascii-art-creator"],
  "files": [
    "skills/ascii-art/SKILL.md",
    "skills/ascii-art/techniques.md",
    "agents/ascii-art-creator.md"
  ]
}
```

Installed via `armadillo add ascii-art`.
