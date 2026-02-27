---
model: claude-sonnet-4-6
name: vercel
description: Use when deploying to Vercel — project setup, environment variables, serverless functions, Edge Functions, or preview deployments. Also use when configuring Vercel for Next.js, Astro, or other frameworks, or debugging deployment issues.
---

# Vercel

## Overview

Vercel is a cloud platform for frontend and serverless deployments. Git-push deploys, preview URLs per branch, global CDN, and serverless/Edge Functions baked in.

## Quick Reference

| Item | Value |
|------|-------|
| **CLI Install** | `npm i -g vercel` |
| **Deploy (preview)** | `vercel` |
| **Deploy (production)** | `vercel --prod` |
| **Link project** | `vercel link` |
| **Pull env vars** | `vercel env pull .env.local` |
| **Docs** | https://vercel.com/docs |

## Deploy Commands

```bash
vercel                    # preview deploy (current dir)
vercel --prod             # production deploy
vercel --yes              # skip prompts
vercel logs [url]         # stream function logs
vercel env pull .env.local  # sync remote env vars locally
vercel env add MY_VAR     # add env var interactively
vercel rollback           # roll back to previous production
```

## vercel.json Basics

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "nextjs",
  "functions": {
    "api/**/*.ts": { "maxDuration": 30, "memory": 512 }
  },
  "rewrites": [{ "source": "/api/:path*", "destination": "https://api.example.com/:path*" }],
  "redirects": [{ "source": "/old", "destination": "/new", "permanent": true }],
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "X-Frame-Options", "value": "DENY" }] }],
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 5 * * *" }]
}
```

## Function Limits (Fluid Compute defaults, enabled by default for new projects)

| Limit | Hobby | Pro | Enterprise |
|-------|-------|-----|------------|
| **Max duration** | 300s | 800s | 800s |
| **Memory** | 2 GB / 1 vCPU | 4 GB / 2 vCPU | 4 GB / 2 vCPU |
| **Bundle size** | 250 MB (uncompressed) | 250 MB | 250 MB |
| **Request body** | 4.5 MB | 4.5 MB | 4.5 MB |
| **Concurrency** | 30,000 | 30,000 | 100,000+ |
| **Edge size** | 1 MB compressed | 2 MB | 4 MB |
| **Edge initial response** | 25s | 25s | 25s |
| **Edge streaming** | 300s | 300s | 300s |

## Environment Variable Scopes

| Scope | When Available |
|-------|---------------|
| `production` | `vercel --prod` deploys only |
| `preview` | All non-production deploys |
| `development` | `vercel dev` locally |

## Preview Deployment Flow

1. Push branch → automatic preview deploy triggered
2. Vercel posts URL to PR comment (GitHub/GitLab/Bitbucket)
3. Preview URL: `<project>-git-<branch>-<team>.vercel.app`
4. Merge to main → production deploy auto-fires

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Env vars missing in production | Check scope — set to `production` not just `preview`/`development` |
| `vercel env pull` overwrites local vars | Use `.env.local` — Vercel merges, not replaces |
| Function timeout on Hobby | Max is 300s; use streaming or offload to queue |
| Edge Function hitting Node.js APIs | Edge uses V8 runtime — no `fs`, `path`, `crypto` (use `globalThis.crypto`) |
| 250 MB bundle exceeded | Tree-shake imports; use `excludeFiles` in vercel.json functions config |
| Build passes locally, fails on Vercel | Check `VERCEL=1` env — Vercel sets this; use for conditional logic |

## Full Reference

See `reference.md` for: full framework configs (Next.js, Astro, Remix, SvelteKit), all env var scopes, Fluid Compute details, Edge vs Serverless comparison, custom domains, rewrites/redirects, cron jobs, observability, and pricing breakdown.
