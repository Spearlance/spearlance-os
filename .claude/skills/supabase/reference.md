# Supabase Reference

> As of February 2026. SDK: `@supabase/supabase-js` v2.x, `@supabase/ssr` for SSR frameworks.

## Table of Contents
1. [Setup](#1-setup)
2. [Database Queries](#2-database-queries)
3. [Authentication](#3-authentication)
4. [Row Level Security](#4-row-level-security)
5. [Storage](#5-storage)
6. [Realtime](#6-realtime)
7. [Edge Functions](#7-edge-functions)
8. [TypeScript Generation](#8-typescript-generation)
9. [Branching](#9-branching)
10. [Pricing & Limits](#10-pricing--limits)
11. [Common Mistakes](#11-common-mistakes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Setup

### Install

```bash
npm install @supabase/supabase-js @supabase/ssr
```

For standalone (no SSR framework), just `@supabase/supabase-js`.

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xyzxyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Supabase is migrating from legacy `anon`/`service_role` keys to new `publishable`/`secret` keys. Both formats work during the transition period. Use the variable name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for either.

**Never expose `service_role`/`secret` keys client-side.** They bypass RLS.

### Next.js App Router (Recommended)

The fastest start is the official template:

```bash
npx create-next-app -e with-supabase
```

Includes cookie-based auth, TypeScript, Tailwind CSS pre-configured.

**Manual setup — server client** (`lib/supabase/server.ts`):

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Manual setup — browser client** (`lib/supabase/client.ts`):

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**Middleware** (`middleware.ts`):

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to read auth state
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### React (Vite/CRA — No SSR)

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

### Standalone (Node.js / server-only)

```ts
import { createClient } from '@supabase/supabase-js'

// Use secret key for admin operations — bypasses RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2. Database Queries

All queries return `{ data, error }`. Always check `error` before using `data`.

### Select

```ts
// Basic select
const { data, error } = await supabase
  .from('posts')
  .select('*')

// Specific columns
const { data } = await supabase
  .from('posts')
  .select('id, title, created_at')

// Joins (foreign key relationship)
const { data } = await supabase
  .from('posts')
  .select('id, title, author:profiles(id, name, avatar_url)')

// Filters
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('published', true)
  .gte('created_at', '2025-01-01')
  .ilike('title', '%supabase%')
  .order('created_at', { ascending: false })
  .limit(20)
  .range(0, 9)   // pagination: rows 0–9

// Single row
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('id', postId)
  .single()   // throws if 0 or >1 rows

// Maybe single (returns null if not found, no error)
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('slug', slug)
  .maybeSingle()
```

### Filter Operators

| Method | SQL equivalent |
|--------|---------------|
| `.eq('col', val)` | `col = val` |
| `.neq('col', val)` | `col != val` |
| `.gt / .gte / .lt / .lte` | `> / >= / < / <=` |
| `.like('col', '%val%')` | `LIKE '%val%'` |
| `.ilike('col', '%val%')` | `ILIKE '%val%'` (case-insensitive) |
| `.in('col', [1,2,3])` | `col IN (1,2,3)` |
| `.is('col', null)` | `col IS NULL` |
| `.contains('col', ['a'])` | `col @> '{a}'` (array) |
| `.overlaps('col', ['a'])` | `col && '{a}'` (array) |
| `.textSearch('col', 'query')` | Full-text search |
| `.or('a.eq.1,b.eq.2')` | `a = 1 OR b = 2` |
| `.not('col', 'eq', val)` | `NOT col = val` |

### Insert

```ts
// Single row
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'Hello World', user_id: user.id, published: false })
  .select()
  .single()

// Multiple rows
const { data, error } = await supabase
  .from('posts')
  .insert([
    { title: 'Post 1', user_id: user.id },
    { title: 'Post 2', user_id: user.id },
  ])
  .select()
```

### Update

```ts
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated Title', updated_at: new Date().toISOString() })
  .eq('id', postId)
  .select()
  .single()
```

### Upsert

```ts
const { data, error } = await supabase
  .from('profiles')
  .upsert({ id: user.id, username: 'newname', updated_at: new Date().toISOString() })
  .select()
```

### Delete

```ts
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
```

### RPC (Stored Procedures / Functions)

```ts
// Call a Postgres function
const { data, error } = await supabase.rpc('get_trending_posts', {
  days_back: 7,
  limit_count: 10,
})

// Postgres function definition:
-- CREATE OR REPLACE FUNCTION get_trending_posts(days_back int, limit_count int)
-- RETURNS TABLE(id uuid, title text, view_count int) AS $$
--   SELECT id, title, view_count FROM posts
--   WHERE created_at > now() - (days_back || ' days')::interval
--   ORDER BY view_count DESC LIMIT limit_count;
-- $$ LANGUAGE sql SECURITY DEFINER;
```

### Count

```ts
const { count, error } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true })
  .eq('published', true)
```

### Transactions

Use Postgres functions for multi-step transactions — the JS client has no native transaction API:

```sql
CREATE OR REPLACE FUNCTION create_post_with_tags(
  post_title text,
  tag_names text[]
) RETURNS uuid AS $$
DECLARE
  new_post_id uuid;
BEGIN
  INSERT INTO posts(title, user_id) VALUES(post_title, auth.uid())
  RETURNING id INTO new_post_id;

  INSERT INTO post_tags(post_id, tag_name)
  SELECT new_post_id, unnest(tag_names);

  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then call via `supabase.rpc('create_post_with_tags', { post_title, tag_names })`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3. Authentication

### Email + Password

```ts
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { full_name: 'Ada Lovelace' },  // stored in user_metadata
    emailRedirectTo: `${location.origin}/auth/callback`,
  },
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
})

// Sign out
await supabase.auth.signOut()

// Password reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${location.origin}/auth/update-password`,
})

// Update password (after redirect from reset email)
await supabase.auth.updateUser({ password: 'newpassword' })
```

### OAuth (Social Login)

```ts
// Redirect to provider
await supabase.auth.signInWithOAuth({
  provider: 'google',  // 'github' | 'discord' | 'twitter' | 'apple' | etc.
  options: {
    redirectTo: `${location.origin}/auth/callback`,
    scopes: 'email profile',  // provider-specific
  },
})

// Required: auth callback route handler (Next.js)
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

### Magic Link / OTP

```ts
// Send magic link
await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
    shouldCreateUser: true,
  },
})

// Send SMS OTP
await supabase.auth.signInWithOtp({ phone: '+15555555555' })

// Verify OTP (for phone or email OTP — not magic link)
await supabase.auth.verifyOtp({ phone: '+15555555555', token: '123456', type: 'sms' })
```

### Get Current User

```ts
// Server-side — ALWAYS use this (validates JWT with Supabase auth server)
const { data: { user }, error } = await supabase.auth.getUser()

// Client-side listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') console.log('User:', session?.user)
  if (event === 'SIGNED_OUT') router.push('/login')
  if (event === 'TOKEN_REFRESHED') console.log('Token refreshed')
})
```

**Never use `getSession()` on the server** — it reads from cookies without revalidation and can be spoofed. Always use `getUser()`.

### Protecting Pages (Next.js Server Component)

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <div>Hello, {user.email}</div>
}
```

### Anonymous Sign-In

```ts
const { data, error } = await supabase.auth.signInAnonymously()
// Later, upgrade to full account:
await supabase.auth.updateUser({ email, password })
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4. Row Level Security

RLS is Postgres-native access control — policies run on every row, for every request, at the database level.

### Enable RLS

```sql
-- Always do this. Default Postgres: no RLS = everyone sees everything.
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### Policy Anatomy

```sql
CREATE POLICY "policy name" ON table_name
  FOR { ALL | SELECT | INSERT | UPDATE | DELETE }
  TO { role | authenticated | anon | public }
  USING (/* row-level filter — evaluated for SELECT, UPDATE, DELETE */)
  WITH CHECK (/* insert/update validation — evaluated for INSERT, UPDATE */);
```

`USING` = "which rows can be seen/modified" (WHERE clause on reads).
`WITH CHECK` = "what values are allowed on write" (validation on writes).

### Core Patterns

**Own data (personal rows):**

```sql
-- Read own rows
CREATE POLICY "read own posts" ON posts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Insert with user_id auto-set
CREATE POLICY "insert own posts" ON posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Update own rows only
CREATE POLICY "update own posts" ON posts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Delete own rows
CREATE POLICY "delete own posts" ON posts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

**Public read, authenticated write:**

```sql
CREATE POLICY "public read" ON posts
  FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "authenticated write" ON posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Multi-Tenant Patterns

**Shared table with `org_id` (most common):**

```sql
-- Every tenant's rows have org_id
ALTER TABLE documents ADD COLUMN org_id uuid REFERENCES orgs(id);

-- Memberships table: who belongs to which org
CREATE TABLE memberships (
  user_id uuid REFERENCES auth.users(id),
  org_id  uuid REFERENCES orgs(id),
  role    text DEFAULT 'member',
  PRIMARY KEY (user_id, org_id)
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Index for performance (critical)
CREATE INDEX ON documents(org_id);
CREATE INDEX ON memberships(user_id);

-- Documents policy: org members only
CREATE POLICY "org members read docs" ON documents
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (SELECT auth.uid())
    )
  );
```

**Role-based within org:**

```sql
-- Admin-only writes
CREATE POLICY "org admins insert docs" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
```

**JWT custom claims (high-performance pattern):**

Set `app_metadata` via Edge Function or Auth Hook, then read from JWT — no join needed:

```sql
-- Assumes org_id is in JWT app_metadata
CREATE POLICY "org from jwt" ON documents
  FOR SELECT TO authenticated
  USING (
    org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
```

### Helper Functions

| Function | Returns | Notes |
|----------|---------|-------|
| `auth.uid()` | `uuid` | Current user's ID. `null` for anon. |
| `auth.jwt()` | `jsonb` | Full JWT payload. Use `app_metadata` for auth decisions. |
| `auth.role()` | `text` | `'anon'` or `'authenticated'` |

**Always wrap with SELECT:**

```sql
-- Slow: auth.uid() called per-row
USING (user_id = auth.uid())

-- Fast: evaluated once, cached by query planner
USING (user_id = (SELECT auth.uid()))
```

### Performance Rules

1. Index every column used in RLS policies (`user_id`, `org_id`, etc.)
2. Use `(SELECT auth.uid())` wrapper — not bare `auth.uid()`
3. Duplicate policy conditions as explicit `.eq()` filters in your queries
4. Use `SECURITY DEFINER` functions for complex authorization logic that bypasses RLS for lookups

### Testing RLS

Test from the client SDK, not the SQL Editor — the SQL Editor runs as `postgres` role and bypasses RLS.

```ts
// Simulate anon user
const anonClient = createClient(url, anonKey)
const { data, error } = await anonClient.from('posts').select('*')
// Should only return published posts if RLS is correct

// Simulate authenticated user
const { data: session } = await supabase.auth.signInWithPassword({ email, password })
const { data } = await supabase.from('posts').select('*')
// Should only return their own posts
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 5. Storage

Supabase Storage supports three bucket types (as of 2025):
- **Files** — standard CDN-backed file storage (images, video, docs)
- **Analytics** — Apache Iceberg tables on AWS S3 (data lakes, ETL)
- **Vector** — embedding storage with similarity search (RAG, AI)

For most apps, use **Files** buckets.

### Create a Bucket

```ts
// Via client
await supabase.storage.createBucket('avatars', {
  public: true,          // false = private (require signed URLs)
  fileSizeLimit: '5MB',
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
})
```

Or create in the Dashboard under Storage → New Bucket.

### Upload

```ts
// Upload a file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true,   // overwrite if exists
    contentType: 'image/png',
  })

// Upload from URL/Buffer
const { data } = await supabase.storage
  .from('docs')
  .upload('reports/q4-2025.pdf', buffer, { contentType: 'application/pdf' })
```

### Get URLs

```ts
// Public URL (bucket must be public)
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${user.id}/avatar.png`)

console.log(data.publicUrl)  // https://xxx.supabase.co/storage/v1/object/public/...

// Signed URL (private bucket, time-limited)
const { data, error } = await supabase.storage
  .from('docs')
  .createSignedUrl('reports/q4-2025.pdf', 3600)  // expires in 1 hour

// Multiple signed URLs at once
const { data } = await supabase.storage
  .from('docs')
  .createSignedUrls(['file1.pdf', 'file2.pdf'], 3600)
```

### Download

```ts
const { data, error } = await supabase.storage
  .from('docs')
  .download('reports/q4-2025.pdf')

// data is a Blob — convert to URL for browser
const url = URL.createObjectURL(data)
```

### List & Delete

```ts
// List files in a folder
const { data } = await supabase.storage
  .from('avatars')
  .list(user.id, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })

// Delete files
const { error } = await supabase.storage
  .from('avatars')
  .remove([`${user.id}/old-avatar.png`])
```

### Image Transformations

```ts
// Resize image on the fly (public buckets only, Pro plan)
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${user.id}/avatar.png`, {
    transform: { width: 100, height: 100, resize: 'cover', quality: 80 },
  })
```

### Storage RLS Policies

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "user upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read on avatars bucket
CREATE POLICY "public avatar read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Allow users to delete own files
CREATE POLICY "user delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'docs' AND owner = auth.uid());
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6. Realtime

Supabase Realtime runs over WebSockets and supports three modes:
- **Postgres Changes** — listen to DB INSERT/UPDATE/DELETE
- **Broadcast** — low-latency ephemeral messages between clients
- **Presence** — track who's online / shared state

### Postgres Changes

```ts
// Listen to all INSERTs on a table
const channel = supabase
  .channel('posts-inserts')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('New post:', payload.new)
    }
  )
  .subscribe()

// Listen to specific row updates (filter)
const channel = supabase
  .channel(`post-${postId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts',
      filter: `id=eq.${postId}`,
    },
    (payload) => {
      setPost(payload.new)
    }
  )
  .subscribe()

// Listen to DELETE
supabase.channel('posts-deletes')
  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' },
    (payload) => removeFromList(payload.old.id))
  .subscribe()

