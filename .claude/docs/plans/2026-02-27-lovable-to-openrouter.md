# Lovable → OpenRouter Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Lovable AI gateway calls with OpenRouter, switching text models to Claude and keeping Gemini for image generation.

**Architecture:** All ~25 Supabase Edge Functions call `ai.gateway.lovable.dev` using OpenAI-compatible format. We swap the URL to `openrouter.ai/api/v1`, change env var from `LOVABLE_API_KEY` to `OPENROUTER_API_KEY`, and remap text models from Gemini to Claude. A shared `aiClient.ts` module centralizes these constants.

**Tech Stack:** Supabase Edge Functions (Deno), OpenRouter API (OpenAI-compatible), Claude claude-sonnet-4-5 (text), Gemini 2.5 Flash Image Preview (images)

---

## Task 1: Create Shared AI Client Module

**Files:**
- Create: `supabase/functions/_shared/aiClient.ts`

**Step 1: Create the shared module**

```typescript
// supabase/functions/_shared/aiClient.ts

// OpenRouter gateway configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model constants
export const AI_MODELS = {
  /** Claude Sonnet 4.5 — all text generation tasks */
  TEXT: 'anthropic/claude-sonnet-4-5',
  /** Gemini 2.5 Flash Image Preview — image generation only */
  IMAGE: 'google/gemini-2.5-flash-image-preview',
} as const;

/** Build standard headers for OpenRouter API calls */
export function aiHeaders(): Record<string, string> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://os.spearlance.com',
    'X-Title': 'SpearlanceOS',
  };
}

/** Chat completions endpoint URL */
export const AI_CHAT_URL = `${OPENROUTER_BASE_URL}/chat/completions`;

/** Standard chat completion request */
export async function aiChatCompletion(body: {
  model?: string;
  messages: Array<{ role: string; content: any }>;
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
  modalities?: string[];
  [key: string]: any;
}): Promise<Response> {
  const response = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({
      model: body.model || AI_MODELS.TEXT,
      ...body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  return response;
}

/** Extract text content from a non-streaming chat completion response */
export async function aiTextResponse(body: {
  messages: Array<{ role: string; content: any }>;
  tools?: any[];
  tool_choice?: any;
  [key: string]: any;
}): Promise<string> {
  const response = await aiChatCompletion(body);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Extract tool call from a non-streaming chat completion response */
export async function aiToolCallResponse(body: {
  messages: Array<{ role: string; content: any }>;
  tools: any[];
  tool_choice?: any;
  [key: string]: any;
}): Promise<{ id: string; name: string; arguments: string } | null> {
  const response = await aiChatCompletion(body);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  return toolCall ? {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: toolCall.function.arguments,
  } : null;
}
```

**Step 2: Verify no syntax errors**

Run: `cd supabase/functions && deno check _shared/aiClient.ts` (if Deno available locally, otherwise visual inspection)

**Step 3: Commit**

```bash
git add supabase/functions/_shared/aiClient.ts
git commit -m "feat: add shared AI client module for OpenRouter"
```

---

## Task 2: Migrate Simple Text Generation Functions (Batch 1)

These functions follow the exact same pattern: fetch URL, send messages, parse `choices[0].message.content`. Mechanical replacement.

**Files to modify (12 functions):**
- `supabase/functions/avatar-generate-summary/index.ts`
- `supabase/functions/avatar-generate-with-ai/index.ts`
- `supabase/functions/blog-generate-article/index.ts`
- `supabase/functions/blog-generate-monthly-topics/index.ts`
- `supabase/functions/blog-generate-outline/index.ts`
- `supabase/functions/blog-generate-topics/index.ts`
- `supabase/functions/duda-comment-webhook/index.ts`
- `supabase/functions/generate-ai-report/index.ts`
- `supabase/functions/generate-avatar-story/index.ts`
- `supabase/functions/generate-daily-action-plan/index.ts`
- `supabase/functions/generate-page-content/index.ts`
- `supabase/functions/launchpad-analyze/index.ts`

**Step 1: For each function, apply these 3 changes:**

1. **Add import** at the top (after existing imports):
```typescript
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';
```

2. **Replace the fetch URL and headers.** Find:
```typescript
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
// ... (any check for !LOVABLE_API_KEY)
```
Remove those lines. Then find:
```typescript
await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
```
Replace with:
```typescript
await fetch(AI_CHAT_URL, {
  method: 'POST',
  headers: aiHeaders(),
```

3. **Replace model name.** Find:
```typescript
model: 'google/gemini-2.5-flash',
```
Replace with:
```typescript
model: AI_MODELS.TEXT,
```
Also replace `'google/gemini-2.5-flash-lite'` and `'claude-sonnet-4-5'` with `AI_MODELS.TEXT`.

