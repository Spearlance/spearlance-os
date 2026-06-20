---
model: claude-sonnet-4-6
name: create-template
description: Use when creating a reusable Remotion composition template — analyzing design references, translating visual designs into React components, building parameterized inputProps schemas with Zod, registering compositions in Root.tsx, and test rendering to verify output.
---

# create-template

## Overview

**Mandatory Announcement — FIRST OUTPUT before anything else:**

No exceptions. Box frame first, then work.

A Remotion template is a parameterized composition — visual structure defined in React, data injected via `inputProps`. Good templates are reusable across many renders with different data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 1: Analyze the Design Reference

When given a screenshot, mockup, or description:

1. **Identify layers** — background, foreground elements, text, overlays, media
2. **Identify animations** — what enters, exits, or moves over time
3. **Identify variable data** — what changes between renders (text, images, colors, durations)
4. **Map to Remotion primitives** — each layer → component; each animation → interpolate/spring

### Design → Component mapping

| Design Element | Remotion Component |
|---------------|-------------------|
| Full-screen background | `<AbsoluteFill>` with background color/image |
| Video layer | `<OffthreadVideo>` (SSR) or `<Video>` (browser) |
| Image layer | `<Img>` |
| Text on screen | `<div>` / `<span>` with inline styles |
| Audio track | `<Audio>` |
| Timed section | `<Sequence from={N} durationInFrames={M}>` |
| Sequential scenes | `<Series>` + `<Series.Sequence>` |
| Lower third / overlay | `<AbsoluteFill>` with absolute positioning |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 2: Define the inputProps Schema

Use Zod for runtime validation and Remotion Studio UI generation:

```ts
// src/templates/LowerThird/schema.ts
import { z } from "zod";

export const lowerThirdSchema = z.object({
  name: z.string().default("John Doe"),
  title: z.string().default("Senior Engineer"),
  accentColor: z.string().default("#FF4800"),
  logoSrc: z.string().optional(),
  durationInFrames: z.number().int().min(30).default(90),
});

export type LowerThirdProps = z.infer<typeof lowerThirdSchema>;
```

### Schema design rules

| Rule | Reason |
|------|--------|
| Always provide `.default()` values | Remotion Studio can render without data |
| Use `z.string()` for colors, not enums | Lets users pass any CSS value |
| Use `z.number().int()` for frame counts | Prevents fractional frame bugs |
| Split media URLs into separate fields | Easier to swap assets per render |
| Keep schema flat where possible | Nested objects work but are harder to override via CLI |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 3: Build the Component Structure

### Canonical directory layout

```
src/
  templates/
    LowerThird/
      index.tsx         ← main composition component
      schema.ts         ← Zod schema + type export
      components/
        NameBlock.tsx   ← sub-components
        AccentBar.tsx
```

### Component skeleton

```tsx
// src/templates/LowerThird/index.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } from "remotion";
import { LowerThirdProps } from "./schema";

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  accentColor,
  logoSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide up from below
  const translateY = spring({
    frame,
    fps,
    from: 60,
    to: 0,
    config: { damping: 14, stiffness: 120 },
  });

  // Fade in
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 60,
          transform: `translateY(${translateY}px)`,
          opacity,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Accent bar */}
        <div style={{ width: 6, height: 64, backgroundColor: accentColor, borderRadius: 3 }} />

        {/* Text block */}
        <div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>
            {name}
          </div>
          <div style={{ fontSize: 22, color: accentColor, marginTop: 4 }}>
            {title}
          </div>
        </div>

        {/* Optional logo */}
        {logoSrc && (
          <Img src={logoSrc} style={{ height: 48, width: "auto", marginLeft: 20 }} />
        )}
      </div>
    </AbsoluteFill>
  );
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 4: Register in Root.tsx

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { LowerThird } from "./templates/LowerThird";
import { lowerThirdSchema } from "./templates/LowerThird/schema";

export const RemotionRoot = () => (
  <>
    {/* Existing compositions */}
    <Composition
      id="MyExistingVideo"
      component={MyExistingVideo}
      width={1920} height={1080} fps={30} durationInFrames={150}
    />

    {/* New template */}
    <Composition
      id="LowerThird"
      component={LowerThird}
      schema={lowerThirdSchema}           // ← enables Studio UI controls
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={90}               // default; overridable via inputProps
      defaultProps={{
        name: "John Doe",
        title: "Senior Engineer",
        accentColor: "#FF4800",
        durationInFrames: 90,
      }}
    />
  </>
);
```

### Composition registration rules