// Listen to all events
supabase.channel('posts-all')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' },
    (payload) => console.log(payload.eventType, payload))
  .subscribe()

// Cleanup
supabase.removeChannel(channel)
```

**Required:** Enable replication for the table in Supabase Dashboard → Database → Replication, or via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
```

### Broadcast

```ts
// Send a message
const channel = supabase.channel('game-room')

channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { x: 100, y: 200, user_id: user.id },
    })
  }
})

// Receive messages
channel
  .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
    updateCursor(payload)
  })
  .subscribe()
```

### Presence

```ts
const channel = supabase.channel('room-1')

// Track own presence
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
      cursor: { x: 0, y: 0 },
    })
  }
})

// Listen to presence changes
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // state = { [presenceKey]: [{ user_id, online_at, ... }] }
    setOnlineUsers(Object.values(state).flat())
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    console.log('Joined:', newPresences)
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    console.log('Left:', leftPresences)
  })
  .subscribe()

// Untrack (on component unmount)
await channel.untrack()
supabase.removeChannel(channel)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 7. Edge Functions

Deno-based TypeScript functions deployed globally at the edge. Cold start ~50ms.

### Create & Structure

```bash
supabase functions new my-function
# Creates: supabase/functions/my-function/index.ts
```

```ts
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const { name } = await req.json()

  // Access Supabase from within Edge Function
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get authenticated user from request
  const authHeader = req.headers.get('Authorization')!
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  return new Response(
    JSON.stringify({ message: `Hello ${name}`, user_id: user?.id }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Local Development

```bash
supabase start
supabase functions serve my-function --env-file supabase/functions/.env

# Test locally
curl -X POST 'http://localhost:54321/functions/v1/my-function' \
  -H 'Authorization: Bearer <local-anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "world"}'
```

### Secrets

```bash
# Set secrets for production
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx OPENAI_API_KEY=sk-xxx

# Push from .env file
supabase secrets set --env-file supabase/functions/.env

# List secrets
supabase secrets list
```

Local: put secrets in `supabase/functions/.env` (auto-loaded).

Access in code: `Deno.env.get('STRIPE_SECRET_KEY')`

### Deploy

```bash
supabase link --project-ref <project-ref>
supabase functions deploy my-function
# Deploy all functions
supabase functions deploy
```

### Invoke from Client

```ts
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { name: 'world' },
  headers: { 'x-custom-header': 'value' },
})
```

### Built-in Environment Variables

These are always available inside Edge Functions:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Project API URL |
| `SUPABASE_ANON_KEY` | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 8. TypeScript Generation

Generate types from your database schema for full end-to-end type safety.

### Generate Types

```bash
# Install CLI
npm i supabase --save-dev

# Authenticate
npx supabase login

# Generate from remote project
npx supabase gen types typescript --project-id <project-ref> --schema public > database.types.ts

# Generate from local Supabase instance
npx supabase gen types typescript --local > database.types.ts

# Also supports Go and Swift
npx supabase gen types --lang=go --project-id <ref> > database.types.go
```

### Use Generated Types

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabase = createClient<Database>(url, key)

// Now queries are fully typed
const { data } = await supabase.from('posts').select('id, title')
//       ^ data: { id: string; title: string }[] | null

// Insert type checking
const { data } = await supabase.from('posts').insert({
  title: 'Hello',
  // user_id: missing → TypeScript error if NOT NULL and no default
})
```

### Type Helpers

```ts
import type { Database } from './database.types'

// Extract table row type
type Post = Database['public']['Tables']['posts']['Row']
type NewPost = Database['public']['Tables']['posts']['Insert']
type PostUpdate = Database['public']['Tables']['posts']['Update']
```

### CI / Auto-generation

```yaml
# .github/workflows/types.yml
- name: Generate Supabase types
  run: npx supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_ID }} > database.types.ts
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Note: As of early 2026, there's a known issue with type generation failing after migrating to new publishable/secret key format. Workaround: use `SUPABASE_ACCESS_TOKEN` env var instead of `supabase login` for CI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 9. Branching

