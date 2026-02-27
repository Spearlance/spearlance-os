# Clerk Reference

Current SDK: `@clerk/nextjs` — see https://clerk.com/docs for latest.

---

## 1. Setup

### Next.js App Router

```bash
npm install @clerk/nextjs
```

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Optional: custom sign-in/up paths
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

> **Keyless mode**: Omit env vars during development and Clerk auto-generates temporary credentials. A dashboard prompt lets you claim the app later.

```typescript
// app/layout.tsx
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut><SignInButton /></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

```typescript
// middleware.ts (Next.js ≤15: middleware.ts, Next.js 15+: proxy.ts works too)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher(['/dashboard(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### React (Vite / CRA)

```bash
npm install @clerk/react
```

```typescript
// main.tsx
import { ClerkProvider } from '@clerk/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
)
```

### Remix

```bash
npm install @clerk/remix
```

```typescript
// app/root.tsx
import { ClerkApp } from '@clerk/remix'
import { rootAuthLoader } from '@clerk/remix/ssr.server'

export const loader = (args: LoaderFunctionArgs) => rootAuthLoader(args)

export default ClerkApp(App)
```

```typescript
// app/entry.server.tsx — wrap with ClerkCatchBoundary
import { ClerkCatchBoundary } from '@clerk/remix'
export const CatchBoundary = ClerkCatchBoundary()
```

### Astro

```bash
npm install @clerk/astro
```

```typescript
// astro.config.mjs
import clerk from '@clerk/astro'
import react from '@astrojs/react'
import node from '@astrojs/node'

export default defineConfig({
  output: 'server',  // required for SSR
  adapter: node({ mode: 'standalone' }),
  integrations: [clerk(), react()],
})
```

```typescript
// src/middleware.ts
import { clerkMiddleware } from '@clerk/astro/server'
export const onRequest = clerkMiddleware()
```

---

## 2. Components

### Pre-built Auth Pages

Mount these inside your own pages — Clerk renders the full form UI:

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return <SignIn />
}

// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'
export default function SignUpPage() {
  return <SignUp />
}
```

### UserButton

Renders the user's avatar. Opens a dropdown with profile management, org switcher, and sign out.

```typescript
import { UserButton } from '@clerk/nextjs'

// Default
<UserButton />

// With custom menu items
<UserButton>
  <UserButton.MenuItems>
    <UserButton.Link label="Billing" labelIcon={<CreditCard />} href="/billing" />
    <UserButton.Action label="Help" labelIcon={<HelpCircle />} onClick={() => openHelp()} />
  </UserButton.MenuItems>
</UserButton>
```

### UserProfile

Full profile management UI — email, password, connected accounts, MFA:

```typescript
import { UserProfile } from '@clerk/nextjs'

// Embedded (not a modal)
<UserProfile />

// With custom pages
<UserProfile>
  <UserProfile.Page label="My App Settings" url="settings" labelIcon={<Settings />}>
    <MySettingsComponent />
  </UserProfile.Page>
</UserProfile>
```

### OrganizationSwitcher

Org picker with the ability to create/switch orgs. Appears in the `<UserButton />` by default or standalone:

```typescript
import { OrganizationSwitcher } from '@clerk/nextjs'

<OrganizationSwitcher
  hidePersonalAccount={false}
  afterSelectOrganizationUrl="/dashboard"
  afterCreateOrganizationUrl="/dashboard"
/>
```

### Conditional Rendering

```typescript
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

<SignedOut>
  <SignInButton mode="modal" />
</SignedOut>
<SignedIn>
  <UserButton />
</SignedIn>
```

### Component Summary

| Component | Purpose |
|-----------|---------|
| `<SignIn />` | Full sign-in form |
| `<SignUp />` | Full sign-up form |
| `<UserButton />` | Avatar dropdown with sign-out |
| `<UserProfile />` | Full profile manager |
| `<OrganizationSwitcher />` | Org picker + create org |
| `<CreateOrganization />` | Org creation form only |
| `<OrganizationProfile />` | Full org settings page |
| `<SignedIn>` | Renders children only when signed in |
| `<SignedOut>` | Renders children only when signed out |
| `<Protect>` | Renders children only with given permission/role |

---

## 3. Middleware

### clerkMiddleware

`clerkMiddleware()` replaced `authMiddleware()`. All routes are **public by default** — you opt-in to protection.

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Protect specific routes
const isProtected = createRouteMatcher([
  '/dashboard(.*)',
  '/api/protected(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect()  // redirects to sign-in if unauthenticated
  }
})
```

