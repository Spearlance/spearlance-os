# Remotion Skill & Agent System Design

## Goal

Build a comprehensive Remotion reference skill and video/image creation agent for Claude Code. The reference skill provides accurate API documentation so Claude stops hallucinating Remotion APIs. The agent orchestrates video and image projects end-to-end.

## Architecture

Two deliverables:

| Deliverable | Type | Location |
|---|---|---|
| `remotion` | Reference skill | `.claude/skills/remotion/SKILL.md` + `reference.md` |
| `remotion-creator` | Agent | `.claude/agents/remotion-creator.md` |

The reference skill is the knowledge. The agent is the workflow. Same pattern as Google API skills + google-api-guide agent.

## Deliverable 1: `remotion` Reference Skill

### SKILL.md (~200-300 words)

Quick reference for common operations:

- **Quick reference table** — current version, packages, setup command, licensing
- **Project setup** — `npx create-video@latest`, directory structure
- **Core pattern** — Composition + useCurrentFrame basic example
- **Rendering commands** — CLI render (video + still), common flags
- **Animation** — interpolate/spring one-liners
- **Common mistakes table**

### reference.md (~800-1200 lines)

Full API reference organized by package:

1. **`remotion` (core)**
   - Components: Composition, Still, Sequence, Series, AbsoluteFill, Loop, Freeze, Folder
   - Hooks: useCurrentFrame, useVideoConfig
   - Animation: interpolate(), spring(), Easing
   - Media: Img, Video, Audio, OffthreadVideo, staticFile()
   - Data: delayRender/continueRender, getInputProps, calculateMetadata
   - Config: remotion.config.ts options

2. **`@remotion/renderer`**
   - bundle() — webpack bundling for SSR
   - selectComposition() — evaluate a composition with input props
   - renderMedia() — render video/audio
   - renderStill() — render single frame as image
   - renderFrames() — render image sequence
   - getCompositions() — list all compositions
   - openBrowser() — share browser instances

3. **`@remotion/cli`**
   - `npx remotion render` — render video
   - `npx remotion still` — render still image
   - `npx remotion studio` — start development studio
   - `npx remotion lambda` — Lambda subcommands

4. **`@remotion/lambda`**
   - Setup (IAM policies, env vars, deployment)
   - deploySite() / deployFunction()
   - renderMediaOnLambda() / renderStillOnLambda()
   - getRenderProgress()
   - Rate limits and concurrency

5. **`@remotion/player`**
   - Player component props (component, durationInFrames, fps, etc.)
   - Events (onPlay, onPause, onEnded, etc.)
   - Ref API (play, pause, seek, getCurrentFrame, etc.)

6. **Ecosystem packages**
   - @remotion/tailwind-v4 — Tailwind CSS setup
   - @remotion/three — React Three Fiber / 3D
   - @remotion/lottie — Lottie animations
   - @remotion/gif — GIF rendering
   - @remotion/motion-blur — Motion blur effect
   - @remotion/noise — Perlin noise

7. **Licensing**
   - Free for individuals / < $100k revenue
   - Company License for > $100k revenue
   - Enterprise tiers

Each section follows: **what it is -> API signature -> example -> gotchas**.

## Deliverable 2: `remotion-creator` Agent

### Role

Orchestrates video and image creation projects. Uses the `remotion` reference skill for API correctness. Handles scene planning, composition structure, animation sequencing, asset management, rendering config, and template patterns.

### Workflow

```
1. Understand the project
   - What are we making? (video, still image, series of stills)
   - Dimensions/resolution? (1920x1080, 1080x1080, 1080x1920, custom)
   - Duration/fps? (for video)
   - What assets exist? (images, video clips, audio, fonts)

2. Plan the composition tree
   - Root composition with scene breakdown
   - Sequence timing (which scenes, how long each)
   - Animation strategy per scene

3. Generate the code
   - Remotion project structure (if new project)
   - React components for each scene
   - Animation logic (interpolate/spring)
   - Asset integration
   - Input props schema (for parameterized renders)

4. Rendering
   - Recommend render approach (local CLI vs Lambda)
   - Provide exact render commands
   - Handle output format selection (mp4, webm, gif, png for stills)
```

### Template Patterns

The agent knows common video/image patterns:

- **Social ad** — Short-form (15-60s), attention-grabbing intro, CTA ending, platform-specific dimensions
- **Explainer** — Scene-by-scene with text overlays, illustrations, voiceover sync
- **Data visualization** — Animated charts/graphs from data input props
- **Presentation/slideshow** — Sequential slides with transitions
- **Still image** — Social graphics, thumbnails, OG images using `<Still>`

### What the Agent Does NOT Do

- Build or update the reference skill (use `writing-reference-skills`)
- Apply brand voice/guidelines (separate future concern — brand-aware video agent)
- Render videos itself (provides commands, user runs them)

## Build Order

1. **`remotion` reference skill** (via `writing-reference-skills` TDD) — independent
2. **`remotion-creator` agent** — depends on reference skill existing

## Implementation Approach

- Reference skill uses `writing-reference-skills` for mandatory web research + TDD
- Agent follows same pattern as `brand-strategist.md` — markdown agent file with clear workflow
- Both follow existing project conventions for skill/agent structure