Supabase Branching creates isolated preview databases per GitHub branch/PR. Each branch is a full Supabase instance (DB, Auth, Storage, Realtime, Edge Functions).

**Status as of February 2026:** Public beta. Dashboard branching in public alpha.

### How it Works

Each branch runs this lifecycle automatically:
1. **Pull** — retrieves migrations from main
2. **Health** — waits for all services to start (up to 2 min)
3. **Configure** — applies `config.toml` settings
4. **Migrate** — runs pending migrations
5. **Seed** — runs seed files
6. **Deploy** — deploys changed Edge Functions

### Enable Branching

1. Connect your GitHub repo in Dashboard → Integrations → GitHub
2. Enable branching in Project Settings → Branching
3. Create a feature branch — Supabase auto-creates a preview DB

### Workflow

```bash
# Work on feature branch
git checkout -b feat/new-table

# Create migration
supabase migration new add_comments_table

# Write migration SQL
# supabase/migrations/20250201_add_comments_table.sql

git add . && git commit -m "feat: add comments table"
git push

# Supabase auto-creates preview DB and runs migration
# PR gets preview URL with its own Supabase credentials
```

### Branching Costs

Preview branches are billed at compute rate (roughly same as a small project). Branches auto-pause after inactivity and are deleted when the PR is closed/merged.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 10. Pricing & Limits

