# Chat Assistant Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Split the 6,879-line chat-assistant monolith into clean modules with a tool registry pattern, eliminating duplicate tool bugs and enabling future extensibility.

**Architecture:** Extract the single index.ts into ~15 focused modules organized by concern (tools/queries, tools/actions, streaming, validation, middleware, prompts). A central registry.ts owns all tool definitions — no tool can be defined elsewhere. The executor maps tool names to handler functions.

**Tech Stack:** Deno (Supabase Edge Functions), OpenRouter API, Supabase JS client, SSE streaming

**Design doc:** `.claude/docs/plans/2026-03-05-chat-assistant-refactor-design.md`

---

## Phase 1: Extract Modules (Stabilize)

### Task 1: Create config.ts and middleware modules

**Files:**
- Create: `supabase/functions/chat-assistant/config.ts`
- Create: `supabase/functions/chat-assistant/middleware/auth.ts`
- Create: `supabase/functions/chat-assistant/middleware/rate-limit.ts`
- Create: `supabase/functions/chat-assistant/middleware/logging.ts`

**Step 1: Create config.ts**

Extract CORS headers and constants from index.ts:

```typescript
// config.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Step 2: Create middleware/auth.ts**

Extract the auth + client access check + profile fetch logic (index.ts lines ~3624-3713). This function takes the request and supabase client, returns `{ user, profile, userRole, userContext }` or throws.

**Step 3: Create middleware/rate-limit.ts**

Extract `checkRateLimit` function (index.ts lines ~211-252).

**Step 4: Create middleware/logging.ts**

Extract `logToolCall` function (index.ts lines ~253-278).

**Step 5: Verify imports work**

Run: `deno check supabase/functions/chat-assistant/config.ts`

**Step 6: Commit**

```bash
git add supabase/functions/chat-assistant/config.ts supabase/functions/chat-assistant/middleware/
git commit -m "refactor(chat): extract config and middleware modules"
```

---

### Task 2: Create validation modules

**Files:**
- Create: `supabase/functions/chat-assistant/validation/sanitize.ts`
- Create: `supabase/functions/chat-assistant/validation/hallucination.ts`
- Create: `supabase/functions/chat-assistant/validation/data-integrity.ts`

**Step 1: Create validation/sanitize.ts**

Extract `sanitizeDataForPrompt` function (index.ts lines ~83-118) and `redactForRole` function (lines ~53-80).

**Step 2: Create validation/hallucination.ts**

Extract the hallucination detection pattern system (index.ts lines ~6107-6170). Export a function:

```typescript
export function detectHallucinations(
  assistantMessage: string,
  functionCallsArray: FunctionCall[]
): { warnings: string[]; modifiedMessage: string; wasModified: boolean }
```

**Step 3: Create validation/data-integrity.ts**

Extract the post-execution validation logic (index.ts lines ~6418-6700). This includes entity ID validation, count verification, and function failure detection.

**Step 4: Commit**

```bash
git add supabase/functions/chat-assistant/validation/
git commit -m "refactor(chat): extract validation modules"
```

---

### Task 3: Create prompts modules

**Files:**
- Create: `supabase/functions/chat-assistant/prompts/personalization.ts`
- Create: `supabase/functions/chat-assistant/prompts/system.ts`

**Step 1: Create prompts/personalization.ts**

Extract `getExpertiseGuidelines` and `getCommunicationGuidelines` (index.ts lines ~13-50).

**Step 2: Create prompts/system.ts**

Extract the system prompt builders. There are 3 modes:
- Default chat mode (the massive system prompt with all the behavior guidelines)
- Offer mode (GSO workflow)
- LaunchPad mode (onboarding conversation)

Export: `buildSystemPrompt(mode, context)` where context includes client info, user profile, historical context, etc.

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/prompts/
git commit -m "refactor(chat): extract prompt builders"
```

---

### Task 4: Create query tool modules

**Files:**
- Create: `supabase/functions/chat-assistant/tools/queries/client-info.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/tasks.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/social.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/analytics.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/content.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/meetings.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/assets.ts`
- Create: `supabase/functions/chat-assistant/tools/queries/communication.ts`

**Step 1: Create each query module**

Move functions from index.ts into their domain files. Each file exports its handler functions:

| File | Functions from index.ts |
|------|------------------------|
| `client-info.ts` | `getClientInfo` (~605-630), `assessAccountStatus` (~2620-2698) |
| `tasks.ts` | `getTasks` (~1951-2060), `searchTasks` (~631-661), `createGeneralTask` (~1790-1860), `updateTask` (~1861-1950), `createTaskFromSubmission` (~1699-1789), `createEmailTask` (~1621-1698) |
| `social.ts` | `getSocialMediaPosts` (~1178-1235), `getSocialPostAnalytics` (~1236-1295) |
| `analytics.ts` | `getWebsiteAnalytics` (~1296-1490), `getChannelKPIs` (~2061-2216), `getClarityMetrics` (~2217-2380), `getSEOPerformance` (~2381-2537) |
| `content.ts` | `getPageAnalysis` (~2538-2598), `getFormSubmissions` (~1114-1177), `getReports` (~662-691), form parsing helpers (~999-1113) |
| `meetings.ts` | `getMeetings` (~875-912), `searchMeetingNotes` (~913-929) |
| `assets.ts` | `searchAssets` (~823-849), `getServices` (~692-706), `getAvatars` (~707-727), `getMarketingTools` (~728-742), `getMarketingChannels` (~743-784) |
| `communication.ts` | `getCommunicationLogs` (~930-998), `getTickets` (~850-874) |

Also extract into query files:
- `draftEmail` → content.ts (it generates email text, read-adjacent)
- `extractLaunchpadData`, `gatherGSOInputs`, `createOrUpdateOfferDraft`, `deepMerge` → Create `supabase/functions/chat-assistant/tools/queries/launchpad.ts`
- `fetchConversationHistory` → Create `supabase/functions/chat-assistant/tools/queries/history.ts`

**Step 2: Verify each module compiles**

```bash
deno check supabase/functions/chat-assistant/tools/queries/client-info.ts
# repeat for each file
```

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/tools/
git commit -m "refactor(chat): extract query tool handlers into domain modules"
```

---

### Task 5: Create tool registry and executor

**Files:**
- Create: `supabase/functions/chat-assistant/tools/registry.ts`
- Create: `supabase/functions/chat-assistant/tools/executor.ts`

**Step 1: Create registry.ts**

Move ALL tool definitions from index.ts into a single registry. Export:

```typescript
import type { ToolDefinition } from './types.ts';

export const QUERY_TOOLS: ToolDefinition[] = [
  // Every tool definition, organized by domain, with comments
];

export const LAUNCHPAD_TOOLS: ToolDefinition[] = [
  // extract_launchpad_data, gather_gso_inputs
];

export function getToolsForMode(mode: 'default' | 'offer' | 'launchpad'): ToolDefinition[] {
  if (mode === 'launchpad') return [...QUERY_TOOLS, ...LAUNCHPAD_TOOLS];
  return QUERY_TOOLS;
}
```

Add a build-time assertion at the bottom of registry.ts:

```typescript
// Compile-time duplicate check
const allNames = [...QUERY_TOOLS, ...LAUNCHPAD_TOOLS].map(t => t.function.name);
const dupes = allNames.filter((n, i) => allNames.indexOf(n) !== i);
if (dupes.length > 0) throw new Error(`Duplicate tool names: ${dupes.join(', ')}`);
```

**Step 2: Create executor.ts**

Build the dispatch map:

```typescript
import { getClientInfo, assessAccountStatus } from './queries/client-info.ts';
import { getTasks, searchTasks, createGeneralTask, updateTask, createTaskFromSubmission, createEmailTask } from './queries/tasks.ts';
// ... all imports

type ExecutorContext = {
  supabase: any;
  clientId: string;
  userId: string;
  userRole: string;
  submissionId: string | null;
};

const TOOL_HANDLERS: Record<string, (ctx: ExecutorContext, args: any) => Promise<any>> = {
  get_client_info: (ctx) => getClientInfo(ctx.supabase, ctx.clientId),
  assess_account_status: (ctx) => assessAccountStatus(ctx.supabase, ctx.clientId),
  get_tasks: (ctx, args) => getTasks(ctx.supabase, args, ctx.clientId, ctx.userId),
  search_tasks: (ctx, args) => searchTasks(ctx.supabase, args, ctx.clientId, ctx.userRole),
  // ... every tool
};

export async function executeTool(name: string, ctx: ExecutorContext, args: any): Promise<any> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { error: 'Unknown function' };
  return handler(ctx, args);
}
```

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/tools/
git commit -m "refactor(chat): add tool registry and executor with duplicate detection"
```

---

### Task 6: Create streaming modules

**Files:**
- Create: `supabase/functions/chat-assistant/streaming/consumer.ts`
- Create: `supabase/functions/chat-assistant/streaming/producer.ts`

**Step 1: Create streaming/consumer.ts**

Extract the Phase 1 stream reading logic (index.ts lines ~5869-6074). Export:

