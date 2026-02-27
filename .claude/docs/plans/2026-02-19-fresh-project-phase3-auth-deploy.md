# Fresh Project System — Phase 3: Auth + Deploy

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create 7 reference skills + 1 agent covering authentication and deployment — every project needs both.

**Architecture:** Each reference skill follows the writing-reference-skills TDD cycle. Auth skills share the `backend-guide` agent (auth is server-side). Deploy skills get a new `infra-guide` agent.

**Tech Stack:** Auth.js, Clerk, Supabase Auth, Vercel, Cloudflare Pages/Workers, Docker, GitHub Actions

**Depends on:** Phase 1 complete, Phase 2 complete (supabase skill exists for supabase-auth)

**REQUIRED SUB-SKILL for each skill:** Use armadillo:writing-reference-skills

---

## Task 1: authjs

**Files:**
- Create: `.claude/skills/authjs/SKILL.md`
- Create: `.claude/skills/authjs/reference.md`
- Create: `.claude/skills/authjs/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: authjs
description: Use when implementing authentication with Auth.js (NextAuth.js) — OAuth providers, credentials, session management, or database adapters. Also use when upgrading from NextAuth v4 to Auth.js v5 or debugging auth callback issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Auth.js v5 in a Next.js App Router project with Google and GitHub OAuth. Show me: auth.ts config, route handler, middleware for protected routes, and how to access the session in Server Components vs Client Components."

**Q2 (Common Operation):** "Implement role-based access control with Auth.js. Users have roles (admin, member, viewer). Show me: extending the session type, adding role to JWT, protecting API routes by role, and conditionally rendering UI based on role."

**Q3 (Gotcha/Limits):** "What are the Auth.js v5 gotchas? Cover: the edge runtime session strategy (JWT only, no database sessions in middleware), the callback chain (signIn → jwt → session), CSRF protection, and the difference between auth() in server components vs middleware."

**Q4 (Recent Change):** "What changed from NextAuth v4 to Auth.js v5? Cover: the new universal auth() function, adapter changes, the config file structure, and any breaking changes in the callback signatures."

### Research queries:
- `"Auth.js v5" setup Next.js App Router 2025 2026`
- `"Auth.js" vs "NextAuth v4" migration guide`
- `"Auth.js" middleware edge runtime session`
- `"Auth.js" database adapters Prisma Drizzle`
- `"Auth.js" role-based access control`
- `site:authjs.dev` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js App Router, SvelteKit, Express)
2. Providers (OAuth, credentials, email/magic link)
3. Session Management (JWT vs database sessions, strategy trade-offs)
4. Callbacks (signIn, jwt, session, redirect)
5. Database Adapters (Prisma, Drizzle, Supabase)
6. Middleware (protected routes, role-based access)
7. TypeScript (extending session, JWT types)
8. Edge Runtime Considerations
9. Migration from NextAuth v4
10. Common Mistakes

---

## Task 2: clerk

**Files:**
- Create: `.claude/skills/clerk/SKILL.md`
- Create: `.claude/skills/clerk/reference.md`
- Create: `.claude/skills/clerk/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: clerk
description: Use when implementing authentication with Clerk — drop-in UI components, organization management, user management, or webhook integration. Also use when adding auth to a project quickly without building custom auth UI.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Clerk in a Next.js App Router project. Show me: environment variables, ClerkProvider, middleware for protected routes, and how to get the current user in Server Components, Client Components, and API routes."

**Q2 (Common Operation):** "Implement multi-tenant organizations with Clerk. An org has members with roles (admin, member). Show me: creating organizations, inviting members, switching between orgs, and scoping data to the active organization."

**Q3 (Gotcha/Limits):** "What are the Clerk gotchas? Cover: the pricing model (MAU-based), what happens when you hit free tier limits, the difference between Clerk's hosted pages vs embedded components, and webhook signature verification for syncing users to your database."

**Q4 (Recent Change):** "What's new in Clerk in 2025-2026? Cover any SDK changes, new components, pricing updates, and the current state of Clerk's B2B features."

