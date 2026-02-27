# Fresh Project System — Phase 4: DX Layer

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 7 reference skills covering the "developer experience" layer — validation, state management, forms, monitoring, and linting. These are the tools that make projects feel solid.

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle. No new agents needed — these skills are consumed directly or through existing agents (frontend-dev-guide for client-side state/forms, backend-guide for validation).

**Tech Stack:** Zod, React Hook Form, Zustand, TanStack Query, Sentry, PostHog, ESLint + Prettier

**Depends on:** Phase 1 complete

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: zod

**Files:**
- Create: `.claude/skills/zod/SKILL.md`
- Create: `.claude/skills/zod/reference.md`
- Create: `.claude/skills/zod/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: zod
description: Use when working with Zod for schema validation — form validation, API input parsing, environment variable validation, or TypeScript type inference from schemas. Also use when choosing a validation library or debugging Zod type errors.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Zod in a TypeScript project. Show me: basic schemas for common types (user, product, API response), type inference with z.infer, and how to use Zod with environment variables (a .env validation schema)."

**Q2 (Common Operation):** "Build a complex Zod schema for a multi-step form: personal info (name, email, phone with format validation), address (with optional fields), and payment (card number with Luhn check, expiry, CVV). Show me: the schema, custom error messages, and how to validate partial data for each step."

**Q3 (Gotcha/Limits):** "What are the Zod gotchas? Cover: the performance impact of complex schemas, the difference between .parse() and .safeParse(), recursive types, branded types, and how to handle union discrimination properly."

**Q4 (Recent Change):** "What's new in Zod 4 (if released) or the latest Zod 3.x? Cover any new validators, performance improvements, and the ecosystem (zod-to-json-schema, @hookform/resolvers)."

### Research queries:
- `"Zod" changelog 2025 2026 new features`
- `"Zod 4" release OR "Zod 3" latest`
- `"Zod" TypeScript best practices`
- `"Zod" environment variables validation`
- `"Zod" React Hook Form integration`
- `site:zod.dev` — verify via WebFetch

### reference.md sections:
1. Primitives (string, number, boolean, date, enums, literals)
2. Objects & Arrays (shape, partial, pick, omit, extend, merge)
3. Unions & Discriminated Unions
4. Refinements & Transforms (custom validation, preprocessing)
5. Error Handling (custom messages, error map, formatting)
6. Type Inference (z.infer, z.input, z.output)
7. Environment Validation Pattern
8. Form Integration (React Hook Form resolver, multi-step forms)
9. API Validation (tRPC input, Express middleware)
10. Advanced (recursive types, branded types, lazy)
11. Common Mistakes

---

## Task 2: react-hook-form

**Files:**
- Create: `.claude/skills/react-hook-form/SKILL.md`
- Create: `.claude/skills/react-hook-form/reference.md`
- Create: `.claude/skills/react-hook-form/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: react-hook-form
description: Use when building forms in React with React Hook Form — registration, validation, error handling, or complex multi-step forms. Also use when integrating forms with Zod, shadcn/ui, or server actions.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up React Hook Form with Zod validation in a Next.js App Router project. Show me: a registration form with name, email, password, confirm password. Include: Zod schema, resolver, error messages, and form submission with server action."

**Q2 (Common Operation):** "Build a multi-step form wizard with React Hook Form: 3 steps with different fields per step, validation per step (not all at once), ability to go back without losing data, and a summary page before submission. Include the Zod schemas and step navigation logic."

**Q3 (Gotcha/Limits):** "What are the React Hook Form gotchas? Cover: controlled vs uncontrolled components, the mode option (onChange vs onBlur vs onSubmit), performance with large forms, using with shadcn/ui Form component, and dynamic field arrays."

**Q4 (Recent Change):** "What's new in React Hook Form v7 (latest)? Cover: any API changes, the Form component (new), server-side validation patterns, and React 19 compatibility."

### Research queries:
- `"React Hook Form" changelog 2025 2026`
- `"React Hook Form" Zod resolver setup`
- `"React Hook Form" shadcn/ui integration`
- `"React Hook Form" multi-step wizard`
- `"React Hook Form" server actions Next.js`
- `site:react-hook-form.com` — verify via WebFetch

