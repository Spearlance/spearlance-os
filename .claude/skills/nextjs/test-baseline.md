# Next.js Skill — RED/GREEN Test Baseline

## Test Questions

These 4 questions were used to establish the baseline and validate the skill.

---

### Q1: File Conventions

> Explain Next.js 15+ App Router file conventions. Differences between `layout.tsx`, `template.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`. Real folder structure for e-commerce.

---

### Q2: Server Actions & Forms

> Build a form with Server Actions in Next.js 15+. Validation with zod, error handling, loading states, optimistic updates with `useOptimistic`. Product creation form.

---

### Q3: Caching Layers

> Explain all 4 caching layers in Next.js 15+: Request Memoization, Data Cache, Full Route Cache, Router Cache. When each applies, how to opt out, `revalidateTag`/`revalidatePath`.

---

### Q4: Next.js 15 → 16 Changes

> What changed in Next.js 15 vs 14, and Next.js 16 vs 15? Latest 2025–2026 releases. Async request APIs, caching defaults, turbopack, breaking changes.

---

## RED Phase — Baseline (without skill)

Honest assessment from training data alone, documented before research.

### Q1 — File Conventions

**Correctly known:**
- `layout.tsx` persists state across navigations, wraps children
- `page.tsx` creates the public URL, unique per route
- `loading.tsx` is a Suspense fallback
- `error.tsx` must be `'use client'`, receives `error` and `reset` props
- `not-found.tsx` triggered by `notFound()`
- `template.tsx` remounts on every navigation (unlike layout)
- Route groups with `(name)` don't create URL segments
- `[slug]` dynamic segments, `[...slug]` catch-all, `[[...slug]]` optional

**Uncertain before research:**
- Whether `default.tsx` is required or optional in parallel routes
- Whether `proxy.ts` exists at all (Next.js 16 addition, unknown before research)
- Exact `params`/`searchParams` async requirement timing (Next.js 15 vs 16)

### Q2 — Server Actions & Forms

**Correctly known:**
- `'use server'` directive for actions
- `FormData` API in Server Actions
- Zod `safeParse` pattern with `flatten().fieldErrors`
- `useActionState` hook (knew it replaced `useFormState` but uncertain which version)
- `pending` state from `useActionState`
- `useOptimistic` basic pattern — takes initial state + reducer

**Uncertain before research:**
- Whether `useActionState` is from `react` or `react-dom` (it's from `react` as of React 19)
- Whether `useFormState` was fully removed or still available
- The exact `[state, formAction, pending]` destructure order (confirmed: state, action, pending)

### Q3 — Caching Layers

**Correctly known:**
- 4 caching layers exist with these names
- Request Memoization: per-render-pass, automatic for fetch GET
- Data Cache: persistent across requests and deployments
- Full Route Cache: rendered HTML + RSC payload at build time
- Router Cache: client-side in-memory, per session

**Wrong before research:**
- Thought `fetch` was still cached by default in Next.js 15 — it is NOT
- Thought `revalidateTag(tag)` still worked the same in Next.js 16 — now requires second `profile` arg; single-arg is deprecated
- Missed `updateTag()` entirely — new Next.js 16 API
- Missed `refresh()` entirely — new Next.js 16 API
- Router Cache staleTime for pages: thought it was 30s, actually 0 (Next.js 15+)

### Q4 — Version Changes

**Correctly known:**
- Async request APIs (cookies, headers, params) in Next.js 15
- Caching defaults reversed in Next.js 15
- Turbopack dev stable in Next.js 15

**Wrong / missing before research:**
- Did not know Next.js 16 shipped (October 2025)
- Did not know Turbopack is now default for both dev AND build in Next.js 16
- Did not know `proxy.ts` replaced `middleware.ts` in Next.js 16
- Did not know `experimental.ppr` was removed (replaced by `cacheComponents`)
- Did not know `updateTag()` and `refresh()` were added
- Did not know `next lint` command was removed in Next.js 16
- Did not know `revalidateTag` signature changed to require profile as second arg
- Did not know React Compiler support reached stable in Next.js 16
- Did not know `default.tsx` became required (not optional) in parallel routes
- Did not know Node.js minimum bumped to 20.9.0

---

## GREEN Phase — With Skill

### Q1 — File Conventions

Skill provides: complete table with all file conventions, `proxy.ts` documented, clear layout vs template distinction, explicit note that `default.tsx` is required in Next.js 16 parallel routes, async `params` pattern.

**Score:** Training data + skill = complete and accurate. Skill adds `proxy.ts`, requirement for `default.tsx`, and async params pattern.

### Q2 — Server Actions & Forms

Skill provides: full Product creation example with zod, `useActionState` with correct import (`from 'react'`), proper `[state, formAction, pending]` destructure, `useOptimistic` with reducer pattern, `useFormStatus` for submit buttons.

**Score:** Training data was mostly right; skill corrects the `useActionState` import source and confirms API shape.

### Q3 — Caching Layers

Skill provides: all 4 layers with correct current behavior. Most critical corrections:
- fetch is NOT cached by default
- `revalidateTag` requires `(tag, 'max')` in Next.js 16
- `updateTag` and `refresh` documented
- Router Cache page staleTime = 0

**Score:** Skill provides significant value over baseline — multiple wrong assumptions corrected.

### Q4 — Version Changes

Skill provides: complete version history table, Next.js 16 breaking changes table, full deprecation table, caching defaults comparison table.

**Score:** Skill provides very high value — Next.js 16 is entirely post-training-cutoff knowledge.

---

## Summary

| Question | Baseline Accuracy | Skill Adds Value |
|----------|------------------|-----------------|
| File Conventions | High — minor gaps | ✓ proxy.ts, default.tsx requirement |
| Server Actions | Medium — API shape uncertain | ✓ confirms useActionState import, arg order |
| Caching | Low — multiple wrong defaults | ✓ corrects fetch default, revalidateTag, new APIs |
| Version Changes | Very Low — Next.js 16 unknown | ✓ entire Next.js 16 release covered |

Skill passes: provides correct, current, actionable information that training data alone cannot produce reliably for at least 3 of 4 questions.
