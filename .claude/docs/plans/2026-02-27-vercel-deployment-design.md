# Vercel SPA Deployment Design

**Date:** 2026-02-27
**Status:** Approved

## Context

SpearlanceOS is a Vite + React + shadcn/ui SPA with all server logic in Supabase Edge Functions (93 functions, 163 migrations, 44 tables). The app needs production deployment at `os.spearlance.com`.

## Decision

Deploy as a static SPA on Vercel. Production environment only. No CI/CD workflows — Vercel's git integration handles auto-deploy on push to main.

## Architecture

```
GitHub repo (main) → Vercel (auto-deploy) → os.spearlance.com
                                              ↓
                                         Vite SPA (dist/)
                                              ↓
                                    Supabase Edge Functions
                                    (hrmhqybdsdngsvhjqwma)
```

## What Gets Created

| Item | Detail |
|------|--------|
| `vercel.json` | SPA rewrite, framework vite, build command, output dist |
| `.vercel/project.json` | Auto-created by `vercel link` (gitignored) |
| Vercel env vars | All VITE_* vars pushed to production scope via CLI |
| Git integration | Auto-deploy on push to main |
| Domain | `os.spearlance.com` in Vercel |

## vercel.json

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## What Does NOT Change

- No CI/CD workflows added
- No changes to Supabase config, edge functions, or migrations
- No changes to vite.config.ts
- No staging environment
- Local Supabase setup stays intact

## Steps

1. Link Vercel project locally (`vercel link`)
2. Create `vercel.json`
3. Push VITE_* env vars from .env to Vercel production
4. Deploy to production (`vercel --prod`)
5. Add custom domain `os.spearlance.com`
6. Verify live build works
