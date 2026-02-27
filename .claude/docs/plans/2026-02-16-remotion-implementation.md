# Remotion Skill & Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a comprehensive Remotion reference skill and video/image creation agent for Claude Code.

**Architecture:** Two deliverables following existing patterns — a reference skill (`SKILL.md` + `reference.md`) modeled on `stripe-api`, and an orchestrator agent modeled on `brand-strategist.md`. The reference skill provides accurate API docs; the agent orchestrates video/image projects end-to-end.

**Tech Stack:** Remotion (React video framework), TypeScript/React, Markdown skill/agent files

---

### Task 1: Build `remotion` Reference Skill via writing-reference-skills TDD

**REQUIRED SUB-SKILL:** Use `writing-reference-skills` for the TDD cycle.

**Files:**
- Create: `.claude/skills/remotion/SKILL.md`
- Create: `.claude/skills/remotion/reference.md`

This task follows the writing-reference-skills TDD cycle (RED → research → GREEN → REFACTOR). The implementer must follow the full process — do NOT skip the research phase.

#### Step 1: RED Phase — Baseline test without skill

Ask a subagent these 5 questions WITHOUT any Remotion skill loaded:

1. "How do I create a new Remotion project and what's the directory structure?"
2. "Write a Remotion composition that fades in text, holds it, then fades out — with correct interpolate() usage and Sequence timing."
3. "How do I render a still image (not video) from a Remotion composition using the CLI?"
4. "What are Remotion's current licensing terms and pricing tiers?"
5. "How do I set up Remotion Lambda for serverless rendering? What IAM policies are needed?"

Document what the agent gets wrong, is uncertain about, or omits.

#### Step 2: Research Phase — Mandatory web research

Search for current Remotion information using WebSearch and WebFetch on `remotion.dev`:

**Must verify:**
- Current Remotion version (check npm or remotion.dev/docs)
- `npx create-video@latest` setup and template options
- Core component APIs: `<Composition>`, `<Still>`, `<Sequence>`, `<Series>`, `<AbsoluteFill>`, `<Loop>`, `<Freeze>`, `<Folder>`
- Hooks: `useCurrentFrame()`, `useVideoConfig()`
- Animation: `interpolate()` signature and extrapolation options, `spring()` config, `Easing` functions
- Media: `<Img>`, `<Video>`, `<Audio>`, `<OffthreadVideo>`, `staticFile()`
- Data: `delayRender()`/`continueRender()`, `getInputProps()`, `calculateMetadata()`
- `remotion.config.ts` options
- `@remotion/renderer`: `bundle()`, `selectComposition()`, `renderMedia()`, `renderStill()`, `renderFrames()`, `getCompositions()`, `openBrowser()`
- CLI commands: `npx remotion render`, `npx remotion still`, `npx remotion studio`
- `@remotion/lambda`: setup, IAM policies, `deploySite()`, `deployFunction()`, `renderMediaOnLambda()`, `renderStillOnLambda()`, `getRenderProgress()`
- `@remotion/player`: `<Player>` props, events, ref API
- Ecosystem: `@remotion/tailwind-v4`, `@remotion/three`, `@remotion/lottie`, `@remotion/gif`, `@remotion/motion-blur`, `@remotion/noise`
- Licensing/pricing tiers
- Recent changes and deprecations

**Search queries to use:**
- `"Remotion" latest version changelog 2025 2026`
- `"Remotion" pricing license company`
- `"Remotion" Lambda setup IAM`
- `"Remotion" interpolate spring animation API`
- `"Remotion" renderStill still image`
- `"Remotion" Player component React`

#### Step 3: GREEN Phase — Write SKILL.md

Create `.claude/skills/remotion/SKILL.md` following the `stripe-api/SKILL.md` pattern exactly:

```markdown
---
name: remotion
description: Use when creating videos or images programmatically with React, building Remotion compositions, rendering video or stills, using Remotion Lambda for serverless rendering, or working with Remotion animation APIs like interpolate and spring.
---

# Remotion

## Overview
[One sentence: what Remotion is + current version]

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | [verified version] |
| **Setup** | `npx create-video@latest` |
| **Studio** | `npx remotion studio` |
| **Render Video** | `npx remotion render src/index.ts CompositionId out.mp4` |
| **Render Still** | `npx remotion still src/index.ts StillId out.png` |
| **Licensing** | Free < $100k revenue; Company License above |

## Core Pattern

[Minimal Composition + useCurrentFrame example — the "hello world"]

## Common Operations

[2-3 most common operations: create composition, animate with interpolate, render]

## Animation Quick Reference

[interpolate() and spring() signatures with common usage]

## Common Mistakes

| Mistake | Fix |
|---------|-----|
[5-8 common mistakes from research]

## Full Reference

See `reference.md` for complete API documentation including [list all sections].
```