**Step 2: Verify no LOVABLE references remain in modified files**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/avatar-generate-summary/ supabase/functions/avatar-generate-with-ai/ supabase/functions/blog-generate-article/ supabase/functions/blog-generate-monthly-topics/ supabase/functions/blog-generate-outline/ supabase/functions/blog-generate-topics/ supabase/functions/duda-comment-webhook/ supabase/functions/generate-ai-report/ supabase/functions/generate-avatar-story/ supabase/functions/generate-daily-action-plan/ supabase/functions/generate-page-content/ supabase/functions/launchpad-analyze/`
Expected: No matches

**Step 3: Commit**

```bash
git add supabase/functions/avatar-generate-summary/ supabase/functions/avatar-generate-with-ai/ supabase/functions/blog-generate-article/ supabase/functions/blog-generate-monthly-topics/ supabase/functions/blog-generate-outline/ supabase/functions/blog-generate-topics/ supabase/functions/duda-comment-webhook/ supabase/functions/generate-ai-report/ supabase/functions/generate-avatar-story/ supabase/functions/generate-daily-action-plan/ supabase/functions/generate-page-content/ supabase/functions/launchpad-analyze/
git commit -m "feat: migrate 12 text generation functions to OpenRouter + Claude"
```

---

## Task 3: Migrate Simple Text Generation Functions (Batch 2)

Same pattern as Task 2 for the remaining simple text functions.

**Files to modify (8 functions):**
- `supabase/functions/match-avatar-to-content/index.ts`
- `supabase/functions/recommend-tasks/index.ts`
- `supabase/functions/send-weekly-performance-emails/index.ts`
- `supabase/functions/social-bulk-generate-captions/index.ts`
- `supabase/functions/social-generate-captions/index.ts`
- `supabase/functions/social-generate-ideas/index.ts`
- `supabase/functions/social-generate-monthly-topics/index.ts`
- `supabase/functions/summarize-story/index.ts`

**Step 1: Apply the same 3 changes from Task 2 to each function**

1. Add `import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';`
2. Replace `LOVABLE_API_KEY` env var + fetch URL + headers with `AI_CHAT_URL` + `aiHeaders()`
3. Replace model string with `AI_MODELS.TEXT`

**Step 2: Verify no LOVABLE references remain**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/match-avatar-to-content/ supabase/functions/recommend-tasks/ supabase/functions/send-weekly-performance-emails/ supabase/functions/social-bulk-generate-captions/ supabase/functions/social-generate-captions/ supabase/functions/social-generate-ideas/ supabase/functions/social-generate-monthly-topics/ supabase/functions/summarize-story/`
Expected: No matches

**Step 3: Commit**

```bash
git add supabase/functions/match-avatar-to-content/ supabase/functions/recommend-tasks/ supabase/functions/send-weekly-performance-emails/ supabase/functions/social-bulk-generate-captions/ supabase/functions/social-generate-captions/ supabase/functions/social-generate-ideas/ supabase/functions/social-generate-monthly-topics/ supabase/functions/summarize-story/
git commit -m "feat: migrate 8 more text generation functions to OpenRouter + Claude"
```

---

## Task 4: Migrate Tool-Calling Functions

These use OpenAI-format `tools` parameter and parse `tool_calls` responses. OpenRouter supports this format identically.

**Files:**
- Modify: `supabase/functions/analyze-lead/index.ts`
- Modify: `supabase/functions/analyze-page-content/index.ts`

**Step 1: Apply same 3 changes (import, URL/headers, model)**

Same pattern as Tasks 2-3. The `tools`, `tool_choice`, and response parsing (`choices[0].message.tool_calls[0]`) stay exactly the same since OpenRouter uses identical format.

**Step 2: Verify no LOVABLE references remain**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/analyze-lead/ supabase/functions/analyze-page-content/`
Expected: No matches

**Step 3: Commit**

```bash
git add supabase/functions/analyze-lead/ supabase/functions/analyze-page-content/
git commit -m "feat: migrate tool-calling functions to OpenRouter + Claude"
```

---

## Task 5: Migrate Vision Function

`analyze-asset` uses image_url content blocks for vision analysis. Claude supports vision via OpenRouter. The function also uses OpenAI directly for embeddings (OPENAI_API_KEY) — leave that untouched.

**Files:**
- Modify: `supabase/functions/analyze-asset/index.ts`

**Step 1: Apply changes to the Lovable AI call only**

The function has TWO AI providers:
1. Lovable gateway call (vision, line ~60) — **migrate this**
2. OpenAI embeddings call (line ~109) — **leave untouched**