### Role-Based Protection

```typescript
export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect({ role: 'org:admin' })  // 404 if wrong role
  }
  if (isProtected(req)) {
    await auth.protect()
  }
})
```

### Permission-Based Protection

```typescript
export default clerkMiddleware(async (auth, req) => {
  if (isBillingRoute(req)) {
    await auth.protect({ permission: 'org:billing:manage' })
  }
})
```

### Accessing Auth in Middleware

```typescript
export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, orgRole } = await auth()

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url })
  }

  // Custom redirect logic
  if (req.nextUrl.pathname === '/' && orgId) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})
```

### Matcher Config

The matcher skips Next.js internals and static assets while always running for API routes:

```typescript
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Key Options

| Option | Purpose |
|--------|---------|
| `signInUrl` | Override sign-in redirect URL |
| `signUpUrl` | Override sign-up redirect URL |
| `clockSkewInMs` | Token clock skew tolerance (default: 5000ms) |
| `authorizedParties` | Protect against subdomain cookie leaks |
| `debug` | Log middleware decisions to terminal |

---

## 4. Server-Side Auth

### auth() — RSC, Route Handlers, Server Actions

`auth()` is async and returns the `Auth` object. Requires `clerkMiddleware()` to be configured.

```typescript
import { auth } from '@clerk/nextjs/server'

// React Server Component
export default async function DashboardPage() {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')

  const data = await fetchData(userId)
  return <Dashboard data={data} />
}
```

```typescript
// Route Handler
export async function GET() {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })
  return Response.json(await getUserData(userId))
}

// Server Action
'use server'
export async function updateProfile() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  await db.users.update({ id: userId })
}
```

### Auth Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `userId` | `string \| null` | Current user's ID |
| `sessionId` | `string \| null` | Current session ID |
| `orgId` | `string \| null` | Active organization ID |
| `orgRole` | `string \| null` | User's role in active org |
| `orgSlug` | `string \| null` | Active org slug |
| `sessionClaims` | `object` | Full JWT claims |

### auth().protect()

```typescript
// Redirects to sign-in if unauthenticated, 404 if unauthorized
const { userId } = await auth.protect()

// With role check
await auth.protect({ role: 'org:admin' })

// With permission check
await auth.protect({ permission: 'org:billing:manage' })

// With custom condition
await auth.protect((has) => has({ permission: 'org:posts:create' }))
```

### currentUser() — Full User Object

```typescript
import { currentUser } from '@clerk/nextjs/server'

const user = await currentUser()
// user is null if not signed in
user?.id
user?.emailAddresses[0].emailAddress
user?.firstName
user?.lastName
user?.imageUrl
user?.publicMetadata  // set server-side
user?.unsafeMetadata  // set client-side
```

> `currentUser()` makes a network call to the Clerk API. Prefer `auth()` for just the ID.

### getToken() — JWT for External APIs

```typescript
const { getToken } = await auth()

// Default Clerk session token
const token = await getToken()

// Custom JWT template
const token = await getToken({ template: 'my-template' })
```

---

## 5. Client-Side Auth

### useAuth

```typescript
'use client'
import { useAuth } from '@clerk/nextjs'

export function Component() {
  const { isLoaded, isSignedIn, userId, orgId, orgRole, has, getToken } = useAuth()

  if (!isLoaded) return <Spinner />
  if (!isSignedIn) return <SignInButton />

  // Permission check
  const canManageBilling = has({ permission: 'org:billing:manage' })

  return <Dashboard />
}
```

### useUser

```typescript
'use client'
import { useUser } from '@clerk/nextjs'

const { isLoaded, isSignedIn, user } = useUser()
// user.firstName, user.lastName, user.primaryEmailAddress?.emailAddress, user.imageUrl

// Update from client
await user.update({ firstName: 'New', unsafeMetadata: { onboarded: true } })
```

### useOrganization

```typescript
'use client'
import { useOrganization } from '@clerk/nextjs'

const { isLoaded, organization, membership, memberships } = useOrganization({
  memberships: { limit: 10 },  // paginate members
})
// organization.name, membership?.role, memberships?.count
```

### useSignIn / useClerk

```typescript
'use client'
import { useSignIn, useClerk } from '@clerk/nextjs'

