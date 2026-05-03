# Dev/Main Environment Split — Design

**Date:** 2026-05-03
**Owner:** Garrett Handley
**Status:** Approved — ready for implementation plan

## Problem

Every edit, migration, and Playwright test currently runs against the production Supabase project (`chikljxwgiskyjsnjelf`). This is the only database, and it holds real client data. SpearlanceOS has 80+ edge functions, ~150 migrations, paying clients, and active cron jobs. A bad migration, a broken seed, or a mistargeted Playwright run can corrupt production with no recovery path beyond restoring backups.

The risk is now disproportionate to the development velocity gain. We need an isolated environment for development and testing that mirrors production architecture without touching production data.

## Goals

1. New features can be built and tested without any chance of touching production data
2. Migrations are verified against a real Supabase project before being applied to prod
3. Playwright e2e tests run against seeded fake data, not real clients
4. Branch-based preview deployments exist for stakeholder review
5. Production stays the only thing on `os.spearlance.com`
6. Setup cost is minimal — start on Supabase Free tier, upgrade only if needed

## Non-Goals

- Replacing local development with a remote-only flow — `npm run dev` still works locally
- Auto-promoting migrations from dev to prod — manual gate is intentional (safety > speed)
- Mirroring production data into dev — dev uses fake seed data only
- Multi-region or HA dev infrastructure — single-region Free tier is sufficient

## Architecture

### Two Supabase Projects

| Project | Reference | Tier | Region | Purpose |
|---------|-----------|------|--------|---------|
| SpearlanceOS | `chikljxwgiskyjsnjelf` | Existing | West US (Oregon) | Production — live customers |
| SpearlanceOS-Dev | TBD on creation | Free (upgradeable) | West US (Oregon) | Development + Playwright + previews |

Same region for parity. Free tier accepted with keepalive cron to prevent 7-day pause.

### Vercel Environment Mapping

| Branch | Vercel Env | Supabase Target | URL |
|--------|------------|-----------------|-----|
| `main` | Production | Prod | `os.spearlance.com` |
| Any other branch | Preview | Dev | `os-spearlance-git-<branch>.vercel.app` |

Environment variable separation handled by Vercel's Production/Preview env scopes — no code changes needed in `src/integrations/supabase/client.ts`.

### Local Development

`.env.local` (gitignored) overrides `.env` and points at the dev project. `npm run dev` automatically uses dev credentials. No manual env switching during normal work.

## Workflows

### Feature Development

```
1. git checkout -b feat/something
2. npm run dev                              → localhost:8080 hits dev Supabase
3. write code, write tests, iterate
4. git push origin feat/something           → Vercel builds preview → dev Supabase
5. share preview URL for review
6. open PR → review → merge to main
7. main auto-deploys to os.spearlance.com   → prod Supabase
```

### Migration Development (Manual Gate)

```
1. write migration file in supabase/migrations/
2. npm run db:link:dev                      → links CLI to dev project
3. npm run db:push:dev                      → applies migration to dev
4. verify on dev (UI, Playwright, manual checks)
5. merge PR to main
6. npm run db:link:prod                     → links CLI to prod project
7. npm run db:push:prod                     → applies migration to prod
```

The link/push split is deliberate. The user explicitly runs the prod step. There is no auto-promotion to main.

### Edge Function Deployment

`scripts/deploy-functions.mjs` modified to accept `--env=dev|prod`, defaulting to **dev**. Production deploys require explicit `--env=prod` flag. Same opt-in pattern as migration push.

### Playwright Tests

`PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_TEST_EMAIL` repointed at the dev environment in `.env`. Tests run against seeded fake ABC Company data. Existing test scope rule (ABC Company only) preserved.

## Seed Data

`supabase/seed.sql` — re-runnable script that populates dev DB:

| Fixture | Purpose |
|---------|---------|
| Admin user | Matches `PLAYWRIGHT_TEST_EMAIL`, full admin role |
| ABC Company test client | Existing Playwright target, fully unlocked |
| 2-3 additional fake clients | Multi-client scenarios |
| Fake analytics rows | CWV / GA4 / Lighthouse data for SOS Tracker testing |
| Fake leads + ticket data | Lead pipeline + ticket system testing |
| Fake Stripe subscription state | Subscription flow testing without real Stripe calls |

