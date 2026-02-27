# Remotion Reference

> Remotion v4.0.423 — React-based programmatic video creation framework.

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Core Components](#2-core-components)
3. [Hooks](#3-hooks)
4. [Animation](#4-animation)
5. [Media](#5-media)
6. [Data & Async](#6-data--async)
7. [Rendering CLI](#7-rendering-cli)
8. [Rendering Node.js/SSR](#8-rendering-nodejsssr)
9. [Lambda](#9-lambda)
10. [Player](#10-player)
11. [Styling](#11-styling)
12. [Ecosystem Packages](#12-ecosystem-packages)
13. [Licensing](#13-licensing)

---

## 1. Project Setup

### Create a New Project

```bash
npx create-video@latest    # npm (recommended)
pnpm create video           # pnpm
yarn create video            # yarn
bun create video             # bun
```

The CLI prompts for a template. Available templates include: Hello World, Blank, Next.js (App Dir), Next.js (Pages Dir), React Router 7, JavaScript, Recorder, Stills, TTS, Audiogram, Music Visualization, TikTok Captions, 3D (Three.js), and more.

### Directory Structure

```
my-video/
  src/
    index.ts            # Entry point: registerRoot(RemotionRoot)
    Root.tsx             # <Composition> declarations
    MyComposition.tsx    # Your video components
  public/               # Static assets (images, fonts, audio)
  remotion.config.ts    # CLI and Studio configuration
  package.json
  tsconfig.json
```

### Entry Point — `registerRoot()`

The entry point file (`src/index.ts`) must call `registerRoot()` with your root component:

```tsx
// src/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

**Gotchas:**
- `registerRoot()` must be called exactly once.
- The entry point file should not export anything — it is the root of the bundle.

### Configuration — `remotion.config.ts`

```ts
import { Config } from "@remotion/cli/config";
Config.setConcurrency(4);        Config.setCodec("h264");
Config.setPixelFormat("yuv420p"); Config.setScale(1);
Config.setStudioPort(3000);       Config.setShouldOpenBrowser(true);
```

**Gotchas:** Only affects CLI/Studio (NOT `@remotion/renderer` or Lambda). CLI flags override config values.

---

## 2. Core Components

### `<Composition>`

Declares a renderable video composition. Must be a child of the root component.

```tsx
import { Composition } from "remotion";

<Composition
  id="my-comp"              // Unique ID (used in CLI and Player)
  component={MyComp}        // React component to render
  width={1920}              // Width in pixels
  height={1080}             // Height in pixels
  fps={30}                  // Frames per second
  durationInFrames={300}    // Total frames (300 frames = 10s at 30fps)
  defaultProps={{ title: "Hello" }}  // Default props
  schema={myZodSchema}      // Optional Zod schema for Studio prop editor
  calculateMetadata={fn}    // Optional async function for dynamic config
/>
```

**Required props:** `id`, `component` (or `lazyComponent`), `width`, `height`, `fps`, `durationInFrames`. **Optional:** `defaultProps`, `schema` (Zod), `calculateMetadata`.

### `<Still>`

Simplified `<Composition>` for single-frame images. No `durationInFrames` or `fps` required.

```tsx
import { Still } from "remotion";

<Still
  id="my-thumbnail"
  component={ThumbnailComp}
  width={1080}
  height={1080}
  defaultProps={{ text: "Thumbnail" }}
/>
```

**Gotchas:**
- Use `<Still>` instead of `<Composition>` when generating static images.
- Rendered with `npx remotion still` (not `npx remotion render`).
- Supports PNG, JPEG, WebP, and PDF output formats.

### `<Sequence>`

Time-shifts children. Offsets when children start playing and optionally limits their duration.

```tsx
import { Sequence } from "remotion";

// Children render from frame 30 to frame 89 (60 frames duration)
<Sequence from={30} durationInFrames={60}>
  <MyChild />
</Sequence>

// With layout="none" (no absolute positioning wrapper)
<Sequence from={0} durationInFrames={90} layout="none">
  <MyChild />
</Sequence>
```

**Key props:** `from` (default: 0), `durationInFrames` (default: Infinity), `layout` ("absolute-fill" | "none"), `name`, `style`, `className`, `premountFor`, `postmountFor`.

**Gotchas:**
- `useCurrentFrame()` inside a `<Sequence>` returns the frame RELATIVE to the sequence start (resets to 0).
- Children are unmounted when outside the sequence's frame range (unless using `premountFor`/`postmountFor`).

### `<Series>`

Plays children sequentially, one after another.

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={60}>
    <TitleCard />
  </Series.Sequence>
  <Series.Sequence durationInFrames={120}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={Infinity}>  {/* Fills remaining time */}
    <Credits />
  </Series.Sequence>
</Series>
```

**`<Series.Sequence>` key props:** `durationInFrames` (last can be `Infinity`), `offset` (positive = delay, negative = overlap), `layout`, `style`, `className`, `premountFor`, `ref`.

### `<AbsoluteFill>`

Full-screen absolutely positioned container. The most common layout wrapper.

```tsx
import { AbsoluteFill } from "remotion";

<AbsoluteFill style={{ backgroundColor: "white" }}>
  <h1>Centered content</h1>
</AbsoluteFill>
```

Equivalent CSS: `position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; display: flex; flex-direction: column;`

**Note:** `AbsoluteFill` does NOT center content by default. Add `justifyContent`/`alignItems` via inline style if centering is needed.

**Gotchas:**
- Tailwind-aware from v4.0.249.
- Multiple `<AbsoluteFill>` components stack on top of each other (z-order by DOM order).

### `<Loop>`

Loops children for a given number of iterations or infinitely.

```tsx
import { Loop } from "remotion";

<Loop durationInFrames={60} times={3}>  {/* 3 iterations of 60 frames */}
  <PulsingDot />
</Loop>
```

**Props:** `durationInFrames` (required), `times` (default: `Infinity`), `layout`, `style`.
**Hook:** `Loop.useLoop()` (v4.0.142+) returns `{ iteration, durationInFrames }`.

### `<Freeze>`

Freezes children at a specific frame. Props: `frame` (number), `active` (boolean or callback, v4.0.127+).

```tsx
import { Freeze } from "remotion";
<Freeze frame={30}><MyAnimation /></Freeze>
<Freeze frame={30} active={(f) => f > 60}><MyAnimation /></Freeze>
```

### `<Folder>`

Organizes compositions in the Studio sidebar. Visual only — no runtime effect.

```tsx
import { Folder } from "remotion";

<Folder name="Marketing">
  <Composition id="ad-1" ... />
  <Composition id="ad-2" ... />
</Folder>
```

---

## 3. Hooks

### `useCurrentFrame()`

Returns the current 0-indexed frame number.

```tsx
import { useCurrentFrame } from "remotion";

const MyComp = () => {
  const frame = useCurrentFrame();
  return <div>Frame: {frame}</div>;
};
```

**Gotchas:**
- Inside a `<Sequence>`, returns the frame RELATIVE to the sequence start (not absolute).
- Frame 0 is the first frame.

### `useVideoConfig()`

Returns the current composition's configuration.

```tsx
import { useVideoConfig } from "remotion";

const MyComp = () => {
  const { width, height, fps, durationInFrames, id, defaultProps } = useVideoConfig();
  // Use fps for time calculations: const seconds = frame / fps;
  return <div>{width}x{height} @ {fps}fps</div>;
};
```

**Returns:** `{ width, height, fps, durationInFrames, id, defaultProps, props, defaultCodec }`

---

## 4. Animation

### `interpolate()`

Maps an input value from one range to another. The primary animation primitive.

```ts
import { interpolate } from "remotion";

// Signature
interpolate(
  input: number,
  inputRange: number[],       // Must be monotonically non-decreasing
  outputRange: number[],      // Same length as inputRange
  options?: {
    extrapolateLeft?: "extend" | "clamp" | "wrap" | "identity";
    extrapolateRight?: "extend" | "clamp" | "wrap" | "identity";
    easing?: (t: number) => number;
  }
): number;
```

**Examples:**

```tsx
const frame = useCurrentFrame();

// Simple fade in (frames 0-30)
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Fade in, hold, fade out
const opacity = interpolate(frame, [0, 30, 60, 90], [0, 1, 1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Slide from left with easing
const translateX = interpolate(frame, [0, 30], [-100, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
});

// Multi-point animation
const scale = interpolate(frame, [0, 15, 30], [0, 1.2, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

**Extrapolation:** `"extend"` (default, continues curve), `"clamp"` (caps at range), `"wrap"` (wraps around), `"identity"` (returns input).

**Gotchas:**
- **Always use `extrapolateRight: "clamp"`** — this is the #1 Remotion mistake. Without it, values exceed output range.
- `inputRange` must be monotonically non-decreasing, same length as `outputRange`.
- For colors, use `interpolateColors()` instead.

### `interpolateColors()`

Interpolates between colors.

```ts
import { interpolateColors } from "remotion";

const color = interpolateColors(
  frame,
  [0, 50],
  ["#ff0000", "rgba(0, 0, 255, 1)"]  // Supports hex, rgba, hsla, named colors
);

// Returns: rgba() string
```

### `spring()`

Physics-based spring animation. Returns a value that animates from `from` to `to`.

```ts
import { spring } from "remotion";

// Signature
spring({
  frame: number;              // Current frame
  fps: number;                // FPS from useVideoConfig()
  from?: number;              // Start value (default: 0)
  to?: number;                // End value (default: 1)
  delay?: number;             // Delay in frames (default: 0)
  reverse?: boolean;          // Reverse animation (default: false)
  durationInFrames?: number;  // Override natural duration
  config?: {
    stiffness?: number;       // Default: 100
    damping?: number;         // Default: 10
    mass?: number;            // Default: 1
    overshootClamping?: boolean;  // Default: false
  };
}): number;
```

**Examples:**

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Basic spring
const scale = spring({ frame, fps });

// Custom spring config
const opacity = spring({
  frame,
  fps,
  from: 0,
  to: 1,
  config: { stiffness: 200, damping: 15, mass: 0.5 },
});

// Delayed spring
const translateY = spring({
  frame,
  fps,
  from: 50,
  to: 0,
  delay: 15,
});

// Fixed-duration spring (stretches to fit)
const progress = spring({
  frame,
  fps,
  durationInFrames: 30,
  config: { damping: 12 },
});
```

**Gotchas:**
- Order of operations: duration stretching -> reversal -> delay.
- `durationInFrames` stretches or compresses the spring to fit the frame count.
- Use `overshootClamping: true` to prevent the value from going past `to`.

### `Easing`

Easing functions for use with `interpolate()`. Import: `import { Easing } from "remotion";`

**Predefined:** `Easing.ease`, `.bounce`, `.back(s?)`, `.elastic(b?)`
**Standard:** `.linear`, `.quad`, `.cubic`, `.poly(n)`
**Mathematical:** `.bezier(x1, y1, x2, y2)`, `.circle`, `.sin`, `.exp`
**Modifiers:** `.in(fn)`, `.out(fn)`, `.inOut(fn)` — wrap any easing function

```tsx
// Custom bezier
interpolate(frame, [0, 30], [0, 1], { easing: Easing.bezier(0.25, 0.1, 0.25, 1), extrapolateRight: "clamp" });
// Bounce out
interpolate(frame, [0, 60], [0, 300], { easing: Easing.out(Easing.bounce), extrapolateRight: "clamp" });
```

---

## 5. Media

### `<Img>`

Ensures image loads before frame renders (prevents blank frames). All standard `<img>` props plus `pauseWhenLoading` (v4.0.111+) and `onError`.

```tsx
import { Img } from "remotion";
<Img src={staticFile("logo.png")} style={{ width: 500 }} />
```

**Gotchas:** Auto-retries 2x. Do NOT use for GIFs (use `@remotion/gif`). Always use `<Img>` over `<img>`.

### `<Video>` / `<Html5Video>`

HTML5 video element for browser/Player playback.

```tsx
import { Video } from "remotion";

<Video
  src={staticFile("clip.mp4")}
  volume={0.8}
  playbackRate={1}
  style={{ width: "100%" }}
/>

// With volume keyframes
<Video
  src={staticFile("clip.mp4")}
  volume={(f) => interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" })}
/>
```

**Shared media props:** `src`, `volume` (number or `(frame) => number`), `playbackRate`, `muted`, `loop`, `trimBefore`, `trimAfter`, `style`.

**Gotchas:**
- `<Video>` uses HTML5 `<video>` — works in browser/Player but NOT ideal for SSR.
- For SSR/rendering, use `<OffthreadVideo>` instead.

### `<OffthreadVideo>`

Extracts frames via FFmpeg. Designed for SSR. Better performance and frame accuracy than `<Video>`.

```tsx
import { OffthreadVideo } from "remotion";
<OffthreadVideo src={staticFile("clip.mp4")} volume={1} transparent={false} toneMapped={true} />
```

**Additional props:** `transparent` (WebM/ProRes 4444), `toneMapped` (HDR), `pauseWhenBuffering`.
**Supported codecs:** H.264, H.265, VP8, VP9, AV1, ProRes.

**Gotchas:**
- NOT supported in `@remotion/web-renderer`.
- Use `<OffthreadVideo>` for rendering, `<Video>` for browser/Player preview.

### `<Audio>` / `<Html5Audio>`

Audio playback component.

```tsx
import { Audio } from "remotion";

<Audio
  src={staticFile("music.mp3")}
  volume={0.5}
  playbackRate={1}
/>

// Volume fade in
<Audio
  src={staticFile("music.mp3")}
  volume={(f) => interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" })}
/>
```

**Props:** Same as `<Video>` plus `toneFrequency` (generate tone at Hz).

### `staticFile()`

References files from the `public/` folder.

```tsx
import { staticFile } from "remotion";

const src = staticFile("logo.png");       // References public/logo.png
const src = staticFile("fonts/bold.woff"); // References public/fonts/bold.woff
```

**Gotchas:**
- Auto-encodes URI-unsafe characters since v4.0.
- Must be a relative path within `public/` — no absolute paths.
- Files are served at build time; cannot dynamically generate paths at runtime.

---

## 6. Data & Async

### `calculateMetadata()` (Preferred)

Async function to dynamically set composition dimensions, duration, FPS, or props before rendering. Runs before the component mounts.

```tsx
import { Composition } from "remotion";

const calculateMyMetadata = async ({ props, abortSignal, defaultProps }) => {
  const res = await fetch("https://api.example.com/data", {
    signal: abortSignal,
  });
  const data = await res.json();

  return {
    props: { ...props, apiData: data },
    durationInFrames: data.frameCount,
    width: data.width,      // Optional: override width
    height: data.height,    // Optional: override height
    fps: data.fps,          // Optional: override fps
  };
};

// In Root.tsx
<Composition
  id="dynamic-comp"
  component={MyComp}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={300}
  calculateMetadata={calculateMyMetadata}
/>
```

**Signature:** `async ({ props, defaultProps, abortSignal }) => { props?, durationInFrames?, width?, height?, fps? }`

**Gotchas:** Use `abortSignal` for fetch calls (Studio may abort on rapid prop changes). Returns override static `<Composition>` props. Preferred over `delayRender()` for pre-render data.

### `delayRender()` / `continueRender()`

Delays rendering until async operations complete. Used inside components.

```tsx
import { delayRender, continueRender, cancelRender } from "remotion";
import { useState, useEffect } from "react";

const MyComp = () => {
  const [data, setData] = useState(null);
  const [handle] = useState(() =>
    delayRender("Loading API data...", {
      retries: 1,
      timeoutInMilliseconds: 7000,
    })
  );

  useEffect(() => {
    fetch("https://api.example.com/data")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        continueRender(handle);  // Signal that rendering can proceed
      })
      .catch((err) => {
        cancelRender(err);  // Abort the render with an error
      });
  }, [handle]);

  if (!data) return null;
  return <div>{data.title}</div>;
};
```

**Signature:** `delayRender(label?, { retries?, timeoutInMilliseconds? }): number` (returns handle).

**Gotchas:** Must call `continueRender(handle)` within timeout (default 30s) or render fails. Use `cancelRender(error)` to abort cleanly. Prefer `calculateMetadata()` for pre-render data fetching.

### `getInputProps()`

Retrieves props passed via CLI `--props` flag or programmatic `inputProps`.

```tsx
import { getInputProps } from "remotion";

const props = getInputProps();  // Returns parsed JSON from --props CLI flag
```

**Gotchas:**
- Returns `{}` in Player and browser contexts (no-op).
- In CLI: `npx remotion render src/index.ts MyComp --props='{"title":"Hello"}'`
- Props can also be passed via a file: `--props=./props.json`

---

## 7. Rendering CLI

### `npx remotion render` — Render Video

```bash
npx remotion render <entry-point> <composition-id> <output-path>

# Examples
npx remotion render src/index.ts MyComp out/video.mp4
npx remotion render src/index.ts MyComp out/video.webm --codec=vp9
```

**Key flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--codec` | `h264` | Output codec |
| `--crf` | codec-dependent | Quality (lower = better) |
| `--frames` | all | Frame range (e.g., `0-99`) |
| `--props` | - | JSON props or path to JSON file |
| `--concurrency` | CPU count | Parallel render threads |
| `--scale` | `1` | Scale factor |
| `--muted` | `false` | Disable audio |

Additional: `--image-format`, `--fps`, `--width`, `--height`, `--jpeg-quality`, `--every-nth-frame`, `--gl` (angle/egl/swangle/swiftshader/vulkan), `--log`.

**Supported codecs:** `h264`, `h265`, `vp8`, `vp9`, `prores`, `h264-mkv`, `gif`, `mp3`, `aac`, `wav`

### `npx remotion still` — Render Still Image

```bash
npx remotion still <entry-point> <composition-id> <output-path>

# Examples
npx remotion still src/index.ts MyThumbnail out/thumb.png
npx remotion still src/index.ts MyThumbnail out/thumb.webp --image-format=webp
npx remotion still src/index.ts MyThumbnail out/doc.pdf --image-format=pdf
```

**Key flags:** `--image-format` (png | jpeg | webp | pdf, default: png), `--frame` (default: 0), `--props`, `--scale`, `--jpeg-quality`, `--gl`, `--log`.

**Gotchas:**
- Works with both `<Still>` and `<Composition>` components.
- For `<Composition>`, defaults to frame 0 unless `--frame` is specified.
- PDF and WebP formats are new in Remotion v4.0.

### `npx remotion studio` — Start Studio

```bash
npx remotion studio
npx remotion studio --port 3001
```

Opens the Remotion Studio (formerly "Preview") with live preview, timeline, Zod-based prop editing, in-Studio render button, and frame-by-frame navigation.

---

## 8. Rendering Node.js/SSR

### `bundle()` — Bundle Entry Point

```ts
import { bundle } from "@remotion/bundler";

const bundleLocation = await bundle({
  entryPoint: "./src/index.ts",     // Required: entry file
  onProgress: (progress: number) => {
    console.log(`Bundling: ${progress}%`);
  },
  webpackOverride: (config) => config,  // Webpack config override
  enableCaching: true,                   // Cache for faster rebuilds
  publicDir: "./public",                 // Static assets directory
});
// bundleLocation is a file:// URL to the bundle
```

### `selectComposition()` — Get Composition Config

```ts
import { selectComposition } from "@remotion/renderer";

const composition = await selectComposition({
  serveUrl: bundleLocation,      // Bundle URL or serve URL
  id: "MyComp",                  // Composition ID
  inputProps: { title: "Hello" }, // Props to pass
  timeoutInMilliseconds: 30000,
});
// Returns: { id, width, height, fps, durationInFrames, defaultProps, props, defaultCodec }
```

### `renderMedia()` — Render Video/Audio

```ts
import { renderMedia } from "@remotion/renderer";

await renderMedia({
  serveUrl: bundleLocation,
  composition,                    // From selectComposition()
  codec: "h264",
  outputLocation: "out/video.mp4",
  inputProps: { title: "Hello" },

  // Optional
  imageFormat: "jpeg",            // "jpeg" | "png"
  crf: 18,                        // Quality (lower = better)
  concurrency: 4,                 // Parallel threads
  scale: 1,
  frameRange: [0, 99],           // Render specific frames
  muted: false,
  jpegQuality: 80,
  onProgress: ({ progress }) => {
    console.log(`Rendering: ${(progress * 100).toFixed(0)}%`);
  },
  onStart: ({ frameCount }) => {
    console.log(`Starting render of ${frameCount} frames`);
  },
});
```

### `renderStill()` — Render Single Frame

```ts
import { renderStill } from "@remotion/renderer";

await renderStill({
  serveUrl: bundleLocation,
  composition,                    // From selectComposition()
  output: "out/thumbnail.png",
  imageFormat: "png",             // "png" | "jpeg" | "webp" | "pdf"
  frame: 0,                      // Which frame to render
  inputProps: { title: "Hello" },

  // Optional
  scale: 1,
  jpegQuality: 80,
  onDownload: (src) => console.log(`Downloading: ${src}`),
});
```

### `getCompositions()` — List All Compositions

```ts
import { getCompositions } from "@remotion/renderer";

const compositions = await getCompositions(bundleLocation, {
  inputProps: {},
});
// Returns array of { id, width, height, fps, durationInFrames, defaultProps }
```

### `renderFrames()` — Render Individual Frames

Lower-level API that renders each frame as an image to a directory. Used when you need frame-level control (e.g., custom concatenation, frame post-processing).

```ts
import { renderFrames } from "@remotion/renderer";

await renderFrames({
  serveUrl: bundleLocation,
  composition,
  outputDir: "out/frames",
  imageFormat: "png",
  inputProps: { title: "Hello" },
  onFrameUpdate: (frame, total) => {
    console.log(`Frame ${frame}/${total}`);
  },
  onStart: ({ frameCount }) => {
    console.log(`Rendering ${frameCount} frames`);
  },
});
```

**Note:** You must concatenate the frames yourself (e.g., via FFmpeg) to produce a video. For most use cases, prefer `renderMedia()`.

### `openBrowser()` — Share Browser Instance

Reuses a single browser instance across multiple renders (avoids cold-start overhead).

```ts
import { openBrowser, renderMedia } from "@remotion/renderer";

const browser = await openBrowser("chrome");

// Pass to renderMedia/renderStill
await renderMedia({ ...options, puppeteerInstance: browser });
await renderMedia({ ...otherOptions, puppeteerInstance: browser });

await browser.close({ silent: true });
```

**Gotchas:** Must call `browser.close()` when done. Useful for batch renders (many compositions in sequence).

### Full SSR Workflow

The typical flow is: `bundle()` -> `selectComposition()` -> `renderMedia()` (or `renderStill()`). See examples above for each step.

---

## 9. Lambda

AWS Lambda distributed rendering. Splits video into chunks rendered by concurrent Lambda functions, then concatenates the result and uploads to S3.

### Architecture

Main Lambda spawns workers (one per chunk), each renders frames, chunks concatenated and uploaded to S3. Default: 1000 concurrent Lambdas/region. Storage: 10GB/Lambda (~5GB max output).

### Setup

**1. Install package:**

```bash
npm install @remotion/lambda
```

**2. Generate IAM policies:**

```bash
# Generate the role policy (attach to Lambda execution role)
npx remotion lambda policies role

# Generate the user policy (attach to your IAM user)
npx remotion lambda policies user
```

**3. Create IAM role and user in AWS Console:**
- Create execution role with the role policy.
- Create IAM user with the user policy and generate access keys.

**4. Set environment variables:**

```bash
# .env
REMOTION_AWS_ACCESS_KEY_ID=AKIA...
REMOTION_AWS_SECRET_ACCESS_KEY=wJa...
```

**5. Deploy Lambda function:**

```bash
npx remotion lambda functions deploy --memory=2048 --timeout=240 --disk=2048
```

**6. Upload site to S3:**

```bash
npx remotion lambda sites create src/index.ts --site-name=my-video
```

### Programmatic Rendering on Lambda

```ts
import {
  renderMediaOnLambda,
  getRenderProgress,
  deploySite,
  deployFunction,
  getOrCreateBucket,
} from "@remotion/lambda/client";

// Deploy (typically done once)
const { functionName } = await deployFunction({
  region: "us-east-1",
  timeoutInSeconds: 240,
  memorySizeInMb: 2048,
  diskSizeInMb: 2048,
});

const { bucketName } = await getOrCreateBucket({ region: "us-east-1" });

const { serveUrl } = await deploySite({
  region: "us-east-1",
  bucketName,
  entryPoint: "./src/index.ts",
  siteName: "my-video",
});

// Render
const { renderId, bucketName: renderBucket } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName,
  composition: "MyComp",
  serveUrl,
  codec: "h264",
  inputProps: { title: "Hello" },
  framesPerLambda: 20,           // Frames per worker Lambda
});

// Poll progress
const progress = await getRenderProgress({
  renderId,
  bucketName: renderBucket,
  region: "us-east-1",
  functionName,
});

console.log(`Progress: ${(progress.overallProgress * 100).toFixed(0)}%`);
if (progress.done) {
  console.log(`Output: ${progress.outputFile}`);
}
```

### `renderStillOnLambda()`

```ts
import { renderStillOnLambda } from "@remotion/lambda/client";

const { url } = await renderStillOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-...",
  composition: "MyThumbnail",
  serveUrl: "https://...",
  imageFormat: "png",
  inputProps: { text: "Thumbnail" },
});
```

### Lambda Supported Regions (20 total)

US: `us-east-1`, `us-east-2`, `us-west-1`, `us-west-2` | EU: `eu-west-1/2/3`, `eu-central-1`, `eu-north-1`, `eu-south-1` | AP: `ap-south-1`, `ap-southeast-1/2`, `ap-northeast-1/2/3` | Other: `ca-central-1`, `sa-east-1`, `af-south-1`, `me-south-1`

### Lambda Gotchas

- Cloud rendering (Lambda, Cloud Run) requires **Cloud Rendering Units**, purchased separately via remotion.pro. Free-tier users (individuals, <=3 employees) still need to purchase Cloud Rendering Units to use Lambda.
- Lambda storage is ephemeral (10GB max) — large videos may need higher `diskSizeInMb`.
- `framesPerLambda` controls chunk granularity: lower = more Lambdas = faster but more overhead.
- VP9 codec is supported on Lambda.
- PHP and Go SDKs available for triggering Lambda renders from other backends.

---

## 10. Player

Embed Remotion compositions in any React application using `@remotion/player`.

### Installation

```bash
npm install @remotion/player
```

### Basic Usage

```tsx
import { Player } from "@remotion/player";
import { MyComposition } from "./MyComposition";

const App = () => (
  <Player
    component={MyComposition}
    durationInFrames={300}
    compositionWidth={1920}
    compositionHeight={1080}
    fps={30}
    controls={true}
    loop={false}
    autoPlay={false}
    style={{ width: "100%" }}
    inputProps={{ title: "Hello" }}
  />
);
```

### Props

**Required:** `component` (or `lazyComponent`), `durationInFrames`, `compositionWidth`, `compositionHeight`, `fps`.

**Playback:** `controls` (false), `loop` (false), `autoPlay` (false), `clickToPlay` (true), `doubleClickToFullscreen` (false), `spaceKeyToPlayOrPause` (true), `playbackRate` (1, range: -4 to 4, not 0).

**Display:** `inputProps` ({}), `style`, `showVolumeControls` (true), `showPlaybackRateControl` (false), `renderLoading`, `errorFallback`, `numberOfSharedAudioTags` (5).

### PlayerRef Methods

Access via `useRef<PlayerRef>()`:

```tsx
import { PlayerRef } from "@remotion/player";
import { useRef } from "react";

const playerRef = useRef<PlayerRef>(null);

// Control methods
playerRef.current?.play();
playerRef.current?.pause();
playerRef.current?.toggle();
playerRef.current?.seekTo(60);               // Seek to frame 60
playerRef.current?.getCurrentFrame();         // Get current frame
playerRef.current?.setVolume(0.5);           // Set volume (0-1)
playerRef.current?.mute();
playerRef.current?.unmute();
playerRef.current?.getVolume();
playerRef.current?.isMuted();
playerRef.current?.isPlaying();
playerRef.current?.requestFullscreen();
playerRef.current?.exitFullscreen();
playerRef.current?.getContainerNode();        // Get DOM node
```

### Player Events

Use `playerRef.current.addEventListener(event, handler)` / `removeEventListener()`.

**Available events:** `play`, `pause`, `seeked`, `timeupdate`, `frameupdate`, `fullscreenchange`, `error`, `ended`.

Event detail types: `frameupdate` has `{ detail: { frame: number } }`, `error` has `{ detail: { error: Error } }`.

### Player in Next.js

```tsx
// app/page.tsx (App Router)
"use client";

import { Player } from "@remotion/player";
import { MyComposition } from "../remotion/MyComposition";

export default function Page() {
  return (
    <Player
      component={MyComposition}
      durationInFrames={300}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      controls
      style={{ width: "100%" }}
      inputProps={{ title: "Next.js + Remotion" }}
    />
  );
}
```

**Gotchas:**
- Player component must be in a Client Component (`"use client"`) in Next.js App Router.
- The composition component does NOT need `"use client"` — only the file rendering `<Player>`.
- Player is React Server Component compatible (the import itself works in RSC).
- `playbackRate` cannot be 0. Valid range: -4 to 4.
- Player does not render in Node.js — it is browser-only.

---

## 11. Styling

Remotion supports inline styles (most common), CSS Modules, CSS imports, and Google Fonts via `@remotion/google-fonts`:

```tsx
// Inline styles
<div style={{ fontSize: 80, color: "white", fontFamily: "Inter" }}>Hello</div>

// Google Fonts
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();
```

### Tailwind CSS

**v4:** `npm install @remotion/tailwind-v4` — zero config needed.
**v3:** `npm install @remotion/tailwind` — requires webpack override:

```ts
// remotion.config.ts
import { enableTailwind } from "@remotion/tailwind";
Config.overrideWebpackConfig((config) => enableTailwind(config));
```

**Gotchas:** `<AbsoluteFill>` is Tailwind-aware from v4.0.249. For SSR, ensure Tailwind is in webpack override.

---

## 12. Ecosystem Packages

| Package | Purpose | Key Export |
|---------|---------|-----------|
| `@remotion/transitions` | Scene transitions between sequences | `<TransitionSeries>` |
| `@remotion/shapes` | SVG primitives | `<Triangle>`, `<Star>`, `<Pie>`, `<Circle>`, `<Rect>`, `<Ellipse>` |
| `@remotion/paths` | SVG path manipulation utilities | `getPointAtLength()`, `getSubpaths()` |
| `@remotion/three` | React Three Fiber integration | `<ThreeCanvas>` |
| `@remotion/lottie` | Lottie animation playback | `<Lottie>` |
| `@remotion/rive` | Rive animation playback | `<Rive>` |
| `@remotion/gif` | Synchronized GIF playback | `<Gif>` |
| `@remotion/tailwind` | Tailwind CSS v3 integration | `enableTailwind()` |
| `@remotion/tailwind-v4` | Tailwind CSS v4 integration | Auto-configured |
| `@remotion/layout-utils` | Text measurement and layout | `measureText()`, `fillTextBox()` |
| `@remotion/install-whisper-cpp` | Local Whisper.cpp transcription | `installWhisperCpp()` |
| `@remotion/openai-whisper` | OpenAI Whisper cloud transcription | `transcribe()` |
| `@remotion/lambda` | AWS Lambda distributed rendering | `renderMediaOnLambda()` |
| `@remotion/cloudrun` | Google Cloud Run rendering (alpha) | `renderMediaOnCloudrun()` |
| `@remotion/web-renderer` | Browser-based rendering (experimental) | `renderMedia()` |
| `@remotion/player` | Embeddable video player | `<Player>` |
| `@remotion/renderer` | Node.js SSR rendering APIs | `renderMedia()`, `renderStill()` |
| `@remotion/bundler` | Webpack bundling for rendering | `bundle()` |
| `@remotion/media` | Newer Video/Audio for web renderer | `<Video>`, `<Audio>` |
| `@remotion/motion-blur` | Per-component motion blur | `<MotionBlur>` |
| `@remotion/noise` | Perlin/simplex noise generation | `noise2D()`, `noise3D()`, `noise4D()` |
| `@remotion/google-fonts` | Google Fonts loader | `loadFont()` |

### `@remotion/transitions`

Provides `<TransitionSeries>` for animated transitions between sequences.

**Available presentations:** `fade()`, `slide()`, `wipe()`, `flip()`, `clockWipe()`, `none()`. Import from `@remotion/transitions/<name>` (e.g., `@remotion/transitions/slide`).

**Timing functions:** `linearTiming({ durationInFrames })`, `springTiming({ config })`.

```tsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 30 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={slide({ direction: "from-left" })}
    timing={linearTiming({ durationInFrames: 20 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneC />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### `@remotion/shapes`

```tsx
import { Star } from "@remotion/shapes";
<Star points={5} innerRadius={50} outerRadius={100} fill="gold" />
```

### `@remotion/three`

```tsx
import { ThreeCanvas } from "@remotion/three";
<ThreeCanvas width={1920} height={1080}>
  <mesh rotation={[0, frame * 0.02, 0]}>
    <boxGeometry args={[2, 2, 2]} />
    <meshStandardMaterial color="royalblue" />
  </mesh>
</ThreeCanvas>
```

---

## 13. Licensing

### License Tiers

| Tier | Who | Cost |
|------|-----|------|
| **Free** | Individuals | $0 |
| **Free** | For-profit companies with <=3 employees | $0 |
| **Free** | Non-profit organizations | $0 |
| **Free** | Evaluation / non-commercial use | $0 |
| **Company License** | For-profit companies with >3 employees | Paid (via remotion.pro) |

### Company License Details

- Purchased at [remotion.pro](https://remotion.pro).
- Includes prioritized support.
- Cloud rendering (Lambda, Cloud Run) requires additional **Cloud Rendering Units**.
- One license per company (covers all projects).

### Restrictions

- Cannot copy or modify Remotion source code for the purpose of selling or licensing a derivative product.
- The restriction applies to the framework code itself, not to videos produced with Remotion.
- Videos/content created with Remotion are fully owned by the creator.

### Templates

20+ free templates available via `npx create-video@latest` (Hello World, Blank, Next.js, Stills, TTS, Audiogram, 3D, TikTok Captions, etc.). Paid: Editor Starter, Watercolor Map, Timeline Component.

---

## Quick Reference: Video vs OffthreadVideo

| Feature | `<Video>` | `<OffthreadVideo>` |
|---------|-----------|---------------------|
| Engine | HTML5 `<video>` | FFmpeg frame extraction |
| Browser/Player | Yes | Limited (no seek) |
| SSR rendering | Possible but slow | Recommended (2x faster) |
| Frame accuracy | Approximate | Exact |
| Transparency | No | Yes (WebM, ProRes 4444) |
| `@remotion/web-renderer` | Via `<Html5Video>` | Not supported |
| HDR tone mapping | No | Yes (`toneMapped` prop) |

**Rule of thumb:** Use `<Video>` for Player/browser preview, `<OffthreadVideo>` for rendering.

---

## Quick Reference: Common Patterns

### Fade In -> Hold -> Fade Out

```tsx
const frame = useCurrentFrame();
const FADE_IN = 20;
const HOLD = 40;
const FADE_OUT = 20;

const opacity = interpolate(
  frame,
  [0, FADE_IN, FADE_IN + HOLD, FADE_IN + HOLD + FADE_OUT],
  [0, 1, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

### Staggered Entrance

```tsx
const items = ["First", "Second", "Third"];
const STAGGER = 10; // frames between each item

{items.map((item, i) => (
  <Sequence key={item} from={i * STAGGER}>
    <FadeInItem text={item} />
  </Sequence>
))}
```

### Dynamic Duration from Props

```tsx
<Composition
  id="dynamic"
  component={MyComp}
  width={1920} height={1080} fps={30}
  durationInFrames={300}
  defaultProps={{ items: [] }}
  calculateMetadata={async ({ props }) => ({
    durationInFrames: Math.max(30, props.items.length * 60),
  })}
/>
```

### Responsive Text Sizing

```tsx
import { measureText } from "@remotion/layout-utils";

const { width: textWidth } = measureText({
  text: "Hello World",
  fontFamily: "Inter",
  fontSize: 80,
  fontWeight: "bold",
});
const scale = Math.min(1, 1600 / textWidth); // Fit within 1600px
```
