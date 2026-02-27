# Supabase Auth — Full Reference

> General Supabase setup (project creation, database, storage, Edge Functions) → see `supabase` skill.
> This reference covers auth flows, session management, RLS integration, and auth hooks.

---

## 1. Setup

### Next.js App Router (SSR — recommended)

```bash
npm install @supabase/supabase-js @supabase/ssr
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJh...
```

Or use the official starter (pre-configured with cookie auth + TypeScript + Tailwind):

```bash
npx create-next-app -e with-supabase
```

### React SPA (no SSR)

```bash
npm install @supabase/supabase-js
```

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

SPA uses localStorage for session persistence. PKCE flow is still used for OAuth/magic links.

### Standalone Node.js / Edge Functions

```ts
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, anonKey, {
  auth: { persistSession: false }  // stateless — no session storage
})
// For admin operations (bypasses RLS):
const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
```

---

## 2. Client Creation — @supabase/ssr

`@supabase/ssr` provides two factory functions. Both auto-configure PKCE flow and cookie-based session storage for SSR contexts.

### Server Client (Server Components, Route Handlers, Server Actions)

```ts
// lib/supabase/server.ts
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — cookies set by middleware instead
          }
        },
      },
    }
  )
}
```

Server Components cannot set cookies directly — the `try/catch` above is intentional. The middleware handles session refresh and cookie propagation.

### Browser Client (Client Components)

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

Use a singleton pattern to avoid creating multiple clients per render:

```ts
// In a Client Component
const supabase = useMemo(() => createClient(), [])
```

---

## 3. Middleware (Session Refresh)

Next.js Server Components cannot write cookies. Middleware must refresh the session on every request and propagate the updated token to both server and browser.

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() here — refreshes the token
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users from protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Critical:** Do not create a new `NextResponse.next()` in middleware after calling `supabase.auth.getUser()` — this drops cookies. Always return `supabaseResponse`.

---

## 4. Auth Callback Route

OAuth and magic links redirect to `/auth/callback` with a `code` param. Exchange it for a session:

```ts
// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }}
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

---

## 5. Email / Password

### Sign Up

```ts
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
    data: { full_name: 'Jane Doe' }  // stored in auth.users.raw_user_meta_data
  }
})
// data.user is set immediately; data.session is null until email confirmed
// data.user.confirmation_sent_at indicates email was sent
```

If "Confirm email" is disabled in the dashboard, `data.session` is returned immediately.

### Email Confirmation

```ts
// After user clicks link in email → /auth/callback?code=xxx
// The callback route above handles this automatically via exchangeCodeForSession()

// Check if user is confirmed:
const { data: { user } } = await supabase.auth.getUser()
const confirmed = user?.email_confirmed_at != null
```

### Sign In

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})
// data.session.access_token — JWT, expires in 1hr by default
// data.session.refresh_token — used to get new access tokens
```

### Password Reset

```ts
// Step 1: Send reset email
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: `${location.origin}/auth/callback?next=/account/update-password`
})

// Step 2: User clicks link → auth/callback → session established
// Step 3: Update password
const { error } = await supabase.auth.updateUser({ password: 'new-password' })
```

### Update Email / Password

```ts
// Must be authenticated
await supabase.auth.updateUser({ email: 'new@example.com' })  // sends confirmation
await supabase.auth.updateUser({ password: 'new-password' })
await supabase.auth.updateUser({ data: { full_name: 'New Name' } })  // user_metadata
```

---

## 6. OAuth

### Basic Flow

