---
model: claude-sonnet-4-6
name: render-video
description: Use when rendering Remotion compositions to video files, stills, or GIFs — including codec selection, quality settings, frame ranges, aspect ratio presets, batch rendering, parallel concurrency, and Lambda/cloud rendering.
---

# render-video

## Overview

**Mandatory Announcement — FIRST OUTPUT before anything else:**

No exceptions. Box frame first, then work.

Remotion v4.0 rendering — CLI and programmatic SSR APIs. Embedded Rust-powered FFmpeg. No external FFmpeg install needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CLI Rendering

### Basic render

```bash
npx remotion render src/index.ts <CompositionId> out/video.mp4
```

### Preview in Studio (no render)

```bash
npx remotion studio src/index.ts
```

### Render a still image

```bash
npx remotion still src/index.ts <StillId> out/frame.png
```

### Render a GIF

```bash
npx remotion render src/index.ts <CompositionId> out/animation.gif --codec=gif
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Aspect Ratio Presets

| Platform | Ratio | Width | Height | Flag |
|----------|-------|-------|--------|------|
| YouTube / Desktop | 16:9 | 1920 | 1080 | — |
| TikTok / Reels | 9:16 | 1080 | 1920 | — |
| Instagram Square | 1:1 | 1080 | 1080 | — |
| Twitter/X Banner | 3:1 | 1500 | 500 | — |
| LinkedIn | 4:5 | 1080 | 1350 | — |

Set dimensions in `Root.tsx` `<Composition>` — they're baked in at composition registration, not at render time. To override at render time:

```bash
npx remotion render src/index.ts MyComp out/video.mp4 \
  --width=1080 --height=1920
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Codec Selection

| Codec | Flag | Output | Use Case |
|-------|------|--------|----------|
| H.264 | `--codec=h264` | `.mp4` | Universal — default, best compatibility |
| H.265 | `--codec=h265` | `.mp4` | Smaller files, less compatible |
| VP8 | `--codec=vp8` | `.webm` | Open web format |
| VP9 | `--codec=vp9` | `.webm` | Better quality than VP8 |
| ProRes | `--codec=prores` | `.mov` | Post-production, editing handoff |
| GIF | `--codec=gif` | `.gif` | Looping animations, no audio |
| MP3 | `--codec=mp3` | `.mp3` | Audio only |
| AAC | `--codec=aac` | `.aac` | Audio only |

```bash
# ProRes for editing handoff
npx remotion render src/index.ts MyComp out/video.mov --codec=prores

# WebM for web embed
npx remotion render src/index.ts MyComp out/video.webm --codec=vp9
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Quality Settings

### CRF (Constant Rate Factor) — lower = higher quality

```bash
# H.264: 0-51, default 18. 23 is visually lossless.
npx remotion render src/index.ts MyComp out/video.mp4 --crf=18

# VP9: 0-63, default 28
npx remotion render src/index.ts MyComp out/video.webm --codec=vp9 --crf=28
```

### Explicit bitrate

```bash
npx remotion render src/index.ts MyComp out/video.mp4 \
  --video-bitrate=8000k \
  --audio-bitrate=192k
```

### JPEG quality for frame exports

```bash
npx remotion still src/index.ts MyStill out/frame.jpg \
  --image-format=jpeg \
  --jpeg-quality=90
```

### Scale factor (output resolution multiplier)

```bash
# 2x scale — render at double the composition dimensions
npx remotion render src/index.ts MyComp out/video.mp4 --scale=2
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Frame Range Selection

```bash
# Render only frames 30–90 (1 second at 30fps)
npx remotion render src/index.ts MyComp out/clip.mp4 --frames=30-90

# Render a single frame as still
npx remotion still src/index.ts MyComp out/frame.png --frame=45

# Every Nth frame (useful for GIF size control)
npx remotion render src/index.ts MyComp out/fast.gif --codec=gif --every-nth-frame=2
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Parallel Rendering (Local)

Concurrency controls how many browser tabs render simultaneously. Default: half your CPU cores.

```bash
# Max concurrency for fastest local render
npx remotion render src/index.ts MyComp out/video.mp4 --concurrency=8

# Conservative — leaves CPU headroom
npx remotion render src/index.ts MyComp out/video.mp4 --concurrency=4
```

⚠ Higher concurrency = more RAM usage. Watch memory on long compositions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Programmatic SSR Rendering

Use `@remotion/renderer` for Node.js-based rendering (CI, server, batch).

```bash
npm install @remotion/renderer
```

### renderMedia() — video/audio

```ts
import { renderMedia, selectComposition } from "@remotion/renderer";

const composition = await selectComposition({
  serveUrl: "http://localhost:3000", // or bundled serve URL
  id: "MyVideo",
  inputProps: { title: "Hello" },
});

