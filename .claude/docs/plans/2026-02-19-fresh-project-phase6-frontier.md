# Fresh Project System — Phase 6: Frontier

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 5 reference skills covering AI integration, additional frontend frameworks, and mobile development — the frontier technologies that round out full greenfield coverage.

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle. No new agents needed — AI skills route through backend-guide, frontend frameworks through frontend-dev-guide, mobile through a future mobile-guide (or standalone for now).

**Tech Stack:** Vercel AI SDK, Anthropic API, React (Vite), SvelteKit, Expo/React Native

**Depends on:** Phase 1 complete

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: vercel-ai-sdk

**Files:**
- Create: `.claude/skills/vercel-ai-sdk/SKILL.md`
- Create: `.claude/skills/vercel-ai-sdk/reference.md`
- Create: `.claude/skills/vercel-ai-sdk/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: vercel-ai-sdk
description: Use when integrating AI/LLM features with the Vercel AI SDK — streaming responses, tool calling, multi-provider support, or building chat interfaces. Also use when building AI-powered features in Next.js or React applications.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up the Vercel AI SDK with Anthropic (Claude) in a Next.js App Router project. Show me: the route handler for streaming, the useChat hook on the client, and how to configure the Anthropic provider."

**Q2 (Common Operation):** "Build a chat interface with the AI SDK that supports: streaming responses, tool calling (the AI can search a database and call APIs), message history, and error handling. Show me: the API route with tools defined, the React component with useChat, and how tool results are rendered."

**Q3 (Gotcha/Limits):** "What are the Vercel AI SDK gotchas? Cover: the difference between generateText and streamText, the token counting issue (no built-in token limit enforcement), the provider abstraction (switching between OpenAI and Anthropic), and edge runtime compatibility."

**Q4 (Recent Change):** "What's new in the Vercel AI SDK in 2025-2026? Cover: AI SDK 4.x changes, the new tool calling API, structured output (generateObject), multi-modal support, and any provider-specific features."

### Research queries:
- `"Vercel AI SDK" changelog 2025 2026`
- `"Vercel AI SDK" Anthropic Claude setup`
- `"Vercel AI SDK" tool calling function calling`
- `"Vercel AI SDK" streaming Next.js App Router`
- `"Vercel AI SDK" generateObject structured output`
- `site:sdk.vercel.ai` — verify via WebFetch

### reference.md sections:
1. Setup (installation, provider configuration: Anthropic, OpenAI, Google)
2. Core Functions (generateText, streamText, generateObject, streamObject)
3. Chat (useChat hook, messages, system prompt, stopping)
4. Streaming (StreamingTextResponse, data stream protocol)
5. Tool Calling (defineTool, tool execution, rendering tool results)
6. Structured Output (generateObject, Zod schema, streaming objects)
7. Multi-Modal (images, PDFs, audio input)
8. Completion (useCompletion for single-turn)
9. Provider Abstraction (switching providers, custom providers)
10. Error Handling (retry, fallback, rate limiting)
11. Edge Runtime Considerations
12. Common Mistakes

---

## Task 2: anthropic-api

**Files:**
- Create: `.claude/skills/anthropic-api/SKILL.md`
- Create: `.claude/skills/anthropic-api/reference.md`
- Create: `.claude/skills/anthropic-api/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: anthropic-api
description: Use when integrating Claude via the Anthropic API — messages, tool use, vision, streaming, or building AI features. Also use when working with the Anthropic SDK, managing API keys, or optimizing Claude API usage.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up the Anthropic TypeScript SDK in a Node.js project. Show me: API key configuration, sending a basic message to Claude, streaming a response, and handling the response types."

**Q2 (Common Operation):** "Build an AI assistant with the Anthropic API that: has a system prompt defining its role, maintains conversation history, uses tool calling to search a product database and check inventory, and streams responses. Show me the full implementation."

**Q3 (Gotcha/Limits):** "What are the Anthropic API gotchas? Cover: rate limits per tier, the token counting difference between input and output, the difference between Claude model IDs (claude-sonnet-4-6 vs claude-haiku-4-5-20251001), message format requirements, and cost optimization strategies."