Add import. Replace Lovable fetch URL/headers/model for the vision call only. Do NOT touch the OpenAI embeddings call.

**Step 2: Verify**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/analyze-asset/`
Expected: No matches

**Step 3: Commit**

```bash
git add supabase/functions/analyze-asset/
git commit -m "feat: migrate vision analysis to OpenRouter + Claude"
```

---

## Task 6: Migrate Image Generation Functions (Chat Completions Style)

These use `/v1/chat/completions` with `modalities: ['image', 'text']` and parse `choices[0].message.images[0].image_url.url`. The model stays `google/gemini-2.5-flash-image-preview` — only URL, headers, and env var change.

**Files:**
- Modify: `supabase/functions/avatar-generate-image/index.ts`
- Modify: `supabase/functions/generate-mood-board/index.ts`
- Modify: `supabase/functions/social-generate-image/index.ts`
- Modify: `supabase/functions/social-bulk-generate-images/index.ts`

**Step 1: Apply changes**

1. Add import: `import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';`
2. Replace `LOVABLE_API_KEY` env var checks + fetch URL + headers with `AI_CHAT_URL` + `aiHeaders()`
3. Replace model with `AI_MODELS.IMAGE` (keeps Gemini)
4. Keep `modalities: ['image', 'text']` and response parsing as-is

**Step 2: Verify no LOVABLE references remain**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/avatar-generate-image/ supabase/functions/generate-mood-board/ supabase/functions/social-generate-image/ supabase/functions/social-bulk-generate-images/`
Expected: No matches

**Step 3: Commit**

```bash
git add supabase/functions/avatar-generate-image/ supabase/functions/generate-mood-board/ supabase/functions/social-generate-image/ supabase/functions/social-bulk-generate-images/
git commit -m "feat: migrate image generation functions to OpenRouter (Gemini)"
```

---

## Task 7: Refactor blog-generate-images (Endpoint Change)

This is the only function using `/v1/images/generations` — an endpoint OpenRouter does NOT support. Must refactor to use `/v1/chat/completions` with `modalities: ['image', 'text']`.

**Files:**
- Modify: `supabase/functions/blog-generate-images/index.ts`

**Step 1: Add import**

```typescript
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';
```

**Step 2: Refactor featured image generation (lines 77-88)**

Find:
```typescript
const featuredResponse = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image-preview',
    prompt: featuredPrompt,
    n: 1,
  }),
});
```

Replace with:
```typescript
const featuredResponse = await fetch(AI_CHAT_URL, {
  method: 'POST',
  headers: aiHeaders(),
  body: JSON.stringify({
    model: AI_MODELS.IMAGE,
    messages: [{ role: 'user', content: featuredPrompt }],
    modalities: ['image', 'text'],
  }),
});
```

**Step 3: Refactor featured image response parsing (lines 90-92)**

Find:
```typescript
const featuredData = await featuredResponse.json();
const imageUrl = featuredData.data[0].url;
```

Replace with:
```typescript
const featuredData = await featuredResponse.json();
const imageUrl = featuredData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
if (!imageUrl) throw new Error('No image in AI response');
```

**Step 4: The image URL is now a base64 data URL, not a remote URL. Refactor the upload (lines 94-104)**

Find:
```typescript
// Upload to Supabase Storage
const imageResponse = await fetch(imageUrl);
const imageBlob = await imageResponse.blob();
const fileName = `${blog_post_id}/featured-${Date.now()}.png`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('client-assets')
  .upload(fileName, imageBlob, {
    contentType: 'image/png',
    upsert: false
  });
```

Replace with:
```typescript
// Upload base64 image to Supabase Storage
const base64Content = imageUrl.split(',')[1];
const imageBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
const fileName = `${blog_post_id}/featured-${Date.now()}.png`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('client-assets')
  .upload(fileName, imageBuffer, {
    contentType: 'image/png',
    upsert: false
  });