```typescript
export interface FunctionCall {
  id: string;
  name: string;
  arguments: string;
}

export async function consumeStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<{
  assistantMessage: string;
  functionCalls: FunctionCall[];
}>
```

**Step 2: Create streaming/producer.ts**

Extract the SSE response construction (the ReadableStream creation at lines ~6979-6993 and the direct passthrough at lines ~6935-6942). Export:

```typescript
export function createSSEResponse(content: string, corsHeaders: Record<string, string>): Response
export function passthrough(body: ReadableStream, corsHeaders: Record<string, string>): Response
```

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/streaming/
git commit -m "refactor(chat): extract streaming consumer and producer"
```

---

### Task 7: Rewrite index.ts as thin orchestrator

**Files:**
- Modify: `supabase/functions/chat-assistant/index.ts` (rewrite from ~6879 lines to ~200 lines)

**Step 1: Rewrite index.ts**

The new index.ts is a thin orchestrator that:
1. Handles CORS preflight
2. Calls `authenticate()` from middleware/auth.ts
3. Calls `checkRateLimit()` from middleware/rate-limit.ts
4. Builds system prompt via `buildSystemPrompt()` from prompts/system.ts
5. Gets tools via `getToolsForMode()` from tools/registry.ts
6. Makes first AI call (streaming) to OpenRouter
7. Consumes stream via `consumeStream()` from streaming/consumer.ts
8. Runs hallucination detection via `detectHallucinations()` from validation/hallucination.ts
9. If tool calls: executes via `executeTool()` from tools/executor.ts with pre-execution validation
10. Makes second AI call if needed
11. Returns response via streaming/producer.ts

All the inline validation (assignee_id check, task_id UUID check, etc.) moves into executor.ts as pre-execution validators.

**Step 2: Deploy and test**

```bash
npx supabase functions deploy chat-assistant --no-verify-jwt
```

Test by sending a message in the chat UI. Verify:
- Chat responds with text
- Tool calls work (ask "how many tasks do I have?")
- LaunchPad mode still works
- Offer mode still works

**Step 3: Commit**

```bash
git add supabase/functions/chat-assistant/
git commit -m "refactor(chat): rewrite index.ts as thin orchestrator importing all modules"
```

---

### Task 8: Frontend cleanup

**Files:**
- Modify: `src/components/chatbot/useChatbot.ts`
- Modify: `src/components/chatbot/ChatMessage.tsx`
- Modify: `src/components/chatbot/types.ts`

**Step 1: Lift user profile to useChatbot**

Move the `useEffect` that fetches user profile from ChatMessage.tsx into useChatbot.ts. Add `userProfile` to the hook return value.

**Step 2: Pass userProfile as prop to ChatMessage**

Update ChatMessage to accept `userProfile` as a prop instead of fetching it internally. Remove the `useEffect`, `useState`, and supabase import for profile fetching.

**Step 3: Type StructuredData properly**

In types.ts, replace `data?: any` with a discriminated union:

```typescript
export type StructuredData =
  | { type: 'task'; items: Task[] }
  | { type: 'meeting'; items: Meeting[] }
  | { type: 'pending_action'; action: string; confirm_id: string; preview: Record<string, any> }
  // ... etc
```

**Step 4: Commit**

```bash
git add src/components/chatbot/
git commit -m "refactor(chat): lift user profile, type structured data"
```

---

### Task 9: Deploy and verify end-to-end

**Step 1: Deploy edge function**

```bash
npx supabase functions deploy chat-assistant --no-verify-jwt
```

**Step 2: Verify in browser**

Test each scenario:
- [ ] Send a basic chat message, get AI response
- [ ] Ask about tasks (triggers tool call)
- [ ] Ask about analytics (triggers different tool)
- [ ] Check error handling (provider errors show meaningful message)
- [ ] Verify user avatar shows correctly in chat

**Step 3: Check function logs**

Open Supabase Dashboard -> Edge Functions -> chat-assistant -> Logs. Verify no errors.

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor(chat): complete modular refactor - verified end-to-end"
```

---

## Task Dependency Map

```
Task 1 (config + middleware) ──┐
Task 2 (validation)           ├── Task 7 (rewrite index.ts) ── Task 9 (deploy + verify)
Task 3 (prompts)              │
Task 4 (query tools)          │
Task 5 (registry + executor)  ─┘
Task 6 (streaming)            ─┘
Task 8 (frontend cleanup)     ─────────────────────────────── Task 9
```

Tasks 1-6 are independent of each other and can be parallelized.
Task 7 depends on all of 1-6.
Task 8 is independent of backend work.
Task 9 depends on 7 and 8.