**Q4 (Recent Change):** "What's new in the Anthropic API and Claude models in 2025-2026? Cover: Claude 4 family (Opus, Sonnet, Haiku), extended thinking, tool use improvements, the Messages Batches API, and any pricing changes."

### Research queries:
- `"Anthropic API" changelog 2025 2026`
- `"Anthropic" Claude API tool use function calling`
- `"Anthropic API" pricing rate limits 2026`
- `"Anthropic" TypeScript SDK streaming`
- `"Claude" model comparison Opus Sonnet Haiku`
- `site:docs.anthropic.com` — verify via WebFetch

### reference.md sections:
1. Setup (SDK installation, API key, client initialization)
2. Messages API (create, system prompt, conversation turns)
3. Streaming (event stream, delta handling, token counting)
4. Tool Use (defining tools, handling tool_use blocks, tool results)
5. Vision (image input, PDF support, base64 vs URL)
6. Extended Thinking (thinking blocks, budget control)
7. Models (Opus 4.6, Sonnet 4.6, Haiku 4.5 — capabilities, pricing, when to use each)
8. Batches API (Messages Batches for bulk processing)
9. Rate Limits & Pricing (per-tier limits, cost optimization)
10. Error Handling (rate limits, overloaded, invalid request)
11. Common Mistakes

---

## Task 3: react-vite

**Files:**
- Create: `.claude/skills/react-vite/SKILL.md`
- Create: `.claude/skills/react-vite/reference.md`
- Create: `.claude/skills/react-vite/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: react-vite
description: Use when building React SPAs with Vite — project setup, routing, bundling, or development server configuration. Also use when a project needs React without Next.js server-side features, or when building dashboards, admin panels, or embedded apps.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up a React + TypeScript project with Vite. Show me: project creation, adding path aliases, configuring environment variables, and the recommended project structure for a medium-sized SPA."

**Q2 (Common Operation):** "Build a React SPA with Vite that has: React Router v7 for routing (with layout routes and protected routes), code splitting with lazy loading, and environment-based API URL configuration. Show me the router setup, a layout component, and the auth guard pattern."

**Q3 (Gotcha/Limits):** "What are the Vite + React gotchas? Cover: the difference between Vite and CRA/Next.js (no SSR by default), environment variable naming (VITE_ prefix), the proxy configuration for API calls during development, and bundle analysis/optimization."

**Q4 (Recent Change):** "What's new in Vite 6 (or latest) and how does it affect React projects? Cover: the new Environment API, Rolldown integration, React Compiler support, and any breaking changes."

### Research queries:
- `"Vite 6" changelog 2025 2026`
- `"Vite" React TypeScript setup 2026`
- `"React Router v7" setup Vite`
- `"Vite" proxy configuration API`
- `"Vite" vs Next.js when to use SPA`
- `site:vite.dev` — verify via WebFetch

### reference.md sections:
1. Setup (create vite, TypeScript, path aliases)
2. Project Structure (recommended layout for SPAs)
3. Routing (React Router v7 — routes, layouts, loaders, actions)
4. Code Splitting (React.lazy, Suspense, route-based splitting)
5. Environment Variables (VITE_ prefix, modes, .env files)
6. API Proxy (vite.config.ts proxy for development)
7. Styling (Tailwind, CSS Modules, styled-components — all work)
8. Building & Optimization (rollup options, chunk splitting, analysis)
9. Testing (Vitest integration, MSW for API mocking)
10. Deployment (static hosting, SPA fallback for routing)
11. When to Use React+Vite vs Next.js
12. Common Mistakes

---

## Task 4: sveltekit

**Files:**
- Create: `.claude/skills/sveltekit/SKILL.md`
- Create: `.claude/skills/sveltekit/reference.md`
- Create: `.claude/skills/sveltekit/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: sveltekit
description: Use when building web applications with SvelteKit — routing, server-side rendering, form actions, or load functions. Also use when choosing between SvelteKit and Next.js or building a full-stack Svelte application.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up a SvelteKit project with TypeScript, Tailwind CSS, and a basic layout. Show me: project creation, the routing convention (+page.svelte, +layout.svelte, +server.ts), and how to add a header/footer layout."