```ts
// Client Component — redirects browser to provider
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${location.origin}/auth/callback`,
    scopes: 'email profile',            // optional extra scopes
    queryParams: { access_type: 'offline', prompt: 'consent' }  // Google-specific
  }
})
```

Supported providers: `google`, `github`, `discord`, `twitter`, `facebook`, `apple`, `azure`, `gitlab`, `bitbucket`, `notion`, `slack`, `spotify`, `twitch`, `zoom`, `linkedin`, `kakao`, `keycloak`, `workos`.

### Provider Configuration (Dashboard)

1. Authentication → Providers → enable provider
2. Add Client ID + Secret from provider's developer console
3. Copy Supabase callback URL → paste into provider's allowed redirects
4. Set `redirectTo` in `signInWithOAuth` to your app URL (must match Site URL or Additional Redirect URLs in dashboard)

### Google Setup Specifics

```
Provider console: console.cloud.google.com → APIs & Services → Credentials
Authorized redirect URIs: https://xxxx.supabase.co/auth/v1/callback
Supabase dashboard: add https://yourapp.com/auth/callback to "Redirect URLs"
```

### Server-Side OAuth (PKCE — no popup)

```ts
// For environments where you can't redirect the browser (e.g., Server Actions):
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${origin}/auth/callback`,
    skipBrowserRedirect: true  // returns URL instead of redirecting
  }
})
if (data.url) redirect(data.url)  // Next.js redirect()
```

---

## 7. Magic Links

```ts
// Send magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
    shouldCreateUser: true,   // create account if not exists (default: true)
    data: { full_name: 'Jane' }  // only for new users
  }
})

// Phone OTP (SMS — requires Twilio/Vonage config)
await supabase.auth.signInWithOtp({ phone: '+15551234567' })
// Verify phone OTP:
await supabase.auth.verifyOtp({ phone: '+15551234567', token: '123456', type: 'sms' })
```

Magic links are one-time use and expire in 1 hour. Users can only request one per 60 seconds. After clicking, the `/auth/callback` route handles session creation via `exchangeCodeForSession()`.

---

## 8. Session Management

### getUser() vs getSession()

```ts
// Server-side: ALWAYS use getUser()
// Makes a network request to auth server to validate the JWT
const { data: { user }, error } = await supabase.auth.getUser()

// Client-side: getSession() is fine (no network round-trip)
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user
```

`getSession()` reads the session from cookie/localStorage without contacting the server — it cannot detect a revoked token, disabled account, or password change. On the server, an attacker could craft a valid-looking but invalidated JWT that `getSession()` accepts. `getUser()` validates against the auth server every time.

### Listening to Auth State Changes (Client)

```ts
// Use in useEffect to react to sign-in / sign-out
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') setUser(null)
      if (event === 'TOKEN_REFRESHED') console.log('Token refreshed')
      if (event === 'PASSWORD_RECOVERY') router.push('/account/update-password')
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

Events: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`, `MFA_CHALLENGE_VERIFIED`.

### Sign Out

```ts
// Client-side
await supabase.auth.signOut()  // clears local session + invalidates refresh token

// Scope options:
await supabase.auth.signOut({ scope: 'local' })   // this device only
await supabase.auth.signOut({ scope: 'global' })  // all devices (default)
await supabase.auth.signOut({ scope: 'others' })  // all other devices
```

### PKCE Flow

`@supabase/ssr` uses PKCE (Proof Key for Code Exchange) by default. The flow:
1. Client generates `code_verifier` + `code_challenge`
2. Auth request sends `code_challenge` to Supabase
3. Supabase redirects to `/auth/callback?code=xxx`
4. `/auth/callback` calls `exchangeCodeForSession(code)` — code is one-time use, expires in 5 minutes
5. Supabase validates against original `code_verifier`, returns tokens

This prevents authorization code interception attacks. The code cannot be reused or used without the original verifier.

---

## 9. RLS Integration

Supabase Auth integrates with RLS via helper functions in SQL. Always enable RLS before writing policies.

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### Core Auth Functions

```sql
auth.uid()      -- UUID of authenticated user, NULL for anon
auth.role()     -- 'authenticated' | 'anon' | 'service_role'
auth.jwt()      -- full decoded JWT as JSONB
auth.email()    -- user's email from JWT
```