### reference.md sections:
1. Setup (useForm, register, handleSubmit)
2. Validation (Zod resolver, inline rules, async validation)
3. Error Handling (formState.errors, ErrorMessage component)
4. Controlled Components (Controller, useController)
5. Field Arrays (useFieldArray — dynamic lists)
6. Multi-Step Forms (wizard pattern with state persistence)
7. Integration with shadcn/ui (FormField, FormItem, FormMessage)
8. Server Actions (form submission with Next.js)
9. Performance (formState subscriptions, shouldUnregister)
10. Testing Forms (testing-library patterns)
11. Common Mistakes

---

## Task 3: zustand

**Files:**
- Create: `.claude/skills/zustand/SKILL.md`
- Create: `.claude/skills/zustand/reference.md`
- Create: `.claude/skills/zustand/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: zustand
description: Use when managing client-side state with Zustand — global stores, slices, middleware, or persistence. Also use when choosing between state management solutions or migrating from Redux/Context to Zustand.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Zustand in a Next.js App Router project. Show me: creating a store, using it in components, TypeScript typing, and how to handle SSR/hydration (the Zustand store must work with both server and client components)."

**Q2 (Common Operation):** "Build a Zustand store for an e-commerce cart: add/remove items, update quantities, calculate totals, persist to localStorage, and sync across tabs. Show me: the store definition with TypeScript, the persist middleware, and the React component usage."

**Q3 (Gotcha/Limits):** "What are the Zustand gotchas? Cover: the SSR hydration mismatch problem, when NOT to use Zustand (server state belongs in TanStack Query), the subscribe pattern for non-React consumers, and how to split a large store into slices."

**Q4 (Recent Change):** "What's new in Zustand v5 (or latest v4.x)? Cover: any API changes, new middleware, TypeScript improvements, and React 19 compatibility."

### Research queries:
- `"Zustand" changelog 2025 2026`
- `"Zustand" Next.js App Router SSR`
- `"Zustand" persist middleware localStorage`
- `"Zustand" vs Redux vs Jotai comparison 2026`
- `"Zustand" slices pattern large store`
- `site:docs.pmnd.rs/zustand` — verify via WebFetch

### reference.md sections:
1. Store Creation (create, set, get, TypeScript)
2. Using in Components (useStore, selectors, shallow equality)
3. Middleware (persist, devtools, immer, subscribeWithSelector)
4. Slices Pattern (splitting large stores)
5. SSR & Hydration (Next.js App Router, createStore factory)
6. Persistence (localStorage, sessionStorage, IndexedDB)
7. Outside React (subscribe, getState)
8. Testing (store isolation per test)
9. Zustand vs Alternatives (when to use what)
10. Common Mistakes

---

## Task 4: tanstack-query

**Files:**
- Create: `.claude/skills/tanstack-query/SKILL.md`
- Create: `.claude/skills/tanstack-query/reference.md`
- Create: `.claude/skills/tanstack-query/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: tanstack-query
description: Use when managing server state with TanStack Query (React Query) — data fetching, caching, mutations, optimistic updates, or infinite scrolling. Also use when replacing manual useEffect data fetching or integrating with tRPC.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up TanStack Query v5 in a Next.js App Router project. Show me: QueryClientProvider setup, a basic query hook, and how to prefetch data in a Server Component and pass it to a Client Component via HydrationBoundary."

**Q2 (Common Operation):** "Build a full CRUD interface with TanStack Query: list items (with pagination), create, update, delete. Include: optimistic updates for mutations, cache invalidation, and loading/error states. Show me the hooks and the React component."

**Q3 (Gotcha/Limits):** "What are the TanStack Query gotchas? Cover: staleTime vs gcTime (renamed from cacheTime), the refetchOnWindowFocus default, query key design (arrays, objects), and why you shouldn't put TanStack Query data in Zustand."

**Q4 (Recent Change):** "What changed in TanStack Query v5 compared to v4? Cover: the new API surface (useQuery options object), renamed options (cacheTime → gcTime), useSuspenseQuery, and the prefetching patterns."

### Research queries:
- `"TanStack Query v5" changelog 2025 2026`
- `"TanStack Query" Next.js App Router SSR prefetch`
- `"TanStack Query" optimistic updates mutation`
- `"TanStack Query v5" migration from v4`
- `"TanStack Query" vs SWR comparison`
- `site:tanstack.com/query` — verify via WebFetch

