# SpearlanceOS — Project Guide

SpearlanceOS is the internal operating system for Spearlance Media (SEO/marketing agency).

## Stack

- **Frontend:** React 18 + Vite, TypeScript, Tailwind + shadcn/ui (Radix)
- **Data/state:** TanStack Query, React Hook Form + Zod
- **Routing:** react-router-dom
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Deploy:** Vercel
- **Testing:** Vitest (unit/component), Playwright (e2e, in `e2e/`)

See `.claude/stack.json` for pinned versions.

## How to work here

Build things. Use judgment. Nothing below is a gate — there are no enforcement hooks, no skill-routing mandate, and no required ceremony. The skills and agents in `.claude/skills/` and `.claude/agents/` are available on demand when they genuinely help (a domain reference, a code review, a debugging assist). Invoke them when useful, skip them when not.

## Rules that matter (`.claude/rules/`)

These auto-load. They're guidance, not tripwires:

- **security.md** — secrets handling, input validation, PII hashing, XSS. Real constraints — follow them.
- **seo-doctrine.md** — Spearlance's SEO operating stance (meta titles, schema, interlinking, page-context protection, escalation). The agency's playbook for SEO work on Spearlance.com and client sites.
- **testing.md** — diagnose-don't-brute-force testing philosophy.
- **git-workflow.md** — repo-specific git gotchas (see below).
- **facebook-capi.md / meta-api-versioning.md / pinterest.md** — API reference for the ad-platform integrations.

## Git gotcha (important)

Claude Code injects a limited-scope `GITHUB_TOKEN`. For pushes and `gh api` calls, prefix with `env -u GITHUB_TOKEN` to use the full-scope keyring token:

```bash
env -u GITHUB_TOKEN git push origin <branch>
env -u GITHUB_TOKEN gh api repos/<slug>/pulls --method POST ...
```

Prefer `gh api` (REST) over `gh pr create`/`gh pr merge` (GraphQL) to avoid rate-limit exhaustion. Details in `git-workflow.md`.

## Environment notes

- Dev/main Supabase split and other ongoing-work context live in this project's memory (`MEMORY.md`).
- Permissions default to `bypassPermissions` with a small catastrophic-command deny-list in `settings.json`.
