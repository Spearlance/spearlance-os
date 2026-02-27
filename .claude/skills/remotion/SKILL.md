---
model: claude-sonnet-4-6
name: remotion
description: Use when working with Remotion for programmatic video creation, rendering compositions, animations with interpolate/spring, embedding the Player in React apps, serverless Lambda rendering, or generating stills.
---

# Remotion

## Overview
Remotion v4.0 for creating videos programmatically with React. Components rendered frame-by-frame. Rust-powered embedded FFmpeg. Outputs video, stills (PNG/JPEG/WebP/PDF), and GIF.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 4.0.423 |
| **Create Project** | `npx create-video@latest` |
| **Start Studio** | `npx remotion studio` |
| **Render Video** | `npx remotion render src/index.ts CompId out/video.mp4` |
| **Render Still** | `npx remotion still src/index.ts StillId out/still.png` |
| **Player Package** | `@remotion/player` |
| **Lambda Package** | `@remotion/lambda` |
| **Config File** | `remotion.config.ts` |
| **Licensing** | Free <=3 employees; Company License above (remotion.pro) |

## Core Pattern

```tsx
// src/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);

// src/Root.tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";
export const RemotionRoot = () => (
  <Composition id="MyVideo" component={MyVideo}
    width={1920} height={1080} fps={30} durationInFrames={150} />
);

// src/MyVideo.tsx
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
export const MyVideo = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity, justifyContent: "center", alignItems: "center" }}>
    <h1 style={{ fontSize: 80 }}>Hello Remotion</h1>
  </AbsoluteFill>;
};
```

## Common Operations

**Fade in/out with Sequences:**
```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 20, 40, 60], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

**Spring animation:**
```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
```

**Render a still image** (declare with `<Still>` in Root — no `durationInFrames`/`fps` needed):
```bash
npx remotion still src/index.ts MyStill out/image.png
```

## Animation Quick Reference

| Function | Use Case |
|----------|----------|
| `interpolate(input, inputRange, outputRange, opts)` | Linear/eased range mapping |
| `spring({ frame, fps, config })` | Physics-based spring |
| `Easing.bezier(x1, y1, x2, y2)` | Custom easing for interpolate |
| `<Sequence from={30} durationInFrames={60}>` | Time-shift children (frame resets to 0) |
| `<Series>` / `<Series.Sequence>` | Sequential playback with offsets |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `extrapolateRight: "clamp"` | Values exceed output range; always clamp |
| Installing FFmpeg separately | v4 embeds FFmpeg in `@remotion/renderer` |
| Using `<Video>` in SSR rendering | Use `<OffthreadVideo>` for SSR; `<Video>` is for browser |
| Forgetting frame resets in Sequences | `useCurrentFrame()` restarts at 0 inside `<Sequence>` |
| Using `<Composition>` for stills | Use `<Still>` — no `durationInFrames`/`fps` needed |
| Not calling `continueRender()` after `delayRender()` | Render hangs after 30s; always pair them |

## Licensing

- **Free:** Individuals, companies <=3 employees, non-profits, evaluation
- **Company License:** Required for for-profit >3 employees (via remotion.pro)
- **Cloud Rendering:** Requires Cloud Rendering Units

## Full Reference

See `reference.md` in this skill directory for complete API docs including core components, hooks, animation, media, data fetching, CLI/SSR rendering, Lambda, Player, styling, ecosystem packages, and licensing.
