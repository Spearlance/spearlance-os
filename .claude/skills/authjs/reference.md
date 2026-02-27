# Auth.js (NextAuth.js v5) Reference

Auth.js v5 — beta (`next-auth@beta`). Requires Next.js 14+. Replaces `getServerSession` with the universal `auth()` function.

---

## 1. Setup

### Next.js App Router

```bash
npm install next-auth@beta
```

```typescript
// auth.ts (project root)
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub, Google],
})
```

```typescript
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth"
```

```bash
# .env
AUTH_SECRET=your-secret-here          # openssl rand -base64 32
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-secret
# AUTH_URL is optional — auto-detected from request headers
```

Add `SessionProvider` for client-side `useSession()`:

```typescript
// app/layout.tsx
import { SessionProvider } from "next-auth/react"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

### SvelteKit

```bash
npm install @auth/sveltekit
```

```typescript
// src/auth.ts
import { SvelteKitAuth } from "@auth/sveltekit"
import GitHub from "@auth/sveltekit/providers/github"

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [GitHub],
})
```

```typescript
// src/hooks.server.ts
export { handle } from "./auth"
```

```typescript
// +page.server.ts
import { auth } from "../auth"
export async function load(event) {
  const session = await auth(event)
  return { session }
}
```

### Express

```bash
npm install @auth/express
```

```typescript
// src/auth.ts
import { ExpressAuth } from "@auth/express"
import GitHub from "@auth/express/providers/github"

export const authConfig = {
  providers: [GitHub],
}

// app.ts
import express from "express"
import { authConfig } from "./auth"

const app = express()
app.use("/auth/*", ExpressAuth(authConfig))
```

---

## 2. Providers

### OAuth Providers

Auth.js supports 80+ built-in OAuth providers. All follow the same pattern:

```typescript
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Discord from "next-auth/providers/discord"
import Twitter from "next-auth/providers/twitter"

// ENV auto-detection: AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
providers: [GitHub, Google, Discord]

// Manual config
providers: [
  GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
    // Override profile mapping
    profile(profile) {
      return { id: profile.id, name: profile.name, email: profile.email }
    },
  }),
]
```

> OAuth 1.0 was dropped in v5. Twitter/X now requires OAuth 2.0.

### Credentials Provider

Use for username/password or custom login logic. Credentials always use JWT strategy — no database session for credential logins.

```typescript
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

providers: [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials)
      if (!parsed.success) return null

      const user = await db.user.findUnique({ where: { email: parsed.data.email } })
      if (!user || !user.passwordHash) return null

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!valid) return null

      return { id: user.id, email: user.email, name: user.name }
    },
  }),
]
```

### Email / Magic Link

Requires a database adapter and email transport.

```bash
npm install @auth/prisma-adapter nodemailer
```

```typescript
import Resend from "next-auth/providers/resend"
import Nodemailer from "next-auth/providers/nodemailer"

// Resend (recommended)
providers: [
  Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: "noreply@example.com" }),
]

// Nodemailer
providers: [
  Nodemailer({
    server: process.env.EMAIL_SERVER,
    from: process.env.EMAIL_FROM,
  }),
]
```

---

## 3. Session Management

### JWT vs Database Sessions

| | JWT (default) | Database |
|--|---------------|----------|
| **Storage** | Encrypted cookie | Database table |
| **Server calls** | None per request | 1 DB query per request |
| **Revocation** | Not possible without blocklist | Instant (delete row) |
| **Edge compatible** | Yes | No |
| **Payload size** | Cookie limit (~4KB) | Unlimited |
| **Best for** | Stateless, edge deployments | Apps needing immediate revocation |

### JWT Strategy (default)

```typescript
export const { auth, handlers } = NextAuth({
  session: { strategy: "jwt" },
  providers: [...],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role  // attach custom fields on first sign-in
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
})
```

### Database Strategy

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/prisma"

export const { auth, handlers } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [...],
})
```