### Research queries:
- `"Clerk" changelog 2025 2026 new features`
- `"Clerk" Next.js App Router setup 2026`
- `"Clerk" organizations multi-tenant`
- `"Clerk" pricing MAU 2026`
- `"Clerk" webhook user sync database`
- `site:clerk.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js, React, Remix, Astro)
2. Components (SignIn, SignUp, UserButton, UserProfile, OrganizationSwitcher)
3. Middleware (clerkMiddleware, protect, publicRoutes)
4. Server-Side Auth (auth(), currentUser() in RSC, API routes)
5. Client-Side Auth (useAuth, useUser, useOrganization hooks)
6. Organizations (create, invite, roles, permissions)
7. Webhooks (user sync, Svix signature verification)
8. Customization (appearance, localization)
9. Pricing & Limits
10. Common Mistakes

---

## Task 3: supabase-auth

**Files:**
- Create: `.claude/skills/supabase-auth/SKILL.md`
- Create: `.claude/skills/supabase-auth/reference.md`
- Create: `.claude/skills/supabase-auth/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: supabase-auth
description: Use when implementing authentication with Supabase Auth — email/password, OAuth, magic links, or Row Level Security integration. Also use when connecting Supabase Auth with RLS policies or debugging auth token issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up Supabase Auth in a Next.js App Router project with SSR. Show me: creating the Supabase client for server/browser, the auth callback route, middleware for session refresh, and protecting pages."

**Q2 (Common Operation):** "Implement email/password auth with Supabase Auth: sign up with email confirmation, sign in, password reset, and session management. Show me the full flow including the confirmation redirect handling."

**Q3 (Gotcha/Limits):** "What are the Supabase Auth gotchas? Cover: the difference between createClient and createServerClient, why you need middleware for session refresh, how auth tokens interact with RLS, and the email rate limits on the free tier."

**Q4 (Recent Change):** "What's new in Supabase Auth in 2025-2026? Cover: auth hooks, SAML/SSO support, any changes to the PKCE flow, and the new @supabase/ssr package."

### Research queries:
- `"Supabase Auth" changelog 2025 2026`
- `"Supabase Auth" Next.js App Router SSR setup`
- `"Supabase" @supabase/ssr package`
- `"Supabase Auth" RLS integration patterns`
- `"Supabase Auth" rate limits email`
- `site:supabase.com/docs/guides/auth` — verify via WebFetch

### reference.md sections:
1. Setup (Next.js SSR, React SPA, standalone)
2. Client Creation (@supabase/ssr — server, browser, middleware)
3. Email/Password (sign up, confirm, sign in, reset)
4. OAuth (Google, GitHub, providers config)
5. Magic Links
6. Session Management (middleware refresh, getSession vs getUser)
7. RLS Integration (auth.uid(), auth.jwt(), policies)
8. Auth Hooks (custom claims, MFA)
9. Protected Routes (middleware, server-side checks)
10. Rate Limits & Pricing
11. Common Mistakes

---

## Task 4: vercel

**Files:**
- Create: `.claude/skills/vercel/SKILL.md`
- Create: `.claude/skills/vercel/reference.md`
- Create: `.claude/skills/vercel/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: vercel
description: Use when deploying to Vercel — project setup, environment variables, serverless functions, Edge Functions, or preview deployments. Also use when configuring Vercel for Next.js, Astro, or other frameworks, or debugging deployment issues.
---
```

### RED baseline questions:

**Q1 (Setup):** "Deploy a Next.js App Router project to Vercel. Show me: vercel.json configuration (if needed), environment variables setup, the deployment workflow, and how preview deployments work with GitHub PRs."

**Q2 (Common Operation):** "Set up a production Vercel deployment with: custom domain, environment variables per branch (preview vs production), serverless function regions, and cron jobs. Show me the full configuration."