| Rule | Detail |
|------|--------|
| `id` must be unique | Duplicate IDs silently break rendering |
| Pass `schema` for parameterized templates | Unlocks Studio UI property editor |
| `defaultProps` must satisfy schema defaults | Studio renders immediately without data |
| `durationInFrames` can be dynamic | Compute from `defaultProps.durationInFrames * fps` if needed |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 5: Parameterized Patterns

### Dynamic duration (durationInFrames from inputProps)

```tsx
// Root.tsx — calculate durationInFrames from props
<Composition
  id="LowerThird"
  component={LowerThird}
  schema={lowerThirdSchema}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={lowerThirdSchema.parse({}).durationInFrames} // parse defaults
  calculateMetadata={({ props }) => ({
    durationInFrames: props.durationInFrames,
  })}
  defaultProps={lowerThirdSchema.parse({})}
/>
```

### Responsive compositions (multi-aspect-ratio template)

Register one composition per aspect ratio, reusing the same component:

```tsx
const FORMATS = [
  { id: "LowerThird-16x9", width: 1920, height: 1080 },
  { id: "LowerThird-9x16", width: 1080, height: 1920 },
  { id: "LowerThird-1x1",  width: 1080, height: 1080 },
];

export const RemotionRoot = () => (
  <>
    {FORMATS.map(({ id, width, height }) => (
      <Composition
        key={id}
        id={id}
        component={LowerThird}
        schema={lowerThirdSchema}
        width={width}
        height={height}
        fps={30}
        durationInFrames={90}
        defaultProps={lowerThirdSchema.parse({})}
      />
    ))}
  </>
);
```

Inside the component, use `useVideoConfig()` to respond to dimensions:

```tsx
const { width, height } = useVideoConfig();
const isPortrait = height > width;
const fontSize = isPortrait ? 28 : 36;
```

### Overlays / scene composition with Sequences

```tsx
export const SceneTemplate: React.FC<SceneProps> = ({ backgroundSrc, title, subtitle }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Background video — full duration */}
      <OffthreadVideo src={backgroundSrc} style={{ width: "100%", height: "100%" }} />

      {/* Title — enters at frame 15 */}
      <Sequence from={15} durationInFrames={120} name="TitleBlock">
        <TitleOverlay title={title} subtitle={subtitle} />
      </Sequence>

      {/* Logo bug — always present */}
      <Sequence from={0} name="LogoBug">
        <LogoBug />
      </Sequence>
    </AbsoluteFill>
  );
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 6: Test Render

Always verify before declaring done.

### Studio preview (visual check)

```bash
npx remotion studio src/index.ts
# Open browser → select composition → scrub timeline
```

### CLI test render (frame range — fast)

```bash
# Render just 30 frames to verify structure
npx remotion render src/index.ts LowerThird out/test.mp4 --frames=0-29

# Render a single frame as PNG for quick visual check
npx remotion still src/index.ts LowerThird out/test.png --frame=15
```

### Test render with custom inputProps

```bash
npx remotion render src/index.ts LowerThird out/test.mp4 \
  --props='{"name":"Jane Smith","title":"Product Designer","accentColor":"#0066FF"}'
```

### Programmatic test render

```ts
import { renderStill, selectComposition } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";

const bundleLocation = await bundle({ entryPoint: "./src/index.ts" });

const comp = await selectComposition({
  serveUrl: bundleLocation,
  id: "LowerThird",
  inputProps: { name: "Test User", title: "QA Engineer", accentColor: "#FF4800" },
});

await renderStill({
  composition: comp,
  serveUrl: bundleLocation,
  output: "out/test-frame.png",
  frame: 15,
});

console.log("✓ test-frame.png generated");
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| No `schema` on `<Composition>` | Studio can't generate UI controls — always pass `schema` |
| `defaultProps` doesn't match schema | Zod will throw at runtime — parse defaults with `schema.parse({})` |
| Hardcoded pixel values for responsive layouts | Use `useVideoConfig()` width/height to adapt |
| Forgetting `extrapolateRight: "clamp"` on interpolate | Values overshoot range — always clamp |
| Using `<Video>` instead of `<OffthreadVideo>` | `<Video>` is browser-only; `<OffthreadVideo>` works in SSR renders |
| Duplicate composition IDs in Root.tsx | Second composition silently ignored — keep IDs unique |
| Not calling `continueRender()` after `delayRender()` | Render hangs after 30s timeout |
| Absolute pixel positions on multi-ratio templates | Use percentage or `useVideoConfig()` to stay responsive |
