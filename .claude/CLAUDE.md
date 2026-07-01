# SpearlanceOS

Agency operations platform for Spearlance Media.

## Stack

- **Frontend:** React 18 + Vite + TypeScript, React Router, TanStack Query
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/data:** Supabase (Postgres, Auth, Edge Functions, RLS)
- **Forms:** react-hook-form + Zod
- **Testing:** Vitest
- **Deploy:** Vercel
- **Package manager:** npm

Full versions in `.claude/stack.json`.

## Git

- Branch-first: never commit directly to `main`. Work on `feat/`, `fix/`, `chore/`, etc.
- Squash-merge PRs.
- Claude Code injects a limited-scope `GITHUB_TOKEN`. Prefix git push / `gh api` with `env -u GITHUB_TOKEN` to use the full-scope keyring token (required for pushes touching `.github/workflows/`).

## Deploy

- Vercel auto-deploy from `main` is unreliable — merges don't always ship. Run `vercel --prod` from `origin/main` to deploy manually. Live at os.spearlance.com.
- Supabase Edge Functions in the repo are not auto-synced to the cloud project; deploy them explicitly when changed.

## Supabase environments

- **prod:** project `chikljxwgiskyjsnjelf` — wired to Vercel **Production** (os.spearlance.com) and local when using prod env.
- **dev:** project `zlljsdaxsggkasvympku` (persistent branch of prod; schema mirrors prod) — wired to Vercel **Preview** (all branches) and to local dev via `.env.local`.

Canonical rule: **Preview = dev, Production = prod.** The Vercel Preview `VITE_SUPABASE_*` vars point at the dev project; never repoint them at prod. (Historical note: a stale/dead project `hrmhqybdsdngsvhjqwma` was wrongly wired to Preview until 2026-07-01 — do not resurrect it.) Apply schema migrations to dev first, then promote to prod.

## Available helpers

`.claude/` provides optional, opt-in resources:
- `agents/` — domain-expert subagents (database, frontend, debugging, code review, integrations) invoked via the Task tool.
- `skills/` — reference docs for libraries/APIs, invoked via the Skill tool when relevant.
- `rules/seo-doctrine.md` — Spearlance SEO operating rules; load when doing SEO work.

These are references, not mandates — use them when they fit the task.
