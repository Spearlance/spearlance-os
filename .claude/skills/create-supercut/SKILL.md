---
model: claude-sonnet-4-6
name: create-supercut
description: Use when creating a supercut or compilation video — analyzing transcripts to extract highlight moments, selecting clips by keyword or topic, assembling a timeline with transitions, getting user approval before rendering, and integrating background music.
---

# create-supercut

## Overview

**Mandatory Announcement — FIRST OUTPUT before anything else:**

No exceptions. Box frame first, then work.

A supercut is a curated compilation of clips around a theme, keyword, or emotional arc. The workflow is: analyze → select → plan timeline → get approval → render. Never render without approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 1: Transcript Analysis

### Expected transcript format

Transcripts should have timestamped segments. Whisper, Deepgram, and AssemblyAI all output compatible formats:

```json
{
  "segments": [
    { "start": 12.4, "end": 15.8, "text": "That was the most insane trick I've ever landed." },
    { "start": 16.1, "end": 19.3, "text": "Let me try it again from the top." }
  ]
}
```

Plain `.srt` format also works:

```
1
00:00:12,400 --> 00:00:15,800
That was the most insane trick I've ever landed.

2
00:00:16,100 --> 00:00:19,300
Let me try it again from the top.
```

### Parsing SRT

```ts
interface Segment {
  index: number;
  start: number; // seconds
  end: number;
  text: string;
}

function parseSrt(srt: string): Segment[] {
  const blocks = srt.trim().split(/\n\n+/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const [startStr, endStr] = lines[1].split(" --> ");
    const toSeconds = (ts: string) => {
      const [h, m, s] = ts.replace(",", ".").split(":").map(Number);
      return h * 3600 + m * 60 + s;
    };
    return {
      index: parseInt(lines[0]),
      start: toSeconds(startStr),
      end: toSeconds(endStr),
      text: lines.slice(2).join(" "),
    };
  });
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 2: Clip Selection

### Keyword / topic matching

```ts
function findHighlights(
  segments: Segment[],
  keywords: string[],
  paddingSeconds = 2
): Clip[] {
  const hits = segments.filter((seg) =>
    keywords.some((kw) => seg.text.toLowerCase().includes(kw.toLowerCase()))
  );

  // Merge overlapping clips (within padding distance)
  const merged: Clip[] = [];
  for (const hit of hits) {
    const clip = { start: hit.start - paddingSeconds, end: hit.end + paddingSeconds, label: hit.text };
    const prev = merged[merged.length - 1];
    if (prev && clip.start <= prev.end) {
      prev.end = Math.max(prev.end, clip.end); // extend
    } else {
      merged.push(clip);
    }
  }
  return merged;
}

// Usage
const clips = findHighlights(segments, ["incredible", "insane", "perfect", "finally"]);
```

### Story arc selection strategies

| Strategy | How |
|----------|-----|
| **Emotional peak** | Sort by sentiment score; pick top N |
| **Chronological journey** | Keep clips in source order; trim to ~30s each |
| **Bookend** | Strong opener from start of source, strong closer from end |
| **Thematic cluster** | Group by keyword topic; one beat per topic |
| **Silence gaps** | Use Remotion's silence detection to find speech bursts |

### Scoring clips for quality

```ts
interface ScoredClip extends Clip {
  score: number;
}