**Q2 (Common Operation):** "Build a full-stack CRUD app with SvelteKit: a page that loads data from a database (Prisma), a form that submits via SvelteKit form actions, and proper error/loading states. Show me: +page.server.ts (load + actions), +page.svelte, and the Prisma integration."

**Q3 (Gotcha/Limits):** "What are the SvelteKit gotchas? Cover: the difference between +page.ts and +page.server.ts (universal vs server load), form actions vs API routes, the $app/environment module, and how SvelteKit handles auth (no middleware equivalent — use hooks.server.ts)."

**Q4 (Recent Change):** "What's new in SvelteKit and Svelte 5 in 2025-2026? Cover: runes (signals-based reactivity), the $state/$derived/$effect paradigm, SvelteKit 2.x changes, and any breaking changes from Svelte 4."

### Research queries:
- `"SvelteKit" changelog 2025 2026`
- `"Svelte 5" runes signals reactivity`
- `"SvelteKit" form actions server-side`
- `"SvelteKit" authentication hooks.server.ts`
- `"SvelteKit" vs Next.js comparison 2026`
- `site:svelte.dev/docs/kit` — verify via WebFetch

### reference.md sections:
1. Setup (create svelte, TypeScript, Tailwind)
2. Routing (+page, +layout, +server, +error, grouping)
3. Load Functions (+page.ts, +page.server.ts, +layout.server.ts)
4. Form Actions (default actions, named actions, progressive enhancement)
5. Svelte 5 Runes ($state, $derived, $effect, $props)
6. Components (Svelte syntax, slots, events, bindings)
7. Hooks (hooks.server.ts — handle, handleFetch, handleError)
8. API Routes (+server.ts — GET, POST, PUT, DELETE)
9. Stores & State (Svelte stores, context, $state)
10. Deployment (adapters: auto, node, static, vercel, cloudflare)
11. SvelteKit vs Next.js (decision guide)
12. Common Mistakes

---

## Task 5: expo-react-native

