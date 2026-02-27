---
model: claude-sonnet-4-6
name: clerk
description: Use when implementing authentication with Clerk — drop-in UI components, organization management, user management, or webhook integration. Also use when adding auth to a project quickly without building custom auth UI.
---

# Clerk

## Quick Reference

| Item | Value |
|------|-------|
| **Install (Next.js)** | `npm install @clerk/nextjs` |
| **Install (React)** | `npm install @clerk/react` |
| **Install (Astro)** | `npm install @clerk/astro` |
| **Docs** | https://clerk.com/docs |
| **Free tier** | 50,000 MAU, 100 orgs, no credit card |
| **Key change** | `clerkMiddleware()` replaced `authMiddleware` |

## Setup (Next.js App Router)

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher(['/dashboard(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

```typescript
// app/layout.tsx — wrap entire app with ClerkProvider
import { ClerkProvider } from '@clerk/nextjs'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html lang="en"><body>{children}</body></html></ClerkProvider>
}
```

```bash
# .env.local — omit in dev for keyless mode (Clerk auto-generates temp keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## auth() — Server-Side

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

// RSC / Server Action / Route Handler
const { userId, orgId, orgRole } = await auth()
if (!userId) redirect('/sign-in')

// Full user object (extra network call — avoid in middleware)
const user = await currentUser()
user?.emailAddresses[0].emailAddress
```

## Components

| Component | Purpose |
|-----------|---------|
| `<SignIn />` | Full sign-in UI page |
| `<SignUp />` | Full sign-up UI page |
| `<UserButton />` | Avatar dropdown (sign out, profile) |
| `<UserProfile />` | Full profile management |
| `<SignedIn>` / `<SignedOut>` | Conditional render wrappers |
| `<OrganizationSwitcher />` | Org picker + create UI |
| `<Protect>` | Render children only with given permission/role |

## Client Hooks

```typescript
import { useAuth, useUser, useOrganization } from '@clerk/nextjs'

const { userId, isSignedIn, isLoaded, has } = useAuth()
const { user } = useUser()
const { organization, membership } = useOrganization()

has({ permission: 'org:billing:manage' })  // permission check
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `authMiddleware()` still in use | Replaced by `clerkMiddleware()` — update imports |
| `auth()` in a Client Component | Server-only — use `useAuth()` on the client |
| Missing `await` on `auth()` | It's async — always `await auth()` |
| No `<ClerkProvider>` in layout | Hooks and components require provider in tree |
| `currentUser()` in middleware | Use `auth()` instead — `currentUser()` makes a network call |
| `await auth.protect()` missing `await` | Silently fails without it |

See `reference.md` for: React/Remix/Astro setup, all components API, middleware options, organizations CRUD, webhook sync with `verifyWebhook`, appearance customization, and pricing details.