With a database adapter, `session.user` is populated directly from the `User` table — no JWT callback needed.

---

## 4. Callbacks

Callbacks fire in this order: `signIn` → `jwt` → `session`.

### signIn Callback

Controls whether a user is allowed to sign in. Return `true` to allow, `false` or a URL string to deny/redirect.

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // Block non-corporate emails
    if (!user.email?.endsWith("@company.com")) return false

    // Allow only verified GitHub emails
    if (account?.provider === "github") {
      return profile?.email_verified === true
    }

    return true
  },
}
```

### jwt Callback

Runs when a JWT is created or updated. Fires on: initial sign-in, session access, token refresh.

```typescript
callbacks: {
  async jwt({ token, user, account, trigger, session }) {
    // Initial sign-in — user/account are populated
    if (user) {
      token.id = user.id
      token.role = user.role
    }

    // Session update via update() client call
    if (trigger === "update" && session?.name) {
      token.name = session.name
    }

    return token
  },
}
```

### session Callback

Runs whenever session data is returned to the client. Use to expose JWT token fields to the session object.

```typescript
callbacks: {
  async session({ session, token }) {
    session.user.id = token.id as string
    session.user.role = token.role as string
    return session
  },
}
```

### redirect Callback

Controls where users are redirected after sign-in/sign-out.

```typescript
callbacks: {
  async redirect({ url, baseUrl }) {
    // Allow relative URLs
    if (url.startsWith("/")) return `${baseUrl}${url}`
    // Allow same-origin URLs
    if (new URL(url).origin === baseUrl) return url
    return baseUrl
  },
}
```

---

## 5. Database Adapters

### Prisma

```bash
npm install @auth/prisma-adapter @prisma/client
npm install -D prisma
```

```typescript
// prisma/schema.prisma — required models
model User {
  id            String          @id @default(cuid())
  name          String?
  email         String?         @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  role          String          @default("user")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@id([identifier, token])
}
```

```typescript
// lib/prisma.ts — singleton
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

```typescript
// auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [...],
})
```

### Drizzle

```bash
npm install @auth/drizzle-adapter drizzle-orm
```

```typescript
// db/schema.ts — Auth.js required tables
import { pgTable, text, timestamp, integer, primaryKey } from "drizzle-orm/pg-core"

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({ pk: primaryKey({ columns: [account.provider, account.providerAccountId] }) }))

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({ pk: primaryKey({ columns: [vt.identifier, vt.token] }) }))
```

```typescript
// auth.ts
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"

export const { auth, handlers } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [...],
})
```

### Supabase

```bash
npm install @auth/supabase-adapter
```

```typescript
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const { auth, handlers } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [...],
})
```

> Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) — the adapter needs admin access.

---

## 6. Middleware

### Basic Protection

```typescript
// middleware.ts
export { auth as middleware } from "@/auth"

// Protect all routes except public ones
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)"],
}
```

### Custom Middleware Logic

```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login")

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.url))
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = { matcher: ["/((?!api|_next).*)"] }
```

### Role-Based Access

```typescript
export default auth((req) => {
  const session = req.auth
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

  if (isAdminRoute && session?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/403", req.url))
  }
})
```

---

## 7. TypeScript

### Extending Session and JWT Types

```typescript
// types/next-auth.d.ts
import { DefaultSession, DefaultJWT } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
  }
}
```

Then in callbacks, TypeScript will have full type safety:

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id     // typed
      token.role = user.role // typed
    }
    return token
  },
  async session({ session, token }) {
    session.user.id = token.id     // typed
    session.user.role = token.role // typed
    return session
  },
}
```

### Typed signIn/signOut

```typescript
"use server"
import { signIn, signOut } from "@/auth"

