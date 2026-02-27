---
model: claude-sonnet-4-6
name: ingest-content
description: Use when building a media ingestion pipeline — processing raw video/audio/image files, extracting technical metadata, AI-driven scene classification, deduplication by perceptual hash, or organizing footage into an indexed library. Also use when setting up batch processing for large media collections or building a RAG-ready asset database.
---

# Content Ingestion Pipeline

Systematic pipeline for transforming raw media files into a structured, searchable, AI-enriched library. Covers intake, metadata extraction, AI classification, deduplication, and indexing.

## Pipeline Stages

```
Raw Files → [1. Intake] → [2. Metadata Extract] → [3. AI Classify] → [4. Dedup] → [5. Index] → Library
```

| Stage | What Happens | Tools |
|-------|-------------|-------|
| **1. Intake** | Scan directories, validate files, queue for processing | `glob`, `chokidar`, S3/R2 |
| **2. Metadata** | Duration, resolution, codec, bitrate, frame rate | `ffprobe`, `exiftool`, `sharp` |
| **3. AI Classify** | Scene type, mood, content tags, transcription | Gemini/GPT-4o vision, Whisper |
| **4. Dedup** | Perceptual hash comparison, near-duplicate detection | `sharp` + dhash, `phash` |
| **5. Index** | Store structured records, generate embeddings | Postgres + pgvector, SQLite |

## Dependencies

```bash
npm install fluent-ffmpeg @ffprobe-installer/ffprobe sharp glob chokidar
npm install @google/genai  # or openai for AI classification
npm install pg             # for Postgres indexing
```

## File Intake

