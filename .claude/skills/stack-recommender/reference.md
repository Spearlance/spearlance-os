# Stack Recommender Reference

> **Last Updated:** February 2026
> **Purpose:** Decision framework for technology stack selection across 7 layers
> **Consumed By:** fullstack-architect agent, stack evaluation requests

---

## Table of Contents

1. [Decision Framework Overview](#1-decision-framework-overview)
2. [Framework Selection Matrix](#2-framework-selection-matrix)
3. [Styling & Component Selection](#3-styling--component-selection)
4. [Backend & API Patterns](#4-backend--api-patterns)
5. [Database Selection](#5-database-selection)
6. [ORM Selection](#6-orm-selection)
7. [Authentication Selection](#7-authentication-selection)
8. [Deployment Selection](#8-deployment-selection)
9. [DX Tooling Defaults](#9-dx-tooling-defaults)
10. [Common Project Templates](#10-common-project-templates)
11. [Anti-Patterns](#11-anti-patterns)
12. [On-Demand Skill Generation](#12-on-demand-skill-generation)

---

## 1. Decision Framework Overview

Every project resolves 7 layers before writing a line of code. Missing one creates costly rewrites.

| Layer | What You're Deciding | Key Trade-off |
|-------|---------------------|---------------|
| **Framework** | How the app renders and routes | Performance vs ecosystem vs DX |
| **Styling** | How UI is built and maintained | Speed vs customization vs consistency |
| **Backend/API** | How data moves between layers | Simplicity vs flexibility vs type safety |
| **Database** | Where data lives and how it scales | Full platform vs raw Postgres vs document store |
| **ORM** | How TypeScript talks to the database | Abstraction vs control vs bundle size |
| **Auth** | Who verifies identity | Speed-to-ship vs cost at scale vs data ownership |
| **Deploy** | Where the app runs | DX vs cost vs edge performance |

**Process:** Gather requirements → run through each layer → produce `stack.json` → flag trade-offs.

**Requirements to gather before deciding:**

- Project type (SaaS, marketing, e-commerce, API, mobile+web)
- Expected monthly active users (MAU) at launch and 12-month target
- Team size and TypeScript comfort level
- Budget ceiling (monthly infra)
- Deadline pressure (MVP in weeks vs months)
- Realtime requirements (live updates, collaboration)
- Geographic audience (global vs single-region)
- Existing infrastructure constraints

---

## 2. Framework Selection Matrix

### Decision Table

| Requirement | Pick | Why |
|------------|------|-----|
| Full-stack React app, SSR + API routes | **Next.js** | Single framework handles rendering + backend; massive ecosystem; Vercel-native |
| Content/marketing site, SEO-critical, minimal interactivity | **Astro** | Ships zero JS by default; only framework to pass Core Web Vitals >50% of the time in benchmarks; island architecture adds interactivity on demand |
| Leaving React entirely; small team; DX priority | **SvelteKit** | Compiles to vanilla JS — no virtual DOM, no runtime; smaller bundles; built-in SSR/SSG |
| Internal dashboard, SPA, no SSR needed | **React + Vite** | Fastest dev server; no SSR overhead; simpler mental model for pure client-side apps |
| Hybrid content + app (marketing pages + authenticated dashboard) | **Next.js** | App Router handles both static (ISR) and dynamic routes in one project |

### Framework Comparison

| | Next.js | Astro | SvelteKit | React + Vite |
|---|---------|-------|-----------|-------------|
| **Rendering** | SSR, SSG, ISR, hybrid | SSG, SSR, islands | SSR, SSG | CSR only (add SSR manually) |
| **JS Sent to Browser** | React runtime required | Zero by default | Svelte runtime (~2.5kb) | Full bundle |
| **Ecosystem** | Largest (React + Vercel) | Growing; multi-framework | Svelte-native | React ecosystem |
| **API Routes** | Built-in (route.ts) | Built-in (endpoints) | Built-in (+server.ts) | Need separate backend |
| **Learning Curve** | Medium (RSC concepts) | Low | Low-Medium | Low |
| **Best For** | SaaS, full-stack apps | Marketing, blogs, docs | Apps where React isn't a requirement | SPAs, dashboards, tools |
| **Downside** | Complexity of RSC + caching model | Limited when you need heavy interactivity | Smaller ecosystem, Svelte-specific patterns | No SSR without setup; SEO requires extra work |

### When NOT to Pick Next.js

- Pure content/marketing site with no authenticated sections → Astro
- Team is allergic to React or wants minimal JS → SvelteKit
- Pure backend API → Hono or Express
- React Native app → Expo (Next.js handles the web counterpart if needed)

---

## 3. Styling & Component Selection

### Default: Tailwind v4 + shadcn/ui

**Tailwind v4** (CSS-first config, `@import "tailwindcss"`) is the default for all new projects. No `tailwind.config.js` needed — configure via CSS variables in `globals.css`.

**shadcn/ui** is not an npm package — it's a collection of copy-owned components built on Radix UI primitives. You own the source. Full customization, no dependency lock-in.

Use this combination unless a specific requirement below applies.

### When to Deviate

| Situation | Alternative | Why |
|-----------|------------|-----|
| Non-React framework (SvelteKit) | Tailwind only, Skeleton UI | shadcn/ui is React-only |
| Astro (mostly static) | Tailwind only | No component library needed for static content |
| Heavy data table / grid requirements | Tailwind + AG Grid | shadcn/ui's Table is layout-only; AG Grid handles virtualization |
| Design system already exists (Figma tokens) | Tailwind + custom components | Map existing tokens to CSS vars; skip shadcn/ui |
| Mobile-first React Native | NativeWind (Tailwind for RN) | Tailwind utilities for React Native syntax |

### Component Library Comparison

| Library | Built On | Customizable | Accessible | Bundle | When |
|---------|----------|-------------|-----------|--------|------|
| **shadcn/ui** | Radix UI | Full (you own code) | ✓ ARIA complete | Minimal (tree-shakeable) | Default for React |
| **Radix UI** (raw) | N/A | Full | ✓ ARIA complete | Minimal | When shadcn/ui opinionation is unwanted |
| **MUI / Material UI** | Custom | Medium | ✓ | Large | Enterprise teams with Material Design requirement |
| **Chakra UI** | Custom | High | ✓ | Medium | When you want opinionated defaults fast |
| **Mantine** | Custom | High | ✓ | Medium | Good shadcn/ui alternative; more pre-built components |
| **Ant Design** | Custom | Low | Partial | Very large | Enterprise dashboards; Chinese ecosystem |

---

## 4. Backend & API Patterns

### When Framework API Routes Are Enough

Next.js `route.ts`, Astro endpoints, or SvelteKit `+server.ts` handle the vast majority of SaaS API needs. Default to this. Skip a dedicated backend service unless a specific trigger applies.

**Use framework API routes when:**
- Standard CRUD on your own database
- Webhooks from third-party services
- Auth callbacks
- File upload handlers
- Simple data aggregation

### When to Introduce a Dedicated Backend

| Trigger | Service | Why |
|---------|---------|-----|
| Non-JS backend needed (Python ML, Go performance) | Separate service + REST | Language requirement overrides simplicity |
| Complex business logic that needs independent scaling | Hono on Railway/Cloudflare Workers | Isolate compute from frontend |
| Microservices architecture | Hono or Express | Independent deploy cycles |
| WebSocket server (long-lived connections) | Hono or Node.js + ws | Next.js/Cloudflare don't support persistent WebSocket connections well |
| Mobile + Web sharing one backend | Hono + tRPC | Type-safe contract across platforms |

### API Pattern Selection

| Pattern | Type Safety | DX | When |
|---------|------------|-----|------|
| **REST (route.ts)** | Manual (zod schemas) | Simple, universal | Default — any client, any language |
| **tRPC** | End-to-end TypeScript | Excellent for monorepos | Full TypeScript stack where client and server are co-located |
| **GraphQL** | Schema-based | Complex setup | Multi-team, multiple clients needing custom data shapes |

**tRPC Decision Rule:** Only use tRPC when: (1) TypeScript on both client and server, (2) you control both client and server, (3) you want compile-time API contract. If any external client will consume your API, use REST.

**GraphQL Decision Rule:** Only when multiple client types (web, mobile, third-party) need to request different data shapes from the same endpoint. Avoid for single-client SaaS — it's over-engineering.

---

## 5. Database Selection

### Decision Table

| Requirement | Pick | Why |
|------------|------|-----|
| Full-stack web app, SQL, need auth + storage too | **Supabase** | Postgres + Auth + Storage + Realtime in one platform; reduces services to manage |
| Pure Postgres, serverless, database branching needed | **Neon** | Serverless scale-to-zero, copy-on-write branching, tight Vercel integration |
| Document model, flexible schema, team knows MongoDB | **MongoDB Atlas** | Document store fits unstructured/variable-schema data; serverless tier available |
| Local-first app, SQLite constraints, edge deploy | **Turso (SQLite)** | SQLite at the edge; very low latency for reads; libsql driver |
| Simple persistence, no cloud required | **SQLite via Drizzle** | Zero infra for dev/hobby; migrate to Postgres later |

### Supabase vs Neon Decision

Both are Postgres. Choose based on what else you need:

| Need | Supabase | Neon |
|------|---------|------|
| Database only | ✗ Overkill | ✓ Right-sized |
| Auth built-in | ✓ Included | ✗ Add Clerk/Auth.js |
| File storage | ✓ Supabase Storage | ✗ Add S3/R2 |
| Realtime subscriptions | ✓ Supabase Realtime | ✗ Add Pusher/Ably |
| Database branching | Partial | ✓ Copy-on-write, instant |
| Vercel integration | Good | ✓ Native integration |
| Serverless/edge | Good (pooler required) | ✓ Designed for it |
| Cost at scale | Platform fee | Pay-per-compute |

**Rule:** If you need 2+ of Auth/Storage/Realtime, pick Supabase. If you need only a database, pick Neon.

### When to Add Redis / Upstash

| Trigger | Add | Why |
|---------|-----|-----|
| Rate limiting | Upstash Redis | Per-request Redis calls; serverless-compatible |
| Session storage | Upstash Redis | Fast key-value; auto-TTL |
| Job queues | Upstash QStash | Durable task scheduling without a worker server |
| Caching expensive queries | Upstash Redis | Avoid redundant DB hits |
| Pub/sub | Upstash Redis | Lightweight message passing |

**Upstash vs self-hosted Redis:** Upstash is serverless-native (per-request billing, no persistent connection). Self-hosted Redis requires a persistent server — fine for Railway/Docker deployments, wrong for serverless.

---

## 6. ORM Selection

### Decision: Default to Drizzle

For new TypeScript projects in 2026, Drizzle is the default pick. Prisma remains strong for teams that want higher-level abstraction and the Prisma ecosystem (Prisma Studio, Accelerate).

### Direct Comparison

| | **Drizzle** | **Prisma** |
|---|------------|------------|
| **Philosophy** | SQL-first; if you know SQL, you know Drizzle | Schema-first; higher abstraction over SQL |
| **Schema Definition** | TypeScript code (no .prisma file) | `.prisma` schema file → generated client |
| **Type Safety** | Inferred directly from TS schema (instant) | Generated from schema (requires `prisma generate`) |
| **Bundle Size** | ~7.4kb min+gzip | Larger (Prisma 7 dropped Rust engine → pure TS now) |
| **Edge/Serverless** | ✓ First-class; no extra config | ✓ Improved in Prisma 7 (Rust engine removed) |
| **Migrations** | `drizzle-kit push` / `drizzle-kit generate` | `prisma migrate dev` / `prisma migrate deploy` |
| **Migration DX** | More manual; full SQL control | Automated; less control over SQL output |
| **Relations** | Manual joins or Drizzle's relational API | Prisma `include`/`select` (automatic JOINs) |
| **Raw SQL** | `sql` template tag; natural to use | `$queryRaw` — possible but escape-hatch feel |
| **Multi-DB Support** | Postgres, MySQL, SQLite, Turso, Neon, Cloudflare D1 | Postgres, MySQL, SQLite, MongoDB, SQL Server, CockroachDB |
| **Ecosystem** | Growing; Drizzle Studio | Mature; Prisma Studio, Prisma Accelerate, Pulse |
| **Cold Start Impact** | Minimal (small bundle) | Minimal in v7+ (Rust engine removed) |

### When to Pick Drizzle

- Edge/serverless deployment (Cloudflare Workers, Vercel Edge)
- Team is SQL-comfortable and wants explicit control
- Bundle size is a constraint
- Working with Neon, Turso, or Cloudflare D1
- New project starting fresh

### When to Pick Prisma

- Team prefers schema-first workflow and visual tooling (Prisma Studio)
- MongoDB is the database (Drizzle doesn't support MongoDB)
- Prisma Accelerate (connection pooling + caching layer) is needed
- Prisma Pulse (realtime database events) is needed
- Large team that benefits from the opinionated structure

---

## 7. Authentication Selection

### Decision Tree

```
Does budget allow $0.02/MAU above 10k users?
├── No → Auth.js (free forever, you host it)
└── Yes → Do you need pre-built UI components and fast setup?
           ├── Yes → Clerk (30-minute setup, beautiful defaults)
           └── No → Are you using Supabase as your full BaaS?
                      ├── Yes → Supabase Auth (bundled, no extra service)
                      └── No → Clerk or Auth.js depending on DX preference
```

### Comparison Table

| | **Clerk** | **Auth.js** | **Supabase Auth** |
|---|---------|------------|-----------------|
| **Setup Time** | ~30 minutes | 2-4 hours | ~1 hour |
| **Hosted** | Yes (Clerk cloud) | No (self-hosted) | Yes (Supabase cloud) |
| **UI Components** | ✓ Built-in (SignIn, UserButton, etc.) | ✗ Build your own | Partial (Supabase UI) |
| **Data Ownership** | Clerk owns user data | ✓ You own everything | Supabase owns (open source self-hostable) |
| **Pricing** | Free to 10k MAU; $0.02/MAU after | Free (infrastructure costs only) | Free tier; scales with Supabase plan |
| **Social Providers** | 20+ (Google, GitHub, etc.) | All (you configure) | 20+ |
| **MFA** | ✓ Built-in | Manual setup | ✓ Built-in |
| **Orgs/Teams** | ✓ First-class Clerk feature | Manual | Manual |
| **Webhooks** | ✓ Built-in | Manual | ✓ Built-in |
| **Session Strategy** | JWT | JWT or database sessions | JWT |
| **Framework Support** | React/Next.js first-class; others supported | Framework-agnostic | Framework-agnostic |
| **When Locked In** | High (Clerk API shapes your data model) | None | Medium (Supabase-specific) |

### When Each Wins

**Clerk:** MVP/startup moving fast. Beautiful components out of the box. Organizations/teams feature saves weeks. Worth the per-MAU cost until ~50k users.

**Auth.js:** Long-lived project where data ownership is non-negotiable. Strict data residency requirements. Budget constraints at scale. Team has bandwidth to build auth UI and maintain sessions.

**Supabase Auth:** Already using Supabase for the database and don't want another service. Acceptable to be in the Supabase ecosystem. Good for prototypes and smaller apps.

---

## 8. Deployment Selection

### Decision Table

| Project Type | Platform | Why |
|------------|---------|-----|
| Next.js app | **Vercel** | Built by Vercel; best Next.js support; Fluid Compute reduces cold starts to near-zero; git-integrated previews |
| Astro site | **Cloudflare Pages** | Unlimited bandwidth on free tier; global edge; static sites thrive here |
| SvelteKit app | **Cloudflare Pages** or **Vercel** | Both work well; Cloudflare cheaper at scale |
| Containerized Node.js/Hono service | **Railway** | PaaS abstraction over Docker; much less ops than raw AWS/GCP |
| Complex microservices, existing DevOps team | **Docker + Kubernetes (GKE/EKS)** | Full control; team already knows this path |
| Hono on edge | **Cloudflare Workers** | Hono is purpose-built for Workers; sub-millisecond globally |

### Platform Comparison

| | **Vercel** | **Cloudflare Pages/Workers** | **Railway** | **Docker/VPS** |
|---|-----------|---------------------------|------------|---------------|
| **Best For** | Next.js apps | Static sites, edge workers | Containerized services | Full control |
| **DX** | Excellent; best preview deploys | Good | Very good | Manual |
| **Free Tier** | 100GB bandwidth/month | Unlimited bandwidth | $5/month credit | N/A |
| **Cold Starts** | Near-zero (Fluid Compute) | Near-zero (Workers) | ~200ms (containers) | None (always-on) |
| **Global Edge** | ✓ (Vercel Edge) | ✓ 200+ PoPs | Partial | Self-managed |
| **WebSockets** | Limited (Edge Functions) | ✓ Durable Objects | ✓ | ✓ |
| **Databases** | Via integrations (Neon, etc.) | D1 (SQLite), KV, R2 | Via addons (Postgres, Redis) | Self-managed |
| **Cost at Scale** | Premium (per-seat + compute) | Very cost-efficient | Predictable | Infrastructure cost only |
| **Security** | Standard | ✓ WAF, DDoS, bot management built-in | Standard | Self-managed |
| **Vendor Lock-in** | High (Next.js advanced features) | Medium (Workers API) | Low (Docker portable) | None |

### Edge vs Serverful

**Use edge (Vercel Edge / Cloudflare Workers) when:**
- Latency is critical globally
- Requests are short-lived (<50ms work)
- No persistent connections needed
- No large Node.js-specific dependencies

**Use serverful (Railway, Docker) when:**
- Long-running processes
- WebSocket connections
- Heavy CPU work (video processing, ML inference)
- Dependencies that require the full Node.js runtime

---

## 9. DX Tooling Defaults

These are the defaults for every new project. Deviate only with a documented reason.

### Package Manager

**pnpm** — default. Faster installs, strict dependency isolation, disk-efficient.

Deviate when: monorepo with Yarn Workspaces already established, or Bun is being used across the whole project for its runtime speed.

### Testing

| Layer | Tool | Why |
|-------|------|-----|
| Unit + integration | **Vitest** | Native ESM, fastest runner, Vite-compatible |
| E2E | **Playwright** | Cross-browser, auto-waiting, reliable selectors, great CI integration |
| Component | **Vitest + @testing-library/react** | Same runner; no context switching |

Deviate when: existing project uses Jest (migration cost > benefit), team has deep Cypress investment and can't migrate.

### Linting & Formatting

| Tool | Config |
|------|--------|
| **ESLint** | `@eslint/js` + framework plugin (e.g. `eslint-plugin-react`) |
| **Prettier** | Default config; `prettier-plugin-tailwindcss` for class sorting |
| **TypeScript** | `strict: true` — no exceptions; `noUncheckedIndexedAccess: true` recommended |

### Type Safety

- **Zod** for runtime validation (API inputs, env vars, form data)
- **TypeScript strict mode** everywhere
- **`@t3-oss/env-nextjs`** for typed environment variables

### Monorepo (when needed)

**Turborepo** — default when managing multiple packages (web, native, shared utils). pnpm workspaces as the package manager layer.

---

## 10. Common Project Templates

### Template 1: SaaS Dashboard

Full-stack SaaS with auth, subscriptions, and a data-heavy dashboard.

```json
{
  "project_type": "saas_dashboard",
  "framework": {
    "pick": "nextjs",
    "version": "16.x",
    "rationale": "Full-stack React with SSR, API routes, and App Router. One framework covers everything."
  },
  "styling": {
    "pick": "tailwind_shadcn",
    "tailwind": "v4",
    "components": "shadcn/ui",
    "rationale": "Fastest path to polished UI. shadcn/ui components are owned — no library lock-in."
  },
  "backend": {
    "pick": "framework_routes",
    "pattern": "REST via route.ts",
    "rationale": "Next.js API routes handle all CRUD. No dedicated backend unless business logic requires it."
  },
  "database": {
    "pick": "supabase",
    "rationale": "Postgres + Auth + Storage + Realtime in one. Eliminates 3 separate services."
  },
  "orm": {
    "pick": "drizzle",
    "rationale": "Lightweight, edge-compatible, SQL-explicit. Type safety without generation step."
  },
  "auth": {
    "pick": "clerk",
    "rationale": "Organizations, webhooks, and pre-built UI. Ships auth in hours not days."
  },
  "deploy": {
    "pick": "vercel",
    "rationale": "Native Next.js support. Preview deploys per PR. Fluid Compute for near-zero cold starts."
  },
  "dx": {
    "package_manager": "pnpm",
    "testing": ["vitest", "playwright"],
    "linting": ["eslint", "prettier"],
    "env": "@t3-oss/env-nextjs"
  },
  "trade_offs": [
    "Clerk costs $0.02/MAU above 10k — switch to Auth.js at ~50k MAU to save cost",
    "Supabase platform fee vs raw Neon — if you don't use Auth/Storage/Realtime, Neon is cheaper",
    "Vercel premium pricing at scale — Cloudflare Pages is an exit path for static/ISR content"
  ]
}
```

### Template 2: Marketing / Content Site

SEO-critical, content-driven site. May integrate a CMS.

```json
{
  "project_type": "marketing_content",
  "framework": {
    "pick": "astro",
    "version": "5.x",
    "rationale": "Zero JS by default. Best Core Web Vitals scores of any framework. Islands for interactive components."
  },
  "styling": {
    "pick": "tailwind",
    "tailwind": "v4",
    "components": "none or hand-rolled",
    "rationale": "No component library needed for static content. shadcn/ui is overkill here."
  },
  "cms": {
    "pick": "sanity_or_payload",
    "sanity": "Managed CMS; great for non-technical editors; GROQ query language",
    "payload": "Self-hosted; TypeScript-native; more control; lower long-term cost",
    "rationale": "Content editors need a CMS. Sanity is faster to set up; Payload is cheaper at scale."
  },
  "backend": {
    "pick": "astro_endpoints",
    "rationale": "Contact forms and newsletter signups handled by Astro API endpoints."
  },
  "database": {
    "pick": "none_or_cms_native",
    "rationale": "CMS is the data store. No separate database unless custom features require it."
  },
  "auth": {
    "pick": "none",
    "rationale": "Public content site. No user accounts."
  },
  "deploy": {
    "pick": "cloudflare_pages",
    "rationale": "Unlimited bandwidth on free tier. Global CDN. Static site thrives here."
  },
  "dx": {
    "package_manager": "pnpm",
    "testing": ["playwright"],
    "linting": ["eslint", "prettier"]
  },
  "trade_offs": [
    "Astro has less ecosystem than Next.js — some React libraries need wrapper islands",
    "Sanity has per-seat pricing for editors — Payload self-hosted avoids this",
    "Cloudflare Pages has limits on SSR Worker execution — mostly fine for content sites"
  ]
}
```

### Template 3: E-Commerce

Product catalog, cart, checkout via Stripe, order management.

```json
{
  "project_type": "ecommerce",
  "framework": {
    "pick": "nextjs",
    "version": "16.x",
    "rationale": "ISR for product pages (fast + always fresh). Server Actions for cart mutations. App Router for streaming."
  },
  "styling": {
    "pick": "tailwind_shadcn",
    "tailwind": "v4",
    "components": "shadcn/ui",
    "rationale": "Fast UI iteration. shadcn/ui handles forms, dialogs, and layout components."
  },
  "payments": {
    "pick": "stripe",
    "pattern": "Checkout Sessions + webhooks for order fulfillment",
    "rationale": "Stripe is the de facto standard. Checkout Sessions handle PCI compliance without custom UI."
  },
  "backend": {
    "pick": "framework_routes",
    "pattern": "REST via route.ts + Stripe webhooks",
    "rationale": "Product catalog, cart state, and order management fit in Next.js API routes."
  },
  "database": {
    "pick": "supabase",
    "rationale": "Products, orders, and inventory in Postgres. Supabase storage for product images."
  },
  "orm": {
    "pick": "drizzle",
    "rationale": "Complex product/order/inventory queries benefit from SQL-explicit control."
  },
  "auth": {
    "pick": "clerk",
    "rationale": "Guest checkout + account creation. Clerk handles both. Webhooks sync users to Supabase."
  },
  "deploy": {
    "pick": "vercel",
    "rationale": "ISR for product pages. Edge middleware for A/B testing and geo-routing."
  },
  "dx": {
    "package_manager": "pnpm",
    "testing": ["vitest", "playwright"],
    "linting": ["eslint", "prettier"]
  },
  "trade_offs": [
    "Supabase image storage has egress costs — Cloudflare R2 is cheaper for large image catalogs",
    "Clerk at scale adds cost — Auth.js is viable once team has bandwidth to build auth UI",
    "ISR cache invalidation requires care — stale product prices/stock are customer-facing bugs"
  ]
}
```

### Template 4: API Service

Standalone backend API. No frontend. Consumed by web, mobile, or third-party clients.

```json
{
  "project_type": "api_service",
  "framework": {
    "pick": "hono",
    "rationale": "Ultrafast; runs on Node.js, Bun, Deno, and Cloudflare Workers. ~14kb framework. TypeScript-native."
  },
  "styling": {
    "pick": "none",
    "rationale": "API service has no UI."
  },
  "backend": {
    "pick": "hono_routes",
    "pattern": "REST with Zod validation middleware",
    "rationale": "Hono's middleware system handles validation, auth, and rate limiting cleanly."
  },
  "database": {
    "pick": "neon",
    "rationale": "Pure Postgres. Serverless-compatible. No BaaS overhead for an API-only service."
  },
  "orm": {
    "pick": "drizzle",
    "rationale": "Lightweight; minimal cold start impact; SQL-explicit for complex query control."
  },
  "auth": {
    "pick": "jwt_custom",
    "rationale": "API services use bearer tokens; no UI auth flow needed. Verify JWTs from Clerk or Auth.js."
  },
  "deploy": {
    "pick": "railway_or_docker",
    "railway": "Managed PaaS; Docker under the hood; less ops; good for most API services",
    "docker": "Full control; use when existing CI/CD pipeline, Kubernetes, or compliance requires it",
    "rationale": "Railway removes ops overhead. Docker when infra team demands full control."
  },
  "dx": {
    "package_manager": "pnpm",
    "testing": ["vitest"],
    "linting": ["eslint", "prettier"]
  },
  "trade_offs": [
    "Hono is less mature than Express for complex middleware chains — Express is acceptable fallback",
    "Railway has cold starts on free tier — upgrade to paid or use always-on for production",
    "Neon's serverless model needs connection pooling config — use the pooler endpoint"
  ]
}
```

### Template 5: Mobile + Web (Shared Backend)

React Native mobile app + Next.js web app sharing a tRPC backend.

```json
{
  "project_type": "mobile_and_web",
  "structure": "monorepo (Turborepo + pnpm workspaces)",
  "packages": {
    "apps/web": "Next.js 16",
    "apps/mobile": "Expo (React Native)",
    "packages/api": "tRPC + Hono backend",
    "packages/shared": "Shared types, utils, Zod schemas"
  },
  "framework": {
    "web": "nextjs",
    "mobile": "expo",
    "rationale": "Next.js for web SSR; Expo for managed RN builds (EAS). Shared tRPC types eliminate API contract drift."
  },
  "styling": {
    "web": "tailwind_shadcn",
    "mobile": "nativewind",
    "rationale": "NativeWind brings Tailwind utilities to React Native. Same class naming across platforms."
  },
  "backend": {
    "pick": "trpc_hono",
    "rationale": "tRPC over Hono gives end-to-end TypeScript type safety between server and both clients."
  },
  "database": {
    "pick": "supabase",
    "rationale": "Realtime for live feed features. Push notifications via Supabase + Expo Notifications."
  },
  "orm": {
    "pick": "drizzle",
    "rationale": "Schema defined once in packages/api; shared type inference across web and mobile."
  },
  "auth": {
    "pick": "clerk",
    "rationale": "Clerk supports Expo SDK natively. Same auth layer across web and mobile."
  },
  "deploy": {
    "web": "vercel",
    "mobile": "expo_eas",
    "backend": "railway",
    "rationale": "Vercel for web. EAS for OTA mobile updates and app store builds. Railway for the tRPC/Hono backend."
  },
  "dx": {
    "package_manager": "pnpm",
    "monorepo": "turborepo",
    "testing": ["vitest", "playwright (web)", "detox (mobile E2E)"],
    "linting": ["eslint", "prettier"]
  },
  "trade_offs": [
    "Monorepo adds tooling complexity — only use if web + mobile are actively co-developed",
    "tRPC couples client and server tightly — REST is better if third-party API consumers exist",
    "Expo managed workflow limits some native modules — bare workflow is the escape hatch",
    "Clerk Expo SDK is solid but slightly behind the web SDK in feature parity"
  ]
}
```

---

## 11. Anti-Patterns

Stacks that look reasonable but create real pain in production.

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Next.js + GraphQL for a single SaaS | GraphQL setup cost (resolvers, schema, codegen) with no benefit over REST for one client | Use REST with route.ts |
| Supabase Auth + Clerk together | Two auth systems for one app; session conflicts; user data in two places | Pick one; Clerk or Supabase Auth, not both |
| Prisma on Cloudflare Workers | Prisma v6 still has edge limitations on some features; binary size concerns | Use Drizzle for Cloudflare Workers |
| MongoDB for a relational SaaS | Relations get painful (no JOINs); schema flexibility becomes schema chaos | Use Postgres (Supabase or Neon) |
| SQLite in production serverless | File-based; no concurrent writes; breaks across serverless instances | Use Turso (SQLite designed for edge/serverless) if you must use SQLite |
| Docker for a standard Next.js app | Ops overhead with no real benefit over Vercel/Railway for most apps | Use Vercel or Railway; Docker when infra team requires it |
| React + Vite + SSR plugins | DIY SSR on Vite is complex and fragile; missing ISR, streaming, edge support | Use SvelteKit or Next.js if SSR is needed |
| Hardcoded env vars in Next.js client components | `NEXT_PUBLIC_` prefix exposes secrets to browser bundle | Validate all env at startup with `@t3-oss/env-nextjs`; never prefix secrets |
| tRPC with REST API consumers | tRPC requires TypeScript client; breaks with any non-TS consumer | Use REST for any API that needs external access |
| Auth.js without a database adapter | Session stored in JWT only; no server-side revocation | Use database sessions with an adapter for anything beyond hobby projects |
| Expo Go for production mobile | Expo Go sandbox restricts native modules; not deployable | Use EAS builds and the managed workflow for production |

---

## 12. On-Demand Skill Generation

When a user picks a technology that doesn't have a pre-written skill in `.claude/skills/`, generate one on demand.

### When to Trigger

- User's stack.json includes a technology with no matching skill directory
- User asks "how do I use [X]?" and no skill exists for X
- fullstack-architect recommends a technology without a skill

### How to Generate

Use the `writing-reference-skills` skill to create the missing reference:

```
Invoke: writing-reference-skills
Args: technology name + brief description of what the skill should cover
```

The `writing-reference-skills` skill will:
1. Research current documentation via WebSearch
2. Generate a two-file skill (`SKILL.md` + `reference.md`)
3. Place it in `.claude/skills/<technology-name>/`

### Technologies Likely to Need On-Demand Generation

| Technology | When It Comes Up |
|-----------|-----------------|
| Hono | API service projects |
| NativeWind | Mobile + web projects |
| Expo / EAS | Mobile projects |
| Turborepo | Monorepo projects |
| Sanity | Content/marketing sites |
| Payload CMS | Content sites preferring self-hosted CMS |
| Upstash | Any project adding Redis/queues |
| Cloudflare Workers | Edge deployment projects |
| Detox | Mobile E2E testing |
| AG Grid | Data-heavy dashboard projects |

### Skill Reuse Check

Before triggering generation, check:

```bash
ls .claude/skills/ | grep <technology-name>
```

If a skill exists, load it directly. Only generate when truly missing.