```

**Step 5: Repeat Steps 2-4 for body image generation (lines 150-190)**

Same refactor: replace `/v1/images/generations` call with chat completions + `modalities`, update response parsing from `bodyData.data[0].url` to `choices[0].message.images[0].image_url.url`, and update upload from fetch(url) to base64 decode.

**Step 6: Remove LOVABLE_API_KEY env var read (line 49-50)**

Find:
```typescript
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
```
Remove these lines (aiHeaders() handles the key check).

**Step 7: Verify no LOVABLE references remain**

Run: `grep -r "LOVABLE\|lovable" supabase/functions/blog-generate-images/`
Expected: No matches

**Step 8: Commit**

```bash
git add supabase/functions/blog-generate-images/
git commit -m "refactor: migrate blog-generate-images from images/generations to chat completions"
```

---

## Task 8: Migrate chat-assistant (High Risk)

The largest function (~7000 lines). Has 3 separate AI call sites with streaming and tool calling.

**Files:**
- Modify: `supabase/functions/chat-assistant/index.ts`

**Step 1: Find the LOVABLE_API_KEY env var read**

Search for `LOVABLE_API_KEY` in the file — it's read once and used in 3 fetch calls. Find where it's declared (likely near top of main handler) and note the variable name.

**Step 2: Add import and replace env var**

Add import at top:
```typescript
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';
```

Remove the `LOVABLE_API_KEY` env var read.

**Step 3: Migrate call site 1 (~line 1566) — email draft generation**

Find:
```typescript
const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
```

Replace URL, headers, and model:
```typescript
const aiResponse = await fetch(AI_CHAT_URL, {
  method: 'POST',
  headers: aiHeaders(),
  body: JSON.stringify({
    model: AI_MODELS.TEXT,
```

**Step 4: Migrate call site 2 (~line 5995) — main streaming chat with tools**

Find:
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: contextualMessages,
    tools,
    stream: true
  })
```

Replace URL, headers, and model. Keep `tools`, `stream: true`, and all SSE parsing logic unchanged:
```typescript
const response = await fetch(AI_CHAT_URL, {
  method: 'POST',
  headers: aiHeaders(),
  body: JSON.stringify({
    model: AI_MODELS.TEXT,
    messages: contextualMessages,
    tools,
    stream: true
  })
```

**Step 5: Migrate call site 3 (~line 6882) — second call with function results**

Find:
```typescript
const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: messagesWithResults,
    stream: true
  })
```

Replace URL, headers, and model:
```typescript
const finalResponse = await fetch(AI_CHAT_URL, {
  method: 'POST',
  headers: aiHeaders(),
  body: JSON.stringify({
    model: AI_MODELS.TEXT,
    messages: messagesWithResults,
    stream: true
  })
```

**Step 6: Update error messages**

Find all instances of `'Lovable AI error'` and replace with `'AI API error'`:
```
Lovable AI error → AI API error
```

**Step 7: Update console.log references**

Find all instances of `'Lovable AI'` or `'Calling Lovable'` in console.log and replace with `'OpenRouter AI'` or just `'AI'`.

**Step 8: Verify no LOVABLE references remain**

Run: `grep -rn "LOVABLE\|lovable\|Lovable" supabase/functions/chat-assistant/`
Expected: No matches

**Step 9: Commit**

```bash
git add supabase/functions/chat-assistant/
git commit -m "feat: migrate chat-assistant to OpenRouter + Claude (streaming + tools)"
```

---

## Task 9: Final Sweep and Cleanup

**Step 1: Verify zero LOVABLE references in entire codebase**

Run: `grep -r "LOVABLE\|lovable\|ai\.gateway\.lovable\.dev" supabase/functions/`
Expected: No matches

If any remain, fix them.

**Step 2: Check .env.example**

If `.env.example` or any docs reference `LOVABLE_API_KEY`, update them. The Supabase secret name changes from `LOVABLE_API_KEY` to `OPENROUTER_API_KEY`.

**Step 3: Update the design doc status**

In `.claude/docs/plans/2026-02-27-lovable-to-openrouter-migration-design.md`, change:
```
**Status:** Approved
```
to:
```
**Status:** Complete
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: complete Lovable → OpenRouter migration cleanup"
```

---

## Post-Migration: Supabase Secret Setup

After all code changes are committed and deployed, the user must:

```bash
# Remove old secret
supabase secrets unset LOVABLE_API_KEY

# Set new secret
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

The `OPENROUTER_API_KEY` value comes from https://openrouter.ai/keys after creating an account.

---

## Summary

| Task | Functions | Risk | Est. |
|------|-----------|------|------|
| 1. Shared AI client | 1 new file | Low | 2 min |
| 2. Simple text batch 1 | 12 functions | Low | 10 min |
| 3. Simple text batch 2 | 8 functions | Low | 8 min |
| 4. Tool-calling functions | 2 functions | Medium | 3 min |
| 5. Vision function | 1 function | Medium | 2 min |
| 6. Image gen (chat completions) | 4 functions | Low | 5 min |
| 7. blog-generate-images refactor | 1 function | Medium | 5 min |
| 8. chat-assistant | 1 function (3 call sites) | High | 10 min |
| 9. Final sweep | codebase-wide | Low | 3 min |

**Total: 9 tasks · 30 functions · ~48 min**
