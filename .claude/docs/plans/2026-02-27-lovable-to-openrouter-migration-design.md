# Lovable → OpenRouter Migration Design

**Date:** 2026-02-27
**Status:** Complete
**Scope:** Migrate ~25 Supabase Edge Functions from Lovable AI Gateway to OpenRouter

## Context

SpearlanceOS uses Lovable's AI gateway (`ai.gateway.lovable.dev`) as an OpenAI-compatible proxy for all AI features. Since the project is no longer on Lovable, this gateway dependency must be replaced. OpenRouter was chosen as the replacement because it's also OpenAI-compatible, minimizing code changes.

## Decision: OpenRouter + Claude for Text, Gemini for Images

- **Text generation**: Switch from `google/gemini-2.5-flash` to `anthropic/claude-sonnet-4-5` via OpenRouter
- **Image generation**: Keep `google/gemini-2.5-flash-image-preview` via OpenRouter (Anthropic has no image gen)
- **Embeddings**: Unchanged — already use OpenAI directly (`text-embedding-3-small`)
- **Transcription**: Unchanged — already use OpenAI directly

## Architecture

### Shared AI Client

Create `supabase/functions/_shared/aiClient.ts`:
- Centralize gateway URL, auth header, model constants
- Export helper functions for common patterns (chat completion, image gen)
- Single place to change if provider changes again

### Gateway URL Change

```
OLD: https://ai.gateway.lovable.dev/v1/chat/completions
NEW: https://openrouter.ai/api/v1/chat/completions

OLD: https://ai.gateway.lovable.dev/v1/images/generations
NEW: https://openrouter.ai/api/v1/images/generations
```

### Env Var Change

```
OLD: LOVABLE_API_KEY (Supabase secret)
NEW: OPENROUTER_API_KEY (Supabase secret)
```

### Model Mapping

| Current | New (OpenRouter) | Used for |
|---------|-----------------|----------|
| `google/gemini-2.5-flash` | `anthropic/claude-sonnet-4-5` | Text generation (~25 sites) |
| `google/gemini-2.5-flash-lite` | `anthropic/claude-sonnet-4-5` | Duda comment analysis |
| `google/gemini-2.5-flash-image-preview` | `google/gemini-2.5-flash-image-preview` | Image gen (~6 sites, unchanged) |
| `claude-sonnet-4-5` | `anthropic/claude-sonnet-4-5` | Blog topics (add OpenRouter prefix) |

## Affected Functions (32 call sites)

### Text Generation (→ claude-sonnet-4-5)
- analyze-asset (vision)
- analyze-lead (tool calling)
- analyze-page-content (tool calling)
- avatar-generate-summary
- avatar-generate-with-ai
- blog-generate-article
- blog-generate-monthly-topics
- blog-generate-outline
- blog-generate-topics (already Claude, just needs prefix)
- chat-assistant (streaming + tool calling, 3 call sites)
- duda-comment-webhook
- generate-ai-report
- generate-avatar-story
- generate-daily-action-plan
- generate-page-content
- launchpad-analyze
- match-avatar-to-content
- recommend-tasks
- send-weekly-performance-emails
- social-bulk-generate-captions
- social-generate-captions
- social-generate-ideas
- social-generate-monthly-topics
- summarize-story

### Image Generation (→ stays gemini-2.5-flash-image-preview)
- avatar-generate-image
- blog-generate-images (uses /v1/images/generations endpoint)
- generate-mood-board
- social-bulk-generate-images
- social-generate-image

### Unchanged (already using OpenAI directly)
- analyze-asset (embeddings via OPENAI_API_KEY)
- recommend-assets (embeddings via OPENAI_API_KEY)
- clarity-generate-weekly-report (gpt-4o-mini via OPENAI_API_KEY)
- transcribe-story (whisper via OPENAI_API_KEY)

## Special Cases

### chat-assistant (~7000 lines)
- Uses **streaming** (`stream: true`) with SSE parsing
- Uses **tool calling** (function calls for KPI queries)
- Has 3 separate AI call sites
- OpenRouter supports both streaming and tool calling in OpenAI format
- Highest risk function — test thoroughly

### blog-generate-images
- Uses `/v1/images/generations` endpoint (not `/v1/chat/completions`)
- Verify OpenRouter supports this endpoint for Gemini image models

### analyze-lead, analyze-page-content
- Use **tool calling** (`tools` parameter + `tool_calls` response parsing)
- OpenRouter maps OpenAI tool calling format to provider-native format

### analyze-asset
- Uses **vision** (image_url content blocks)
- Claude supports vision natively through OpenRouter

## Risk Assessment

- **Low risk**: URL/key/model swaps in simple text generation functions
- **Medium risk**: Tool calling functions (format compatibility)
- **High risk**: chat-assistant (streaming + tool calling + complexity)
- **Unknown**: `/v1/images/generations` endpoint support on OpenRouter

## Success Criteria

- All text generation functions return valid responses via OpenRouter + Claude
- Image generation continues working via OpenRouter + Gemini
- Chat assistant streams correctly with tool calling
- No LOVABLE_API_KEY references remain in codebase