await renderMedia({
  composition,
  serveUrl: "http://localhost:3000",
  codec: "h264",
  outputLocation: "out/video.mp4",
  inputProps: { title: "Hello" },
  frameRange: [0, 89],         // optional
  concurrency: 4,              // optional
  crf: 18,                     // optional
  videoBitrate: "8000k",       // optional
  audioBitrate: "192k",        // optional
  onProgress: ({ progress }) => {
    console.log(`${Math.round(progress * 100)}%`);
  },
});
```

### renderStill() — single frame

```ts
import { renderStill, selectComposition } from "@remotion/renderer";

const composition = await selectComposition({
  serveUrl: "http://localhost:3000",
  id: "MyStill",
  inputProps: {},
});

await renderStill({
  composition,
  serveUrl: "http://localhost:3000",
  output: "out/frame.png",
  frame: 0,              // which frame to capture
  imageFormat: "png",    // "png" | "jpeg" | "webp" | "pdf"
  jpegQuality: 90,       // jpeg only
  scale: 1,
});
```

### Bundle first (for production/CI)

```ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const bundleLocation = await bundle({
  entryPoint: "./src/index.ts",
  webpackOverride: (config) => config,
});

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: "MyVideo",
  inputProps: {},
});

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation: "out/video.mp4",
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Batch Rendering

No built-in batch command — use a Node script:

```ts
import { renderMedia, selectComposition } from "@remotion/renderer";

const BATCH = [
  { id: "Intro", output: "out/intro.mp4", props: { name: "Alice" } },
  { id: "Intro", output: "out/intro-bob.mp4", props: { name: "Bob" } },
  { id: "Outro", output: "out/outro.mp4", props: {} },
];

// Sequential — safe for memory-constrained machines
for (const job of BATCH) {
  const comp = await selectComposition({ serveUrl, id: job.id, inputProps: job.props });
  await renderMedia({ composition: comp, serveUrl, codec: "h264", outputLocation: job.output, inputProps: job.props });
  console.log(`✓ ${job.output}`);
}
```

For parallel batch, use `Promise.all` with a concurrency limiter (p-limit):

```ts
import pLimit from "p-limit";
const limit = pLimit(3); // max 3 renders at once

await Promise.all(
  BATCH.map((job) => limit(async () => {
    const comp = await selectComposition({ serveUrl, id: job.id, inputProps: job.props });
    await renderMedia({ composition: comp, serveUrl, codec: "h264", outputLocation: job.output, inputProps: job.props });
  }))
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Lambda / Cloud Rendering

Distributed rendering — video split into chunks, each chunk rendered by a separate Lambda function, then stitched.

### Install

```bash
npm install @remotion/lambda
```

### Deploy Lambda function (one-time)

```bash
npx remotion lambda functions deploy --memory=2048 --timeout=120 --region=us-east-1
```

### Deploy site to S3

```bash
npx remotion lambda sites create src/index.ts --site-name=my-video-app
```

### Render on Lambda (CLI)

```bash
npx remotion lambda render <site-url> MyComp out/video.mp4 \
  --region=us-east-1 \
  --frames-per-lambda=20
```

### Render on Lambda (programmatic)

```ts
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-4-0-000-mem2048mb-disk2048mb-120sec",
  serveUrl: "https://s3.us-east-1.amazonaws.com/remotionlambda-abcd1234/sites/my-video-app",
  composition: "MyVideo",
  inputProps: { title: "Hello" },
  codec: "h264",
  framesPerLambda: 20,  // lower = faster (more parallel), higher = cheaper
});

// Poll for completion
while (true) {
  const progress = await getRenderProgress({ renderId, bucketName, functionName, region: "us-east-1" });
  if (progress.done) {
    console.log("Output URL:", progress.outputFile);
    break;
  }
  if (progress.fatalErrorEncountered) throw new Error(progress.errors[0].message);
  await new Promise((r) => setTimeout(r, 2000));
}
```

### Lambda parallelization tradeoff

| `framesPerLambda` | Lambda count | Speed | Cost |
|-------------------|-------------|-------|------|
| 5 | High | Fastest | Most expensive |
| 20 | Medium | Fast | Balanced |
| 40+ | Low | Slower | Cheapest |

Max 200 Lambda functions per render.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## GIF-Specific Settings

```bash
# Basic GIF
npx remotion render src/index.ts MyComp out/loop.gif --codec=gif

# Reduce size: skip every other frame + scale down
npx remotion render src/index.ts MyComp out/loop.gif \
  --codec=gif \
  --every-nth-frame=2 \
  --scale=0.5

# Limit frame range for a short loop
npx remotion render src/index.ts MyComp out/loop.gif \
  --codec=gif \
  --frames=0-59
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Installing FFmpeg separately | v4 embeds FFmpeg — don't install externally |
| `<Video>` in SSR render | Use `<OffthreadVideo>` — `<Video>` is browser-only |
| `delayRender()` without `continueRender()` | Render hangs at 30s — always pair them |
| High `--concurrency` on low RAM machine | Crashes mid-render — reduce to 2–4 |
| GIF with no `--every-nth-frame` | Huge file sizes — always drop frames for GIFs |
| Lambda without site deployed | Must run `sites create` before `lambda render` |
| Wrong `framesPerLambda` direction | Lower = faster + more expensive; higher = slower + cheaper |
