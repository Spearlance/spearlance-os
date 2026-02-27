# Brand Knowledge Base System - Design Document

**Date:** 2026-02-16
**Status:** Approved

## Problem

When doing brand-aware work (copywriting, strategy, deliverables), Claude has no persistent knowledge of the agency's brand, client's brand, audience profiles, messaging framework, or competitive landscape. This context must be re-explained every session.

## Solution

A per-project knowledge base in `.claude/knowledge/` with a skill to build it (via document parsing, audio transcription, or Socratic interview) and an agent to consume it for brand-aware work.

## What We're Building

### 1. Knowledge Base Structure

```
.claude/knowledge/
├── config.json                  # Toggle sections on/off
├── agency/
│   ├── brand-identity.md        # Mission, values, personality, visual identity
│   ├── services.md              # Offerings, process, pricing philosophy
│   └── positioning.md           # Differentiators, ideal client, competitive advantage
└── client/
    ├── brand-identity.md        # Brand name, mission, values, visual identity, personality
    ├── audience-profiles.md     # Personas, demographics, psychographics, pain points, goals
    ├── messaging-framework.md   # Value props, taglines, elevator pitch, key messages per audience
    ├── content-strategy.md      # Content pillars, channels, topics, posting cadence, formats
    ├── competitive-landscape.md # Competitors, SWOT, differentiators, market gaps
    ├── business-model.md        # Revenue model, services/products, pricing, case studies
    └── voice-and-tone.md        # Writing style, vocabulary, do's/don'ts, example rewrites
```

**Toggle config (`config.json`):**
```json
{
  "agency": { "enabled": true },
  "client": { "enabled": true }
}
```

### 2. `brand-knowledge-builder` Skill

**Type:** Discipline/workflow skill
**Trigger:** User wants to build, update, or add to their brand knowledge base

**Flow:**
1. Ask which sections to build (agency / client / both)
2. Ask if user has existing documents, audio recordings, or neither
3. Branch by input type:
   - **Documents** → read files (PDFs, text, markdown) → extract structured info
   - **Audio** → transcribe via Deepgram skill → extract structured info
   - **Both** → transcribe + read → merge
   - **Neither** → interview mode (topic-by-topic Socratic questions)
4. For each knowledge file:
   - Pre-fill from extracted info (if docs/audio provided)
   - Identify gaps → interview to fill them
   - Write structured markdown to `.claude/knowledge/`
5. Write `config.json` with enabled sections
6. Summary of what was built + what has gaps

**Key behaviors:**
- **Incremental** - can run on one topic at a time
- **Additive updates** - re-running merges new info, doesn't overwrite
- **Gap detection** - after parsing docs, tells user what's missing
- **Source tracking** - each file gets `<!-- Sources: filename.pdf, interview 2026-02-16 -->` comment

**Interview mode:**
- Goes topic by topic (brand identity → audience → messaging → etc.)
- 3-6 focused questions per topic
- Multiple choice where possible, open-ended when needed
- Writes the file after each topic so progress is saved

### 3. `deepgram-transcription` Skill

**Type:** Reference skill (two-file pattern)
**Purpose:** Reusable Deepgram API reference for any skill/agent that needs audio transcription

**Structure:**
```
deepgram-transcription/
├── SKILL.md        # Quick ref: API endpoint, auth, basic transcription call
└── reference.md    # Full: model options, features, response format, errors
```

**Covers:**
- Nova-3 model (latest Feb 2026)
- REST API for pre-recorded audio
- Smart formatting, diarization, paragraphs, punctuation
- Auth via `DEEPGRAM_API_KEY` env var
- Response parsing
- Supported audio formats

**Built with:** `writing-reference-skills` TDD cycle with mandatory web research

### 4. `brand-strategist` Agent

**Type:** Named agent
**Trigger:** Brand-aware creative work, copywriting, messaging, content strategy, deliverables

**Behavior:**
1. Reads `.claude/knowledge/config.json` to see what's enabled
2. Loads only enabled section files
3. Applies brand context to the task

**Capabilities:**
- Write copy in client's voice/tone (website, social, email, ads)
- Draft messaging aligned to audience personas
- Create content fitting content strategy pillars
- Write proposals positioning the agency correctly
- Suggest strategy informed by competitive landscape
- Flag contradictions with established brand guidelines

**Edge cases:**
- Knowledge base empty/missing → tells user, suggests running builder skill
- Section toggled off → ignores it entirely

## Build Order

1. `deepgram-transcription` skill (dependency for audio input)
2. Knowledge base schema (directory structure + template files)
3. `brand-knowledge-builder` skill
4. `brand-strategist` agent

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Per-project vs global | Per-project | Each project/client is different, no templates needed |
| Toggle mechanism | `config.json` | Simple, human-readable, easy to flip manually or via skill |
| Deepgram as separate skill | Yes | Reusable for meeting notes, client calls, podcasts beyond brand work |
| Update strategy | Additive merge | Knowledge grows over time, periodic refreshes at milestones |
| Source tracking | HTML comments | Non-intrusive, helps trace where info came from |
| Interview style | Topic-by-topic, save after each | Progress isn't lost if session ends mid-build |
