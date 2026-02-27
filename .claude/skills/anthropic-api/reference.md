# Anthropic API Developer Reference

> **Last Updated:** February 2026
> **SDK:** `@anthropic-ai/sdk` (Node.js / TypeScript)
> **Base URL:** `https://api.anthropic.com/v1`
> **API Version Header:** `anthropic-version: 2023-06-01`

---

## Table of Contents

1. [Setup](#setup)
2. [Messages API](#messages-api)
3. [Streaming](#streaming)
4. [Tool Use](#tool-use)
5. [Vision](#vision)
6. [Extended Thinking](#extended-thinking)
7. [Models](#models)
8. [Batches API](#batches-api)
9. [Rate Limits and Pricing](#rate-limits-and-pricing)
10. [Error Handling](#error-handling)
11. [Common Mistakes](#common-mistakes)

---

## Setup

### Install

```bash
npm install @anthropic-ai/sdk
```

### Environment Variable

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Never commit API keys. Never expose them in client-side (browser) code.

### Client Initialization

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Uses ANTHROPIC_API_KEY env var automatically
const client = new Anthropic();

// Or explicit key (server-side only)
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional: default headers
  defaultHeaders: { "anthropic-beta": "some-beta-feature" },
  // Optional: timeout (ms)
  timeout: 60_000,
  // Optional: max retries (default: 2)
  maxRetries: 3,
});
```

### TypeScript Types

The SDK exports full types for all request and response shapes:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageParam,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ImageBlockParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

// Type-safe messages array
const messages: MessageParam[] = [
  { role: "user", content: "What is 2 + 2?" },
];
```

---

## Messages API

### Basic Call

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,           // Required — no default
  system: "You are a helpful assistant.",
  messages: [
    { role: "user", content: "Explain recursion in one sentence." },
  ],
});
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | yes | Model ID (see Models section) |
| `max_tokens` | number | yes | Max output tokens; must exceed `budget_tokens` when thinking enabled |
| `messages` | MessageParam[] | yes | Alternating user/assistant turns |
| `system` | string or ContentBlock[] | no | System prompt |
| `temperature` | number | no | 0–1, default 1; incompatible with extended thinking |
| `top_p` | number | no | Nucleus sampling; 0.95–1 when thinking enabled |
| `top_k` | number | no | Top-k sampling; incompatible with extended thinking |
| `stop_sequences` | string[] | no | Custom stop sequences |
| `stream` | boolean | no | Enable SSE streaming |
| `tools` | Tool[] | no | Tool definitions for tool use |
| `tool_choice` | ToolChoice | no | `auto`, `any`, `tool`, or `none` |
| `thinking` | ThinkingConfig | no | Extended thinking config |
| `metadata` | object | no | `{ user_id: string }` for abuse prevention |

### Response Structure

```typescript
interface Message {
  id: string;                    // "msg_..."
  type: "message";
  role: "assistant";
  content: ContentBlock[];       // Array of text/tool_use/thinking blocks
  model: string;                 // Model that responded
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use";
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
```

### Content Blocks

Claude returns one or more content blocks in `response.content`:

```typescript
// Text block
interface TextBlock {
  type: "text";
  text: string;
}

// Tool use block (Claude wants to call a tool)
interface ToolUseBlock {
  type: "tool_use";
  id: string;         // "toolu_..." — use this as tool_use_id in result
  name: string;
  input: Record<string, unknown>;
}

// Thinking block (extended thinking enabled)
interface ThinkingBlock {
  type: "thinking";
  thinking: string;
  signature: string;  // Opaque — pass back unmodified in multi-turn
}
```

### Multi-Turn Conversation

```typescript
const messages: MessageParam[] = [
  { role: "user", content: "What is the capital of France?" },
];

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 256,
  messages,
});

// Append assistant response for next turn
messages.push({ role: "assistant", content: response.content });
messages.push({ role: "user", content: "What is its population?" });

const followUp = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 256,
  messages,
});
```

### Prompt Caching

Cache large, repeated context (system prompts, documents, tool definitions) to reduce costs by 90% on cached tokens:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: "You are an expert analyst. Here is the full documentation...",
    },
    {
      type: "text",
      text: largeDocumentContent,           // 10k+ token content to cache
      cache_control: { type: "ephemeral" }, // Cache for ~5 min (or 1hr with beta header)
    },
  ],
  messages: [{ role: "user", content: "Summarize section 3." }],
});

// response.usage.cache_creation_input_tokens — tokens written to cache (billed at 1.25x)
// response.usage.cache_read_input_tokens    — tokens read from cache (billed at 0.1x)
```

---

## Streaming

### Stream with Async Iterator

```typescript
const stream = await client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  messages: [{ role: "user", content: "Write a short story about a robot." }],
});

for await (const event of stream) {
  switch (event.type) {
    case "message_start":
      // event.message: partial Message object
      break;
    case "content_block_start":
      // event.content_block: { type: "text", text: "" } or { type: "tool_use", ... }
      break;
    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
      }
      break;
    case "content_block_stop":
      break;
    case "message_delta":
      // event.delta.stop_reason, event.usage (output_tokens so far)
      break;
    case "message_stop":
      break;
  }
}

