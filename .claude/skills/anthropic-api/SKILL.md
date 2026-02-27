---
model: claude-sonnet-4-6
name: anthropic-api
description: Use when integrating Claude via the Anthropic API — messages, tool use, vision, streaming, or building AI features. Also use when working with the Anthropic SDK, managing API keys, or optimizing Claude API usage.
---

# Anthropic API

## Overview

Direct Claude API access via the `@anthropic-ai/sdk` package. Uses a Messages API with a structured `messages` array, content blocks, and optional streaming.

## Models (February 2026)

| Model ID | Description | Input | Output |
|----------|-------------|-------|--------|
| `claude-opus-4-6` | Most capable — agents, complex reasoning | $5/MTok | $25/MTok |
| `claude-sonnet-4-6` | Balanced speed + intelligence | $3/MTok | $15/MTok |
| `claude-haiku-4-5-20251001` | Fastest, cheapest, near-frontier | $1/MTok | $5/MTok |

Context window: 200K tokens (1M beta for Opus/Sonnet 4.6). Max output: 128K (Opus 4.6), 64K (others).

## Basic Message Call

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello, Claude." }],
});

console.log(response.content[0].text);
```

## Streaming

```typescript
const stream = await client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write me a haiku." }],
});

for await (const chunk of stream) {
  if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
    process.stdout.write(chunk.delta.text);
  }
}

const finalMessage = await stream.finalMessage();
console.log("\nTotal tokens:", finalMessage.usage.output_tokens);
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `max_tokens` | Required on every request — no default |
| `tool_result` not immediately after `tool_use` | Tool result must follow the turn containing `tool_use` |
| Image base64 missing data URL prefix | Use `data:image/jpeg;base64,...` format |
| Extended thinking `budget_tokens >= max_tokens` | `budget_tokens` must be less than `max_tokens` |
| Storing API key in client-side code | Server-side only; use env vars |
| Using `budget_tokens` on Opus 4.6 | Deprecated — use adaptive thinking with `effort` instead |
| Forgetting `anthropic-version` header in raw HTTP | Always `2023-06-01` |
| Streaming without handling `overloaded_error` | Add retry with backoff for 529s |

See reference.md for full API coverage.