As of February 2026. Verify at [supabase.com/pricing](https://supabase.com/pricing).

### Plans

| Plan | Price | Projects | DB Storage | MAUs | File Storage |
|------|-------|----------|-----------|------|-------------|
| **Free** | $0 | 2 | 500 MB | 50,000 | 1 GB |
| **Pro** | $25/mo + usage | Unlimited | 8 GB incl. | 100,000 incl. | 100 GB incl. |
| **Team** | $599/mo | Unlimited | Team collab + SSO | Unlimited incl. | Higher limits |
| **Enterprise** | Custom | Dedicated | HIPAA, SLAs | Custom | Custom |

### Free Tier Key Limits

| Resource | Free Limit |
|----------|-----------|
| Database storage | 500 MB |
| Database egress | 2 GB / month |
| Monthly active users | 50,000 |
| File storage | 1 GB |
| Storage egress | 2 GB / month |
| Edge Function invocations | 500,000 / month |
| Realtime connections | 200 concurrent |
| Projects | 2 |
| Inactivity pause | After 7 days |

**Free projects auto-pause after 7 days of no API requests.** Data is retained; the project restores on next access. Not suitable for production.

### Pro Overage Rates (approximate)

| Resource | Overage |
|----------|---------|
| Database storage | $0.125 / GB |
| Egress | $0.09 / GB |
| Auth MAUs | $0.00325 / MAU after 100k |
| File storage | $0.021 / GB |
| Edge Functions | $2 / million invocations |

### PostgREST v14 (2025)

As of late 2025, Supabase upgraded the Data API to PostgREST v14, delivering ~20% more RPS for GET requests and 2-second schema cache loading (down from 7 minutes for complex schemas).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 11. Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| `getSession()` in server code | Auth bypass — spoofable | Use `getUser()` — it calls Supabase Auth server every time |
| Bare `auth.uid()` in RLS policies | Slow — called per-row | `(SELECT auth.uid())` — evaluated once, cached |
| No index on RLS policy columns | Slow queries at scale | `CREATE INDEX ON table(user_id)` for every RLS column |
| Forgetting `ENABLE ROW LEVEL SECURITY` | All rows exposed | Postgres default: no RLS = public access. Always enable. |
| Testing RLS in SQL Editor | False confidence | SQL Editor runs as `postgres` role, bypasses RLS. Test via SDK. |
| `service_role` key client-side | Security breach | Only use `anon`/`publishable` key in browser code |
| No `WITH CHECK` on INSERT policies | Privilege escalation | Without `WITH CHECK`, users can insert any `user_id` |
| Free tier for production | Downtime | Projects pause after 7 days inactivity — use Pro |
| Realtime without publication | Silently no events | `ALTER PUBLICATION supabase_realtime ADD TABLE posts;` |
| Not calling `supabase.removeChannel()` | Memory leaks | Always remove channels on component unmount |
| Using `user_metadata` for auth decisions | Spoofable | Users can write `user_metadata`. Use `app_metadata` for authorization. |
| Signed URLs that never expire | Security risk | Always set appropriate `expiresIn` (seconds). 3600 = 1 hour. |

### Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `PGRST301` | JWT invalid or expired | Re-authenticate user |
| `PGRST116` | Not found (`.single()` returned 0 rows) | Use `.maybeSingle()` or check existence first |
| `42501` | RLS policy violation | Check policy definitions; user lacks access |
| `23505` | Unique violation | Handle duplicate key in UI or use `.upsert()` |
| `23503` | Foreign key violation | Referenced row doesn't exist |
| `storage/object-not-found` | File doesn't exist | Check path; use `.list()` to confirm |
| `AuthSessionMissingError` | No active session | Redirect to login |
| `AuthRetryableFetchError` | Network error to Auth server | Retry with backoff |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Appendix: Migrations

```bash
# Create a new migration
supabase migration new add_posts_table

# Apply migrations locally
supabase db reset

# Apply to production (careful)
supabase db push

# Inspect current schema diff
supabase db diff --use-migra
```

Migration files live in `supabase/migrations/` and run in timestamp order.

## Appendix: Local Development Stack

```bash
supabase start   # starts Postgres, Auth, Storage, Realtime, Studio
supabase stop    # stop all containers
supabase status  # print local URLs and keys
```

Local Studio (dashboard equivalent): http://localhost:54323
Local API: http://localhost:54321
Local DB: postgresql://postgres:postgres@localhost:54322/postgres