**Q3 (Gotcha/Limits):** "What are the Vercel gotchas? Cover: serverless function size limits (50MB), execution time limits (10s hobby / 60s pro), cold starts, the difference between Serverless and Edge Functions, and bandwidth/build minute pricing traps."

**Q4 (Recent Change):** "What's new on Vercel in 2025-2026? Cover: Vercel Firewall, Speed Insights, Web Analytics, Fluid Compute, and any pricing model changes."

### Research queries:
- `"Vercel" changelog 2025 2026 new features`
- `"Vercel" pricing changes 2026`
- `"Vercel" serverless function limits timeout`
- `"Vercel" Edge Functions vs Serverless Functions`
- `"Vercel" environment variables preview production`
- `site:vercel.com/docs` — verify via WebFetch

### reference.md sections:
1. Setup (import project, CLI, vercel.json)
2. Frameworks (Next.js, Astro, Remix, SvelteKit — framework-specific config)
3. Environment Variables (scopes: production, preview, development)
4. Serverless Functions (API routes, limits, regions)
5. Edge Functions (middleware, edge runtime)
6. Deployments (preview, production, rollback, promote)
7. Domains (custom domains, redirects, rewrites)
8. Cron Jobs (vercel.json crons config)
9. Observability (logs, Speed Insights, Web Analytics)
10. Pricing & Limits (hobby vs pro vs enterprise, gotchas)
11. Common Mistakes

---

## Task 5: cloudflare-pages-workers

**Files:**
- Create: `.claude/skills/cloudflare-pages-workers/SKILL.md`
- Create: `.claude/skills/cloudflare-pages-workers/reference.md`
- Create: `.claude/skills/cloudflare-pages-workers/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: cloudflare-pages-workers
description: Use when deploying to Cloudflare Pages or Workers — static sites, full-stack apps, edge computing, D1 database, R2 storage, or KV. Also use when choosing between Vercel and Cloudflare or building on the Cloudflare developer platform.
---
```

### RED baseline questions:

**Q1 (Setup):** "Deploy a full-stack app to Cloudflare Pages with Functions (server-side). Show me: wrangler.toml, the Pages Functions directory structure, environment variables/secrets, and the deployment workflow."

**Q2 (Common Operation):** "Build a Cloudflare Worker that: handles API requests, uses D1 (SQLite) for data, R2 for file storage, and KV for caching. Show me the full wrangler.toml and worker code."

**Q3 (Gotcha/Limits):** "What are the Cloudflare Workers/Pages gotchas? Cover: the 128MB memory limit, CPU time limits (10ms free / 30s paid), no Node.js API compatibility (no fs, no net), cold start behavior, and D1 consistency model."

**Q4 (Recent Change):** "What's new on Cloudflare's developer platform in 2025-2026? Cover: Workers AI, Vectorize, Hyperdrive, container support, and any changes to the free tier."

### Research queries:
- `"Cloudflare Workers" changelog 2025 2026`
- `"Cloudflare Pages" full-stack deployment`
- `"Cloudflare D1" database production ready 2026`
- `"Cloudflare Workers" limits CPU memory`
- `"Cloudflare" vs Vercel comparison 2026`
- `site:developers.cloudflare.com` — verify via WebFetch

### reference.md sections:
1. Pages Setup (static sites, full-stack with Functions)
2. Workers Setup (wrangler.toml, dev, deploy)
3. Pages Functions (directory-based routing, middleware)
4. Bindings (D1, R2, KV, Durable Objects, Queues)
5. D1 Database (SQL, migrations, consistency)
6. R2 Object Storage (S3-compatible API)
7. KV (key-value, TTL, caching patterns)
8. Environment Variables & Secrets
9. Custom Domains & Routing
10. Workers AI & Vectorize
11. Node.js Compatibility Mode
12. Pricing & Limits (free vs paid, per-request model)
13. Common Mistakes

---

## Task 6: docker