**Always wrap in `(SELECT ...)`** to prevent per-row evaluation:

```sql
-- Bad: re-evaluated for every row
USING (auth.uid() = user_id)

-- Good: evaluated once, result cached by query planner
USING ((SELECT auth.uid()) = user_id)
```

### Common Policy Patterns

```sql
-- Own data (read)
CREATE POLICY "read own" ON posts FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Own data (write)
CREATE POLICY "write own" ON posts FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Public read
CREATE POLICY "public read" ON posts FOR SELECT TO anon, authenticated
  USING (published = true);

-- Multi-tenant (org membership)
CREATE POLICY "org members" ON posts FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Role-based via user_metadata
CREATE POLICY "admins only" ON settings FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Role-based via custom JWT claim (requires custom access token hook)
CREATE POLICY "admins only" ON settings FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'admin');
```

### Accessing auth.users in Policies

`auth.users` is not directly accessible from the `public` schema. Use a view or join via a profiles table:

```sql
-- Standard pattern: mirror auth.users to public.profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user'
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### User Metadata

```ts
// user_metadata — user-writable, safe for display data
await supabase.auth.updateUser({ data: { full_name: 'Jane', avatar_url: '...' } })

// app_metadata — admin-only (service_role), use for roles/permissions
// Set via admin API or custom access token hook
```

In SQL: `auth.jwt() -> 'user_metadata'` and `auth.jwt() -> 'app_metadata'`.

---

## 10. Auth Hooks

Hooks intercept the auth flow to add custom behavior. Two execution modes: Postgres functions or HTTP endpoints.

### Available Hooks (with tier requirements)

| Hook | Tier | Fires When |
|------|------|-----------|
| Before User Created | Free, Pro | Before new account created |
| Custom Access Token | Free, Pro | Each time a new JWT is issued |
| Send SMS | Free, Pro | Before SMS is sent |
| Send Email | Free, Pro | Before email is sent |
| MFA Verification Attempt | Teams, Enterprise | Each MFA check |
| Password Verification Attempt | Teams, Enterprise | Each password check |

### Custom Access Token Hook (add claims to JWT)

```sql
-- Postgres function approach
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  -- Get role from profiles table
  SELECT role INTO user_role FROM public.profiles WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';
  -- Add custom claim to JWT
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'user')));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;
```

After adding: Dashboard → Authentication → Hooks → Custom Access Token → select the function.

Now access the claim in RLS:
```sql
USING ((SELECT auth.jwt() ->> 'user_role') = 'admin')
```

Or in TypeScript:
```ts
const { data: { user } } = await supabase.auth.getUser()
const role = user?.app_metadata?.user_role  // after hook adds to claims
```

### Before User Created Hook (block signups)

```sql
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event JSONB)
RETURNS JSONB AS $$
BEGIN
  -- Block signups from certain domains
  IF (event->>'email') NOT LIKE '%@yourcompany.com' THEN
    RAISE EXCEPTION 'Only company emails allowed';
  END IF;
  RETURN event;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. MFA

```ts
// Step 1: Enroll a TOTP factor
const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
// data.totp.qr_code — SVG QR code for authenticator app
// data.totp.secret — manual entry key
// data.id — factor ID, save this

// Step 2: Verify enrollment (user scans QR and enters code)
const { data, error } = await supabase.auth.mfa.challengeAndVerify({
  factorId: data.id,
  code: '123456'
})

// Step 3: Check AAL (Authenticator Assurance Level) after sign-in
const { data: { currentLevel, nextLevel } } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
// currentLevel: 'aal1' | 'aal2'
// nextLevel: 'aal1' | 'aal2' — what's required given enrolled factors

// Step 4: If nextLevel is 'aal2', challenge the user
const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
const { error } = await supabase.auth.mfa.verify({
  factorId,
  challengeId: challenge.id,
  code: userEnteredCode
})

// RLS: require MFA
CREATE POLICY "mfa required" ON sensitive_table FOR SELECT TO authenticated
  USING ((SELECT (auth.jwt()->>'aal') = 'aal2'));
```