### reference.md sections:
1. Setup (QueryClientProvider, defaults, devtools)
2. Queries (useQuery, query keys, staleTime, gcTime)
3. Mutations (useMutation, onSuccess/onError, cache invalidation)
4. Optimistic Updates (optimistic mutation pattern)
5. Pagination & Infinite Scroll (useInfiniteQuery)
6. Prefetching & SSR (prefetchQuery, HydrationBoundary, dehydrate)
7. Dependent Queries (enabled option)
8. Query Cancellation (signal)
9. Suspense Mode (useSuspenseQuery)
10. Testing (QueryClient per test, msw integration)
11. v4 → v5 Migration
12. Common Mistakes

---

## Task 5: sentry

**Files:**
- Create: `.claude/skills/sentry/SKILL.md`
- Create: `.claude/skills/sentry/reference.md`
- Create: `.claude/skills/sentry/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: sentry
description: Use when integrating Sentry for error tracking — SDK setup, source maps, performance monitoring, or alert configuration. Also use when debugging Sentry integration issues or optimizing event volume.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Sentry in a Next.js App Router project. Show me: the wizard setup, sentry.client.config.ts and sentry.server.config.ts, instrumentation.ts, source map upload, and the withSentryConfig wrapper in next.config.js."

**Q2 (Common Operation):** "Configure Sentry for a production app: set up error boundaries in React, capture custom errors with context (user info, request data), configure performance monitoring with a 20% sample rate, and set up Slack alerts for new errors."

**Q3 (Gotcha/Limits):** "What are the Sentry gotchas? Cover: the event quota and what happens when you exceed it, source map upload in CI/CD, the performance impact of tracing, filtering noisy errors (ResizeObserver, ad blocker errors), and the difference between Sentry's free vs Team plan."

**Q4 (Recent Change):** "What's new in Sentry in 2025-2026? Cover: Session Replay, Profiling, the new SDK (v8), Crons monitoring, and any pricing changes."

### Research queries:
- `"Sentry" changelog SDK v8 2025 2026`
- `"Sentry" Next.js App Router setup 2026`
- `"Sentry" pricing free tier 2026`
- `"Sentry" source maps Vercel deployment`
- `"Sentry" performance monitoring sample rate`
- `site:docs.sentry.io` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js, React, Node.js, Express)
2. Error Capturing (captureException, captureMessage, error boundaries)
3. Context & Scope (setUser, setTag, setContext, breadcrumbs)
4. Performance Monitoring (tracing, spans, custom instrumentation)
5. Session Replay (setup, privacy, sampling)
6. Source Maps (upload in CI, Vercel integration, webpack/turbopack)
7. Releases & Deploys (sentry-cli, GitHub integration)
8. Alerts & Notifications (issue alerts, metric alerts, Slack/email)
9. Filtering (beforeSend, denyUrls, ignoreErrors)
10. Pricing & Quotas (event volume, rate limiting)
11. Common Mistakes

---

## Task 6: posthog

**Files:**
- Create: `.claude/skills/posthog/SKILL.md`
- Create: `.claude/skills/posthog/reference.md`
- Create: `.claude/skills/posthog/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: posthog
description: Use when integrating PostHog for product analytics, feature flags, A/B testing, or session replay. Also use when choosing between analytics tools or implementing event tracking in a web application.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up PostHog in a Next.js App Router project. Show me: the PostHogProvider, initializing with the project API key, capturing pageviews with the App Router (no pages router), and identifying users after login."

**Q2 (Common Operation):** "Implement feature flags with PostHog in a Next.js app. Show me: creating a flag in PostHog, checking the flag server-side (in a Server Component), checking client-side, and running an A/B test with conversion tracking."

**Q3 (Gotcha/Limits):** "What are the PostHog gotchas? Cover: the event ingestion delay (not real-time for queries), autocapture noise, the impact of ad blockers on tracking, self-hosted vs cloud pricing, and the session recording storage costs."

**Q4 (Recent Change):** "What's new in PostHog in 2025-2026? Cover: the data warehouse, Web Analytics, PostHog Max (AI), and any pricing model changes."

