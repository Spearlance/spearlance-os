# Vercel AI SDK Developer Reference

> **Last Updated:** February 2026
> **SDK Version:** 6.x (`ai` package)
> **Docs:** https://ai-sdk.dev | **GitHub:** https://github.com/vercel/ai

---

## Table of Contents

1. [Setup](#setup)
2. [Core Functions](#core-functions)
3. [Chat (useChat)](#chat-usechat)
4. [Streaming](#streaming)
5. [Tool Calling](#tool-calling)
6. [Structured Output](#structured-output)
7. [Multi-Modal](#multi-modal)
8. [useCompletion](#usecompletion)
9. [Provider Abstraction](#provider-abstraction)
10. [Error Handling](#error-handling)
11. [Edge Runtime](#edge-runtime)
12. [Common Mistakes](#common-mistakes)

---

## Setup

### Install

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
npm install @ai-sdk/mistral @ai-sdk/groq          # additional providers
npm install @ai-sdk/react                          # useChat, useCompletion, useObject
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
```

Providers auto-read their respective env vars — no explicit configuration needed for basic usage.

### Provider Initialization

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { groq } from '@ai-sdk/groq';

// Models instantiated inline
const model = anthropic('claude-sonnet-4-6');
const model = openai('gpt-4o');
const model = google('gemini-2.0-flash');
const model = groq('llama-3.3-70b-versatile');
```

### Next.js App Router Route Handler

```typescript
// app/api/chat/route.ts
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages),
    maxTokens: 2048,
  });
  return result.toUIMessageStreamResponse();
}
```

---

## Core Functions

### generateText — Synchronous Completion

Waits for the full response. Use for batch jobs, scripts, and non-interactive tasks.

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text, usage, finishReason, steps } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  system: 'You are a technical writer.',
  prompt: 'Summarize the key benefits of TypeScript in 3 bullet points.',
  maxTokens: 512,
});
// usage: { promptTokens, completionTokens, totalTokens }
// finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error'
```

### streamText — Streaming Completion

Returns a stream immediately. Required for any user-facing interface.

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  prompt: 'Write a short story about a robot learning to paint.',
  maxTokens: 1024,
  onFinish: ({ text, usage, finishReason }) => {
    console.log('Done. Tokens used:', usage.totalTokens);
  },
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// In Next.js route handler:
return result.toUIMessageStreamResponse();
```

### generateText vs streamText

| Aspect | `generateText` | `streamText` |
|--------|---------------|--------------|
| Returns when | Full response complete | Immediately (stream) |
| Result shape | `{ text, usage, steps }` | `{ textStream, toUIMessageStreamResponse() }` |
| Token usage | Available in result | Available in `onFinish` |
| Best for | Batch, cron, scripts | Chat UI, real-time output |
| Tool calling | `stopWhen: stepCountIs(N)` | Same |

**Callbacks available on both:** `onFinish`, `onError`, `onChunk`, `onAbort`

---

## Chat (useChat)

### Basic Setup

```typescript
// app/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function ChatPage() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: ({ message }) => console.log('AI responded:', message),
    onError: (error) => console.error('Chat error:', error),
  });
  const [input, setInput] = useState('');

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <b>{msg.role}:</b>{' '}
          {msg.parts.map((part, i) =>
            part.type === 'text' ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      ))}
      {(status === 'streaming' || status === 'submitted') && (
        <button onClick={stop}>Stop</button>
      )}
      {error && <button onClick={regenerate}>Retry</button>}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput(''); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== 'ready'} />
        <button type="submit" disabled={status !== 'ready'}>Send</button>
      </form>
    </div>
  );
}
```

### useChat Return Values

| Property | Type | Description |
|----------|------|-------------|
| `messages` | `UIMessage[]` | Full message history with parts |
| `sendMessage` | `(options) => void` | Send a new user message |
| `status` | `'ready' \| 'submitted' \| 'streaming' \| 'error'` | Current chat state |
| `stop` | `() => void` | Abort current stream |
| `error` | `Error \| undefined` | Last error if any |
| `setMessages` | `(msgs) => void` | Directly set message array |
| `regenerate` | `() => void` | Re-process last message |

### Status Values

| Status | Meaning |
|--------|---------|
| `ready` | Idle — enable input |
| `submitted` | Request sent, waiting for first token |
| `streaming` | Receiving tokens |
| `error` | Last request failed |

### Message Structure

`UIMessage[]` uses a `parts` array — not a flat `content` string:

```typescript
type UIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'tool-call'; toolName: string; args: unknown; toolCallId: string }
    | { type: 'tool-result'; toolCallId: string; result: unknown }
  >;
};
```

---

## Streaming

### Data Stream Protocol

`toUIMessageStreamResponse()` uses a text-based protocol parsed automatically by `useChat`:

```
0:"Hello"                         → text chunk
2:[{"type":"tool-call",...}]       → tool call
d:{"finishReason":"stop",...}      → finish event
e:{"error":"..."}                  → error event
```

Never parse this manually on the client — `useChat` handles it.

### Full Stream (All Event Types)

```typescript
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'text-delta':   process.stdout.write(part.textDelta); break;
    case 'tool-call':    console.log('Tool called:', part.toolName, part.args); break;
    case 'tool-result':  console.log('Tool result:', part.result); break;
    case 'finish':       console.log('Finish reason:', part.finishReason); break;
    case 'error':        console.error('Stream error:', part.error); break;
  }
}
```

### Node.js Streaming (Non-Next.js)

```typescript
const result = streamText({ model, prompt: 'Generate 10 startup ideas.' });

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

const fullText = await result.text;     // await full text post-stream
const usage   = await result.usage;    // await token counts
```

---

## Tool Calling

### Defining a Tool

```typescript
import { tool, generateText, stepCountIs } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get current weather for a city',
  inputSchema: z.object({
    city: z.string().describe('City name, e.g. "San Francisco"'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ city, unit }) => ({
    city,
    temperature: 22,
    unit,
    condition: 'Partly cloudy',
  }),
});
```

### Single-Step Tool Call

```typescript
const { text, toolCalls, toolResults } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  tools: { weather: weatherTool },
  prompt: 'What is the weather in Tokyo?',
});
```

### Multi-Step Tool Calling

```typescript
const { text, steps } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  tools: { search: searchTool, calculate: calculatorTool },
  stopWhen: stepCountIs(10), // max 10 agentic rounds
  prompt: 'Research the top 3 fastest EVs and compare their 0-60 times.',
});

// Inspect each step
for (const step of steps) {
  console.log('Tool calls:', step.toolCalls);
  console.log('Tool results:', step.toolResults);
}
```

Works identically with `streamText` — return `result.toUIMessageStreamResponse()`.

### Rendering Tool Invocations in useChat

```tsx
{msg.parts.map((part, i) => {
  if (part.type === 'text') return <p key={i}>{part.text}</p>;
  if (part.type === 'tool-call') return (
    <div key={i} className="bg-gray-100 p-2 rounded font-mono text-sm">
      {part.toolName}({JSON.stringify(part.args)})
    </div>
  );
  if (part.type === 'tool-result') return (
    <pre key={i} className="bg-green-50 p-2 rounded text-xs">
      {JSON.stringify(part.result, null, 2)}
    </pre>
  );
  return null;
})}
```

### Tool Options

```typescript
tool({
  // ...
  strict: true,    // OpenAI: enforce strict JSON schema adherence
  examples: [      // Guide model with concrete inputs
    { input: { query: 'TypeScript generics tutorial' } },
  ],
})
```

---

## Structured Output

> `generateObject` and `streamObject` are **deprecated in AI SDK 6**. Use `generateText`/`streamText` with the `Output` API. Old functions still work but will be removed in a future major.

### Output.object() — Typed Structured Generation

```typescript
import { generateText, Output } from 'ai';
import { z } from 'zod';

const recipeSchema = z.object({
  name: z.string().describe('Name of the dish'),
  ingredients: z.array(z.object({ item: z.string(), amount: z.string() })),
  steps: z.array(z.string()),
  prepTimeMinutes: z.number(),
});

const { output } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  output: Output.object({ schema: recipeSchema }),
  prompt: 'Generate a vegetarian pasta recipe.',
});

// output is fully typed as z.infer<typeof recipeSchema>
console.log(output.name);
console.log(output.ingredients);
```

### Streaming Partial Results

```typescript
const { partialOutputStream } = streamText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: recipeSchema }),
  prompt: 'Generate a chocolate cake recipe.',
});

for await (const partial of partialOutputStream) {
  // Deep partial — all fields potentially undefined mid-stream
  console.log(partial.name);
}
```

### Other Output Modes

```typescript
// Arrays
const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.array({ schema: z.object({ title: z.string(), description: z.string() }) }),
  prompt: 'Generate 5 edtech startup ideas.',
});

// Classification
const { output: sentiment } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  output: Output.choice(['positive', 'negative', 'neutral']),
  prompt: 'Classify: "This product exceeded all my expectations!"',
});
// → 'positive'

// Unvalidated JSON
const { output: raw } = await generateText({
  model: openai('gpt-4o'),
  output: Output.json(),
  prompt: 'Return a JSON object with name and age.',
});
```

### Schema Best Practices

Always use `.describe()` — descriptions are sent to the model:

```typescript
const schema = z.object({
  headline: z.string().describe('Catchy headline under 60 characters'),
  summary: z.string().describe('2-3 sentence summary of the content'),
  tags: z.array(z.string()).describe('3-5 topical keywords, lowercase'),
});
```

---

## Multi-Modal

### Images

```typescript
// From URL
{ type: 'image', image: new URL('https://example.com/photo.jpg') }

// From buffer
{ type: 'image', image: fs.readFileSync('./chart.png') }

// From base64 data URL
{ type: 'image', image: 'data:image/png;base64,iVBORw0KGgo...' }
```

Full example:

```typescript
const { text } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image', image: new URL('https://example.com/photo.jpg') },
    ],
  }],
});
```

### PDFs and Audio

```typescript
// PDF
{ type: 'file', mimeType: 'application/pdf', data: fs.readFileSync('./doc.pdf'), filename: 'doc.pdf' }

// Audio (OpenAI, Google)
{ type: 'file', mimeType: 'audio/mp3', data: fs.readFileSync('./recording.mp3') }
```

### Provider Support Matrix

| Capability | Anthropic | OpenAI | Google |
|-----------|-----------|--------|--------|
| Image URL | ✓ | ✓ | ✓ |
| Image buffer/base64 | ✓ | ✓ | ✓ |
| PDF | ✓ | ✓ | ✓ |
| Audio | ✗ | ✓ (wav, mp3) | ✓ |
| Video | ✗ | ✗ | ✓ |

---

## useCompletion

Single-turn prompt → completion. No conversation history.

```typescript
'use client';
import { useCompletion } from '@ai-sdk/react';

export default function SummaryPage() {
  const { completion, input, handleInputChange, handleSubmit, isLoading, stop, error } =
    useCompletion({ api: '/api/completion' });

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} disabled={isLoading} />
      <button type="submit" disabled={isLoading}>Submit</button>
      {isLoading && <button type="button" onClick={stop}>Stop</button>}
      {error && <p>{error.message}</p>}
      <div>{completion}</div>
    </form>
  );
}
```

### Route Handler

```typescript
// app/api/completion/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: 'Reply with a 3-sentence summary.',
    prompt,
    maxTokens: 256,
  });
  return result.toTextStreamResponse(); // Note: toTextStreamResponse, not toUIMessageStreamResponse
}
```

### useCompletion vs useChat

| | `useCompletion` | `useChat` |
|--|--|--|
| History | No | Yes |
| Use case | Summarize, translate, classify | Conversation, agents |
| Loading state | `isLoading: boolean` | `status: 'ready' \| 'streaming' \| ...` |

---

## Provider Abstraction

### Provider Registry (Multi-Provider Apps)

```typescript
// lib/ai.ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createProviderRegistry } from 'ai';

export const registry = createProviderRegistry({ anthropic, openai, google });

// Usage: 'provider:modelId'
const model = registry.languageModel('anthropic:claude-sonnet-4-6');
const fast  = registry.languageModel('openai:gpt-4o-mini');
```

### Custom Provider with Aliases

```typescript
import { customProvider } from 'ai';

export const models = customProvider({
  languageModels: {
    fast:     openai('gpt-4o-mini'),
    smart:    anthropic('claude-sonnet-4-6'),
    powerful: anthropic('claude-opus-4-6'),
  },
});

const result = await generateText({
  model: models.languageModel('smart'),
  prompt: 'Explain quantum entanglement.',
});
```

### Runtime Provider Switching

```typescript
type Provider = 'anthropic' | 'openai' | 'google';

function getModel(provider: Provider) {
  switch (provider) {
    case 'anthropic': return anthropic('claude-sonnet-4-6');
    case 'openai':    return openai('gpt-4o');
    case 'google':    return google('gemini-2.0-flash');
  }
}

const { text } = await generateText({
  model: getModel(process.env.AI_PROVIDER as Provider ?? 'anthropic'),
  prompt: userPrompt,
});
```

### Provider-Specific Options

```typescript
const { text } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  prompt: 'Solve step by step.',
  providerOptions: {
    anthropic: { thinking: { type: 'enabled', budgetTokens: 5000 } },
  },
});
```

---

## Error Handling

### Error Types (31 total, prefixed `AI_`)

| Error Class | When Thrown |
|-------------|-------------|
| `AI_APICallError` | HTTP error from provider API |
| `AI_TypeValidationError` | Response doesn't match expected schema |
| `AI_NoObjectGeneratedError` | `Output.object()` failed to produce valid output |
| `AI_NoSuchToolError` | Model called an unregistered tool |
| `AI_InvalidToolInputError` | Tool arguments failed schema validation |
| `AI_JSONParseError` | Response contained invalid JSON |
| `AI_LoadAPIKeyError` | API key env var missing or empty |
| `AI_RetryError` | All retry attempts exhausted |
| `AI_NoContentGeneratedError` | Model returned empty content |
| `AI_UnsupportedFunctionalityError` | Feature not supported by this provider |

### Type-Safe Error Checking

```typescript
import { AI_APICallError, AI_NoObjectGeneratedError, AI_TypeValidationError } from 'ai';

try {
  const { output } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    output: Output.object({ schema: mySchema }),
    prompt: 'Extract data.',
  });
} catch (error) {
  if (AI_APICallError.isInstance(error)) {
    console.error('API error:', error.statusCode, error.message);
    console.error('Provider response:', error.responseBody);
  } else if (AI_NoObjectGeneratedError.isInstance(error)) {
    console.error('Structured output failed. Raw text:', error.text);
  } else if (AI_TypeValidationError.isInstance(error)) {
    console.error('Schema mismatch:', error.value);
  } else {
    throw error;
  }
}
```

### Rate Limit Retry with Backoff

```typescript
async function generateWithRetry(prompt: string, maxAttempts = 3): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { text } = await generateText({ model: anthropic('claude-sonnet-4-6'), prompt });
      return text;
    } catch (error) {
      if (AI_APICallError.isInstance(error) && error.statusCode === 429 && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retry attempts exceeded');
}
```

### Stream Error Handling

```typescript
const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Tell me a story.',
  onError: (error) => console.error('Stream failed mid-way:', error),
});

try {
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
} catch (error) {
  if (AI_APICallError.isInstance(error)) {
    console.error('Stream error. Status:', error.statusCode);
  }
}
```

---

## Edge Runtime

### What Works on Edge

| Feature | Edge | Notes |
|---------|------|-------|
| `streamText` | ✓ | Primary edge use case |
| `generateText` | ✓ | Works; no streaming benefit |
| Tool calling | ✓ | Provider-dependent |
| `Output.object()` | ✓ | Supported |
| File system (`fs`) | ✗ | No Node APIs on edge |
| Long generation (>25s) | ✗ | Vercel Edge 25s limit |

### Next.js Edge Route

```typescript
// app/api/chat/route.ts
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

### Edge vs Node.js

| | Edge | Node.js |
|--|--|--|
| Cold start | ~0ms | ~100-500ms |
| Max duration | 25s (Vercel) | 60-300s |
| File system | ✗ | ✓ |
| Memory | ~128MB | Up to 3GB |
| Best for | Streaming chat | Complex agents, file ops |

All major providers use the Fetch API — edge compatible. Issues arise only when using Node.js-specific features alongside them.

---

## Common Mistakes

| Mistake | Why It Hurts | Fix |
|---------|-------------|-----|
| `generateText` for chat UI | Users wait for full response | Use `streamText` + `toUIMessageStreamResponse()` |
| Calling deprecated `generateObject` | Removed in future major | Use `generateText` with `Output.object({ schema })` |
| Skipping `await convertToModelMessages()` | `UIMessage[]` crashes model call | Always convert before passing to `messages:` |
| Not setting `maxTokens` | Runaway generation burns budget | SDK has no default cap — always set it |
| Relying on `isLoading` from `useChat` | Removed in v6 | Use `status !== 'ready'` instead |
| Anthropic tool results out of order | API rejects malformed conversation | Tool result must immediately follow the assistant turn |
| Awaiting `result.text` mid-stream | Throws if stream still open | Use `onFinish` callback or `await` after iteration |
| Streaming on edge without checking provider | Silent failures on unsupported features | Verify each provider's edge support before deploying |
| Calling `/api/chat` manually with `fetch` | Bypasses data stream protocol | Use `useChat` or manually parse the stream protocol |
| `useChat` options `api:` without `transport:` | v6 requires `DefaultChatTransport` wrapper | `transport: new DefaultChatTransport({ api: '/api/chat' })` |
| Zod schemas without `.describe()` | Model guesses field meaning — poor output quality | Add `.describe('...')` to every non-obvious property |
| `streamObject` / `generateObject` in new code | Deprecated — don't start new code with these | Use `Output.*` API from day one |
