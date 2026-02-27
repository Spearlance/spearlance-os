---
model: claude-sonnet-4-6
name: supabase
description: Use when working with Supabase — database queries, authentication, storage, real-time subscriptions, Edge Functions, or Row Level Security. Also use when setting up Supabase in a new project or migrating from Firebase.
---

# Supabase

## Overview
Supabase is an open-source Firebase alternative built on Postgres — database, auth, storage, realtime, and Edge Functions (Deno runtime) in one platform. SDK: `@supabase/supabase-js` v2.x + `@supabase/ssr` for server-side rendering.

## Quick Reference

| Item | Value |
|------|-------|
| Dashboard | https://supabase.com/dashboard |
| New project | https://database.new |
| Install | `npm install @supabase/supabase-js @supabase/ssr` |
| Env var (URL) | `NEXT_PUBLIC_SUPABASE_URL` |
| Env var (key) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `anon` key) |
| Type gen | `npx supabase gen types typescript --project-id <ref> > database.types.ts` |

## Client Setup (Next.js App Router)

```bash
# Fastest start — pre-configured with cookie auth, TS, Tailwind
npx create-next-app -e with-supabase
```

Two client modules: `lib/supabase/server.ts` (uses `createServerClient` from `@supabase/ssr` + Next.js `cookies()`) and `lib/supabase/client.ts` (uses `createBrowserClient`). Full code in `reference.md` §1.

## Authentication

```ts
// Sign up
await supabase.auth.signUp({ email, password })
// Sign in (password)
await supabase.auth.signInWithPassword({ email, password })
// OAuth (Google, GitHub, etc.)
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })
// Magic link
await supabase.auth.signInWithOtp({ email })
// Sign out
await supabase.auth.signOut()
// Get user (server-safe — always use over getSession())
const { data: { user } } = await supabase.auth.getUser()
```

## Database Queries

```ts
// Select
const { data, error } = await supabase.from('posts').select('id, title, author:profiles(name)').eq('published', true).order('created_at', { ascending: false }).limit(10)
// Insert
const { data, error } = await supabase.from('posts').insert({ title: 'Hello', user_id: user.id }).select().single()
// Update
const { error } = await supabase.from('posts').update({ title: 'Updated' }).eq('id', postId)
// Delete
const { error } = await supabase.from('posts').delete().eq('id', postId)
// RPC (stored procedure)
const { data } = await supabase.rpc('my_function', { param1: 'value' })
```

## Row Level Security

```sql
-- Enable RLS (always do this first)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Own data only
CREATE POLICY "Users see own posts" ON posts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Multi-tenant (org-based)
CREATE POLICY "Org members see org posts" ON posts FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = (SELECT auth.uid())));
```

## Storage

```ts
// Upload
await supabase.storage.from('avatars').upload(`${user.id}/avatar.png`, file, { upsert: true })
// Public URL
const { data } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.png`)
// Signed URL (private bucket, expires in seconds)
const { data } = await supabase.storage.from('docs').createSignedUrl('report.pdf', 3600)
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `getSession()` server-side | Use `getUser()` — validates JWT every request |
| `auth.uid()` bare in RLS | Wrap: `(SELECT auth.uid())` — cached by planner |
| Missing `ENABLE ROW LEVEL SECURITY` | Default Postgres = no access control |
| No index on RLS columns | Index `user_id`, `org_id` — runs on every row |
| Free tier in production | Pauses after 7 days inactivity |
| `service_role` key client-side | Bypasses RLS — server only |

## Full Reference
See `reference.md` for: Next.js/React/standalone setup, all auth flows, RLS multi-tenant patterns, storage policies, realtime subscriptions/presence/broadcast, Edge Functions (Deno), TypeScript type generation, branching, and pricing tiers.
