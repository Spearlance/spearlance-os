---
model: claude-sonnet-4-6
name: authjs
description: Use when implementing authentication with Auth.js (NextAuth.js) — OAuth providers, credentials, session management, or database adapters. Also use when upgrading from NextAuth v4 to Auth.js v5 or debugging auth callback issues.
---

# Auth.js (NextAuth.js v5)

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | v5 (beta: `next-auth@beta`) |
| **Install** | `npm install next-auth@beta` |
| **Docs** | https://authjs.dev |
| **Min Next.js** | 14.0+ |
| **Secret** | `AUTH_SECRET` — only required env var |

## Setup (Next.js App Router)

```typescript
// auth.ts (project root)
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub],
})
```

```typescript
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth"
```

```bash
# .env
AUTH_SECRET=your-secret-here   # openssl rand -base64 32
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

## OAuth Provider Config

```typescript
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

// ENV auto-detected: AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
providers: [GitHub, Google]

// Manual override
providers: [GitHub({ clientId: "...", clientSecret: "..." })]
```

## Session Access

```typescript
// Server Component / Server Action
import { auth } from "@/auth"
const session = await auth()
session?.user?.email

// Client Component
"use client"
import { useSession } from "next-auth/react"
const { data: session, status } = useSession()

// Route Handler — wrap with auth
export const GET = auth((req) => {
  const session = req.auth
})
```

## Middleware Protection

```typescript
// middleware.ts — simplest: protect everything
export { auth as middleware } from "@/auth"
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] }

// Custom redirect logic
import { auth } from "@/auth"
export default auth((req) => {
  if (!req.auth) return Response.redirect(new URL("/login", req.url))
})
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `getServerSession(authOptions)` | Replace with `await auth()` |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` env vars | Rename to `AUTH_SECRET` / `AUTH_URL` |
| `@next-auth/prisma-adapter` package | Use `@auth/prisma-adapter` |
| Database adapter in middleware | Split config — edge can only use JWT |
| Missing `SessionProvider` for client hooks | Wrap layout in `<SessionProvider>` |
| Cookies still named `next-auth.*` | v5 renames them to `authjs.*` |

See `reference.md` for: SvelteKit/Express setup, credentials provider, email magic links, JWT vs database sessions, full callback chain, Prisma/Drizzle/Supabase adapters, TypeScript session extension, edge runtime split config, and complete v4→v5 migration checklist.