**Files:**
- Create: `.claude/skills/expo-react-native/SKILL.md`
- Create: `.claude/skills/expo-react-native/reference.md`
- Create: `.claude/skills/expo-react-native/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: expo-react-native
description: Use when building mobile apps with Expo and React Native — project setup, navigation, native APIs, or building for iOS and Android. Also use when choosing between Expo and bare React Native or deploying mobile apps.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up an Expo project with TypeScript and file-based routing (Expo Router). Show me: project creation, the app directory structure, basic navigation (tabs + stack), and running on iOS simulator and Android emulator."

**Q2 (Common Operation):** "Build a mobile app screen with Expo that: fetches data from an API, displays it in a scrollable list with pull-to-refresh, has a search bar with debounced filtering, and navigates to a detail screen on tap. Include the styling with React Native's StyleSheet."

**Q3 (Gotcha/Limits):** "What are the Expo gotchas? Cover: the difference between Expo Go and development builds (custom native modules), EAS Build vs local builds, the new architecture (Fabric, TurboModules), and which native APIs need a development build vs work in Expo Go."

**Q4 (Recent Change):** "What's new in Expo SDK 52+ and React Native in 2025-2026? Cover: Expo Router v4, the new architecture being default, React Native 0.76+, and EAS improvements."

### Research queries:
- `"Expo SDK" changelog 2025 2026`
- `"Expo Router" file-based routing setup`
- `"React Native" new architecture 2026`
- `"Expo" vs bare React Native comparison`
- `"EAS Build" pricing 2026`
- `site:docs.expo.dev` — verify via WebFetch

### reference.md sections:
1. Setup (create-expo-app, TypeScript, project structure)
2. Expo Router (file-based routing, layouts, tabs, stack, modals)
3. Components (View, Text, ScrollView, FlatList, Pressable, Image)
4. Styling (StyleSheet, responsive patterns, platform-specific)
5. Navigation Patterns (tab bar, drawer, stack, deep linking)
6. Native APIs (Camera, Location, Notifications, Haptics, Secure Store)
7. Data Fetching (fetch, TanStack Query, SWR patterns)
8. State Management (Zustand, Context, AsyncStorage)
9. Development Builds vs Expo Go
10. EAS (Build, Submit, Update — OTA updates)
11. Deployment (App Store, Google Play, TestFlight)
12. Common Mistakes

---

## Task 6: Update skills.json with Phase 6 skills + bundles

**Files:**
- Modify: `skills.json`

**New bundles:**
```json
"ai": {
  "name": "AI Integration",
  "description": "Vercel AI SDK + Anthropic API — build AI features into any app",
  "default": false,
  "skills": ["vercel-ai-sdk", "anthropic-api"]
},
"mobile": {
  "name": "Mobile Development",
  "description": "Expo + React Native — cross-platform mobile apps",
  "default": false,
  "skills": ["expo-react-native"]
}
```

**Add react-vite and sveltekit to frontend-dev bundle:**
```json
"frontend-dev": {
  "name": "Frontend Development",
  "description": "Tailwind v4, shadcn/ui, Next.js, Astro, React+Vite, SvelteKit, Framer Motion, GSAP, responsive design, accessibility",
  "default": false,
  "skills": ["tailwind-css", "shadcn-ui", "nextjs", "astro", "react-vite", "sveltekit", "framer-motion", "gsap", "responsive-design", "accessibility"]
}
```

**Commit:**
```bash
git add skills.json
git commit -m "feat: register Phase 6 frontier skills and bundles"
```

---

## Task 7: Final integration — update stack-recommender + CLAUDE.md

**Files:**
- Modify: `.claude/skills/stack-recommender/reference.md`
- Modify: `.claude/CLAUDE.md`

### Step 1: Update stack-recommender reference

Update the technology selection matrices in stack-recommender/reference.md to include ALL skills from Phases 2-6. The decision framework should now reference every pre-written skill.

### Step 2: Update CLAUDE.md template

Add all new skill categories to the CLAUDE.md template so projects that install armadillo see the full skill list.

### Step 3: Update armadillo-shepherd routing table

Add routing entries for ALL new skills to the shepherd's routing table.

**Commit:**
```bash
git add .claude/skills/stack-recommender/reference.md .claude/CLAUDE.md .claude/skills/armadillo-shepherd/SKILL.md
git commit -m "feat: update stack-recommender, CLAUDE.md, and shepherd with all Phase 2-6 skills"
```

---

## Task 8: End-to-end test — full fresh-project flow

Create a comprehensive test that validates the entire fresh-project system works with the full skill set:

1. Empty directory → onboarding detects greenfield
2. Discovery conversation → PROJECT.md
3. Stack recommendation → stack.json (using real skills from all phases)
4. Scaffold → working project
5. Planning → implementation plan
6. Verify all bundles auto-install based on stack.json

**Files:**
- Create: `.claude/tests/fresh-project/test-e2e-full-stack.sh`

**Commit:**
```bash
git add .claude/tests/fresh-project/
git commit -m "test: add end-to-end fresh-project flow test"
```

---

## Summary

| Task | Skill | Type |
|------|-------|------|
| 1 | vercel-ai-sdk | Reference (TDD) |
| 2 | anthropic-api | Reference (TDD) |
| 3 | react-vite | Reference (TDD) |
| 4 | sveltekit | Reference (TDD) |
| 5 | expo-react-native | Reference (TDD) |
| 6 | skills.json update | Registry |
| 7 | Integration updates | Stack-rec + CLAUDE.md + shepherd |
| 8 | E2E test | Full flow validation |

8 tasks · executing subagent-driven

**Parallelizable:** Tasks 1-2 (AI) in parallel. Tasks 3-4 (frameworks) in parallel. Task 5 independent. Tasks 6-8 sequential after all skills.

---

## Phase 6 Complete = System Complete

After Phase 6:

```
Pre-written reference skills:  54 (24 existing + 30 new)
Workflow skills:                22 (19 existing + 3 new)
Agents:                         14 (9 existing + 5 new)
Bundles:                        23 (9 existing + 14 new)
Hooks:                          8 (modified, not new)
Rules:                          6 (5 existing + 1 new)

Coverage: ~95% of greenfield projects use only pre-written skills
Remaining ~5%: on-demand generation via writing-reference-skills
```

```
[████████████] 6/6 phases complete

● ahh, that felt good didn't it?
```