// Get complete Message object after stream ends
const finalMessage = await stream.finalMessage();
console.log("Input tokens:", finalMessage.usage.input_tokens);
console.log("Output tokens:", finalMessage.usage.output_tokens);
```

### Stream Text Only (Helper)

```typescript
const stream = client.messages.stream({ ... });

// Yields only text chunks
for await (const text of stream.text()) {
  process.stdout.write(text);
}
```

### SSE Event Types

| Event | When |
|-------|------|
| `message_start` | Start of response; contains partial Message |
| `content_block_start` | New content block begins |
| `content_block_delta` | Incremental content; `text_delta`, `thinking_delta`, or `signature_delta` |
| `content_block_stop` | Content block complete |
| `message_delta` | `stop_reason`, `stop_sequence`, and running usage |
| `message_stop` | Stream complete |

---

## Tool Use

Tool use (function calling) lets Claude request execution of tools you define. You run the tool and return results — Claude uses them to complete its response.

### Define Tools

```typescript
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

const tools: Tool[] = [
  {
    name: "get_weather",
    description: "Get current weather conditions for a location.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City and country, e.g. 'Paris, France'",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit",
        },
      },
      required: ["location"],
    },
  },
];
```

### Tool Use Loop

```typescript
async function runWithTools(userMessage: string): Promise<string> {
  const messages: MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    // Append Claude's response to conversation
    messages.push({ role: "assistant", content: response.content });

    // Done — no tool calls
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "";
    }

    // Handle tool calls
    if (response.stop_reason === "tool_use") {
      const toolResults: ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        let result: string;
        if (block.name === "get_weather") {
          const input = block.input as { location: string; unit?: string };
          result = await fetchWeather(input.location, input.unit);
        } else {
          result = `Unknown tool: ${block.name}`;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id, // Must match the tool_use block id
          content: result,
        });
      }

      // Return tool results as next user message
      messages.push({ role: "user", content: toolResults });
    }
  }
}
```

### Tool Choice Control

```typescript
// Let Claude decide (default)
tool_choice: { type: "auto" }

// Force Claude to use at least one tool
tool_choice: { type: "any" }

// Force a specific tool
tool_choice: { type: "tool", name: "get_weather" }

// Disable tool use entirely (tools still visible but not called)
tool_choice: { type: "none" }
```

### Tool Result with Error

```typescript
toolResults.push({
  type: "tool_result",
  tool_use_id: block.id,
  content: "Error: Location not found",
  is_error: true,  // Optional — signals tool execution failed
});
```

---

## Vision

Claude can process images in user messages. All current Claude models support vision.

### Image from URL

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "url",
            url: "https://example.com/diagram.png",
          },
        },
        {
          type: "text",
          text: "Describe what you see in this image.",
        },
      ],
    },
  ],
});
```

### Image from Base64

```typescript
import fs from "fs";

const imageData = fs.readFileSync("./photo.jpg");
const base64Image = imageData.toString("base64");

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",  // "image/jpeg" | "image/png" | "image/gif" | "image/webp"
            data: base64Image,
          },
        },
        { type: "text", text: "What objects are in this photo?" },
      ],
    },
  ],
});
```

### Supported Formats and Limits

