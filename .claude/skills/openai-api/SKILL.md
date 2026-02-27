---
model: claude-sonnet-4-6
name: openai-api
description: Use when integrating OpenAI models via the openai Node.js SDK — Chat Completions, tool use/function calling, structured outputs, vision, image generation (gpt-image-1), embeddings, streaming, or the Responses API. Also use when choosing between OpenAI models or migrating from the Assistants API.
---

# OpenAI API

Direct OpenAI API access via the `openai` SDK. Chat Completions is the primary interface; the Responses API is the modern replacement for Assistants.

Install: `npm install openai` · v4.x · Node.js 18+

## Models (February 2026)

| Model ID | Best For | Context | Notes |
|----------|----------|---------|-------|
| `gpt-4.1` | Coding, instruction following | 128K | Developer favorite — strong at structured tasks |
| `gpt-4o` | Multimodal, general purpose | 128K | Vision + text, balanced |
| `gpt-4o-mini` | Cost-efficient, high-volume | 128K | Best value for most tasks |
| `o3` | Complex multi-step reasoning | 200K | Thinking model — slower, expensive |
| `o4-mini` | Fast reasoning, math/code | 128K | Best benchmarks per dollar for reasoning |

**Recommendation:** Default to `gpt-4o-mini` for production volume. Use `gpt-4.1` for code tasks. Reserve `o3`/`o4-mini` for problems requiring deep reasoning.

**Note:** `gpt-4o`, `gpt-4.1`, and `o4-mini` deprecated February 16, 2026 in some API versions — check [platform.openai.com/docs/deprecations](https://platform.openai.com/docs/deprecations) for current status.

## Setup

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Chat Completions

```typescript
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "You are a concise technical assistant." },
    { role: "user", content: "What's the difference between == and === in JS?" },
  ],
  max_tokens: 512,
  temperature: 0.3,
});

console.log(response.choices[0].message.content);
console.log(response.usage); // { prompt_tokens, completion_tokens, total_tokens }
```

## Streaming

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Write a short poem about databases." }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

## Tool Use / Function Calling

```typescript
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_stock_price",
      description: "Get the current stock price for a ticker symbol.",
      parameters: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Stock ticker e.g. AAPL" },
          currency: { type: "string", enum: ["USD", "EUR", "GBP"], default: "USD" },
        },
        required: ["ticker"],
        additionalProperties: false,
      },
      strict: true, // Enables strict schema enforcement
    },
  },
];

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "What's Apple's stock price?" }],
  tools,
  tool_choice: "auto", // "auto" | "none" | "required" | { type: "function", function: { name } }
  parallel_tool_calls: true,
});

// Handle tool calls
const message = response.choices[0].message;
if (message.tool_calls) {
  const results = await Promise.all(
    message.tool_calls.map(async (call) => {
      const args = JSON.parse(call.function.arguments);
      const result = await callYourFunction(call.function.name, args);
      return {
        role: "tool" as const,
        tool_call_id: call.id,
        content: JSON.stringify(result),
      };
    })
  );

  // Send results back for final response
  const final = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "What's Apple's stock price?" },
      message, // assistant message with tool_calls
      ...results,
    ],
    tools,
  });

  console.log(final.choices[0].message.content);
}
```

## Structured Outputs

Guarantees responses match your JSON schema exactly — no hallucinated keys, no missing required fields.

```typescript
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({
    item: z.string(),
    amount: z.string(),
  })),
  steps: z.array(z.string()),
  prep_time_minutes: z.number(),
});

// Method 1: Zod schema (recommended)
const response = await client.beta.chat.completions.parse({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Give me a recipe for carbonara." }],
  response_format: zodResponseFormat(RecipeSchema, "recipe"),
});

const recipe = response.choices[0].message.parsed; // fully typed

// Method 2: Raw JSON schema
const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Give me a recipe for carbonara." }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "recipe",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
        },
        required: ["name", "steps"],
        additionalProperties: false,
      },
    },
  },
});

const recipe = JSON.parse(response.choices[0].message.content!);
```

## Vision (Image Understanding)

```typescript
// From URL
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: "https://example.com/chart.png" } },
        { type: "text", text: "What trend does this chart show?" },
      ],
    },
  ],
  max_tokens: 512,
});

// From base64
const imageData = fs.readFileSync("./screenshot.png").toString("base64");
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${imageData}`, detail: "high" },
        },
        { type: "text", text: "Describe what's on screen." },
      ],
    },
  ],
});
```

## Image Generation (gpt-image-1)

```typescript
// Generate
const response = await client.images.generate({
  model: "gpt-image-1",
  prompt: "A photorealistic armadillo wearing a graduation cap.",
  n: 1,
  size: "1024x1024",
  quality: "high", // "low" | "medium" | "high"
  output_format: "png", // "png" | "jpeg" | "webp"
});

