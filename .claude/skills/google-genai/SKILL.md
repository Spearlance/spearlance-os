---
model: claude-sonnet-4-6
name: google-genai
description: Use when integrating Google Gemini models via the @google/genai SDK — text generation, chat, multimodal (vision, audio, video), function calling, embeddings, safety settings, streaming, or context caching. Also use when choosing between Gemini models or migrating from the older @google/generative-ai SDK.
---

# Google Generative AI (Gemini)

Direct Gemini API access via the `@google/genai` SDK (GA as of May 2025). Supports both Gemini Developer API and Vertex AI.

Install: `npm install @google/genai` · v1.x · Node.js 20+

## Models (February 2026)

| Model ID | Best For | Context Window | Multimodal |
|----------|----------|----------------|------------|
| `gemini-2.5-pro` | Complex reasoning, long-context tasks | 1M tokens | Text, image, audio, video, PDF |
| `gemini-2.5-flash` | Speed/cost balance, most tasks | 1M tokens | Text, image, audio, video, PDF |
| `gemini-2.5-flash-lite` | High-volume, low-cost inference | 1M tokens | Text, image |
| `gemini-2.0-flash` | Legacy — retiring March 31, 2026 | 1M tokens | Text, image, audio, video |

**Recommendation:** Use `gemini-2.5-flash` as default. Use `gemini-2.5-pro` for complex multi-step reasoning only.

## Setup

```typescript
import { GoogleGenAI } from "@google/genai";

// Gemini Developer API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Vertex AI
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: "us-central1",
});
```

## Text Generation

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Explain how neural networks learn.",
});

console.log(response.text);
```

## Chat (Multi-turn)

```typescript
const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  history: [
    { role: "user", parts: [{ text: "You are a concise coding assistant." }] },
    { role: "model", parts: [{ text: "Understood. I'll keep answers tight." }] },
  ],
});

const reply = await chat.sendMessage({ message: "What's a closure in JS?" });
console.log(reply.text);

// Continue conversation — history is maintained automatically
const followUp = await chat.sendMessage({ message: "Show me an example." });
console.log(followUp.text);
```

## Multimodal — Vision

```typescript
import { createPartFromUri, createUserContent } from "@google/genai";

// From URL
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: createUserContent([
    createPartFromUri("https://example.com/image.jpg", "image/jpeg"),
    "Describe what's in this image.",
  ]),
});

// From local file (upload first)
const file = await ai.files.upload({
  file: new Blob([fs.readFileSync("./photo.jpg")], { type: "image/jpeg" }),
  config: { displayName: "photo" },
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: createUserContent([
    createPartFromUri(file.uri, file.mimeType),
    "What objects are in this photo?",
  ]),
});
```

## Multimodal — Audio & Video

```typescript
// Upload audio file
const audio = await ai.files.upload({
  file: new Blob([fs.readFileSync("./meeting.mp3")], { type: "audio/mp3" }),
});

// Generate transcript + summary
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: createUserContent([
    createPartFromUri(audio.uri, "audio/mp3"),
    "Transcribe and summarize this audio.",
  ]),
});

// Video (same pattern — supports mp4, mov, avi, webm)
const video = await ai.files.upload({
  file: new Blob([fs.readFileSync("./clip.mp4")], { type: "video/mp4" }),
});
```

## Streaming

```typescript
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: "Write a detailed explanation of quantum entanglement.",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

## Function Calling (Tool Use)

```typescript
const getWeatherTool = {
  name: "get_weather",
  description: "Returns current weather for a city.",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["city"],
  },
};

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "What's the weather in Tokyo?",
  config: {
    tools: [{ functionDeclarations: [getWeatherTool] }],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
  },
});

// Handle tool call
const call = response.functionCalls?.[0];
if (call) {
  const result = await callYourAPI(call.name, call.args);

  // Send result back
  const final = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: "What's the weather in Tokyo?" }] },
      { role: "model", parts: response.candidates[0].content.parts },
      {
        role: "user",
        parts: [{ functionResponse: { name: call.name, response: result } }],
      },
    ],
    config: { tools: [{ functionDeclarations: [getWeatherTool] }] },
  });

  console.log(final.text);
}
```

## Structured Output (JSON Schema)

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "List 3 planets with their diameter in km.",
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          diameter_km: { type: "number" },
        },
        required: ["name", "diameter_km"],
      },
    },
  },
});