| Format | media_type |
|--------|------------|
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| GIF | `image/gif` (static or animated) |
| WebP | `image/webp` |

- Max image size: 5MB per image
- Max images per request: 20
- Max image dimensions: 8000 x 8000 px
- Images are resized internally if they exceed optimal dimensions (~1568px on the longest side for best results)

### PDF Support

```typescript
const pdfData = fs.readFileSync("./report.pdf");
const base64Pdf = pdfData.toString("base64");

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Pdf,
          },
        },
        { type: "text", text: "Summarize the key findings in this report." },
      ],
    },
  ],
});
```

---

## Extended Thinking

Extended thinking lets Claude reason through complex problems step-by-step before responding. Useful for math, logic, multi-step reasoning, and difficult coding problems.

### Sonnet 4.6 — Manual Extended Thinking

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,       // Must be greater than budget_tokens
  thinking: {
    type: "enabled",
    budget_tokens: 10000,  // Min: 1024; Claude may use less
  },
  messages: [
    { role: "user", content: "Prove that there are infinitely many prime numbers." },
  ],
});

for (const block of response.content) {
  if (block.type === "thinking") {
    console.log("Reasoning:", block.thinking); // Summarized thinking for Claude 4 models
  } else if (block.type === "text") {
    console.log("Answer:", block.text);
  }
}
```

### Opus 4.6 — Adaptive Thinking (Preferred)

`budget_tokens` is deprecated on Opus 4.6. Use adaptive thinking with `effort` instead:

```typescript
// Adaptive thinking — Opus 4.6 only
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 16000,
  thinking: {
    type: "adaptive",   // Opus 4.6 decides thinking depth automatically
  },
  // Optional: control thinking depth via effort
  // effort: "low" | "medium" | "high"  (API-level, check docs for current syntax)
  messages: [
    { role: "user", content: "Design a distributed rate limiter architecture." },
  ],
});
```

### When to Use Extended Thinking

- Complex mathematical proofs or calculations
- Multi-step logical reasoning
- Difficult coding problems (algorithm design, debugging)
- Tasks where showing reasoning improves trust

### Constraints

| Constraint | Detail |
|------------|--------|
| Min `budget_tokens` | 1024 |
| `budget_tokens` vs `max_tokens` | `budget_tokens` must be less than `max_tokens` |
| Incompatible params | `temperature`, `top_k`, forced tool choice |
| `top_p` range | Must be 0.95–1 when thinking enabled |
| Response pre-fill | Not allowed with thinking enabled |
| Opus 4.6 | Use `type: "adaptive"` — `type: "enabled"` is deprecated |

### Multi-Turn with Thinking Blocks

Pass thinking blocks back unmodified when continuing a conversation that includes tool use:

```typescript
// Preserve thinking blocks in subsequent turns (required for tool use continuity)
messages.push({ role: "assistant", content: response.content }); // includes thinking blocks
messages.push({ role: "user", content: toolResults });
```

---

## Models

### Current Models (February 2026)

| Model ID | Alias | Description | Context | Max Output | Input | Output |
|----------|-------|-------------|---------|------------|-------|--------|
| `claude-opus-4-6` | `claude-opus-4-6` | Most capable; agents, complex reasoning, coding | 200K / 1M beta | 128K | $5/MTok | $25/MTok |
| `claude-sonnet-4-6` | `claude-sonnet-4-6` | Balanced speed + intelligence | 200K / 1M beta | 64K | $3/MTok | $15/MTok |
| `claude-haiku-4-5-20251001` | `claude-haiku-4-5` | Fastest, cheapest, near-frontier intelligence | 200K | 64K | $1/MTok | $5/MTok |

### Prompt Caching Rates

| Token Type | Rate vs. Base Input Price |
|------------|--------------------------|
| Cache write | 1.25x base input price |
| Cache read | 0.10x base input price (90% savings) |

### Long Context Pricing

For requests exceeding 200K tokens (1M beta window):
- Additional pricing applies — check the [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing) for current rates.
- Requires `anthropic-beta: context-1m-2025-08-07` header.
- Available to Tier 4+ organizations.

### Choosing a Model

| Use Case | Recommended Model |
|----------|------------------|
| Agent workflows, complex reasoning, coding | `claude-opus-4-6` |
| Production apps, balanced performance | `claude-sonnet-4-6` |
| High-volume, simple tasks, classification | `claude-haiku-4-5-20251001` |
| Bulk processing (batch API) | Any — Haiku cheapest |

---

## Batches API

Process up to 100,000 requests per batch at 50% off real-time pricing. Results available within 24 hours — ideal for bulk classification, evaluation, data enrichment.

### Create a Batch

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const batch = await client.messages.batches.create({
  requests: [
    {
      custom_id: "user-001",
      params: {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: "Classify the sentiment: 'Great product!'" }],
      },
    },
    {
      custom_id: "user-002",
      params: {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: "Classify the sentiment: 'Terrible experience.'" }],
      },
    },
    // Up to 100,000 requests per batch
  ],
});

console.log("Batch ID:", batch.id);
console.log("Status:", batch.processing_status); // "in_progress"
```

