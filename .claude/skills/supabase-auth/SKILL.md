---
model: claude-sonnet-4-6
name: supabase-auth
description: Use when implementing authentication with Supabase Auth — email/password, OAuth, magic links, or Row Level Security integration. Also use when connecting Supabase Auth with RLS policies or debugging auth token issues.
---

# Supabase Auth

## Overview

Supabase Auth is a JWT-based authentication system built on GoTrue. Uses PKCE flow by default with `@supabase/ssr`. Sessions live in cookies (SSR) or localStorage (SPA). General Supabase setup → see `supabase` skill.

## Quick Reference

| Item | Value |
|------|-------|
| Install | `npm install @supabase/supabase-js @supabase/ssr` |
| Anon key env | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Server client | `createServerClient` from `@supabase/ssr` |
| Browser client | `createBrowserClient` from `@supabase/ssr` |
| Email limit | 2/hr built-in; custom SMTP to increase |
| Docs | https://supabase.com/docs/guides/auth |

## Client Setup (Next.js SSR)

```ts
// lib/supabase/server.ts — Server Components, Route Handlers, Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(),
                  setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

// lib/supabase/client.ts — Client Components
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

## Auth Methods

```ts
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })
await supabase.auth.signInWithOtp({ email })                    // magic link
await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` })
await supabase.auth.signOut()
const { data: { user } } = await supabase.auth.getUser()       // server-safe — validates JWT
```

## getUser() vs getSession()

| | `getUser()` | `getSession()` |
|---|---|---|
| Validates JWT | ✓ server round-trip | ✗ local only |
| Use server-side | ✓ always | ✗ never |
| Use client-side | ✓ fine | ✓ fine (faster) |

## Middleware Pattern

Middleware MUST refresh the session on every request so Server Components get a valid token. See `reference.md` §6 for full implementation.

## RLS Connection

```sql
-- auth.uid() returns the authenticated user's UUID
CREATE POLICY "own data" ON posts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);  -- wrap in SELECT to cache per-query
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `getSession()` server-side | Use `getUser()` — only one that validates JWT |
| No middleware | Sessions expire; middleware refreshes them |
| Missing auth callback route | OAuth/magic links need `/auth/callback` to exchange code |
| Bare `auth.uid()` in RLS | Wrap: `(SELECT auth.uid())` — avoids per-row re-eval |
| Built-in SMTP in production | 2 emails/hr hard limit — configure custom SMTP |
| `service_role` client-side | Bypasses RLS entirely — server only |

## Full Reference
See `reference.md`: complete middleware code, OAuth setup, magic link flow, auth callbacks, MFA, auth hooks, RLS patterns, protected routes, SMTP config, rate limits.