**Files:**
- Create: `.claude/skills/docker/SKILL.md`
- Create: `.claude/skills/docker/reference.md`
- Create: `.claude/skills/docker/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: docker
description: Use when containerizing applications with Docker — Dockerfiles, multi-stage builds, docker-compose, or container deployment. Also use when debugging container issues, optimizing image sizes, or setting up local development with Docker.
---
```

### RED baseline questions:

**Q1 (Setup):** "Write a production-ready Dockerfile for a Next.js App Router project. Use multi-stage builds, minimize image size, and handle the standalone output mode. Show me the Dockerfile and docker-compose.yml for local development."

**Q2 (Common Operation):** "Set up a docker-compose development environment with: a Node.js API, Postgres database, Redis cache, and a React frontend. Show me: docker-compose.yml, volume mounts for hot reload, health checks, and the networking setup."

**Q3 (Gotcha/Limits):** "What are the Docker gotchas for web developers? Cover: layer caching (why COPY package.json before COPY . matters), the .dockerignore file, running as non-root, handling secrets at build time vs runtime, and the difference between CMD and ENTRYPOINT."

**Q4 (Recent Change):** "What's new in Docker in 2025-2026? Cover: Docker Init, Docker Scout, Docker Build Cloud, Compose Watch, and any changes to Docker Desktop licensing."

### Research queries:
- `"Docker" changelog 2025 2026 new features`
- `"Dockerfile" Next.js multi-stage build 2026`
- `"Docker" best practices production Node.js`
- `"Docker Compose" development environment 2026`
- `"Docker" security non-root best practices`
- `site:docs.docker.com` — verify via WebFetch

### reference.md sections:
1. Dockerfile (FROM, COPY, RUN, CMD, ENTRYPOINT, multi-stage)
2. Multi-Stage Builds (patterns for Node.js, Next.js, Go, Python)
3. Docker Compose (services, networks, volumes, depends_on)
4. Development Setup (hot reload, volume mounts, Compose Watch)
5. Production Patterns (non-root, health checks, graceful shutdown)
6. Image Optimization (layer caching, .dockerignore, size reduction)
7. Secrets Management (build args, runtime secrets, Docker secrets)
8. Networking (bridge, host, service discovery)
9. Docker Init (auto-generate Dockerfile and compose)
10. Docker Scout (vulnerability scanning)
11. Common Mistakes

---

## Task 7: github-actions

**Files:**
- Create: `.claude/skills/github-actions/SKILL.md`
- Create: `.claude/skills/github-actions/reference.md`
- Create: `.claude/skills/github-actions/test-baseline.md`

**SKILL.md frontmatter:**
```yaml
---
model: claude-sonnet-4-6
name: github-actions
description: Use when setting up CI/CD with GitHub Actions — workflows, jobs, actions, matrix builds, or deployment automation. Also use when debugging workflow failures, optimizing build times, or implementing release automation.
---
```

### RED baseline questions:

**Q1 (Setup):** "Set up a GitHub Actions CI pipeline for a Next.js + pnpm project. Steps: install dependencies, lint, type check, run unit tests (Vitest), run E2E tests (Playwright), and deploy to Vercel on push to main. Show me the complete .github/workflows/ci.yml."

**Q2 (Common Operation):** "Implement a release workflow with GitHub Actions: on push to main, run tests, bump version based on conventional commits, create a GitHub release with changelog, and deploy. Use semantic-release or changesets."

**Q3 (Gotcha/Limits):** "What are the GitHub Actions gotchas? Cover: the job concurrency issue (parallel deploys), secret masking limitations, the difference between GITHUB_TOKEN permissions, caching strategies (node_modules vs pnpm store), and billing for private repos."

**Q4 (Recent Change):** "What's new in GitHub Actions in 2025-2026? Cover: Arm runners, larger runners, Actions Attestations, required workflows, and any YAML syntax changes."

### Research queries:
- `"GitHub Actions" changelog 2025 2026 new features`
- `"GitHub Actions" Next.js pnpm CI pipeline`
- `"GitHub Actions" caching pnpm node_modules`
- `"GitHub Actions" billing minutes 2026`
- `"GitHub Actions" reusable workflows`
- `site:docs.github.com/actions` — verify via WebFetch