### Poll for Completion

```typescript
async function waitForBatch(batchId: string) {
  while (true) {
    const batch = await client.messages.batches.retrieve(batchId);

    if (batch.processing_status === "ended") {
      return batch;
    }

    console.log(`Processing... ${batch.request_counts.processing} remaining`);
    await new Promise((resolve) => setTimeout(resolve, 60_000)); // Poll every 60s
  }
}

const completedBatch = await waitForBatch(batch.id);
console.log("Succeeded:", completedBatch.request_counts.succeeded);
console.log("Errored:", completedBatch.request_counts.errored);
```

### Retrieve Results

```typescript
// Stream results (recommended for large batches)
for await (const result of await client.messages.batches.results(batch.id)) {
  if (result.result.type === "succeeded") {
    const message = result.result.message;
    const text = message.content.find((b) => b.type === "text");
    console.log(`${result.custom_id}:`, text?.type === "text" ? text.text : "");
  } else if (result.result.type === "errored") {
    console.error(`${result.custom_id} failed:`, result.result.error);
  }
}
```

### Batch Limits and Properties

| Property | Value |
|----------|-------|
| Max requests per batch | 100,000 |
| Pricing discount | 50% vs real-time |
| Max processing time | 24 hours |
| Results available | Until batch expires (29 days) |
| Cancel a batch | `client.messages.batches.cancel(batchId)` |

---

## Rate Limits and Pricing

### Usage Tiers

Advance tiers by cumulative credit purchases. Tiers control monthly spend and RPM/TPM limits.

| Tier | Credit Purchase Required | Max Credit Purchase |
|------|-------------------------|---------------------|
| Tier 1 | $5 | $100 |
| Tier 2 | $40 | $500 |
| Tier 3 | $200 | $1,000 |
| Tier 4 | $400 | $5,000 |

### Rate Limits by Tier (Claude Opus/Sonnet 4.x)

| Tier | RPM | ITPM | OTPM |
|------|-----|------|------|
| Tier 1 | 50 | 30,000 | 8,000 |
| Tier 2 | 1,000 | 450,000 | 90,000 |
| Tier 3 | 2,000 | 800,000 | 160,000 |
| Tier 4 | 4,000 | 2,000,000 | 400,000 |

### Rate Limits by Tier (Claude Haiku 4.5)

| Tier | RPM | ITPM | OTPM |
|------|-----|------|------|
| Tier 1 | 50 | 50,000 | 10,000 |
| Tier 2 | 1,000 | 450,000 | 90,000 |
| Tier 3 | 2,000 | 1,000,000 | 200,000 |
| Tier 4 | 4,000 | 4,000,000 | 800,000 |

### Cache-Aware ITPM

Cached input tokens (`cache_read_input_tokens`) do NOT count toward ITPM for current models. Only uncached input tokens and cache-write tokens count. This effectively multiplies your throughput when using prompt caching.

### Cost Optimization

| Strategy | Savings |
|----------|---------|
| Prompt caching (repeated context) | Up to 90% on cached tokens |
| Batch API (bulk, non-urgent) | 50% vs real-time |
| Use Haiku for simple tasks | 3-5x cheaper than Sonnet |
| Minimize system prompt size | Reduces input tokens every request |
| Stream responses | Reduces perceived latency (no cost impact) |