### Research queries:
- `"PostHog" changelog 2025 2026 new features`
- `"PostHog" Next.js App Router setup`
- `"PostHog" feature flags A/B testing`
- `"PostHog" pricing 2026 free tier`
- `"PostHog" vs Mixpanel vs Amplitude comparison`
- `site:posthog.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js, React, Node.js)
2. Event Tracking (capture, autocapture, custom events)
3. User Identification (identify, alias, groups)
4. Feature Flags (boolean, multivariate, payloads)
5. A/B Testing (experiments, goals, statistical significance)
6. Session Recording (setup, privacy controls, playlist)
7. Web Analytics (pageviews, UTMs, referrers)
8. Surveys (in-app surveys, targeting)
9. Data Warehouse (queries, HogQL)
10. Self-Hosted vs Cloud
11. Pricing & Limits
12. Common Mistakes

---

## Task 7: eslint-prettier

**Files:**
- Create: `.claude/skills/eslint-prettier/SKILL.md`
- Create: `.claude/skills/eslint-prettier/reference.md`
- Create: `.claude/skills/eslint-prettier/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: eslint-prettier
description: Use when setting up code linting and formatting with ESLint and Prettier — configuration, rule customization, IDE integration, or CI enforcement. Also use when migrating ESLint to flat config or resolving ESLint/Prettier conflicts.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up ESLint 9 (flat config) and Prettier for a Next.js + TypeScript project. Show me: eslint.config.mjs, .prettierrc, the scripts in package.json, and how to make them not conflict with each other."

**Q2 (Common Operation):** "Configure ESLint for a team: add rules for no unused imports, consistent import ordering, React hooks rules, accessibility (jsx-a11y), and enforce Prettier formatting through ESLint. Show me the full flat config with all plugins."

**Q3 (Gotcha/Limits):** "What are the ESLint + Prettier gotchas? Cover: the flat config vs legacy .eslintrc migration, why eslint-config-prettier exists (and when to use eslint-plugin-prettier vs running Prettier separately), and how to handle the 'Parsing error' with TypeScript files."

**Q4 (Recent Change):** "What changed in ESLint 9? Cover: the flat config format, the new rule API, deprecated .eslintrc support timeline, and which popular plugins support flat config now."

### Research queries:
- `"ESLint 9" flat config setup 2025 2026`
- `"ESLint" Prettier integration flat config`
- `"ESLint" Next.js TypeScript flat config`
- `"ESLint 9" migration from eslintrc`
- `"Prettier" configuration 2026`
- `site:eslint.org/docs` — verify via WebFetch

### reference.md sections:
1. ESLint 9 Flat Config (eslint.config.mjs structure)
2. Prettier Setup (.prettierrc, .prettierignore)
3. Integration (eslint-config-prettier, running together)
4. TypeScript (typescript-eslint, parser config)
5. React/Next.js (eslint-plugin-react, hooks, jsx-a11y)
6. Import Ordering (eslint-plugin-import, sort rules)
7. Custom Rules (severity levels, per-file overrides)
8. IDE Integration (VS Code settings, format on save)
9. CI Enforcement (lint-staged, husky, GitHub Actions)
10. Migration from .eslintrc to Flat Config
11. Common Mistakes

---

## Task 8: Update skills.json with Phase 4 skills + bundles

**Files:**
- Modify: `skills.json`

**New bundles:**
```json
"forms": {
  "name": "Forms & Validation",
  "description": "Zod schema validation + React Hook Form — type-safe forms",
  "default": false,
  "skills": ["zod", "react-hook-form"]
},
"state": {
  "name": "State Management",
  "description": "Zustand client state + TanStack Query server state",
  "default": false,
  "skills": ["zustand", "tanstack-query"]
},
"monitoring": {
  "name": "Monitoring & Analytics",
  "description": "Sentry error tracking + PostHog product analytics",
  "default": false,
  "skills": ["sentry", "posthog"]
},
"tooling": {
  "name": "Developer Tooling",
  "description": "ESLint 9 + Prettier — code quality and formatting",
  "default": false,
  "skills": ["eslint-prettier"]
}
```

**Commit:**
```bash
git add skills.json
git commit -m "feat: register Phase 4 DX layer skills and bundles"
```

---

## Summary

| Task | Skill | Type |
|------|-------|------|
| 1 | zod | Reference (TDD) |
| 2 | react-hook-form | Reference (TDD) |
| 3 | zustand | Reference (TDD) |
| 4 | tanstack-query | Reference (TDD) |
| 5 | sentry | Reference (TDD) |
| 6 | posthog | Reference (TDD) |
| 7 | eslint-prettier | Reference (TDD) |
| 8 | skills.json update | Registry |

8 tasks · executing subagent-driven

**Parallelizable:** Tasks 1-2 (forms) in parallel. Tasks 3-4 (state) in parallel. Tasks 5-6 (monitoring) in parallel. Task 7 independent. Task 8 after all skills exist.