const { signIn } = useSignIn()
await signIn.create({ identifier: email, password })  // custom sign-in flow

const { signOut } = useClerk()
await signOut({ redirectUrl: '/' })
```

### Hook Summary

| Hook | Returns |
|------|---------|
| `useAuth()` | `userId`, `orgId`, `isSignedIn`, `has()`, `getToken()` |
| `useUser()` | `user` object, `isSignedIn`, `isLoaded` |
| `useOrganization()` | `organization`, `membership`, `memberships` |
| `useOrganizationList()` | `userMemberships`, `createOrganization()` |
| `useSession()` | `session`, `isActive` |
| `useClerk()` | Full `Clerk` object, `signOut()`, `openSignIn()` |

---

## 6. Organizations

### Enable Organizations

Enable via Clerk Dashboard → Organizations, or during development Clerk will auto-prompt you.

### Create an Organization

Use the pre-built `<CreateOrganization />` component, or via hook:

```typescript
const { createOrganization } = useOrganizationList()
const org = await createOrganization({ name: 'Acme Inc' })
// org.id, org.slug, org.name
```

### Invite Members

```typescript
'use client'
import { useOrganization } from '@clerk/nextjs'

export function InviteMember() {
  const { organization } = useOrganization()

  const invite = async (email: string) => {
    await organization?.inviteMember({
      emailAddress: email,
      role: 'org:member',  // or 'org:admin'
    })
  }
}
```

### Default Roles

| Role | Identifier |
|------|-----------|
| Admin | `org:admin` |
| Member | `org:member` |

Create up to 10 custom roles per instance via Dashboard → Organizations → Roles.

### Permissions

```typescript
// Check permission server-side
const { has } = await auth()
if (!has({ permission: 'org:billing:manage' })) {
  return new Response('Forbidden', { status: 403 })
}

// Check permission client-side
const { has } = useAuth()
const canEdit = has({ permission: 'org:posts:edit' })

// In RSC with <Protect>
import { Protect } from '@clerk/nextjs'
<Protect permission="org:billing:manage" fallback={<p>No access</p>}>
  <BillingPage />
</Protect>
```

### Switch Active Organization

```typescript
const { setActive, userMemberships } = useOrganizationList({ userMemberships: { infinite: true } })

// Switch to org
await setActive({ organization: orgId })
```

Or use `<OrganizationSwitcher />` for a pre-built dropdown UI.

### Manage Memberships (Server-Side)

```typescript
import { clerkClient } from '@clerk/nextjs/server'

const clerk = await clerkClient()

// Get org members
const members = await clerk.organizations.getOrganizationMembershipList({
  organizationId: orgId,
})

// Update member role
await clerk.organizations.updateOrganizationMembership({
  organizationId: orgId,
  userId,
  role: 'org:admin',
})

// Remove member
await clerk.organizations.deleteOrganizationMembership({
  organizationId: orgId,
  userId,
})
```

---

## 7. Webhooks

Clerk uses Svix for webhook delivery. Use `verifyWebhook` from `@clerk/nextjs/webhooks` — no separate Svix package needed.

### Setup

1. Go to Clerk Dashboard → Webhooks → Add Endpoint
2. Set your endpoint URL (e.g., `https://yourapp.com/api/webhooks/clerk`)
3. Select events to subscribe to
4. Copy the **Signing Secret** (`whsec_...`)

