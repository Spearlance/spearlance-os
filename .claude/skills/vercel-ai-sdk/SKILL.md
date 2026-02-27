---
model: claude-sonnet-4-6
name: vercel-ai-sdk
description: Use when integrating AI/LLM features with the Vercel AI SDK — streaming responses, tool calling, multi-provider support, or building chat interfaces. Also use when building AI-powered features in Next.js or React applications.
---

# Vercel AI SDK

> SDK version: 6.x (2026) | Package: `ai` | Docs: https://ai-sdk.dev

## Install

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
```

## Provider Setup

```typescript
import { anthropic } from '@ai-sdk/anthropic'; // ANTHROPIC_API_KEY
import { openai } from '@ai-sdk/openai';         // OPENAI_API_KEY
import { google } from '@ai-sdk/google';          // GOOGLE_GENERATIVE_AI_API_KEY

const model = anthropic('claude-sonnet-4-6');
```

## generateText vs streamText

| | `generateText` | `streamText` |
|--|--|--|
| Returns | Complete text after finish | Stream (async iterable) |
| Use for | Batch, non-interactive | Chat, real-time UI |
| Result | `{ text, usage, steps }` | `{ textStream, toUIMessageStreamResponse() }` |
| Tool calling | `stopWhen: stepCountIs(N)` | Same |

## useChat Hook (React/Next.js)

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <b>{msg.role}:</b>
          {msg.parts.map((p, i) => p.type === 'text' ? <span key={i}>{p.text}</span> : null)}
        </div>
      ))}
      {(status === 'streaming' || status === 'submitted') && (
        <button onClick={stop}>Stop</button>
      )}
      <form onSubmit={e => { e.preventDefault(); sendMessage({ text: input }); setInput(''); }}>
        <input value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'ready'} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Route Handler

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
  });
  return result.toUIMessageStreamResponse();
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `generateText` for chat UIs | Use `streamText` — users expect immediate feedback |
| `generateObject` / `streamObject` directly | Deprecated in v6 — use `generateText`/`streamText` with `Output.object()` |
| Forgetting `await convertToModelMessages()` | UIMessage format must be converted before passing to model |
| Not handling `status !== 'ready'` | Disable input while `submitted` or `streaming` |
| Anthropic tool calls without assistant turn | Tool results must follow the assistant turn containing the tool call |
| Token limits not set | SDK does not enforce limits — always set `maxTokens` |
| Streaming on edge without provider support | Verify provider supports edge runtime before using `runtime: 'edge'` |
| `useChat` with old `handleSubmit` API | v6 uses `sendMessage({ text })` — `handleSubmit` pattern changed |

See reference.md for full API coverage.
