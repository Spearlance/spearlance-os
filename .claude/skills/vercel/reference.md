# Vercel — Developer Reference

> **Last Verified:** February 2026
> **Documentation:** https://vercel.com/docs
> **CLI Version:** `vercel@latest`

---

## Table of Contents

1. [Setup](#1-setup)
2. [Frameworks](#2-frameworks)
3. [Environment Variables](#3-environment-variables)
4. [Serverless Functions](#4-serverless-functions)
5. [Edge Functions](#5-edge-functions)
6. [Fluid Compute](#6-fluid-compute)
7. [Deployments](#7-deployments)
8. [Domains](#8-domains)
9. [Cron Jobs](#9-cron-jobs)
10. [Observability](#10-observability)
11. [Pricing & Limits](#11-pricing--limits)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Setup

### Import Project (Dashboard)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import from GitHub, GitLab, or Bitbucket
3. Vercel auto-detects framework and sets build/output defaults
4. Configure environment variables before first deploy
5. Click Deploy

### CLI Setup

```bash
npm i -g vercel
vercel login           # browser OAuth or email magic link
vercel link            # link cwd to existing Vercel project
vercel                 # deploy (preview)
vercel --prod          # deploy (production)
vercel dev             # local dev server with Edge/Function emulation
```

### vercel.json

Static configuration file at project root. Alternatively, use `vercel.ts` for dynamic/programmatic config at build time. Only one config file per project.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "next dev",
  "cleanUrls": true,
  "trailingSlash": false,
  "regions": ["iad1"],
  "fluid": true,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "memory": 512
    }
  },
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://upstream.example.com/:path*" }
  ],
  "redirects": [
    { "source": "/old-path", "destination": "/new-path", "permanent": true }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ],
  "crons": [
    { "path": "/api/cron/daily", "schedule": "0 5 * * *" }
  ]
}
```

### Key vercel.json Properties

| Property | Description |
|----------|-------------|
| `framework` | Framework preset (e.g., `nextjs`, `astro`, `remix`, `sveltekit`) |
| `buildCommand` | Override default build command |
| `outputDirectory` | Where build artifacts land |
| `cleanUrls` | Strip `.html` from URLs |
| `trailingSlash` | `true` adds slash, `false` removes, omit for no change |
| `regions` | Array of region codes for function execution |
| `fluid` | Enable Fluid Compute (`true`/`false`) |
| `functions` | Per-function config: `maxDuration`, `memory`, `runtime` |
| `rewrites` | Proxy/rewrite requests without redirecting the browser |
| `redirects` | Redirect with 301/302/307/308 response |
| `headers` | Add custom response headers |
| `crons` | Schedule function invocations |
| `ignoreCommand` | Exit code 1 = skip build, 0 = proceed |

---

## 2. Frameworks

### Next.js

Auto-detected. No vercel.json required for standard setups.

```json
{
  "framework": "nextjs"
}
```

Key behaviors:
- App Router and Pages Router both supported
- API routes (`app/api/**/route.ts`, `pages/api/**`) → Vercel Functions
- `middleware.ts` (or `proxy.ts` in Next.js 16+) → Edge runtime
- ISR with `revalidate` works via Vercel's CDN cache
- Image Optimization handled via Vercel's `/\_next/image` endpoint
- `NEXT_PUBLIC_*` vars exposed to browser; all others server-only

```json
{
  "framework": "nextjs",
  "functions": {
    "app/api/ai/route.ts": { "maxDuration": 60, "memory": 1024 }
  }
}
```

### Astro

```json
{
  "framework": "astro"
}
```

For SSR (server output mode), install the Vercel adapter:

```bash
npx astro add vercel
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',   // or 'hybrid' for partial SSR
  adapter: vercel(),
});
```

Static output (`output: 'static'`) needs no adapter — just deploy the `dist/` directory.

### Remix

```bash
npx create-remix@latest --template vercel
```

```json
{
  "framework": "remix",
  "buildCommand": "remix build",
  "outputDirectory": "public/build"
}
```

Vercel adapter handles loader/action routing to Functions automatically.

### SvelteKit

```bash
npm i -D @sveltejs/adapter-vercel
```

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',
      regions: ['iad1'],
    }),
  },
};
```

### Framework Detection

Vercel auto-detects via `package.json` scripts and config files. Override with `"framework"` in vercel.json or in Dashboard > Settings > General > Framework Preset.

---

## 3. Environment Variables

### Scopes

| Scope | When Available |
|-------|---------------|
| `production` | Deploys to production (git default branch or `vercel --prod`) |
| `preview` | All preview deployments (non-production branches) |
| `development` | `vercel dev` local server only |

A variable can be assigned to one, two, or all three scopes. Variables not set for a scope are absent at runtime — they do NOT fall back to another scope.

### Managing via CLI

```bash
vercel env add SECRET_KEY                  # interactive — picks scope + value
vercel env add SECRET_KEY production       # non-interactive with scope
vercel env pull .env.local                 # download all dev vars to .env.local
vercel env ls                              # list all vars (values hidden)
vercel env rm SECRET_KEY production        # remove a var
```

### Managing via Dashboard

Dashboard > Project > Settings > Environment Variables

Supports:
- Plain text values
- Sensitive values (write-only, value hidden after save)
- Linking to Vercel integrations (e.g., Neon, Upstash auto-inject vars)

### System Environment Variables

Vercel injects these automatically at build/runtime:

| Variable | Value |
|----------|-------|
| `VERCEL` | `"1"` (always set) |
| `VERCEL_ENV` | `"production"`, `"preview"`, or `"development"` |
| `VERCEL_URL` | Deployment URL (no `https://` prefix) |
| `VERCEL_BRANCH_URL` | Branch alias URL |
| `VERCEL_GIT_COMMIT_SHA` | Full commit SHA |
| `VERCEL_GIT_COMMIT_REF` | Branch name |
| `VERCEL_GIT_REPO_SLUG` | Repo name |
| `VERCEL_REGION` | Region code where function is executing |

### Next.js Env Exposure

```
NEXT_PUBLIC_API_URL   → exposed to browser (bundled at build time)
API_SECRET            → server-only (never sent to client)
```

---

## 4. Serverless Functions

### File-Based Routing

Functions live at `api/` (for non-framework projects) or via framework conventions:

```
api/hello.ts          → /api/hello
api/users/[id].ts     → /api/users/:id
app/api/users/route.ts  → /api/users (Next.js App Router)
pages/api/hello.ts    → /api/hello (Next.js Pages Router)
```

### Basic Function

```typescript
// api/hello.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { name = 'World' } = req.query;
  res.status(200).json({ message: `Hello, ${name}!` });
}
```

### Streaming Response

```typescript
// api/stream.ts
export const config = { maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 5; i++) {
        controller.enqueue(new TextEncoder().encode(`chunk ${i}\n`));
        await new Promise(r => setTimeout(r, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

### Function Configuration

**Per-function via vercel.json:**

```json
{
  "functions": {
    "api/heavy.ts": { "maxDuration": 60, "memory": 1024 },
    "api/ai/*.ts":  { "maxDuration": 300, "memory": 3008 }
  }
}
```

**Inline via export:**

```typescript
export const config = {
  maxDuration: 30,
  memory: 512,
  regions: ['iad1', 'sfo1'],
};
```

### Limits (Fluid Compute enabled — default for new projects)

| Limit | Hobby | Pro | Enterprise |
|-------|-------|-----|------------|
| **Max duration (default)** | 300s | 300s | 300s |
| **Max duration (configurable)** | 300s | 800s | 800s |
| **Memory (default)** | 2 GB / 1 vCPU | 2 GB / 1 vCPU | 2 GB / 1 vCPU |
| **Memory (max)** | 2 GB / 1 vCPU | 4 GB / 2 vCPU | 4 GB / 2 vCPU |
| **Bundle size (uncompressed)** | 250 MB | 250 MB | 250 MB |
| **Request/Response body** | 4.5 MB | 4.5 MB | 4.5 MB |
| **File descriptors** | 1,024 (shared) | 1,024 (shared) | 1,024 (shared) |
| **Max concurrency** | 30,000 | 30,000 | 100,000+ |

### Regions

Common codes: `iad1` (D.C., default), `sfo1` (SF), `lhr1` (London), `fra1` (Frankfurt), `sin1` (Singapore), `hnd1` (Tokyo), `gru1` (São Paulo), `syd1` (Sydney).

Set default in Dashboard > Settings > Functions or vercel.json `"regions"`. Enterprise supports multi-region.

### Background Tasks with waitUntil

With Fluid Compute, extend function lifecycle past response:

```typescript
import { waitUntil } from '@vercel/functions';

export async function POST(req: Request) {
  const body = await req.json();

  // Fire-and-forget — runs after response is sent
  waitUntil(sendAnalytics(body));

  return Response.json({ ok: true });
}
```

---

## 5. Edge Functions

### What Are They

Edge Functions run on Vercel's Edge Network (V8 isolates, not Node.js). Low latency, globally distributed, but limited runtime APIs.

### Edge Runtime Constraints

| Available | NOT Available |
|-----------|---------------|
| `fetch`, `Request`, `Response` | `fs`, `path`, `child_process` |
| `globalThis.crypto` (Web Crypto) | `crypto` module (Node.js) |
| `TextEncoder`/`TextDecoder` | Most Node.js built-ins |
| `URL`, `URLSearchParams` | `Buffer` (use `Uint8Array`) |
| Geo/IP request headers | Native modules |
| Streaming responses | Full Node.js runtime |

### Limits

| Limit | Hobby | Pro | Enterprise |
|-------|-------|-----|------------|
| **Initial response timeout** | 25s | 25s | 25s |
| **Streaming duration** | 300s | 300s | 300s |
| **Bundle size (compressed)** | 1 MB | 2 MB | 4 MB |
| **CPU time per invocation** | 50ms/unit | 50ms/unit | 50ms/unit |

### Next.js Middleware (Edge)

```typescript
// middleware.ts (Next.js 15 and earlier)
// proxy.ts (Next.js 16+)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
};
```

### Standalone Edge Function

```typescript
// api/edge-hello.ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const { geo } = req as any;  // Vercel adds geo to request
  return Response.json({ country: geo?.country ?? 'unknown' });
}
```

### Geo / IP Headers

Vercel injects these into Edge Function requests:

| Header | Value |
|--------|-------|
| `x-vercel-ip-country` | ISO 3166-1 alpha-2 country code |
| `x-vercel-ip-city` | City name (URL-encoded) |
| `x-vercel-ip-latitude` | Latitude |
| `x-vercel-ip-longitude` | Longitude |
| `x-vercel-ip-timezone` | IANA timezone string |

---

## 6. Fluid Compute

Vercel's default compute model for new projects (default since April 2025). Combines server-like efficiency with serverless scaling.

Key differences from classic serverless:
- **In-function concurrency**: single instance handles multiple requests simultaneously
- **No cold starts for warm instances**: reuses instances across requests
- **Active CPU billing**: only pay for CPU actively used, not idle I/O wait time
- **Background tasks**: `waitUntil()` extends lifecycle past response
- **Higher default durations**: 300s default vs 10-15s in classic serverless

### Enable/Disable

```json
// vercel.json
{
  "fluid": true
}
```

Or toggle in Dashboard > Project > Settings > Functions > Fluid Compute.

### Pricing Model

- **Active CPU time**: CPU milliseconds your code actively executes (I/O wait excluded)
- **Provisioned memory time**: memory allocated × time function instance is live
- Savings of up to 95% vs classic serverless for I/O-heavy workloads (AI APIs, DB queries)

---

## 7. Deployments

### Deployment Types

| Type | Trigger | URL |
|------|---------|-----|
| **Production** | Push to default branch or `vercel --prod` | `project.vercel.app` + custom domain |
| **Preview** | Push to any non-default branch | `project-git-branch-team.vercel.app` |
| **Instant** | `vercel` CLI in any branch | Unique hash URL |

### Preview Deployments

Every Git push to a non-default branch gets a unique URL. Vercel posts it as a PR comment (requires GitHub/GitLab/Bitbucket integration).

- Preview URL: `<project>-<hash>-<team>.vercel.app`
- Branch alias: `<project>-git-<branch>-<team>.vercel.app`
- Disable for a branch: Dashboard > Settings > Git > Ignored Build Step

### Rollback & Promote

```bash
vercel rollback                    # roll back production to previous deployment
vercel rollback [deployment-url]   # roll back to specific deployment
vercel promote [deployment-url]    # promote any preview to production
```

Or use Dashboard: Deployments tab > ... menu > Promote to Production.

### Deployment Protection

| Option | Plan |
|--------|------|
| Vercel Authentication (login required) | All |
| Password Protection | Pro/Enterprise |
| Trusted IP allowlist | Enterprise |

Configure at Dashboard > Settings > Deployment Protection.

---

## 8. Domains

### Add Custom Domain

```bash
vercel domains add example.com
```

Or in Dashboard > Project > Settings > Domains > Add. Vercel auto-provisions SSL/TLS and handles HTTP → HTTPS.

### DNS Setup Options

| Option | How |
|--------|-----|
| **Vercel Nameservers** | Transfer DNS to Vercel — fully automatic |
| **CNAME** | Point `www` via CNAME to `cname.vercel-dns.com` |
| **A Record** | Point apex domain A record to `76.76.21.21` |

### Redirects

```json
{
  "redirects": [
    {
      "source": "/old-blog/:slug",
      "destination": "/blog/:slug",
      "permanent": true
    },
    {
      "source": "/docs",
      "destination": "https://docs.example.com",
      "permanent": false
    }
  ]
}
```

Status codes: `permanent: true` → 308, `permanent: false` → 307.

### Rewrites

Rewrites proxy requests without changing the browser URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.backend.com/:path*"
    },
    {
      "source": "/legacy/:path*",
      "destination": "/new/:path*"
    }
  ]
}
```

### Bulk Redirects

For large redirect tables (hundreds of entries), use `bulkRedirectsPath`:

```json
{
  "bulkRedirectsPath": "redirects.csv"
}
```

CSV format: `source,destination,permanent`

### Headers

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 9. Cron Jobs

### Configuration

```json
{
  "crons": [
    { "path": "/api/cron/daily-report", "schedule": "0 8 * * *" },
    { "path": "/api/cron/hourly-sync",  "schedule": "0 * * * *" },
    { "path": "/api/cron/weekly",       "schedule": "0 0 * * 1" }
  ]
}
```

- Schedule format: standard cron expression (UTC timezone)
- `path` must point to an existing Vercel Function
- Maximum: 2 crons on Hobby, unlimited on Pro/Enterprise

### Cron Function

```typescript
// app/api/cron/daily-report/route.ts
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await runDailyReport();
  return Response.json({ ok: true });
}
```

Set `CRON_SECRET` environment variable to verify requests are from Vercel and not external callers.

### Limits

| Plan | Max Cron Jobs |
|------|--------------|
| Hobby | 2 |
| Pro | Unlimited |
| Enterprise | Unlimited |

---

## 10. Observability

### Runtime Logs

Stream live function logs:

```bash
vercel logs [deployment-url]    # stream logs for a deployment
vercel logs --follow            # follow logs in real time
```

Log retention:
- Hobby: 1 hour
- Pro: 1 day
- Enterprise: configurable (up to 3 months with log drains)

### Log Drains

Send logs to external services (Datadog, Axiom, Logtail, etc.):

Dashboard > Project > Settings > Log Drains > Add

Supports: JSON, NDJSON, syslog formats.

### Speed Insights

Tracks Core Web Vitals (LCP, FCP, CLS, TTFB, INP) for real user monitoring.

```bash
npm install @vercel/speed-insights
```

```tsx
// app/layout.tsx (Next.js)
import { SpeedInsights } from '@vercel/speed-insights/next';
// Other frameworks: import { SpeedInsights } from '@vercel/speed-insights';

export default function RootLayout({ children }) {
  return <html><body>{children}<SpeedInsights /></body></html>;
}
```

### Web Analytics

Privacy-first, cookie-free visitor analytics. No cookies, GDPR-compliant.

```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx (Next.js)
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }) {
  return <html><body>{children}<Analytics /></body></html>;
}
```

Enable in Dashboard > Project > Analytics tab. Tracks page views, visitors, referrers, devices, countries.

### Vercel Toolbar

Local overlay — deployment info, comments, feature flags. Auto-shown in `vercel dev`.
Disable: set `devIndicators: false` in `next.config.ts`.

---

## 11. Pricing & Limits

### Plans

| Feature | Hobby (Free) | Pro ($20/seat/mo) | Enterprise (Custom) |
|---------|-------------|-------------------|---------------------|
| **Use case** | Personal projects | Teams & production | Large orgs |
| **Team members** | 1 (personal only) | Unlimited | Unlimited |
| **Deployments** | Unlimited | Unlimited | Unlimited |
| **Bandwidth** | 100 GB/mo | 1 TB/mo included | Custom |
| **Build minutes** | 6,000/mo | 24,000/mo | Custom |
| **Serverless function duration** | Up to 300s | Up to 800s | Up to 800s |
| **Preview deployments** | Yes | Yes | Yes |
| **Custom domains** | Yes | Yes | Yes |
| **SSL** | Auto | Auto | Auto |
| **Edge Network** | Global | Global | Global + dedicated |
| **Password protection** | No | Yes | Yes |
| **SSO / SAML** | No | No | Yes |
| **SLA** | None | None | 99.99% |
| **Support** | Community | Email | Dedicated CSM |
| **Cron jobs** | 2 max | Unlimited | Unlimited |
| **Log retention** | 1 hour | 1 day | Up to 3 months |
| **Spend management** | No | Yes | Yes |

### Overage Behavior

- **Hobby**: Deployments paused when limits exceeded — site goes down
- **Pro/Enterprise**: Overages billed as usage-based add-ons — site stays up
- Configure Spend Management (Pro+) to get alerts or auto-pause at thresholds

### Key Usage Costs (Pro, approximate)

| Resource | Included | Overage |
|----------|----------|---------|
| Fast Data Transfer | 1 TB/mo | ~$0.15/GB |
| Function active CPU time | Included credit | ~$0.000024/GB-s |
| Build minutes | 24,000/mo | ~$0.008/min |
| Edge Function invocations | 1M/mo | ~$2/million |
| Image Optimization | 5,000/mo | ~$5/1,000 |

Exact pricing at https://vercel.com/pricing — verify in dashboard, costs change.

### Function Execution Limits Summary

| Limit | Hobby | Pro | Enterprise |
|-------|-------|-----|------------|
| Max duration | 300s | 800s | 800s |
| Max memory | 2 GB | 4 GB | 4 GB |
| Max vCPU | 1 | 2 | 2 |
| Bundle size | 250 MB | 250 MB | 250 MB |
| Request body | 4.5 MB | 4.5 MB | 4.5 MB |
| Edge bundle | 1 MB | 2 MB | 4 MB |
| Concurrency | 30,000 | 30,000 | 100,000+ |

---

## 12. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Env var missing in production | Double-check scope — a var set for `preview` only is absent in `production`. Set all three scopes or verify in Dashboard. |
| `vercel env pull` not working | Must be linked via `vercel link` first. Pulls development-scoped vars to `.env.local`. |
| Function times out silently | Check Vercel logs — 504 `FUNCTION_INVOCATION_TIMEOUT`. Increase `maxDuration` or use streaming. |
| Edge Function using Node.js APIs | Edge uses V8 isolates — no `fs`, `path`, `crypto` module. Use `globalThis.crypto` for crypto, `Uint8Array` instead of `Buffer`. |
| 250 MB bundle exceeded | Use `excludeFiles` in vercel.json functions config, tree-shake imports, check with bundle analyzers. |
| Build works locally, fails on Vercel | Check `VERCEL=1` — Vercel sets this env var. Also check `NODE_ENV=production` differences. |
| Preview URL has wrong env vars | Previews use `preview`-scoped vars, not `production`. Ensure separate values are configured. |
| Cron job not triggering | Verify the function path exists, schedule is valid cron syntax, and `CRON_SECRET` is set. Check Cron tab in Dashboard for run history. |
| Missing trailing slash causes 404 | Set `"trailingSlash": true` in vercel.json or match your framework's setting. |
| CORS errors on API routes | Add CORS headers via vercel.json `headers` or inside the function handler — Vercel doesn't add them automatically. |
| `vercel --prod` deploys wrong branch | `--prod` deploys current local files, not the git branch. Ensure you're on the right branch and files are correct. |
| Speed Insights showing no data | Check the component is in the root layout and the feature is enabled in Dashboard > Analytics. |
| ISR not invalidating (Next.js) | `revalidatePath`/`revalidateTag` must be called in a Server Action or Route Handler — not during render. |
| Hobby plan site goes down | Hobby pauses when limits hit. Pro overages are billed but site stays live. Upgrade if traffic matters. |