```bash
# .env.local
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

### Next.js Route Handler

```typescript
// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)

    const { id } = evt.data
    const eventType = evt.type

    if (evt.type === 'user.created') {
      // evt.data is fully typed as UserJSON
      await db.users.create({
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0]?.email_address,
        firstName: evt.data.first_name,
        lastName: evt.data.last_name,
      })
    }

    if (evt.type === 'user.updated') {
      await db.users.update({
        where: { clerkId: evt.data.id },
        data: {
          email: evt.data.email_addresses[0]?.email_address,
          firstName: evt.data.first_name,
        },
      })
    }

    if (evt.type === 'user.deleted') {
      await db.users.delete({ where: { clerkId: evt.data.id } })
    }

    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }
}
```

> **Note:** Return 2xx to stop Clerk retrying the event. Return 4xx/5xx to trigger retries.

### Common Webhook Events

| Event | Trigger |
|-------|---------|
| `user.created` | New user signs up |
| `user.updated` | User profile changes |
| `user.deleted` | User account deleted |
| `session.created` | User signs in |
| `session.ended` | Session expires/revoked |
| `organization.created` | New org created |
| `organization.updated` | Org details change |
| `organizationMembership.created` | User joins org |
| `organizationMembership.deleted` | User leaves org |
| `organizationInvitation.created` | Invite sent |
| `organizationInvitation.accepted` | Invite accepted |

### Local Development (ngrok)

```bash
npx ngrok http 3000
# Use the HTTPS URL from ngrok as your webhook endpoint in Clerk Dashboard
```

---

## 8. Customization

### Appearance Prop

Pass `appearance` to any component or `<ClerkProvider>` for global theming:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

// Global dark theme
<ClerkProvider appearance={{ baseTheme: dark }}>

// Custom variables (global)
<ClerkProvider appearance={{
  variables: {
    colorPrimary: '#6c47ff',
    colorBackground: '#ffffff',
    colorText: '#1a1a1a',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, sans-serif',
  },
}}>

// Component-specific overrides
<SignIn appearance={{
  elements: {
    formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',  // Tailwind classes
    card: 'shadow-none border border-gray-200',
    headerTitle: 'text-2xl font-bold',
  },
}} />
```

### Available Themes

```bash
npm install @clerk/themes
```

| Theme | Import |
|-------|--------|
| Dark | `import { dark } from '@clerk/themes'` |
| Shadesof Purple | `import { shadesOfPurple } from '@clerk/themes'` |
| Neo Brutalism | `import { neobrutalism } from '@clerk/themes'` |

### Localization

```typescript
import { frFR } from '@clerk/localizations'

<ClerkProvider localization={frFR}>
```

Available localizations: `enUS` (default), `frFR`, `deDE`, `esES`, `ptBR`, `jaJP`, `zhCN`, and many more. See https://clerk.com/docs/customization/localization for the full list.

### Custom Sign-In/Up Pages

Route-based: mount `<SignIn />` and `<SignUp />` at your custom paths:

```bash
# .env.local
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

---

## 9. Pricing & Limits

| Tier | Price | MAU included |
|------|-------|--------------|
| **Free** | $0/mo | 50,000 MAU |
| **Pro** | $25/mo (or $20/mo annual) | 50,000 MAU |
| **Enterprise** | Custom | Custom |

**Free tier includes:**
- Unlimited applications
- 3 dashboard seats
- Up to 3 social connections
- Webhooks
- Bot protection
- 100 Monthly Retained Organizations (MROs)
- Up to 20 org members per org

**Pro adds:**
- Remove Clerk branding
- Multi-factor authentication (MFA)
- Passkeys
- Custom password requirements
- Custom email/SMS templates
- User bans, allowlists/blocklists
- Custom session duration
- 1 enterprise SSO connection included ($75/mo each additional)

**Organizations add-on (B2B):** $100/mo (or $85/mo annual) — unlimited members, advanced roles/permissions, unlimited org invitations.

**MAU overage (Pro):** $0.02 per user beyond 50,000. First-day users are not counted (churn protection).

---

## 10. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `authMiddleware()` still in use | Replaced by `clerkMiddleware()` — update all imports |
| `auth()` in a Client Component | Server-only — use `useAuth()` on the client |
| Missing `await` on `auth()` | It's async — `const { userId } = await auth()` |
| `auth.protect()` without `await` | Must be `await auth.protect()` — silently fails otherwise |
| `currentUser()` in middleware | Too slow — middleware runs on every request; use `auth()` |
| No `<ClerkProvider>` wrapping the tree | All components and hooks require the provider |
| Forgetting `CLERK_WEBHOOK_SIGNING_SECRET` | Without it, `verifyWebhook` throws; add to `.env.local` |
| Raw body consumed before `verifyWebhook` | Don't call `req.json()` before `verifyWebhook(req)` |
| Returning nothing from webhook handler | Clerk retries on no-response; always return 200 on success |
| Protecting routes in `app/` via middleware only | Also protect in the RSC with `auth.protect()` for defense-in-depth |
| `orgRole` undefined when no org is active | User may have no active org — always null-check `orgId` |
| Setting `publicMetadata` from client | `publicMetadata` is server-write only — use `unsafeMetadata` for client writes |