const imageBase64 = response.data[0].b64_json;
fs.writeFileSync("output.png", Buffer.from(imageBase64, "base64"));

// Edit existing image
const edited = await client.images.edit({
  model: "gpt-image-1",
  image: fs.createReadStream("./photo.png"),
  mask: fs.createReadStream("./mask.png"),
  prompt: "Replace the sky with a sunset.",
});
```

**Note:** DALL-E 3 model snapshots deprecated for removal May 12, 2026 — migrate to `gpt-image-1`.

## Embeddings

```typescript
// Single text
const response = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "The quick brown fox jumps over the lazy dog.",
});

const vector = response.data[0].embedding; // float[]

// Batch embed
const batch = await client.embeddings.create({
  model: "text-embedding-3-large",
  input: ["First document", "Second document", "Third document"],
  dimensions: 512, // Reduce dimensions (text-embedding-3 only)
});

const vectors = batch.data.map((d) => d.embedding);
```

### Embedding Models

| Model | Dimensions | Cost | Notes |
|-------|-----------|------|-------|
| `text-embedding-3-large` | 3072 (reducible) | $0.13/MTok | Best quality, multilingual |
| `text-embedding-3-small` | 1536 (reducible) | $0.02/MTok | Best value, great for RAG |
| `text-embedding-ada-002` | 1536 | $0.10/MTok | Legacy — use text-embedding-3-small instead |

## Responses API (Modern Assistants Replacement)

The Responses API replaces Assistants API (sunsets August 26, 2026). Simpler, stateless, more control.

```typescript
// Simple request/response
const response = await client.responses.create({
  model: "gpt-4o-mini",
  input: "What are the benefits of TypeScript?",
});

console.log(response.output_text);

// With built-in tools
const response = await client.responses.create({
  model: "gpt-4o",
  tools: [{ type: "web_search_preview" }],
  input: "What's the latest news about AI regulation?",
});

// Structured output via text.format
const response = await client.responses.create({
  model: "gpt-4o-mini",
  input: "List 5 programming languages with their creation year.",
  text: {
    format: {
      type: "json_schema",
      name: "languages",
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            year: { type: "number" },
          },
          required: ["name", "year"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  },
});
```

## Quick Reference

| Operation | Method |
|-----------|--------|
| Chat completion | `client.chat.completions.create()` |
| Streaming | Same + `stream: true` |
| Structured output | `client.beta.chat.completions.parse()` |
| Image generation | `client.images.generate()` |
| Image editing | `client.images.edit()` |
| Embeddings | `client.embeddings.create()` |
| Responses API | `client.responses.create()` |
| List models | `client.models.list()` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `additionalProperties: false` in strict schemas | Required for `strict: true` — schema validation will fail without it |
| Using `tool_choice: "required"` always | Forces a tool call every turn — deadlocks if no tools match intent |
| Passing `response_format` with non-JSON content in messages | Model will try to force JSON even if question is conversational |
| Ignoring `finish_reason: "length"` | Response was cut off — increase `max_tokens` |
| DALL-E 3 in new code | Deprecated for removal May 2026 — use `gpt-image-1` |
| Assistants API for new projects | Sunsets August 26, 2026 — use Responses API |
| Base64 images without `data:` prefix | Must be `data:image/png;base64,...` — bare base64 is rejected |
| Not retrying 429/500s | Always add exponential backoff — use `openai.APIError` for typed catch |
| `dimensions` on `text-embedding-ada-002` | Only supported on `text-embedding-3-*` models |
| Parallel tool calls when tools are stateful | Set `parallel_tool_calls: false` if tools mutate shared state |

## Error Handling

```typescript
import { APIError, RateLimitError, AuthenticationError } from "openai";

try {
  const response = await client.chat.completions.create({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    // Retry with exponential backoff
    await sleep(Math.pow(2, attempt) * 1000);
  } else if (err instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (err instanceof APIError) {
    console.error(err.status, err.message, err.code);
  }
}
```

## Related Skills

- `vercel-ai-sdk` — Multi-provider abstraction (wraps OpenAI + Anthropic + Gemini)
- `anthropic-api` — Claude alternative
- `google-genai` — Gemini alternative
- `postgresql-pgvector` — Store and query OpenAI embeddings in Postgres

---

Sources:
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/introduction)
- [Structured Outputs | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [Migrate to Responses API | OpenAI](https://platform.openai.com/docs/guides/migrate-to-responses)
- [GPT Image 1 | OpenAI](https://platform.openai.com/docs/models/gpt-image-1)
- [OpenAI Models](https://platform.openai.com/docs/models)