```typescript
import { glob } from "glob";
import * as fs from "fs/promises";
import * as path from "path";

const SUPPORTED_TYPES = {
  video: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mxf"],
  audio: [".mp3", ".wav", ".aac", ".flac", ".m4a"],
  image: [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".raw"],
};

interface MediaFile {
  absolutePath: string;
  relativePath: string;
  filename: string;
  extension: string;
  mediaType: "video" | "audio" | "image";
  sizeBytes: number;
  mtime: Date;
}

async function scanDirectory(rootDir: string): Promise<MediaFile[]> {
  const allExtensions = Object.values(SUPPORTED_TYPES).flat();
  const pattern = `**/*{${allExtensions.join(",")}}`;

  const files = await glob(pattern, { cwd: rootDir, absolute: true, nocase: true });

  return Promise.all(
    files.map(async (absolutePath) => {
      const stat = await fs.stat(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const mediaType = Object.entries(SUPPORTED_TYPES).find(([, exts]) =>
        exts.includes(ext)
      )?.[0] as "video" | "audio" | "image";

      return {
        absolutePath,
        relativePath: path.relative(rootDir, absolutePath),
        filename: path.basename(absolutePath),
        extension: ext,
        mediaType,
        sizeBytes: stat.size,
        mtime: stat.mtime,
      };
    })
  );
}
```

## Metadata Extraction

```typescript
import ffprobe from "fluent-ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import sharp from "sharp";

ffprobe.setFfprobePath(ffprobeInstaller.path);

interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrateBps: number;
  hasAudio: boolean;
  audioCodec?: string;
  audioChannels?: number;
  sampleRate?: number;
  container: string;
}

async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffprobe.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find((s) => s.codec_type === "video");
      const audioStream = data.streams.find((s) => s.codec_type === "audio");

      if (!videoStream) return reject(new Error("No video stream found"));

      const [fpsNum, fpsDen] = (videoStream.r_frame_rate || "30/1").split("/").map(Number);

      resolve({
        durationSeconds: Number(data.format.duration),
        width: videoStream.width!,
        height: videoStream.height!,
        fps: fpsNum / fpsDen,
        codec: videoStream.codec_name!,
        bitrateBps: Number(data.format.bit_rate),
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
        audioChannels: audioStream?.channels,
        sampleRate: Number(audioStream?.sample_rate),
        container: data.format.format_name!,
      });
    });
  });
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  channels: number;
  hasAlpha: boolean;
  fileSizeBytes: number;
  colorSpace: string;
}

async function extractImageMetadata(filePath: string): Promise<ImageMetadata> {
  const image = sharp(filePath);
  const [meta, stat] = await Promise.all([image.metadata(), fs.stat(filePath)]);

  return {
    width: meta.width!,
    height: meta.height!,
    format: meta.format!,
    channels: meta.channels!,
    hasAlpha: meta.hasAlpha!,
    fileSizeBytes: stat.size,
    colorSpace: meta.space!,
  };
}
```

## AI Classification

```typescript
import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AIClassification {
  sceneType: string;       // "interview" | "b-roll" | "action" | "landscape" | "product" | etc.
  mood: string;            // "energetic" | "calm" | "dramatic" | "upbeat" | etc.
  contentTags: string[];   // ["outdoor", "daytime", "people", "urban", ...]
  description: string;     // 1-2 sentence natural language description
  suitableFor: string[];   // ["social-media", "documentary", "commercial", ...]
  confidence: number;      // 0–1
}

async function classifyVideoFrame(framePath: string): Promise<AIClassification> {
  const imageData = await fs.readFile(framePath);
  const base64 = imageData.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      {
        inlineData: { data: base64, mimeType: "image/jpeg" },
      },
      `Analyze this video frame and return a JSON object with:
      - sceneType: one of [interview, b-roll, action, landscape, product, graphic, talking-head, animation, other]
      - mood: one of [energetic, calm, dramatic, upbeat, serious, playful, inspirational, melancholic]
      - contentTags: array of descriptive tags (max 8)
      - description: 1-2 sentence description
      - suitableFor: array from [social-media, documentary, commercial, tutorial, news, entertainment]
      - confidence: float 0-1 for your confidence in this classification
      Return only valid JSON, no markdown.`,
    ]),
    config: { responseMimeType: "application/json" },
  });

  return JSON.parse(response.text) as AIClassification;
}

// Extract representative frame for classification
async function extractKeyFrame(
  videoPath: string,
  outputPath: string,
  timestampSeconds = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffprobe(videoPath)
      .screenshots({
        timestamps: [timestampSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "640x?", // resize for faster AI processing
      })
      .on("end", resolve)
      .on("error", reject);
  });
}
```

## Perceptual Hashing (Deduplication)

Perceptual hashes are "close" when images look similar — unlike cryptographic hashes which change entirely on 1 pixel difference.

```typescript
import sharp from "sharp";

// Difference hash (dHash) — fast, good for near-duplicate detection
async function computePerceptualHash(imagePath: string): Promise<string> {
  // Resize to 9x8 grayscale (gives 64-bit hash)
  const pixels = await sharp(imagePath)
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  // Compute difference hash: compare adjacent pixels in each row
  let hash = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = pixels[row * 9 + col];
      const right = pixels[row * 9 + col + 1];
      hash += left > right ? "1" : "0";
    }
  }

  // Convert binary to hex
  return parseInt(hash, 2).toString(16).padStart(16, "0");
}

// For video: hash a keyframe extracted from the middle
async function computeVideoHash(videoPath: string, tmpDir: string): Promise<string> {
  const framePath = path.join(tmpDir, `${Date.now()}_frame.jpg`);
  await extractKeyFrame(videoPath, framePath);
  const hash = await computePerceptualHash(framePath);
  await fs.unlink(framePath);
  return hash;
}

// Hamming distance — number of differing bits
function hammingDistance(hash1: string, hash2: string): number {
  const a = BigInt(`0x${hash1}`);
  const b = BigInt(`0x${hash2}`);
  let xor = a ^ b;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

// Threshold: 0 = identical, <5 = near-duplicate, <10 = similar
const isDuplicate = (h1: string, h2: string) => hammingDistance(h1, h2) < 5;
```

## Batch Processing Pipeline

```typescript
import PQueue from "p-queue"; // npm install p-queue

interface IngestedAsset {
  id: string;
  absolutePath: string;
  filename: string;
  mediaType: "video" | "audio" | "image";
  metadata: VideoMetadata | ImageMetadata;
  classification?: AIClassification;
  perceptualHash: string;
  isDuplicate: boolean;
  duplicateOf?: string;
  status: "processed" | "failed" | "duplicate";
  processedAt: Date;
}

async function runIngestionPipeline(
  sourceDir: string,
  options = { concurrency: 4, aiClassify: true }
): Promise<IngestedAsset[]> {
  const queue = new PQueue({ concurrency: options.concurrency });
  const results: IngestedAsset[] = [];
  const hashIndex = new Map<string, string>(); // hash → asset id

  // Stage 1: Scan
  const files = await scanDirectory(sourceDir);
  console.log(`Found ${files.length} media files`);

  const tasks = files.map((file) =>
    queue.add(async () => {
      try {
        // Stage 2: Metadata
        const metadata =
          file.mediaType === "video" || file.mediaType === "audio"
            ? await extractVideoMetadata(file.absolutePath)
            : await extractImageMetadata(file.absolutePath);

        // Stage 3: Perceptual hash + dedup
        const hash = await computeVideoHash(file.absolutePath, "/tmp");
        const existingId = [...hashIndex.entries()].find(
          ([h]) => hammingDistance(h, hash) < 5
        )?.[1];

        const asset: IngestedAsset = {
          id: crypto.randomUUID(),
          absolutePath: file.absolutePath,
          filename: file.filename,
          mediaType: file.mediaType,
          metadata,
          perceptualHash: hash,
          isDuplicate: !!existingId,
          duplicateOf: existingId,
          status: existingId ? "duplicate" : "processed",
          processedAt: new Date(),
        };

        if (!existingId) {
          hashIndex.set(hash, asset.id);

          // Stage 4: AI classification (skip duplicates)
          if (options.aiClassify && file.mediaType !== "audio") {
            const framePath = `/tmp/${asset.id}_frame.jpg`;
            await extractKeyFrame(file.absolutePath, framePath);
            asset.classification = await classifyVideoFrame(framePath);
            await fs.unlink(framePath);
          }
        }

        results.push(asset);
        console.log(`✓ ${file.filename} [${asset.status}]`);
        return asset;
      } catch (err) {
        console.error(`✗ ${file.filename}:`, err);
        results.push({
          id: crypto.randomUUID(),
          absolutePath: file.absolutePath,
          filename: file.filename,
          mediaType: file.mediaType,
          metadata: {} as any,
          perceptualHash: "",
          isDuplicate: false,
          status: "failed",
          processedAt: new Date(),
        });
      }
    })
  );

  await Promise.all(tasks);
  return results;
}
```

## Database Schema (Postgres)

```sql
CREATE TABLE media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  absolute_path   TEXT NOT NULL,
  filename        TEXT NOT NULL,
  media_type      TEXT NOT NULL CHECK (media_type IN ('video', 'audio', 'image')),

  -- Technical metadata
  duration_sec    REAL,
  width           INTEGER,
  height          INTEGER,
  fps             REAL,
  codec           TEXT,
  bitrate_bps     BIGINT,
  file_size_bytes BIGINT NOT NULL,
  container       TEXT,

  -- AI classification
  scene_type      TEXT,
  mood            TEXT,
  content_tags    TEXT[] DEFAULT '{}',
  description     TEXT,
  suitable_for    TEXT[] DEFAULT '{}',
  ai_confidence   REAL,

  -- Deduplication
  perceptual_hash TEXT,
  is_duplicate    BOOLEAN DEFAULT FALSE,
  duplicate_of    UUID REFERENCES media_assets(id),

  -- Vector embedding for semantic search
  embedding       vector(1536),

  -- Lifecycle
  status          TEXT DEFAULT 'processed',
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  metadata_raw    JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX ON media_assets (media_type);
CREATE INDEX ON media_assets (scene_type);
CREATE INDEX ON media_assets USING GIN (content_tags);
CREATE INDEX ON media_assets (is_duplicate) WHERE is_duplicate = FALSE;
CREATE INDEX ON media_assets USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
```

## Library Output Structure

```
library/
├── index.json           # Full asset manifest
├── duplicates.json      # Duplicate groups
├── stats.json           # Pipeline run summary
└── assets/
    ├── video/
    │   ├── interview/
    │   ├── b-roll/
    │   └── action/
    ├── audio/
    └── images/
```

```typescript
async function writeLibraryIndex(assets: IngestedAsset[], outputDir: string) {
  const processed = assets.filter((a) => a.status === "processed");
  const duplicates = assets.filter((a) => a.status === "duplicate");
  const failed = assets.filter((a) => a.status === "failed");

  const stats = {
    total: assets.length,
    processed: processed.length,
    duplicates: duplicates.length,
    failed: failed.length,
    byType: {
      video: processed.filter((a) => a.mediaType === "video").length,
      audio: processed.filter((a) => a.mediaType === "audio").length,
      image: processed.filter((a) => a.mediaType === "image").length,
    },
    bySceneType: processed.reduce<Record<string, number>>((acc, a) => {
      const type = a.classification?.sceneType ?? "unclassified";
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {}),
    processedAt: new Date().toISOString(),
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "stats.json"), JSON.stringify(stats, null, 2));
  await fs.writeFile(path.join(outputDir, "index.json"), JSON.stringify(processed, null, 2));
  await fs.writeFile(path.join(outputDir, "duplicates.json"), JSON.stringify(duplicates, null, 2));

  console.log(`\nLibrary written to ${outputDir}`);
  console.log(`  ✓ ${processed.length} assets indexed`);
  console.log(`  ◐ ${duplicates.length} duplicates skipped`);
  console.log(`  ✗ ${failed.length} failed`);
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running AI classification on every frame | Extract 1 representative keyframe (at 10–20% through clip) — full video is unnecessary and expensive |
| Comparing hashes as strings | Use `hammingDistance` on BigInt XOR — string comparison misses near-duplicates |
| No concurrency limit on ffprobe | Cap with `p-queue` — spawning 100 ffprobe processes crashes the machine |
| Classifying audio files with vision models | Skip AI classification for audio-only; use Whisper transcription instead |
| Storing absolute paths only | Also store relative paths — absolute paths break when moving the library |
| Not resizing frames before AI classification | Full-resolution is slow and costs more tokens — resize to 640px wide first |
| Hashing 5-second clips as identical to 2-hour films | Hash from multiple timestamps for long-form content to detect partial duplicates |
| Missing `WHERE embedding IS NOT NULL` on HNSW index | Partial index is required — NULL vectors cause index failures |
| Not handling ffprobe timeout | Some corrupted files hang forever — wrap in `Promise.race` with 30s timeout |

## Related Skills

- `remotion` — Programmatic video rendering (output stage after ingestion)
- `create-supercut` — Automated highlight reel assembly from an indexed library
- `deepgram-transcription` — Transcribe audio tracks during ingestion
- `postgresql-pgvector` — Semantic search over ingested asset embeddings
- `s3-cloudflare-r2` — Store raw media files and processed outputs
- `google-genai` / `openai-api` — AI classification providers