---

## 12. Protected Routes

### Middleware-Level Protection (recommended)

```ts
// middleware.ts — runs before every request
const { data: { user } } = await supabase.auth.getUser()

const protectedPaths = ['/dashboard', '/account', '/admin']
const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

if (!user && isProtected) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}
```

### Server Component Check

```ts
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <div>Hello {user.email}</div>
}
```

### Route Handler Auth

```ts
// app/api/protected/route.ts
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // user is validated — safe to query
  const { data } = await supabase.from('posts').select('*').eq('user_id', user.id)
  return Response.json({ data })
}
```

---

## 13. Email (SMTP) Configuration

The built-in email service is for development only. Production must use custom SMTP.

```
Dashboard → Project Settings → Authentication → SMTP Settings
```

Recommended providers: Resend, Postmark, SendGrid, AWS SES.

```ts
// Resend + Supabase custom SMTP
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Pass: re_xxxxxxxxxxxx
Sender email: auth@yourdomain.com
```

After configuring custom SMTP, increase rate limits:
```
Dashboard → Authentication → Rate Limits → adjust per-hour limits
```

---

## 14. Rate Limits & Pricing

### Default Limits (all tiers)

| Endpoint | Default Limit |
|----------|--------------|
| Email sending (`/signup`, `/recover`, `/otp`, `/magiclink`) | 2 emails/hr (built-in SMTP) |
| OTP endpoint | 30 OTPs/hr total |
| Per-user OTP cooldown | 60 seconds between requests |
| Token refresh | 1800/hr per IP |
| Verification (`/verify`) | 360/hr per IP |

Custom SMTP removes the 2 emails/hr ceiling — set your own limit in dashboard.

### Auth Pricing

| Feature | Free | Pro ($25/mo) | Teams | Enterprise |
|---------|------|--------------|-------|-----------|
| MAUs | 50,000 | 100,000 | Custom | Custom |
| Social OAuth providers | ✓ | ✓ | ✓ | ✓ |
| Custom SMTP | ✓ | ✓ | ✓ | ✓ |
| Auth hooks (basic) | ✓ | ✓ | ✓ | ✓ |
| MFA Verification Hook | ✗ | ✗ | ✓ | ✓ |
| Password Verification Hook | ✗ | ✗ | ✓ | ✓ |
| SSO (SAML) | ✗ | 1 connection | Custom | Custom |

Free tier pauses entire project after 7 days inactivity — use Pro for production.

---

## 15. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `getSession()` server-side | Use `getUser()` — validates JWT against auth server |
| Creating new `NextResponse.next()` after middleware auth | Return `supabaseResponse`, not a new response — drops cookies |
| Missing `/auth/callback` route | OAuth + magic links won't work without `exchangeCodeForSession()` |
| Bare `auth.uid()` in RLS | Wrap: `(SELECT auth.uid())` — cached by planner, prevents per-row calls |
| Not enabling RLS | Default Postgres = no access control — all rows visible to anon |
| `service_role` key client-side | Bypasses RLS entirely — server/Edge Function only |
| User metadata for roles | Use `app_metadata` or custom JWT claims — `user_metadata` is user-writable |
| Built-in SMTP in production | Hard limit of 2 emails/hr — configure custom SMTP |
| No index on RLS filter columns | `user_id`, `org_id` etc — RLS runs on every row access |
| Forgetting `emailRedirectTo` | OAuth/magic links redirect to Supabase, not your app |
| `shouldCreateUser: false` not set | Magic link signInWithOtp creates accounts by default |
| Auth hooks without GRANT | Must `GRANT EXECUTE ON FUNCTION ... TO supabase_auth_admin` |