function scoreClips(clips: Clip[], segments: Segment[]): ScoredClip[] {
  return clips.map((clip) => {
    const covered = segments.filter((s) => s.start >= clip.start && s.end <= clip.end);
    const wordCount = covered.reduce((n, s) => n + s.text.split(" ").length, 0);
    const duration = clip.end - clip.start;
    // Prefer dense speech, penalize very short or very long clips
    const score = wordCount / duration - Math.abs(duration - 8) * 0.1;
    return { ...clip, score };
  }).sort((a, b) => b.score - a.score);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 3: Timeline Assembly

### Timeline data structure

```ts
interface TimelineClip {
  sourceFile: string;     // path to video file
  sourceStart: number;    // seconds into source
  sourceEnd: number;
  label?: string;
  transition?: "cut" | "fade" | "dissolve";
  transitionDuration?: number; // frames
}
```

### Remotion Sequence assembly

Each clip maps to a `<Sequence>` offset in the composition. Use `<OffthreadVideo>` for SSR-safe video playback:

```tsx
import { AbsoluteFill, Sequence, OffthreadVideo, useVideoConfig } from "remotion";

interface SupercutProps {
  clips: TimelineClip[];
}

export const Supercut: React.FC<SupercutProps> = ({ clips }) => {
  const { fps } = useVideoConfig();
  let cursor = 0;

  return (
    <AbsoluteFill>
      {clips.map((clip, i) => {
        const durationSec = clip.sourceEnd - clip.sourceStart;
        const durationFrames = Math.round(durationSec * fps);
        const from = cursor;
        cursor += durationFrames;

        return (
          <Sequence key={i} from={from} durationInFrames={durationFrames}>
            <OffthreadVideo
              src={clip.sourceFile}
              startFrom={Math.round(clip.sourceStart * fps)}
              endAt={Math.round(clip.sourceEnd * fps)}
              style={{ width: "100%", height: "100%" }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

### Computing total duration for Composition

```ts
const totalFrames = clips.reduce((sum, clip) => {
  return sum + Math.round((clip.sourceEnd - clip.sourceStart) * fps);
}, 0);
```

Register it:

```tsx
<Composition
  id="Supercut"
  component={Supercut}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={totalFrames}
  defaultProps={{ clips }}
/>
```

### Transitions — Fade between clips

```tsx
const FADE_FRAMES = 15;

// Outgoing clip: fade out at end
const opacity = interpolate(
  frame,
  [durationFrames - FADE_FRAMES, durationFrames],
  [1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

// Incoming clip: fade in at start
const opacity = interpolate(
  frame,
  [0, FADE_FRAMES],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 4: Approval Flow (Required)

**Never render without presenting the timeline first.**

Present the proposed timeline to the user before rendering:

```
📋 Proposed Supercut Timeline — 4 clips · 47 seconds

  #  Source file        Start    End      Duration  Label
  1  interview-1.mp4    0:12     0:24     12s       "most insane trick"
  2  interview-1.mp4    1:43     1:58     15s       "finally nailed it"
  3  interview-2.mp4    3:01     3:11     10s       "perfect landing"
  4  interview-3.mp4    0:08     0:18     10s       "incredible run"

  Transitions: fade (15 frames)
  Music: lo-fi-beat.mp3 (fades out at end)
  Output: 1920×1080 · H.264 · ~47s

▸ Approve this timeline, or tell me what to adjust?
```

Only proceed to render after explicit approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 5: Background Music

### Audio layer

```tsx
import { Audio, AbsoluteFill, Sequence } from "remotion";

export const SupercutWithMusic: React.FC<Props> = ({ clips, musicSrc, totalFrames }) => {
  const { fps } = useVideoConfig();
  const FADE_OUT_FRAMES = fps * 3; // 3-second fade out

  const musicVolume = interpolate(
    useCurrentFrame(),
    [totalFrames - FADE_OUT_FRAMES, totalFrames],
    [0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* Background music — loops if shorter than video */}
      <Audio src={musicSrc} volume={musicVolume} />

      {/* Video clips on top */}
      {clips.map((clip, i) => (
        <Sequence key={i} from={clip.from} durationInFrames={clip.durationFrames}>
          <OffthreadVideo
            src={clip.sourceFile}
            startFrom={Math.round(clip.sourceStart * fps)}
            volume={1}
            style={{ width: "100%", height: "100%" }}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

### Volume balance guidelines

| Layer | Volume |
|-------|--------|
| Dialog / voice (prominent) | 1.0 |
| Background music (with dialog) | 0.3–0.5 |
| Background music (no dialog) | 0.7–1.0 |
| Sound effects | 0.5–0.8 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 6: Render

After approval, hand off to `render-video` skill patterns:

```bash
npx remotion render src/index.ts Supercut out/supercut.mp4 \
  --codec=h264 \
  --crf=18 \
  --concurrency=4
```

Or programmatically:

```ts
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: "out/supercut.mp4",
  crf: 18,
  inputProps: { clips, musicSrc: "./assets/music.mp3" },
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Rendering before user approval | Always present timeline + ask first |
| Using `<Video>` for SSR render | Use `<OffthreadVideo>` |
| Overlapping clip windows | Merge clips within padding distance before assembling |
| Music louder than dialog | Cap background music at 0.4–0.5 when voice is present |
| Missing padding around keyword hits | Add 1–3s before and after — context matters |
| Fixed `durationInFrames` in Composition | Compute dynamically from clip list |
| `startFrom` / `endAt` on wrong unit | These are in **frames**, not seconds — multiply by fps |
