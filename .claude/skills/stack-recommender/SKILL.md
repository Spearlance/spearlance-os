---
model: claude-opus-4-6
name: stack-recommender
description: Use when recommending a technology stack for a new project based on requirements. Maps project needs to specific technologies with trade-off analysis and rationale. Also use when a user wants to change or evaluate their current stack choices.
---

# Stack Recommender

## Overview

Decision framework that maps project requirements to specific technology picks across 7 layers — framework, styling, backend, database, auth, deploy, and DX tooling — with honest trade-off analysis for each choice.

## Quick Reference — Default Picks by Project Type

| Project Type | Framework | Styling | Database | Auth | Deploy |
|-------------|-----------|---------|----------|------|--------|
| SaaS Dashboard | Next.js | Tailwind + shadcn/ui | Supabase (Postgres) | Clerk | Vercel |
| Marketing/Content | Astro | Tailwind | Sanity or Payload CMS | N/A | Cloudflare |
| E-Commerce | Next.js | Tailwind + shadcn/ui | Supabase + Stripe | Clerk | Vercel |
| API Service | Hono | N/A | Neon (Postgres) + Drizzle | JWT/custom | Railway or Docker |
| Mobile + Web | Expo + Next.js | Tailwind (web) / NativeWind (mobile) | Supabase | Clerk | Vercel + EAS |

## Decision Layers

| Layer | Covers |
|-------|--------|
| **Framework** | Next.js, Astro, SvelteKit, React + Vite — when each wins |
| **Styling** | Tailwind v4 + shadcn/ui as default; when to deviate |
| **Backend / API** | REST vs tRPC vs GraphQL; framework routes vs dedicated service |
| **Database** | Postgres (Supabase/Neon) vs MongoDB vs SQLite; when to add Redis |
| **ORM** | Drizzle vs Prisma — type safety, bundle size, edge compatibility |
| **Auth** | Clerk vs Auth.js vs Supabase Auth — speed, cost, data ownership |
| **Deploy** | Vercel vs Cloudflare vs Railway vs Docker — edge vs serverful |

## How to Use

1. Read `PROJECT.md` (or intake from user) — extract: project type, traffic expectations, budget, team size, deadline pressure, existing infra
2. Match requirements to the decision framework in `reference.md`
3. Output a `stack.json` with all 7 layers populated and a brief rationale for each pick
4. Flag trade-offs — every pick has a downside worth naming

## Common Mistakes

| Mistake | Reality |
|---------|---------|
| Defaulting to Next.js for everything | Astro is faster for content/marketing; adds zero JS by default |
| Choosing Prisma for edge/serverless | Drizzle is ~7kb vs Prisma's heavier footprint; wins on cold starts |
| Picking Clerk before checking budget | $0.02/MAU above 10k free — at scale, Auth.js is free forever |
| Supabase when you only need a database | Neon is the leaner pick if you don't need Auth/Storage/Realtime |
| Firebase for new web projects | Firebase is mobile-first; Supabase or Neon are the default for web |
| Over-engineering the backend | Framework API routes handle 90% of SaaS API needs — skip the dedicated backend |
| Docker when Railway exists | Railway handles containerized deploys with less ops overhead |

## Full Reference

See `reference.md` for complete decision matrices, ORM comparison table, auth decision tree, deployment platform guide, 5 complete `stack.json` templates, and anti-patterns.