export async function loginAction() {
  await signIn("github", { redirectTo: "/dashboard" })
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}
```

---

## 8. Edge Runtime Considerations

### The Problem

Next.js middleware runs in the Edge Runtime, which has no Node.js APIs (no `fs`, limited `crypto`, no TCP sockets). Most database clients (Prisma, Drizzle with PG) require TCP, so they cannot run in middleware.

**Auth.js middleware only supports JWT session strategy.** If you use a database adapter, you must split your config.

### Split Config Pattern

```typescript
// auth.config.ts — edge-safe (no DB imports)
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"

export const authConfig: NextAuthConfig = {
  providers: [GitHub, Credentials({ /* ... */ })],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = nextUrl.pathname.startsWith("/dashboard")
      if (isProtected && !isLoggedIn) return false
      return true
    },
  },
}
```

```typescript
// auth.ts — full config with adapter (Node.js only)
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },  // JWT required with edge middleware
})
```

```typescript
// middleware.ts — only imports edge-safe config
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)
export default auth
export const config = { matcher: ["/((?!api/auth|_next).*)"] }
```

> When using a database adapter + edge middleware, always set `session: { strategy: "jwt" }`. The adapter stores user/account data, but sessions are managed via JWT cookies.

---

## 9. Migration from NextAuth v4

### Environment Variables

```bash
# v4
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://example.com

# v5
AUTH_SECRET=...
# AUTH_URL optional — auto-detected
# Provider vars renamed:
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

### Config File

```typescript
// v4: pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

export default NextAuth({
  providers: [GithubProvider({ clientId: "...", clientSecret: "..." })],
})
```

```typescript
// v5: auth.ts (project root)
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub],  // ENV auto-detected
})

// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth"
```

### Session Access

| Context | v4 | v5 |
|---------|-----|-----|
| Server Component | `getServerSession(authOptions)` | `await auth()` |
| API Route (Node) | `getServerSession(req, res, authOptions)` | `auth(req, res)` |
| `getServerSideProps` | `getServerSession(ctx.req, ctx.res, authOptions)` | `auth(context)` |
| Middleware | `withAuth()` wrapper | `export { auth as middleware }` |

### Adapter Packages

```bash
# v4
npm install @next-auth/prisma-adapter
npm install @next-auth/drizzle-adapter

# v5
npm install @auth/prisma-adapter
npm install @auth/drizzle-adapter
```

### Type Changes

```typescript
// v4
import type { NextAuthOptions } from "next-auth"

// v5
import type { NextAuthConfig } from "next-auth"
```

### Cookie Names

Auth.js v5 renames cookies from `next-auth.*` to `authjs.*`. Existing sessions will be invalidated — users will be logged out on first visit after upgrading.

### What Didn't Change

- Database schema — no migrations needed
- `useSession()` hook API
- Client-side `signIn()` / `signOut()` behavior
- Callback signatures (`signIn`, `jwt`, `session`, `redirect`)

---

## 10. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `getServerSession(authOptions)` in v5 | Replace with `await auth()` |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` env vars | Rename to `AUTH_SECRET` / `AUTH_URL` |
| `@next-auth/prisma-adapter` package | Install `@auth/prisma-adapter` instead |
| Database adapter without `strategy: "jwt"` when using edge middleware | Set `session: { strategy: "jwt" }` and use split config pattern |
| Missing `SessionProvider` in layout | Wrap root layout — required for `useSession()` |
| Returning `undefined` from `authorize()` | Return `null` to reject credentials sign-in |
| Database session with credentials provider | Credentials always uses JWT — use `session: { strategy: "jwt" }` |
| Not extending TypeScript types | Add `types/next-auth.d.ts` for `session.user.id` / `session.user.role` |
| Exposing sensitive data in session callback | Only copy needed fields from token to session — don't spread `token` |
| Using OAuth 1.0 providers (Twitter v1) | Migrate to OAuth 2.0 — v5 dropped OAuth 1.0 |
| `AUTH_URL` not set behind a proxy | Set `AUTH_TRUST_HOST=true` or provide `AUTH_URL` explicitly |
| Forgetting `onDelete: Cascade` in Prisma schema | Account/Session deletion fails when user is deleted |