Trigger: `npm run db:seed` — drops and reseeds. Idempotent.

## Keepalive

Free Supabase projects pause after 7 days with no API activity. Workaround:

`.github/workflows/dev-keepalive.yml`:
- Runs every 3 days at noon UTC (`cron: "0 12 */3 * *"`)
- Hits dev Supabase REST API with `SELECT 1`
- Costs $0 — GitHub Actions free tier
- Runtime ~5 seconds per execution

If the dev project is upgraded to Pro, the workflow becomes harmless and can be removed.

## Disabled in Dev

| Item | Why | Where |
|------|-----|-------|
| All cron functions | No need for scheduled tasks in dev; saves quota | `supabase/config.toml` (dev linkage) |
| Stripe live mode | Use test keys + test webhooks | Stripe dashboard + dev `.env.local` |
| Outbound email | No emails to real users from dev | Disable or route to test inbox |
| Cal.com production org | Use test org or no-op | `VITE_CAL_ORG_ID` in dev `.env.local` |

## File Changes Required

| File | Change |
|------|--------|
| `.env.example` | Add comment block explaining dev vs prod |
| `.env.local` | New file (gitignored) — dev Supabase keys |
| `package.json` | Add `db:seed`, `db:link:dev`, `db:link:prod`, `db:push:dev`, `db:push:prod` scripts |
| `scripts/deploy-functions.mjs` | Add `--env=dev|prod` flag, default to dev |
| `supabase/seed.sql` | New file — dev fixtures |
| `.github/workflows/dev-keepalive.yml` | New file — 3-day cron ping |
| `.claude/CLAUDE.md` | Document the dev/prod workflow |
| `.claude/rules/playwright-verification.md` | Update to reference dev environment |

No changes to `src/integrations/supabase/client.ts` — environment variables continue to drive the connection. Vercel handles env scoping.

## Security Considerations

- Dev Supabase service role key never exposed to frontend (same rule as prod)
- DB password generated at project creation, written to `.env.local` only, never committed
- Edge function secrets (`OPENAI_API_KEY`, `STRIPE_*`, `DATAFORSEO_*`, ~20 total) must be set in dev project — separate from prod, no shared secrets
- Stripe in dev = test mode keys only, never live keys
- GitHub Action keepalive uses dev anon key only (read-only SELECT 1)

## Testing Approach (TDD Order)

1. RED: write a test that fails because dev environment doesn't exist (e.g., `npm run db:link:dev` script missing)
2. GREEN: create the script, project, link
3. RED: write a test that fails because seed data doesn't load
4. GREEN: write `seed.sql` and `db:seed` script
5. RED: Playwright login fails against dev (no seeded admin)
6. GREEN: seed admin, repoint Playwright env vars, suite passes
7. Verify edge function deploy with `--env=dev` works
8. Verify keepalive workflow syntax via GitHub Actions dry-run

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Free tier slot unavailable in org (6 projects already) | Fallback: $25/mo Pro tier — design unchanged |
| Initial migration sync (~150 files) takes 10-30 min | Run as one-shot during execution; document for future |
| Drift between dev and prod schemas | Manual gate forces alignment; both run from same migration files |
| Edge function secret drift | Document required secrets in `.env.example`; check during initial setup |
| Developer forgets to link to dev before push | `db:push` scripts hardcode the target via `--project-ref`, not implicit linkage |
| Stripe test webhooks missing | Configure Stripe test endpoints in dev project setup phase |

## Rollback Path

If dev environment causes more friction than value:
1. Stop using `.env.local` — `.env` resumes pointing at prod
2. Pause or delete dev Supabase project
3. Remove keepalive workflow
4. Revert `package.json` script additions
5. Original workflow restored — no production data affected

Total revert time: ~10 minutes. No production impact at any point.

## Out of Scope (Future Work)

- Auto-promotion of migrations via GitHub Action (deferred — manual gate is intentional)
- Production data anonymization for richer dev testing (compliance concerns; not needed)
- Staging environment between dev and prod (overkill for solo-dev pace)
- E2E tests on Vercel preview URLs in CI (current local-run model is sufficient)

## Approval

Design approved by Garrett on 2026-05-03. Ready for `writing-plans` skill to generate step-by-step implementation plan with checkpoints.