### Rate Limit Response Headers

| Header | Description |
|--------|-------------|
| `anthropic-ratelimit-requests-limit` | Max RPM |
| `anthropic-ratelimit-requests-remaining` | Requests left in window |
| `anthropic-ratelimit-input-tokens-remaining` | Input tokens left (rounded to nearest 1k) |
| `anthropic-ratelimit-output-tokens-remaining` | Output tokens left |
| `retry-after` | Seconds to wait after 429 |

---

## Error Handling

### SDK Error Types

```typescript
import Anthropic from "@anthropic-ai/sdk";
import {
  APIError,
  APIStatusError,
  RateLimitError,
  APIConnectionError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  UnprocessableEntityError,
  InternalServerError,
} from "@anthropic-ai/sdk";

try {
  const response = await client.messages.create({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    // 429 — back off and retry
    console.error("Rate limited. Retry after:", err.headers?.["retry-after"]);
  } else if (err instanceof APIStatusError) {
    // 529 — API overloaded (normal under high load)
    if (err.status === 529) {
      console.error("API overloaded — retry with backoff");
    }
  } else if (err instanceof APIConnectionError) {
    // Network error — retry
    console.error("Connection failed:", err.message);
  } else if (err instanceof AuthenticationError) {
    // 401 — invalid API key
    console.error("Invalid API key");
  } else if (err instanceof BadRequestError) {
    // 400 — invalid request params
    console.error("Bad request:", err.message);
  } else {
    throw err;
  }
}
```

### Exponential Backoff

The SDK retries automatically (default: 2 retries) for 429 and 5xx errors. For custom retry logic:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err instanceof RateLimitError ||
        (err instanceof APIStatusError && err.status === 529) ||
        err instanceof APIConnectionError;

      if (!isRetryable || attempt === maxRetries) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
const response = await withRetry(() =>
  client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello" }],
  })
);
```

### HTTP Status Codes

| Status | Error Class | Meaning |
|--------|-------------|---------|
| 400 | `BadRequestError` | Invalid parameters |
| 401 | `AuthenticationError` | Invalid or missing API key |
| 403 | `PermissionDeniedError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 422 | `UnprocessableEntityError` | Valid JSON but invalid semantics |
| 429 | `RateLimitError` | Rate limit hit — check `retry-after` header |
| 500 | `InternalServerError` | Anthropic server error |
| 529 | `APIStatusError` (status 529) | API overloaded — retry with backoff |

---

## Common Mistakes

| Mistake | Why It Breaks | Fix |
|---------|---------------|-----|
| Omitting `max_tokens` | Field is required; no default | Always set `max_tokens`; for long outputs set to model max (128K for Opus 4.6) |
| `tool_result` not immediately following `tool_use` turn | API rejects invalid conversation structure | Tool results must be the next user message after Claude's `tool_use` block |
| Image base64 missing `data:` prefix | `source.type: "base64"` doesn't use data URL syntax | Put the raw base64 in `data`, not `data:image/jpeg;base64,...` — the `media_type` field is separate |
| `budget_tokens >= max_tokens` | Validation error | `budget_tokens` must be strictly less than `max_tokens` |
| Using `budget_tokens` on `claude-opus-4-6` | Deprecated; behavior may change | Use `thinking: { type: "adaptive" }` for Opus 4.6 |
| Storing API key in browser/frontend | Key exposed to all users | API calls must go through a server-side route; never send key to client |
| Missing `anthropic-version` header in raw HTTP | Request fails | Always include `anthropic-version: 2023-06-01` |
| Not handling 529 overloaded errors | Crashes or drops requests during high load | 529 is normal under load; treat like 429 and retry with backoff |
| Modifying or omitting thinking blocks in multi-turn tool use | Model loses reasoning continuity | Pass `response.content` (including thinking blocks) back unmodified |
| Setting `temperature` or `top_k` with extended thinking | API error | Extended thinking is incompatible with `temperature` and `top_k` |
| Treating `output_tokens` as visible tokens when thinking is enabled | Billing confusion | Billed output = full thinking tokens generated, not summarized tokens you see |
| Using `tool_choice: "any"` or `"tool"` with extended thinking | API error | Extended thinking only supports `auto` or `none` tool choice |