const planets = JSON.parse(response.text);
```

## Embeddings

```typescript
const result = await ai.models.embedContent({
  model: "text-embedding-004",
  contents: "The quick brown fox jumps over the lazy dog.",
  config: { taskType: "SEMANTIC_SIMILARITY" },
});

console.log(result.embeddings[0].values); // float32[]

// Batch embed
const batch = await ai.models.batchEmbedContents({
  model: "text-embedding-004",
  requests: [
    { content: { parts: [{ text: "First document" }] } },
    { content: { parts: [{ text: "Second document" }] } },
  ],
});
```

### Embedding Task Types

| Task Type | When to Use |
|-----------|-------------|
| `SEMANTIC_SIMILARITY` | Compare text similarity |
| `RETRIEVAL_DOCUMENT` | Documents stored in a corpus |
| `RETRIEVAL_QUERY` | User queries against a corpus |
| `CLASSIFICATION` | Categorizing text |
| `CLUSTERING` | Grouping similar texts |

## Safety Settings

```typescript
import { HarmBlockThreshold, HarmCategory } from "@google/genai";

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Your prompt here.",
  config: {
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  },
});

// Check if blocked
if (response.candidates[0].finishReason === "SAFETY") {
  console.log("Response blocked by safety filters");
  console.log(response.candidates[0].safetyRatings);
}
```

### Safety Thresholds

| Threshold | Behavior |
|-----------|----------|
| `BLOCK_NONE` | No blocking (use with caution) |
| `BLOCK_ONLY_HIGH` | Block only clearly harmful content |
| `BLOCK_MEDIUM_AND_ABOVE` | Default — balanced |
| `BLOCK_LOW_AND_ABOVE` | Strict — blocks anything suspicious |

## Context Caching

Caches large, repeated context (system prompts, documents) to reduce cost and latency.

```typescript
// Create a cache
const cache = await ai.caches.create({
  model: "gemini-2.5-flash",
  config: {
    contents: [
      {
        role: "user",
        parts: [{ text: largeSystemPrompt }], // e.g., 50k token document
      },
    ],
    ttl: "3600s", // 1 hour TTL
  },
});

// Use cached context in requests
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Summarize the key points.",
  config: { cachedContent: cache.name },
});

// Clean up when done
await ai.caches.delete({ name: cache.name });
```

## Generation Config

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Your prompt",
  config: {
    temperature: 0.7,       // 0-2, lower = more deterministic
    topP: 0.95,             // nucleus sampling
    topK: 40,               // top-k sampling
    maxOutputTokens: 2048,
    stopSequences: ["END"],
    candidateCount: 1,      // number of responses (usually 1)
  },
});
```

## Quick Reference

| Operation | Method |
|-----------|--------|
| Text generation | `ai.models.generateContent()` |
| Streaming | `ai.models.generateContentStream()` |
| Chat session | `ai.chats.create()` → `chat.sendMessage()` |
| Upload file | `ai.files.upload()` |
| Embeddings | `ai.models.embedContent()` |
| Create cache | `ai.caches.create()` |
| List models | `ai.models.list()` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `@google/generative-ai` (old SDK) | Use `@google/genai` — new unified SDK since May 2025 |
| `gemini-2.0-flash` in production | Retiring March 31, 2026 — migrate to `gemini-2.5-flash` |
| Passing raw base64 without uploading | Use `ai.files.upload()` for files >4MB; inline base64 for small images only |
| Ignoring `finishReason` | Check for `SAFETY`, `MAX_TOKENS`, `RECITATION` before using `.text` |
| Not specifying `taskType` for embeddings | Wrong task type degrades retrieval quality significantly |
| Chat history role order wrong | Must alternate `user` / `model` — can't have two `user` turns in a row |
| Using function calling mode `ANY` blindly | `ANY` forces a tool call every turn — use `AUTO` unless you need guaranteed tool use |
| Not handling rate limits | Implement exponential backoff — free tier is 15 RPM; paid varies by model |

## Related Skills

- `vercel-ai-sdk` — Multi-provider abstraction layer (wraps Gemini + others)
- `anthropic-api` — Claude alternative with similar capabilities
- `openai-api` — GPT alternative, same skill category
- `postgresql-pgvector` — Store and query Gemini embeddings in Postgres

---

Sources:
- [Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs)
- [Google Gen AI SDK — GitHub](https://github.com/googleapis/js-genai)
- [@google/genai — npm](https://www.npmjs.com/package/@google/genai)
- [Gemini Models | Google AI for Developers](https://ai.google.dev/gemini-api/docs/models)