### reference.md sections:
1. Workflow Syntax (on, jobs, steps, env, defaults)
2. Triggers (push, pull_request, schedule, workflow_dispatch, repository_dispatch)
3. Jobs (runs-on, needs, matrix, concurrency)
4. Actions (uses, with, marketplace actions)
5. Caching (actions/cache, pnpm/npm/yarn patterns)
6. Secrets & Variables (environment secrets, GITHUB_TOKEN permissions)
7. Artifacts (upload-artifact, download-artifact)
8. Reusable Workflows (workflow_call, inputs, secrets)
9. Deployment Patterns (environment protection, deployment gates)
10. Matrix Builds (multiple Node versions, OS combinations)
11. Performance (caching, parallel jobs, conditional steps)
12. Billing & Limits
13. Common Mistakes

---

## Task 8: Write infra-guide agent

**Files:**
- Create: `.claude/agents/infra-guide.md`

```markdown
---
name: infra-guide
description: Use when asking general questions about deployment, hosting, CI/CD, containerization, or infrastructure. Routes to specific skills (vercel, cloudflare-pages-workers, docker, github-actions) based on context.
model: inherit
memory: user
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, Skill
---

# Infrastructure Guide

You help with deployment, hosting, CI/CD, and infrastructure questions.

## Skills You Route To

| Topic | Skill |
|-------|-------|
| Vercel deployment | armadillo:vercel |
| Cloudflare Pages/Workers | armadillo:cloudflare-pages-workers |
| Docker containerization | armadillo:docker |
| GitHub Actions CI/CD | armadillo:github-actions |

## How to Help

1. Read `.claude/stack.json` if it exists — use the project's decided deploy target
2. If no stack.json, understand the project's needs before recommending
3. Load the relevant reference skill for specific questions
4. For "where should I deploy?" questions, compare based on: framework, budget, scale needs, team experience

## Decision Quick Reference

| Need | Recommendation |
|------|----------------|
| Next.js with zero config | Vercel |
| Edge computing, cheapest at scale | Cloudflare |
| Full control, any hosting | Docker |
| Custom backend, needs containers | Docker + Railway/Fly.io |
| CI/CD (any project) | GitHub Actions |
```

**Commit:**
```bash
git add .claude/agents/infra-guide.md
git commit -m "feat: add infra-guide agent"
```

---

## Task 9: Update skills.json with Phase 3 skills + bundles

**Files:**
- Modify: `skills.json`

**New bundles:**
```json
"auth": {
  "name": "Authentication",
  "description": "Auth.js, Clerk, Supabase Auth — drop-in authentication for any stack",
  "default": false,
  "skills": ["authjs", "clerk", "supabase-auth"]
},
"deploy": {
  "name": "Deployment",
  "description": "Vercel, Cloudflare, Docker, GitHub Actions — deploy anywhere with CI/CD",
  "default": false,
  "skills": ["vercel", "cloudflare-pages-workers", "docker", "github-actions"]
}
```

**Commit:**
```bash
git add skills.json
git commit -m "feat: register Phase 3 auth + deploy skills and bundles"
```

---

## Summary

| Task | Skill | Type |
|------|-------|------|
| 1 | authjs | Reference (TDD) |
| 2 | clerk | Reference (TDD) |
| 3 | supabase-auth | Reference (TDD) |
| 4 | vercel | Reference (TDD) |
| 5 | cloudflare-pages-workers | Reference (TDD) |
| 6 | docker | Reference (TDD) |
| 7 | github-actions | Reference (TDD) |
| 8 | infra-guide agent | Agent |
| 9 | skills.json update | Registry |

9 tasks · executing subagent-driven

**Parallelizable:** Tasks 1-3 (auth) can run in parallel. Tasks 4-7 (deploy) can run in parallel. Tasks 8-9 are sequential after skills exist.
