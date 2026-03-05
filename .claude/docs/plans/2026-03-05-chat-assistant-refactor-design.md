# Chat Assistant Refactor Design

**Date:** 2026-03-05
**Status:** Approved
**Scope:** Refactor 6,879-line monolith into modular architecture + add confirm-first action system

## Context

The `chat-assistant` edge function is a single 6,879-line file containing ~30 tool functions, tool definitions, system prompts, hallucination detection, validation, and streaming logic. This caused:
- Duplicate tool names (broke Claude API)
- Impossible to audit or extend
- No separation between read (query) and write (action) operations

The chat widget frontend has minor issues (N+1 profile queries, untyped data) but is structurally sound.

## Goals

1. **Stabilize:** Split monolith into modules, deduplicate tools, fix streaming
2. **Extend:** Add confirm-first action pattern for write operations
3. **Enable future:** Architecture that makes adding vector RAG and new tools trivial

## Architecture

### Backend — Modular Edge Function

```
supabase/functions/chat-assistant/
├── index.ts                  — entry point (~150 lines)
├── config.ts                 — CORS headers, constants
├── prompts/
│   ├── system.ts             — system prompt builder (per-mode: default, offer, launchpad)
│   └── personalization.ts    — expertise/communication style guidelines
├── tools/
│   ├── registry.ts           — SINGLE source of truth for ALL tool schemas
│   ├── executor.ts           — name -> function dispatch + confirm-first gate
│   │
│   ├── queries/              — READ tools (execute immediately)
│   │   ├── client-info.ts    — get_client_info, assess_account_status
│   │   ├── tasks.ts          — get_tasks, search_tasks
│   │   ├── social.ts         — get_social_media_posts, get_social_post_analytics
│   │   ├── analytics.ts      — get_website_analytics, get_channel_kpis, get_clarity_metrics, get_seo_performance
│   │   ├── content.ts        — get_page_analysis, get_form_submissions, get_reports
│   │   ├── meetings.ts       — get_meetings, search_meeting_notes
│   │   ├── assets.ts         — search_assets, get_services, get_avatars, get_marketing_tools, get_marketing_channels
│   │   └── communication.ts  — get_communication_logs, get_tickets
│   │
│   └── actions/              — WRITE tools (confirm-first pattern)
│       ├── task-actions.ts   — create, assign, update, complete tasks
│       ├── social-actions.ts — draft post, schedule, generate caption/image
│       ├── email-actions.ts  — draft email, send, create follow-up sequence
│       └── content-actions.ts— generate outline, create brief, trigger page analysis
│
├── streaming/
│   ├── consumer.ts           — OpenRouter stream -> tool calls + text accumulation
│   └── producer.ts           — SSE response construction back to client
├── validation/
│   ├── hallucination.ts      — post-processing hallucination detection patterns
│   ├── data-integrity.ts     — count verification, entity ID validation
│   └── sanitize.ts           — prompt injection sanitization
├── middleware/
│   ├── auth.ts               — user auth + client access check + role extraction
│   ├── rate-limit.ts         — per-user rate limiting
│   └── logging.ts            — tool call audit logging
└── marketing-knowledge.ts    — (existing, unchanged)
```

### Key Design Decision: registry.ts

Single file containing every tool definition (JSON schema). No tool can be defined anywhere else. The executor imports from registry and dispatches to the correct handler. This eliminates duplicate tool names permanently.

```typescript
// tools/registry.ts
export const QUERY_TOOLS = [ /* all read-only tool schemas */ ];
export const ACTION_TOOLS = [ /* all write tool schemas */ ];
export const LAUNCHPAD_TOOLS = [ /* launchpad-specific tools */ ];

export function getToolsForMode(mode: 'default' | 'offer' | 'launchpad'): ToolDefinition[] {
  const base = [...QUERY_TOOLS, ...ACTION_TOOLS];
  if (mode === 'launchpad') return [...base, ...LAUNCHPAD_TOOLS];
  return base;
}
```

### Confirm-First Action Pattern

Write actions return a pending_action instead of executing immediately:

```typescript
// When AI calls a write tool:
{
  type: "pending_action",
  action: "create_task",
  confirm_id: "action_abc123",
  preview: {
    title: "Update homepage",
    due_date: "2026-03-07",
    assignee: "Garrett Handley",
    priority: "medium"
  }
}
```

Frontend renders an ActionCard component with Confirm / Edit / Cancel buttons.

On confirm, frontend calls: `POST /chat-assistant { action: "confirm", confirm_id: "action_abc123" }`

The edge function stores pending actions in a `chat_pending_actions` table with a 10-minute TTL.

### Frontend Changes

| Change | File | Why |
|--------|------|-----|
| Lift user profile fetch | useChatbot.ts | Fetch once, pass as prop to ChatMessage |
| ActionCard component | chatbot/ActionCard.tsx | Renders pending actions with confirm/edit/cancel |
| Type StructuredData | types.ts | Discriminated union replacing `any` |
| Better error display | ChatMessage.tsx | Show provider errors, retry with backoff |
| Handle pending_action responses | useChatbot.ts | Parse action responses, render ActionCard |

### Data Model

New table for pending actions:

```sql
CREATE TABLE chat_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirm_id TEXT UNIQUE NOT NULL,
  conversation_id UUID REFERENCES chat_conversations(id),
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes')
);
```

## Phasing

### Phase 1: Stabilize (this session)
- Split index.ts into modules
- Create registry.ts with deduplicated tool definitions
- Create executor.ts with clean dispatch
- Move all tool functions into query files
- Move validation, streaming, middleware into their directories
- Move prompts into prompts/
- Deploy and verify chat works end-to-end

### Phase 2: Confirm-First Actions (follow-up)
- Create chat_pending_actions table
- Build action tool handlers (task, social, email, content)
- Add confirm/cancel endpoint to index.ts
- Build ActionCard frontend component
- Wire up confirm flow in useChatbot

### Phase 3: Vector RAG (future)
- Add tools/knowledge/ directory with embedding search
- Pipe business docs, past conversations into vector store
- Add knowledge retrieval as a tool the AI can call

## Success Criteria

- Chat responds correctly to queries (no regressions from current behavior)
- No duplicate tool names possible (enforced by registry pattern)
- Each tool file is under 200 lines
- index.ts is under 200 lines
- All existing tool functions work identically after refactor

## Risks

- **Deno import resolution:** Edge functions need relative imports. All modules must use `./` paths.
- **Deploy size:** Supabase bundles all imported files. Shouldn't be an issue but verify.
- **Behavioral regression:** Tool dispatch must map 1:1 to current switch/case logic. Test each tool.