**Target: <100 lines, <500 words.**

#### Step 4: GREEN Phase — Write reference.md

Create `.claude/skills/remotion/reference.md` with comprehensive API docs:

**Structure (use exact headings):**

```markdown
# Remotion Reference

## Table of Contents
[Link to each section]

## 1. Project Setup
- npx create-video@latest (templates, options)
- Directory structure
- remotion.config.ts options

## 2. Core Components
### Composition
### Still
### Sequence
### Series
### AbsoluteFill
### Loop
### Freeze
### Folder

## 3. Hooks
### useCurrentFrame()
### useVideoConfig()

## 4. Animation
### interpolate()
### spring()
### Easing

## 5. Media
### <Img>
### <Video>
### <Audio>
### <OffthreadVideo>
### staticFile()

## 6. Data & Async
### delayRender() / continueRender()
### getInputProps()
### calculateMetadata()

## 7. Rendering (CLI)
### npx remotion render
### npx remotion still
### npx remotion studio

## 8. Rendering (Node.js / SSR)
### bundle()
### selectComposition()
### renderMedia()
### renderStill()
### renderFrames()
### getCompositions()
### openBrowser()

## 9. Lambda (Serverless Rendering)
### Setup (IAM, env vars)
### deploySite()
### deployFunction()
### renderMediaOnLambda()
### renderStillOnLambda()
### getRenderProgress()

## 10. Player
### <Player> props
### Events
### Ref API (play, pause, seek, getCurrentFrame)

## 11. Styling
### CSS in Remotion
### Tailwind CSS v4 (@remotion/tailwind-v4)

## 12. Ecosystem Packages
### @remotion/three (3D)
### @remotion/lottie
### @remotion/gif
### @remotion/motion-blur
### @remotion/noise

## 13. Licensing
### Free tier
### Company License
### Enterprise
```

Each section must include: **what it is → TypeScript API signature → working example → gotchas/notes**.

**Target: 800-1200 lines.**

#### Step 5: GREEN test — Verify skill works

Ask a subagent the same 5 questions from Step 1, this time WITH the skill loaded. Rate each answer:
- Does the skill provide **correct, current, actionable** information?
- Does it improve over baseline on at least 4 of 5 questions?

If it fails, fix the specific gaps and re-test.

#### Step 6: REFACTOR — Close gaps

Run 3 additional edge-case questions:
1. "How do I use `calculateMetadata()` to make a composition's duration depend on input props?"
2. "How do I embed a Remotion `<Player>` in a Next.js app with controls?"
3. "What's the difference between `<Video>` and `<OffthreadVideo>` and when should I use each?"

If the skill can't answer these correctly, add the missing information and re-test.

#### Step 7: Commit

```bash
git add .claude/skills/remotion/SKILL.md .claude/skills/remotion/reference.md
git commit -m "feat: add remotion reference skill with comprehensive API docs"
```

---

### Task 2: Create `remotion-creator` Agent

**Depends on:** Task 1 (reference skill must exist)

**Files:**
- Create: `.claude/agents/remotion-creator.md`

#### Step 1: Study existing agent pattern

Read `.claude/agents/brand-strategist.md` for the exact agent file structure:
- YAML frontmatter with `name`, `description`, `model: inherit`
- Role statement
- "Before Starting Any Task" checklist
- Capabilities section
- Output standards
- "What You Don't Do" section

#### Step 2: Write the agent file

Create `.claude/agents/remotion-creator.md`:

```markdown
---
name: remotion-creator
description: |
  Use this agent when creating videos or images programmatically, planning
  video compositions, building Remotion projects, or generating animated
  content. Also use when the user needs scene planning, animation sequencing,
  or rendering pipeline guidance for Remotion projects.
model: inherit
---

You are a video and image creation director. Your role is to plan, structure,
and build Remotion projects for programmatic video and image generation.

## Before Starting Any Task

1. **Load the Remotion reference skill**
   - Read `.claude/skills/remotion/SKILL.md` for quick reference
   - Reference `.claude/skills/remotion/reference.md` for detailed API docs
   - Use these docs for all API calls — do NOT rely on training data for
     Remotion API specifics

2. **Understand the project**
   - What are we making? (video, still image, series of stills)
   - What dimensions? (1920x1080 landscape, 1080x1080 square, 1080x1920 portrait, custom)
   - For video: duration and fps? (default 30fps)
   - What assets exist? (images, video clips, audio files, fonts)
   - Is this a new project or adding to existing?

## Your Capabilities

### Scene Planning
- Break video concepts into compositions and sequences
- Plan scene timing (frames per scene, transitions)
- Design animation strategy per scene
- Structure the React component tree

**Always apply:** Remotion reference skill for correct API usage

### Code Generation
- Remotion project scaffolding (if new project)
- React components for each scene/composition
- Animation logic using interpolate() and spring()
- Asset integration (images, video, audio, fonts)
- Input props schemas for parameterized renders
- Still compositions for image generation

**Always apply:** TypeScript, functional React components, Remotion best practices

### Rendering Pipeline
- Recommend render approach (local CLI vs Lambda)
- Provide exact render commands with correct flags
- Handle output format selection (mp4, webm, gif, png for stills)
- Lambda setup guidance when serverless rendering needed

**Always apply:** Remotion reference skill for correct CLI flags and renderer APIs

### Template Patterns

When the user's request matches a common pattern, apply these templates:

**Social Ad** — Short-form (15-60s)
- Attention-grabbing intro (first 3s)
- Value proposition scenes
- CTA ending with branding
- Platform dimensions: 1080x1080 (feed), 1080x1920 (story/reel), 1920x1080 (YouTube)

**Explainer** — Scene-by-scene narrative
- Title/intro scene
- Problem/solution scenes with text overlays
- Feature highlight scenes
- Outro with CTA
- Optional: voiceover sync using audio timing

**Data Visualization** — Animated charts/graphs
- Accept data via input props
- Animated bar/line/pie charts
- Number counters with interpolate()
- Data-driven duration via calculateMetadata()

**Presentation/Slideshow** — Sequential slides
- Slide-per-Sequence structure
- Consistent transitions between slides
- Title + body + image layout per slide
- Progress indicator (optional)

**Still Image** — Static graphics using <Still>
- Social media graphics (OG images, thumbnails)
- Dynamic image generation from data
- Consistent branding/layout
- PNG or JPEG output

## Output Standards

1. **API accuracy** — Every Remotion API call must match the reference skill. Do not guess at prop names, function signatures, or CLI flags
2. **TypeScript** — All code in TypeScript with proper typing for input props
3. **Composition structure** — Every video needs a root Composition in the entry file, scenes as separate components
4. **Frame-based thinking** — Express all timing in frames (fps * seconds). Help the user convert between seconds and frames
5. **Render-ready** — Always end with the exact render command the user needs to run

## What You Don't Do

- Build or update the reference skill (use writing-reference-skills)
- Apply brand voice/guidelines (future: brand-aware video agent)
- Render videos yourself (provide commands, user runs them)
- Guess at Remotion APIs not in the reference (flag gaps, suggest user check docs)
- Use deprecated APIs (check reference for current approach)
```

#### Step 3: Verify agent works

Dispatch a subagent with the `remotion-creator` agent context and ask it:
> "I want to create a 15-second Instagram Reel ad for a coffee shop. I have a logo (logo.png), a hero image (coffee.jpg), and I want animated text. Help me build this."

Verify the agent:
- Asks the right discovery questions (or proceeds with sensible defaults)
- Structures a proper composition tree with Sequences
- Uses correct Remotion APIs from the reference skill
- Provides the render command at the end
- Uses 1080x1920 dimensions for Reel format

#### Step 4: Commit

```bash
git add .claude/agents/remotion-creator.md
git commit -m "feat: add remotion-creator agent for video and image projects"
```

---

## Dependency Graph

```
Task 1 (remotion reference skill) ──► Task 2 (remotion-creator agent)
```

Task 1 is independent and should be completed first. Task 2 depends on Task 1 because the agent references the skill.
