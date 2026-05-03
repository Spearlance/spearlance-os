# Dev/Main Environment Split — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create a separate Supabase dev project with seed data so all development, testing, and previews run against dev — production is untouchable.

**Architecture:** Two Supabase projects (prod stays as-is, new dev project created via CLI). Vercel env vars scoped so Production env → prod Supabase, Preview env → dev Supabase. Local dev reads `.env.local` which points at dev. Manual migration gate — you run `db push` against prod yourself.

**Tech Stack:** Supabase CLI, Vite env vars, Vercel env scoping, GitHub Actions (keepalive cron), Node.js scripts

**Design doc:** `.claude/docs/plans/2026-05-03-dev-main-environment-split-design.md`

---

## Production Safety Doctrine (MANDATORY)

This work happens around live production. Before any task runs, these rules apply:

1. **Work on a fresh branch** (`feat/dev-environment-split`) — never on `main`, never on a branch with unrelated work
2. **Manual prod backup taken** before any task starts (Supabase Dashboard → Backups → Create backup)
3. **NEVER use `--linked` for destructive Supabase commands** — always explicit `--project-ref <ref>`
4. **Three forbidden command patterns** that must NEVER execute against prod ref `chikljxwgiskyjsnjelf`:
   - `db reset` (wipes the database)
   - `db push` (without prior verification + confirmation)
   - `functions deploy --all` (mass overwrite)
5. **Vercel changes happen LAST** (after dev is fully verified working)
6. **Vercel changes only ADD Preview-scoped vars** — never modify Production-scoped vars
7. **Stripe keys validated** — dev `.env.local` and dev Edge Function secrets must use `sk_test_*` / `pk_test_*` keys ONLY. Live keys (`sk_live_*`) refuse to load.
8. **No code freeze violations** — no new migrations on any branch, no merges to main, while this work is in flight

### The Three Danger Tasks
- **Task 3** (push migrations): risk of pushing to wrong project
- **Task 6** (run seed): risk of seeding fake data into prod
- **Task 9** (Vercel env vars): risk of editing Production-scope by mistake

These three tasks have extra checkpoint gates and explicit `--project-ref` everywhere.

---

### Task 0: Pre-Flight Safety Setup

**Files:**
- Create: `scripts/confirm-prod.mjs`
- Create: `scripts/check-link-state.mjs`

**Step 1: Create a dedicated branch for this work**

```bash
git checkout main
git pull
git checkout -b feat/dev-environment-split
```

Verify:

```bash
git branch --show-current
```

Expected: `feat/dev-environment-split`

**Step 2: Take manual prod Supabase backup**

Open: https://supabase.com/dashboard/project/chikljxwgiskyjsnjelf/database/backups

Click **"Create backup"**. Wait for completion (~1-2 min). Note the timestamp — this is your restore point.

This step is MANUAL — confirm with user that backup completed before continuing. Do NOT proceed to Task 1 without this confirmation.

**Step 3: Write `scripts/confirm-prod.mjs`**

This script is required by any prod-targeting npm script. It blocks unless the user types "PRODUCTION" exactly.

```javascript
import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('');
console.log('⚠ ⚠ ⚠  PRODUCTION DATABASE OPERATION  ⚠ ⚠ ⚠');
console.log('');
console.log('You are about to run a command that will modify the LIVE production database.');
console.log('Project: SpearlanceOS (chikljxwgiskyjsnjelf)');
console.log('');

rl.question("Type 'PRODUCTION' (exact case) to confirm, or anything else to abort: ", (answer) => {
  rl.close();
  if (answer === 'PRODUCTION') {
    console.log('✓ Confirmed. Proceeding with production operation.');
    process.exit(0);
  }
  console.log('✗ Aborted. No changes made.');
  process.exit(1);
});
```

**Step 4: Write `scripts/check-link-state.mjs`**

Prints the currently linked Supabase project, color-coded by env. Used by `db:current` script.

```javascript
import { execSync } from 'node:child_process';

const PROD_REF = 'chikljxwgiskyjsnjelf';

try {
  const output = execSync('npx supabase projects list', { encoding: 'utf-8' });
  const lines = output.split('\n');
  const linked = lines.find(l => l.includes('●'));

  if (!linked) {
    console.log('▸ No project linked. Run npm run db:link:dev or npm run db:link:prod');
    process.exit(0);
  }

  const isProd = linked.includes(PROD_REF);
  const tag = isProd ? '🔴 PRODUCTION' : '🟢 DEVELOPMENT';
  console.log('');
  console.log(`Current Supabase link: ${tag}`);
  console.log(linked.trim());
  console.log('');
  if (isProd) {
    console.log('⚠ You are linked to PRODUCTION. Destructive commands will affect live data.');
    console.log('');
  }
} catch (err) {
  console.error('Error checking link state:', err.message);
  process.exit(1);
}
```

**Step 5: Add scripts to package.json**

```json
"db:current": "node scripts/check-link-state.mjs",
"prod:confirm": "node scripts/confirm-prod.mjs"
```

**Step 6: Commit**

```bash
git add scripts/confirm-prod.mjs scripts/check-link-state.mjs package.json
git commit -m "feat: add prod safety scripts (confirm-prod, check-link-state)"
```

**Step 7: Verify**

```bash
npm run db:current
```

Expected: shows current link state with color-coded label.

```bash
npm run prod:confirm
# Type something other than PRODUCTION → exit 1
```

Expected: aborts unless exact "PRODUCTION" typed.

---

### Task 1: Create the Dev Supabase Project

**Files:**
- None (CLI operation)

**Step 1: Generate a secure DB password**

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Save this output — you'll need it in Step 2 and Task 2.

**Step 2: Create the project via Supabase CLI**

```bash
npx supabase projects create "SpearlanceOS-Dev" \
  --org-id apaagrpscbfhzbetyeem \
  --db-password "<password-from-step-1>" \
  --region us-west-1
```

Expected output: Project reference ID (e.g., `abcdefghijklmnopqrst`). Save this — it's used everywhere.

If this fails with "free tier limit exceeded", the org already has 2 free projects. Options:
- Upgrade to Pro ($25/mo): go to Supabase dashboard
- Pause an unused project to free a slot

**Step 3: Wait for project to be ready (~2 min)**

```bash
npx supabase projects list | grep "SpearlanceOS-Dev"
```

Expected: row appears with the new reference ID and "West US (Oregon)" region.

**Step 4: Get the new project's API keys**

```bash
npx supabase projects api-keys --project-ref <DEV_PROJECT_REF>
```

Save the `anon` key (this becomes `VITE_SUPABASE_PUBLISHABLE_KEY` for dev) and the project URL pattern: `https://<DEV_PROJECT_REF>.supabase.co`.

**Step 5: Commit — no code changes yet, just document the ref**

No git commit for this task — it's a side-effect (project created). The ref gets used in Task 2.

---

### Task 2: Create `.env.local` and Update `.env.example`

**Files:**
- Create: `.env.local` (gitignored — already in `.gitignore` at line 17)
- Modify: `.env.example`

**Step 1: Write `.env.local` with dev project credentials**

Create `.env.local` at project root with these values (substituting real keys from Task 1 Step 4):

```env
# Dev Supabase — SpearlanceOS-Dev project
VITE_SUPABASE_URL=https://<DEV_PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-task-1>
VITE_SUPABASE_PROJECT_ID=<DEV_PROJECT_REF>

# Stripe TEST mode keys (never live keys in dev)
# Get test keys from: https://dashboard.stripe.com/test/apikeys
VITE_STRIPE_STARTER_MONTHLY_PRICE_ID=
VITE_STRIPE_STARTER_ANNUAL_PRICE_ID=
VITE_STRIPE_UNLIMITED_MONTHLY_PRICE_ID=
VITE_STRIPE_UNLIMITED_ANNUAL_PRICE_ID=
VITE_STRIPE_WEBSITE_ADDON_PRICE_ID=

# Playwright — same test user, now seeded in dev DB
PLAYWRIGHT_TEST_EMAIL=test-admin@spearlance-dev.com
PLAYWRIGHT_TEST_PASSWORD=TestPassword123!

# Dev app URL
VITE_APP_URL=http://localhost:8080
```

**Step 2: Update `.env.example` with environment documentation**

Add a comment block at the top of `.env.example` explaining the two-environment setup:

```env
# ============================================================
# SpearlanceOS Environment Configuration
# ============================================================
# TWO ENVIRONMENTS:
#   Production → uses Vercel env vars (set in Vercel dashboard)
#   Development → uses .env.local (gitignored, local machine only)
#
# For local dev:
#   1. Copy .env.example to .env.local
#   2. Fill in dev Supabase credentials (SpearlanceOS-Dev project)
#   3. npm run dev — automatically reads .env.local
#
# For production:
#   Set env vars in Vercel dashboard → Production scope
#   NEVER put prod credentials in any local file
# ============================================================
```

**Step 3: Verify `.env.local` is gitignored**

```bash
git status
```

Expected: `.env.local` does NOT appear in untracked files. It's already in `.gitignore` at line 17.

**Step 4: Commit `.env.example` changes**

```bash
git add .env.example
git commit -m "docs: add two-environment setup guide to .env.example"
```

---

### Task 3: Push Migrations to Dev Project (Explicit-Ref Mode)

**Files:**
- None (CLI operation, never uses `--linked`)

**SAFETY:** This task uses ONLY explicit `--project-ref <DEV_REF>` flags. Never `--linked`. Never bare commands. The link state is irrelevant — even if the CLI is currently linked to prod, every command in this task targets dev by ref.

**Step 1: Pre-flight — verify the dev ref is correct**

```bash
npx supabase projects list | grep "<DEV_PROJECT_REF>"
```

Expected: row with `SpearlanceOS-Dev`. If empty, Task 1 didn't complete — STOP.

**Step 2: Confirm dev DB is empty**

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected: `0` or near-zero. If count is high, something already pushed to it — investigate before pushing.

**Step 3: Push migrations to dev using explicit ref**

```bash
npx supabase link --project-ref <DEV_PROJECT_REF>
npm run db:current
```

Expected output from `db:current`: 🟢 DEVELOPMENT label, NOT 🔴 PRODUCTION. **If it shows production, STOP. Do not push.**

```bash
npx supabase db push
```

Note: After explicit `link --project-ref <DEV_REF>`, plain `db push` is safe because we just verified the link state. But the explicit-ref pattern is preferred:

```bash
# Even safer alternative — pass DB URL directly
npx supabase db push --db-url "postgresql://postgres.<DEV_PROJECT_REF>:<DB_PASSWORD>@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

Expected runtime: 5-30 minutes. ~150 migrations apply in order.

If any migration fails: stop, investigate. Do NOT modify migrations to "make them work" without understanding why prod accepted them.

**Step 4: Verify schema applied**

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected: 60+ tables. Compare against prod count if uncertain (read-only query, safe).

**Step 5: Confirm prod is untouched**

```bash
npx supabase db query --project-ref chikljxwgiskyjsnjelf \
  "SELECT count(*) FROM public.clients;"
```

Expected: same count as before this task started. This is a read-only SELECT, zero risk.

**Step 6: Stay linked to dev** (do NOT re-link to prod yet — Task 6 needs dev linkage)

`npm run db:current` should show 🟢 DEVELOPMENT throughout Tasks 3-6.

---

### Task 4: Add Database Helper Scripts to `package.json`

**Files:**
- Modify: `package.json` (scripts section)
- Test: `scripts/deploy-functions.mjs` (verify --env flag in Task 7)

**Step 1: Write test — verify scripts exist in package.json**

Create `tests/scripts/db-scripts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

describe('database helper scripts', () => {
  it('has db:link:dev script', () => {
    expect(pkg.scripts['db:link:dev']).toBeDefined();
    expect(pkg.scripts['db:link:dev']).toContain('supabase link');
  });

  it('has db:link:prod script', () => {
    expect(pkg.scripts['db:link:prod']).toBeDefined();
    expect(pkg.scripts['db:link:prod']).toContain('chikljxwgiskyjsnjelf');
  });

  it('has db:push script', () => {
    expect(pkg.scripts['db:push']).toBeDefined();
    expect(pkg.scripts['db:push']).toContain('supabase db push');
  });

  it('has db:seed script', () => {
    expect(pkg.scripts['db:seed']).toBeDefined();
  });

  it('has db:reset:dev script', () => {
    expect(pkg.scripts['db:reset:dev']).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scripts/db-scripts.test.ts
```

Expected: FAIL — scripts don't exist yet.

**Step 3: Add scripts to package.json**

Add to the `"scripts"` section of `package.json` (after existing `deploy:functions:diff`):

```json
"db:link:dev": "npx supabase link --project-ref <DEV_PROJECT_REF>",
"db:link:prod": "npx supabase link --project-ref chikljxwgiskyjsnjelf",
"db:push": "npx supabase db push --linked",
"db:push:dry": "npx supabase db push --linked --dry-run",
"db:seed": "npx supabase db reset --linked --db-url $(node -e \"const r='<DEV_PROJECT_REF>';console.log('postgresql://postgres.' + r + ':' + process.env.SUPABASE_DB_PASSWORD + '@aws-0-us-west-1.pooler.supabase.com:6543/postgres')\")",
"db:reset:dev": "npm run db:link:dev && npm run db:push && npm run db:seed"
```

Note: `<DEV_PROJECT_REF>` must be replaced with the actual project ref from Task 1.

Simplified alternative for `db:seed` (just runs seed.sql against linked project):

```json
"db:seed": "npx supabase db push --linked --include-seed"
```

This uses Supabase's built-in `--include-seed` which reads `supabase/seed.sql`. Cleaner.

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/scripts/db-scripts.test.ts
```

Expected: PASS — all 5 tests green.

**Step 5: Commit**

```bash
git add package.json tests/scripts/db-scripts.test.ts
git commit -m "feat: add database helper scripts for dev/prod environment management"
```

---

### Task 5: Write Seed Data

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Write test — verify seed file exists and has required fixtures**

Create `tests/scripts/seed-file.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const seedPath = join(__dirname, '../../supabase/seed.sql');

describe('seed data file', () => {
  it('seed.sql exists', () => {
    expect(existsSync(seedPath)).toBe(true);
  });

  const seed = existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';

  it('creates a test admin profile', () => {
    expect(seed).toContain('test-admin@spearlance-dev.com');
  });

  it('creates ABC Company client', () => {
    expect(seed).toContain('ABC Company');
  });

  it('creates fake additional clients', () => {
    expect(seed).toContain('Demo Construction Co');
  });

  it('creates billing plan entries', () => {
    expect(seed).toContain('billing_plans');
  });

  it('creates user_roles entry for admin', () => {
    expect(seed).toContain('user_roles');
    expect(seed).toContain('admin');
  });

  it('is idempotent — uses INSERT ON CONFLICT or starts with cleanup', () => {
    const hasConflict = seed.includes('ON CONFLICT');
    const hasCleanup = seed.includes('DELETE FROM') || seed.includes('TRUNCATE');
    expect(hasConflict || hasCleanup).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scripts/seed-file.test.ts
```

Expected: FAIL — `seed.sql` doesn't exist.

**Step 3: Write `supabase/seed.sql`**

The seed data must use stable UUIDs so it's deterministic. Generate 10 fixed UUIDs for the fixtures. Core tables to seed (based on schema analysis):

```sql
-- ============================================================
-- SpearlanceOS Dev Seed Data
-- Idempotent: safe to re-run. Uses ON CONFLICT DO NOTHING.
-- ============================================================

-- Fixed UUIDs for deterministic seeding
-- Admin user:        00000000-0000-0000-0000-000000000001
-- ABC Company:       00000000-0000-0000-0000-000000000010
-- Demo Construction: 00000000-0000-0000-0000-000000000011
-- Sunshine Dental:   00000000-0000-0000-0000-000000000012

-- Step 1: Create auth user (Supabase auth.users)
-- NOTE: This must be done via Supabase Dashboard or edge function
-- because auth.users is managed by GoTrue, not direct SQL.
-- After creating the user in dashboard, the trigger will create the profile.
-- The PLAYWRIGHT_TEST_EMAIL and PASSWORD in .env.local must match.

-- Step 2: Billing plans
INSERT INTO public.billing_plans (id, name, stripe_product_id, features, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'Starter', 'prod_test_starter', '{"websites": 1, "users": 2}', true),
  ('00000000-0000-0000-0000-000000000021', 'Unlimited', 'prod_test_unlimited', '{"websites": 999, "users": 999}', true)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Admin profile (must match auth.users email)
-- The profile is auto-created by the handle_new_user trigger.
-- After creating user in dashboard, update the profile:
-- UPDATE public.profiles SET full_name = 'Test Admin' WHERE id = '<auth-user-id>';

-- Step 4: User roles
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<auth-user-id>', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Clients
INSERT INTO public.clients (id, name, website_url, status, subscription_status, plan_id)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'ABC Company', 'https://abc-company-test.com', 'active', 'active', '00000000-0000-0000-0000-000000000021'),
  ('00000000-0000-0000-0000-000000000011', 'Demo Construction Co', 'https://demo-construction.com', 'active', 'trialing', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000012', 'Sunshine Dental', 'https://sunshine-dental-test.com', 'active', 'active', '00000000-0000-0000-0000-000000000020')
ON CONFLICT (id) DO NOTHING;

-- Step 6: Assign admin to clients
-- INSERT INTO public.profiles (client_id)... handled by admin-assign-clients edge function
-- For seed: direct update after user creation
-- UPDATE public.profiles SET client_id = '00000000-0000-0000-0000-000000000010' WHERE email = 'test-admin@spearlance-dev.com';

-- Step 7: Fake web_events for SOS Tracker testing
INSERT INTO public.web_events (id, client_id, event_type, url, payload, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'cwv', 'https://abc-company-test.com/', '{"lcp": 1200, "fid": 50, "cls": 0.05}', now() - interval '1 day'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'cwv', 'https://abc-company-test.com/', '{"lcp": 1400, "fid": 70, "cls": 0.08}', now() - interval '2 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'pageview', 'https://abc-company-test.com/', '{"referrer": "google"}', now() - interval '1 hour'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000011', 'cwv', 'https://demo-construction.com/', '{"lcp": 2500, "fid": 120, "cls": 0.15}', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Step 8: Fake leads
INSERT INTO public.leads (id, client_id, name, email, phone, source, status, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'John Smith', 'john@example.com', '555-0101', 'website', 'new', now() - interval '3 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Jane Doe', 'jane@example.com', '555-0102', 'referral', 'contacted', now() - interval '1 day'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000011', 'Bob Builder', 'bob@example.com', '555-0201', 'google_ads', 'new', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Step 9: Fake tickets
INSERT INTO public.tickets (id, client_id, title, description, status, priority, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Update homepage banner', 'Need to change the hero image for spring promotion', 'open', 'medium', now() - interval '2 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', 'Fix contact form', 'Form submissions not going through', 'in_progress', 'high', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;
```

**Important implementation notes:**
- The auth user must be created via Supabase Dashboard or the `create-user` edge function, not raw SQL. Auth is managed by GoTrue.
- After creating the auth user, the `handle_new_user` trigger creates the profile. Then run the seed SQL for the rest.
- The seed file needs to be adapted to the actual column names — read the first migration file (`20251011164405_*.sql`) line-by-line to get exact column definitions before writing final seed SQL.
- Column names in the seed above are approximations — verify against `src/integrations/supabase/types.ts` during implementation.

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/scripts/seed-file.test.ts
```

Expected: PASS — all 7 tests green.

**Step 5: Commit**

```bash
git add supabase/seed.sql tests/scripts/seed-file.test.ts
git commit -m "feat: add dev seed data for ABC Company and test fixtures"
```

---

### Task 6: Run Seed Against Dev Project (Explicit-Ref Mode)

**Files:**
- None (CLI operation against dev only)

**SAFETY:** Every command uses explicit `--project-ref <DEV_PROJECT_REF>`. The seed contains DELETE/INSERT statements — running it against prod would corrupt data.

**Step 1: Verify link state before any seed work**

```bash
npm run db:current
```

Expected: 🟢 DEVELOPMENT. **If it shows PRODUCTION, STOP. Run `npm run db:link:dev` and verify before continuing.**

**Step 2: Create the auth user in dev Supabase**

Go to Supabase Dashboard → SpearlanceOS-Dev → Authentication → Users → Add User:
- Email: `test-admin@spearlance-dev.com`
- Password: `TestPassword123!`
- Auto confirm: Yes

Verify via SQL query against dev:

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> \
  "SELECT email FROM auth.users WHERE email = 'test-admin@spearlance-dev.com';"
```

Expected: 1 row.

**Step 3: Run the seed against dev (explicit ref)**

```bash
npx supabase db push --project-ref <DEV_PROJECT_REF> --include-seed
```

Note the explicit `--project-ref` — required, not optional.

Expected: seed.sql runs, fixtures inserted, no errors.

**Step 4: Assign admin role to the test user**

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> "
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'test-admin@spearlance-dev.com'
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET full_name = 'Test Admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'test-admin@spearlance-dev.com');
"
```

**Step 5: Verify seed data on dev**

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> \
  "SELECT name FROM public.clients ORDER BY name;"
```

Expected:
```
ABC Company
Demo Construction Co
Sunshine Dental
```

**Step 6: Verify prod is STILL untouched**

```bash
npx supabase db query --project-ref chikljxwgiskyjsnjelf \
  "SELECT name FROM public.clients WHERE name IN ('ABC Company', 'Demo Construction Co', 'Sunshine Dental') ORDER BY name;"
```

Expected: Same result as before Task 6 began. If "Demo Construction Co" or "Sunshine Dental" appear in prod, **the seed leaked into prod — STOP and investigate immediately**. (ABC Company may already exist legitimately in prod.)

**Step 7: Stay linked to dev** for the remaining tasks. Re-link to prod only after Task 11 completes successfully.

---

### Task 7: Add `--env` Flag to Deploy Functions Script

**Files:**
- Modify: `scripts/deploy-functions.mjs`
- Test: `tests/scripts/deploy-functions.test.ts` (existing or new)

**Step 1: Write test for env flag**

Add to existing tests or create `tests/scripts/deploy-env-flag.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('deploy-functions --env flag', () => {
  it('parseArgs extracts --env value', async () => {
    const { parseArgs } = await import('../../scripts/deploy-functions-helpers.mjs');
    const flags = parseArgs(['node', 'script.mjs', '--env', 'dev']);
    expect(flags.env).toBe('dev');
  });

  it('defaults env to dev when not specified', async () => {
    const { parseArgs } = await import('../../scripts/deploy-functions-helpers.mjs');
    const flags = parseArgs(['node', 'script.mjs', '--status']);
    expect(flags.env).toBe('dev');
  });

  it('getProjectRef returns dev ref for env=dev', async () => {
    const { getProjectRef } = await import('../../scripts/deploy-functions-helpers.mjs');
    const ref = getProjectRef('dev');
    expect(ref).not.toBe('chikljxwgiskyjsnjelf');
  });

  it('getProjectRef returns prod ref for env=prod', async () => {
    const { getProjectRef } = await import('../../scripts/deploy-functions-helpers.mjs');
    const ref = getProjectRef('prod');
    expect(ref).toBe('chikljxwgiskyjsnjelf');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scripts/deploy-env-flag.test.ts
```

Expected: FAIL — `parseArgs` doesn't have `env`, `getProjectRef` doesn't exist.

**Step 3: Modify `scripts/deploy-functions.mjs`**

Add env flag parsing to `parseArgs()`:

```javascript
// In parseArgs function, add:
const envIdx = args.indexOf('--env');
flags.env = (envIdx !== -1 && args[envIdx + 1]) ? args[envIdx + 1] : 'dev';
```

Add a project ref resolver (near the top of the file):

```javascript
const PROJECT_REFS = {
  prod: 'chikljxwgiskyjsnjelf',
  dev: '<DEV_PROJECT_REF>',  // Replace with actual ref from Task 1
};

export function getProjectRef(env) {
  const ref = PROJECT_REFS[env];
  if (!ref) throw new Error(`Unknown env "${env}". Use --env dev or --env prod`);
  return ref;
}
```

In `main()`, replace `parseConfigToml(configContent)` with:

```javascript
const flags = parseArgs(process.argv);
const projectRef = getProjectRef(flags.env);
console.log(`▸ Environment: ${flags.env}`);
```

Keep the existing `parseConfigToml` as a fallback or remove it — the env flag is the source of truth now.

**Step 4: Update package.json deploy scripts**

```json
"deploy:functions": "node scripts/deploy-functions.mjs",
"deploy:functions:dev": "node scripts/deploy-functions.mjs --env dev",
"deploy:functions:prod": "node scripts/deploy-functions.mjs --env prod",
"deploy:functions:status": "node scripts/deploy-functions.mjs --status",
"deploy:functions:diff": "node scripts/deploy-functions.mjs --diff"
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/scripts/deploy-env-flag.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add scripts/deploy-functions.mjs package.json tests/scripts/deploy-env-flag.test.ts
git commit -m "feat: add --env dev|prod flag to deploy-functions, default to dev"
```

---

### Task 8: Create GitHub Actions Keepalive Workflow

**Files:**
- Create: `.github/workflows/dev-keepalive.yml`

**Step 1: Write test — verify workflow file exists and has correct structure**

Create `tests/scripts/keepalive-workflow.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const workflowPath = join(__dirname, '../../.github/workflows/dev-keepalive.yml');

describe('dev keepalive workflow', () => {
  it('workflow file exists', () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  const content = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf-8') : '';
  const workflow = content ? parse(content) : null;

  it('runs on a cron schedule', () => {
    expect(workflow?.on?.schedule).toBeDefined();
    expect(workflow.on.schedule[0].cron).toBeDefined();
  });

  it('cron runs every 3 days', () => {
    expect(workflow?.on?.schedule[0].cron).toBe('0 12 */3 * *');
  });

  it('has a keepalive job', () => {
    expect(workflow?.jobs?.keepalive).toBeDefined();
  });

  it('uses curl to ping Supabase REST API', () => {
    const steps = workflow?.jobs?.keepalive?.steps || [];
    const pingStep = steps.find((s: any) => s.name?.toLowerCase().includes('ping'));
    expect(pingStep).toBeDefined();
  });
});
```

Note: This test requires the `yaml` package. Check if it's installed:

```bash
npm ls yaml 2>&1 || echo "need to install"
```

If not installed, add as dev dependency:

```bash
npm install -D yaml
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scripts/keepalive-workflow.test.ts
```

Expected: FAIL — workflow file doesn't exist.

**Step 3: Create the workflow file**

Create `.github/workflows/dev-keepalive.yml`:

```yaml
name: Dev Supabase Keepalive

on:
  schedule:
    - cron: '0 12 */3 * *'
  workflow_dispatch:

jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping dev Supabase to prevent pause
        env:
          DEV_SUPABASE_URL: ${{ secrets.DEV_SUPABASE_URL }}
          DEV_SUPABASE_ANON_KEY: ${{ secrets.DEV_SUPABASE_ANON_KEY }}
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            "${DEV_SUPABASE_URL}/rest/v1/rpc/version" \
            -H "apikey: ${DEV_SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${DEV_SUPABASE_ANON_KEY}")

          if [ "$response" -ge 200 ] && [ "$response" -lt 500 ]; then
            echo "✓ Dev Supabase is alive (HTTP $response)"
          else
            echo "✗ Dev Supabase may be paused (HTTP $response)"
            exit 1
          fi
```

**GitHub Secrets required** (set in repo Settings → Secrets → Actions):
- `DEV_SUPABASE_URL`: `https://<DEV_PROJECT_REF>.supabase.co`
- `DEV_SUPABASE_ANON_KEY`: anon key from Task 1

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/scripts/keepalive-workflow.test.ts
```

Expected: PASS — all 5 tests green.

**Step 5: Commit**

```bash
git add .github/workflows/dev-keepalive.yml tests/scripts/keepalive-workflow.test.ts
git commit -m "feat: add GitHub Actions keepalive cron for dev Supabase (every 3 days)"
```

---

### Task 9: ~~Configure Vercel Environment Variables~~ **MOVED — see Task 11.5**

This task has been moved to AFTER verification (Task 11) to minimize the time window where Vercel config could affect the live site. The new ordering means dev is fully tested and working before any Vercel touch.

See **Task 11.5: Configure Vercel Environment Variables** below.

---

### Task 10: Set Edge Function Secrets on Dev Project

**Files:**
- None (Supabase Dashboard or CLI operation)

**Step 1: List required secrets from `.env.example`**

These secrets must be set in the dev project's Edge Functions Secrets (Supabase Dashboard → SpearlanceOS-Dev → Edge Functions → Secrets):

| Secret | Dev Value |
|--------|-----------|
| `STRIPE_SECRET_KEY` | Stripe TEST secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe TEST webhook signing secret |
| `STRIPE_UNLIMITED_PRODUCT_ID` | Stripe TEST product ID |
| `STRIPE_STARTER_PRICE_ID` | Stripe TEST price ID |
| `OPENROUTER_API_KEY` | Same as prod (or separate dev key if billing is a concern) |
| `OPENAI_API_KEY` | Same as prod (or separate dev key) |
| `GOOGLE_PSI_API_KEY` | Same as prod |
| `DATAFORSEO_LOGIN` | Same as prod |
| `DATAFORSEO_PASSWORD` | Same as prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev project's service_role key (from Task 1 Step 4) |

**Step 2: Set secrets via CLI** (alternative to Dashboard)

```bash
npx supabase secrets set --project-ref <DEV_PROJECT_REF> \
  STRIPE_SECRET_KEY="sk_test_..." \
  OPENAI_API_KEY="..." \
  SUPABASE_SERVICE_ROLE_KEY="<dev-service-role-key>"
```

Repeat for each secret. Use Stripe TEST mode keys (from https://dashboard.stripe.com/test/apikeys).

**Step 3: Deploy critical edge functions to dev**

At minimum, deploy functions needed for login and basic app functionality:

```bash
npm run deploy:functions:dev -- --function forgot-password
npm run deploy:functions:dev -- --function send-magic-link
npm run deploy:functions:dev -- --function late-ensure-profile
npm run deploy:functions:dev -- --function create-user
npm run deploy:functions:dev -- --function admin-assign-clients
```

Or deploy all:

```bash
npm run deploy:functions:dev -- --all --yes
```

---

### Task 11: Verify Full Dev Flow End-to-End

**Files:**
- None (verification only)

**Step 1: Start local dev pointing at dev Supabase**

```bash
npm run dev
```

Open `http://localhost:8080` — login with `test-admin@spearlance-dev.com` / `TestPassword123!`.

Expected: Login succeeds, app loads, ABC Company visible in client list.

**Step 2: Run Playwright e2e against dev**

```bash
npm run test:e2e
```

Expected: auth setup succeeds (logs into dev), ABC Company smoke tests pass.

If auth fails: verify PLAYWRIGHT_TEST_EMAIL/PASSWORD in `.env.local` match the user created in Task 6.

**Step 3: Verify prod is untouched**

```bash
npx supabase db query --project-ref chikljxwgiskyjsnjelf "SELECT count(*) FROM public.clients;"
```

Expected: Same count as before — no new seed data in prod.

**Step 4: Test migration flow**

Create a throwaway migration:

```bash
echo "-- test migration" > supabase/migrations/99999999999999_test.sql
npx supabase db push --project-ref <DEV_PROJECT_REF>
```

Verify it applied to dev. Then delete the test migration:

```bash
rm supabase/migrations/99999999999999_test.sql
```

---

### Task 11.5: Configure Vercel Environment Variables (AFTER verification)

**Files:**
- None (Vercel Dashboard operation)

**SAFETY:** This is the last task that can affect prod. Only ADD Preview-scoped vars. Never edit Production-scoped vars. The Production column should remain visually identical when you're done.

**Step 1: Take a screenshot of current Production env vars**

Vercel Dashboard → SpearlanceOS → Settings → Environment Variables → screenshot the current Production-scoped values. This is your visual baseline — when this task is done, Production-scope must look identical.

**Step 2: Verify Production-scoped vars exist (read-only check)**

Confirm these are already set in Production scope (they must be — the app is live):

| Variable | Scope | Expected Value |
|----------|-------|---------------|
| `VITE_SUPABASE_URL` | Production | `https://chikljxwgiskyjsnjelf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production | (prod anon key) |
| `VITE_SUPABASE_PROJECT_ID` | Production | `chikljxwgiskyjsnjelf` |
| `VITE_APP_URL` | Production | `https://os.spearlance.com` |

**DO NOT EDIT THESE.** Read-only verification only.

**Step 3: ADD Preview-scoped variables (the only writes in this task)**

Use Vercel UI → Add New → Select "Preview" scope only (uncheck Production and Development if they're checked):

| Variable | Scope | Value |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | **Preview only** | `https://<DEV_PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Preview only** | (dev anon key from Task 1) |
| `VITE_SUPABASE_PROJECT_ID` | **Preview only** | `<DEV_PROJECT_REF>` |

`VITE_APP_URL` does NOT need a Preview-scoped value — Vercel auto-sets it via `$VERCEL_URL`.

**Step 4: Compare to baseline screenshot**

Re-screenshot the env var page. Compare Production column to Step 1 screenshot. **They must be identical.** If anything in Production changed, revert immediately.

**Step 5: Trigger preview build**

```bash
git push origin feat/dev-environment-split
```

Wait for Vercel build. Open preview URL → DevTools Network tab → confirm requests go to `<DEV_PROJECT_REF>.supabase.co`, NOT `chikljxwgiskyjsnjelf.supabase.co`.

**Step 6: Verify prod still uses prod**

Open `https://os.spearlance.com` → DevTools → Network → confirm requests still go to `chikljxwgiskyjsnjelf.supabase.co`.

If prod requests are hitting dev: rollback Preview vars, investigate.

---

### Task 12: Update Documentation

**Files:**
- Modify: `.claude/CLAUDE.md`
- Modify: `.claude/rules/playwright-verification.md`

**Step 1: Add environment workflow section to CLAUDE.md**

Add after the "Permissions" section:

```markdown
## Environment: Dev/Main Split

Two Supabase projects:
- **Production** (`chikljxwgiskyjsnjelf`): `os.spearlance.com`, main branch only
- **Development** (`<DEV_PROJECT_REF>`): local dev + Vercel previews + Playwright

### Local Dev
`.env.local` points at dev Supabase. `npm run dev` uses dev automatically.

### Migrations
1. Write migration in `supabase/migrations/`
2. `npm run db:link:dev && npm run db:push` — test on dev
3. Merge PR to main
4. `npm run db:link:prod && npm run db:push` — promote to prod

### Edge Functions
- `npm run deploy:functions:dev` — deploy to dev (default)
- `npm run deploy:functions:prod` — deploy to prod (explicit)

### Seed Data
`npm run db:seed` — resets dev DB to known state with ABC Company fixtures.

### Vercel
- Main branch → Production env vars → prod Supabase
- Any other branch → Preview env vars → dev Supabase
```

**Step 2: Update playwright-verification.md**

In the "Credentials are in `.env`" section, change to:

```markdown
Credentials are in `.env.local` (dev environment):
- `PLAYWRIGHT_TEST_EMAIL` — login email (dev test account, seeded in dev DB)
- `PLAYWRIGHT_TEST_PASSWORD` — login password
- `PLAYWRIGHT_BASE_URL` — defaults to `http://localhost:8080`

Tests always run against the **dev** Supabase project. Never against production.
```

**Step 3: Commit**

```bash
git add .claude/CLAUDE.md .claude/rules/playwright-verification.md
git commit -m "docs: add dev/main environment workflow to CLAUDE.md and Playwright rules"
```

---

### Task 13: Set GitHub Actions Secrets

**Files:**
- None (GitHub Settings operation)

**Step 1: Open GitHub repo settings**

Go to: GitHub → SpearlanceOS repo → Settings → Secrets and variables → Actions

**Step 2: Add repository secrets**

| Secret | Value |
|--------|-------|
| `DEV_SUPABASE_URL` | `https://<DEV_PROJECT_REF>.supabase.co` |
| `DEV_SUPABASE_ANON_KEY` | Dev anon key from Task 1 |

**Step 3: Verify keepalive workflow**

Manually trigger the workflow to test:

```bash
env -u GITHUB_TOKEN gh workflow run dev-keepalive.yml
```

Or trigger from GitHub Actions tab → "Dev Supabase Keepalive" → "Run workflow".

Expected: Green checkmark, logs show "Dev Supabase is alive (HTTP 200)" or similar success code.

---

---

## Permanent Guardrails (Tasks 14-19) — Build the Firewall

These tasks build PERMANENT infrastructure that prevents future accidents — not just for this work, but for every session going forward. They run AFTER the dev environment is verified working (Task 11) but can run in parallel with Tasks 12-13.

The goal: make it **technically impossible** to run a destructive command against prod without explicit, deliberate confirmation. Hooks block at the tool layer; skills gate human workflows; scripts validate at runtime.

---

### Task 14: Build the Prod-Firewall Hook (Critical)

**Files:**
- Create: `.claude/hooks/prod-firewall.sh`
- Modify: `.claude/settings.json`

This is the most important guardrail. A PreToolUse Bash hook that intercepts dangerous commands and blocks them at the tool layer — before they execute.

**Step 1: Write test for the hook**

Create `tests/hooks/prod-firewall.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const hookPath = join(__dirname, '../../.claude/hooks/prod-firewall.sh');

function runHook(command: string): { code: number; stderr: string } {
  const input = JSON.stringify({ tool_input: { command } });
  try {
    execSync(`echo '${input}' | bash ${hookPath}`, { encoding: 'utf-8', stdio: 'pipe' });
    return { code: 0, stderr: '' };
  } catch (err: any) {
    return { code: err.status, stderr: err.stderr?.toString() || '' };
  }
}

describe('prod-firewall hook', () => {
  it('blocks db reset against prod ref', () => {
    const result = runHook('npx supabase db reset --project-ref chikljxwgiskyjsnjelf');
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('PRODUCTION');
  });

  it('blocks db push against prod ref without --confirm-prod', () => {
    const result = runHook('npx supabase db push --project-ref chikljxwgiskyjsnjelf');
    expect(result.code).toBe(2);
  });

  it('allows db push against dev ref', () => {
    const result = runHook('npx supabase db push --project-ref abc123dev');
    expect(result.code).toBe(0);
  });

  it('blocks db reset --linked entirely (linked state too risky)', () => {
    const result = runHook('npx supabase db reset --linked');
    expect(result.code).toBe(2);
  });

  it('allows read-only db query against prod', () => {
    const result = runHook('npx supabase db query --project-ref chikljxwgiskyjsnjelf "SELECT 1"');
    expect(result.code).toBe(0);
  });

  it('blocks functions deploy --all against prod', () => {
    const result = runHook('node scripts/deploy-functions.mjs --env prod --all');
    expect(result.code).toBe(2);
  });

  it('allows functions deploy single function against prod', () => {
    const result = runHook('node scripts/deploy-functions.mjs --env prod --function send-magic-link');
    expect(result.code).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/prod-firewall.test.ts
```

Expected: FAIL — hook doesn't exist.

**Step 3: Write the hook**

Create `.claude/hooks/prod-firewall.sh`:

```bash
#!/usr/bin/env bash
# PreToolUse hook: blocks destructive Supabase commands against production.
# Matcher: Bash
#
# Production project ref: chikljxwgiskyjsnjelf
#
# Blocking rules:
#   1. supabase db reset against prod ref → BLOCK
#   2. supabase db push against prod ref WITHOUT npm run prod:confirm flag → BLOCK
#   3. supabase db reset --linked → BLOCK (linked state too risky)
#   4. supabase db push --linked → BLOCK
#   5. functions deploy --all with --env prod → BLOCK
#   6. Any command containing DROP TABLE / TRUNCATE against prod ref → BLOCK
#
# Escape valve: set ARMADILLO_PROD_CONFIRMED=1 before the command.
# This is set by the prod:confirm npm script after typing "PRODUCTION".

set -eu

PROD_REF="chikljxwgiskyjsnjelf"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Helper: block with explanation
block() {
  echo "🛑 PROD-FIREWALL BLOCKED" >&2
  echo "" >&2
  echo "Command: $COMMAND" >&2
  echo "" >&2
  echo "Reason: $1" >&2
  echo "" >&2
  echo "To proceed (if you really mean it):" >&2
  echo "  1. Run: npm run prod:confirm" >&2
  echo "  2. Type 'PRODUCTION' to set the confirmation flag" >&2
  echo "  3. Re-run your command in the same shell session" >&2
  echo "" >&2
  exit 2
}

# Rule 1: db reset against prod ref → never allow
if echo "$COMMAND" | grep -qE "supabase[[:space:]]+db[[:space:]]+reset" && echo "$COMMAND" | grep -q "$PROD_REF"; then
  block "supabase db reset against PRODUCTION wipes the database. Refused."
fi

# Rule 2: db push against prod ref without confirmation
if echo "$COMMAND" | grep -qE "supabase[[:space:]]+db[[:space:]]+push" && echo "$COMMAND" | grep -q "$PROD_REF"; then
  if [ "${ARMADILLO_PROD_CONFIRMED:-0}" != "1" ]; then
    block "db push against PRODUCTION requires explicit confirmation."
  fi
fi

# Rule 3 & 4: --linked is forbidden for destructive commands
if echo "$COMMAND" | grep -qE "supabase[[:space:]]+db[[:space:]]+(reset|push)" && echo "$COMMAND" | grep -q -- "--linked"; then
  block "Use explicit --project-ref instead of --linked. Linked state can drift."
fi

# Rule 5: functions deploy --all with --env prod
if echo "$COMMAND" | grep -qE "deploy-functions" && echo "$COMMAND" | grep -q -- "--env[[:space:]]*prod" && echo "$COMMAND" | grep -q -- "--all"; then
  if [ "${ARMADILLO_PROD_CONFIRMED:-0}" != "1" ]; then
    block "Mass function deploy to PRODUCTION requires explicit confirmation."
  fi
fi

# Rule 6: Raw destructive SQL against prod
if echo "$COMMAND" | grep -q "$PROD_REF" && echo "$COMMAND" | grep -qiE "(DROP[[:space:]]+TABLE|TRUNCATE|DELETE[[:space:]]+FROM)"; then
  block "Destructive SQL against PRODUCTION ref refused."
fi

# All checks passed
exit 0
```

Make it executable:

```bash
chmod +x .claude/hooks/prod-firewall.sh
```

**Step 4: Register the hook in settings.json**

Edit `.claude/settings.json`. Add to the existing `PreToolUse` → `Bash` matcher (alongside `enforce-skill-gate.sh`):

```json
{
  "matcher": "Bash",
  "hooks": [
    { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-skill-gate.sh" },
    { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/prod-firewall.sh" }
  ]
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/hooks/prod-firewall.test.ts
```

Expected: PASS — all 7 tests green.

**Step 6: Manual smoke test**

```bash
# This should be BLOCKED
npx supabase db reset --project-ref chikljxwgiskyjsnjelf

# This should be ALLOWED (read-only)
npx supabase db query --project-ref chikljxwgiskyjsnjelf "SELECT 1"
```

**Step 7: Commit**

```bash
git add .claude/hooks/prod-firewall.sh .claude/settings.json tests/hooks/prod-firewall.test.ts
git commit -m "feat: add prod-firewall hook to block destructive commands against production"
```

---

### Task 15: Stripe Live-Key Detection Script

**Files:**
- Create: `scripts/check-stripe-keys.mjs`
- Modify: `package.json` (add to `predev` script)

Validates that dev `.env.local` doesn't contain `sk_live_*` Stripe keys. Runs automatically before `npm run dev`.

**Step 1: Write test**

Create `tests/scripts/check-stripe-keys.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const tmpEnv = join(__dirname, '.tmp.env.local');

describe('check-stripe-keys', () => {
  it('passes when only test keys present', () => {
    writeFileSync(tmpEnv, 'STRIPE_SECRET_KEY=sk_test_abc\nVITE_STRIPE_STARTER_MONTHLY_PRICE_ID=price_test_xyz');
    const result = execSync(`node scripts/check-stripe-keys.mjs ${tmpEnv}`, { encoding: 'utf-8' });
    expect(result).toContain('✓');
    unlinkSync(tmpEnv);
  });

  it('blocks when sk_live_ key present', () => {
    writeFileSync(tmpEnv, 'STRIPE_SECRET_KEY=sk_live_dangerous');
    expect(() => {
      execSync(`node scripts/check-stripe-keys.mjs ${tmpEnv}`, { stdio: 'pipe' });
    }).toThrow();
    unlinkSync(tmpEnv);
  });

  it('blocks when pk_live_ key present', () => {
    writeFileSync(tmpEnv, 'STRIPE_PUBLISHABLE_KEY=pk_live_dangerous');
    expect(() => {
      execSync(`node scripts/check-stripe-keys.mjs ${tmpEnv}`, { stdio: 'pipe' });
    }).toThrow();
    unlinkSync(tmpEnv);
  });
});
```

**Step 2: Run test — verify FAIL**

**Step 3: Write `scripts/check-stripe-keys.mjs`**

```javascript
import { readFileSync, existsSync } from 'node:fs';

const path = process.argv[2] || '.env.local';

if (!existsSync(path)) {
  console.log(`▸ No ${path} found — skipping Stripe key check`);
  process.exit(0);
}

const content = readFileSync(path, 'utf-8');
const liveKeyPattern = /(sk|pk|rk)_live_[A-Za-z0-9]+/g;
const matches = content.match(liveKeyPattern);

if (matches && matches.length > 0) {
  console.error('');
  console.error('🛑 STRIPE LIVE KEY DETECTED IN DEV ENV');
  console.error('');
  console.error(`File: ${path}`);
  console.error(`Found ${matches.length} live key(s) — these belong in production only.`);
  console.error('');
  console.error('Replace with TEST keys from: https://dashboard.stripe.com/test/apikeys');
  console.error('Test keys start with sk_test_ / pk_test_');
  console.error('');
  process.exit(1);
}

console.log('✓ Stripe keys validated (test mode only)');
process.exit(0);
```

**Step 4: Add to package.json**

```json
"predev": "node scripts/check-stripe-keys.mjs",
"check:stripe-keys": "node scripts/check-stripe-keys.mjs"
```

`predev` runs automatically before `npm run dev`. Stripe live keys = no dev server start.

**Step 5: Run test — verify PASS**

**Step 6: Commit**

```bash
git add scripts/check-stripe-keys.mjs package.json tests/scripts/check-stripe-keys.test.ts
git commit -m "feat: block dev server start if Stripe live keys detected in .env.local"
```

---

### Task 16: Pre-Commit Hook for Prod Secrets

**Files:**
- Create: `scripts/pre-commit-secrets.sh`
- Modify: `.git/hooks/pre-commit` (or via husky/lefthook if used)

Catches accidental commits of live Stripe keys, prod service-role keys, or `.env`/`.env.local` files.

**Step 1: Check existing pre-commit hooks**

```bash
cat .git/hooks/pre-commit 2>/dev/null || echo "No pre-commit hook"
```

If husky is used:

```bash
ls .husky/ 2>/dev/null || echo "No husky"
```

**Step 2: Write `scripts/pre-commit-secrets.sh`**

```bash
#!/usr/bin/env bash
# Blocks commits that contain prod secrets, live Stripe keys, or .env files.

set -eu

# Get list of staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACM)

# Block .env file commits (except .env.example)
for file in $STAGED; do
  case "$file" in
    .env|.env.local|.env.production|.env.*.local)
      echo "🛑 Refusing to commit: $file" >&2
      echo "Environment files contain secrets and must not be committed." >&2
      exit 1
      ;;
  esac
done

# Scan staged content for live secrets
VIOLATIONS=$(git diff --cached -U0 | grep -E '^\+' | grep -oE '(sk|pk|rk)_live_[A-Za-z0-9]+' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "🛑 Stripe LIVE keys detected in staged changes:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Replace with sk_test_/pk_test_ keys before committing." >&2
  exit 1
fi

# Scan for prod service role key prefix
SERVICE_VIOLATIONS=$(git diff --cached -U0 | grep -E '^\+' | grep "chikljxwgiskyjsnjelf" | grep -E "(service_role|SUPABASE_SERVICE_ROLE)" || true)

if [ -n "$SERVICE_VIOLATIONS" ]; then
  echo "🛑 Prod Supabase service-role key detected in staged changes:" >&2
  echo "$SERVICE_VIOLATIONS" >&2
  exit 1
fi

exit 0
```

**Step 3: Install the hook**

If no husky:

```bash
cp scripts/pre-commit-secrets.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

If husky is in use:

```bash
echo "bash scripts/pre-commit-secrets.sh" >> .husky/pre-commit
```

**Step 4: Smoke test**

```bash
echo "STRIPE_KEY=sk_live_test123" > /tmp/test-secret.txt
git add /tmp/test-secret.txt 2>/dev/null || true
git commit -m "test: should fail" 2>&1 | head -5
# Expected: blocked
git restore --staged /tmp/test-secret.txt 2>/dev/null || true
rm /tmp/test-secret.txt
```

**Step 5: Commit the hook script itself**

```bash
git add scripts/pre-commit-secrets.sh
git commit -m "feat: pre-commit hook blocks live Stripe keys and .env file commits"
```

---

### Task 17: Add Prod-Safety Rule File

**Files:**
- Create: `.claude/rules/prod-safety.md`
- Modify: `.claude/CLAUDE.md` (reference new rule)

Documents the firewall, what triggers it, how to use the escape valve. Auto-loaded into every session.

**Step 1: Write `.claude/rules/prod-safety.md`**

```markdown
# Production Safety Rules

When SpearlanceOS production project is in scope (`chikljxwgiskyjsnjelf`), these rules apply with no exceptions.

## The Firewall

`.claude/hooks/prod-firewall.sh` blocks dangerous Bash commands at the tool layer. It activates when:

| Trigger | Action |
|---------|--------|
| `supabase db reset` + prod ref | BLOCK — never allowed |
| `supabase db push` + prod ref + no confirmation | BLOCK |
| `supabase db reset --linked` or `db push --linked` | BLOCK — explicit ref required |
| `deploy-functions --env prod --all` + no confirmation | BLOCK |
| `DROP TABLE` / `TRUNCATE` / `DELETE FROM` against prod ref | BLOCK |

Read-only operations (`db query SELECT`, `projects list`, `functions list`) are always allowed.

## The Escape Valve

When you genuinely need to run a destructive command on prod:

```bash
npm run prod:confirm
# Type 'PRODUCTION' (exact case)
# Sets ARMADILLO_PROD_CONFIRMED=1 in current shell
# Re-run your command — firewall lets it through
```

The flag is per-shell-session — opening a new terminal resets it. Intentional friction.

## Always Use Explicit `--project-ref`

The Supabase CLI's "linked" state can drift. Always pass `--project-ref` for any destructive command:

```bash
# ❌ Wrong — relies on link state
npx supabase db push --linked

# ✓ Correct — impossible to hit wrong project
npx supabase db push --project-ref <DEV_REF>
```

## The Three Refs

| Env | Project Ref | Color |
|-----|-------------|-------|
| Production | `chikljxwgiskyjsnjelf` | 🔴 |
| Development | `<DEV_PROJECT_REF>` | 🟢 |

Never inline the prod ref in a command without consciously deciding to.

## Verifying Current Link

Before any DB operation:

```bash
npm run db:current
```

Shows 🔴 PRODUCTION or 🟢 DEVELOPMENT label. Default to dev.

## Vercel Rules

- Production-scoped env vars: NEVER edited via Claude. User-only operation.
- Preview-scoped env vars: editable, points at dev project
- The Production column in Vercel's env vars table should be visually identical before and after any preview-scope work

## Stripe Rules

- Dev `.env.local` and dev Edge Function secrets: `sk_test_*` / `pk_test_*` keys ONLY
- `npm run dev` runs `predev` script which validates this
- Live keys (`sk_live_*`) refuse to load in dev — by design

## When This Rule Is Inactive

This rule applies whenever the project is SpearlanceOS. There is no inactive state.
```

**Step 2: Reference rule in CLAUDE.md**

Add to the Rules table in `.claude/CLAUDE.md`:

| **prod-safety** | Production firewall, escape valve, Vercel rules, Stripe key validation |

**Step 3: Commit**

```bash
git add .claude/rules/prod-safety.md .claude/CLAUDE.md
git commit -m "docs: add prod-safety rule documenting firewall and escape valve"
```

---

### Task 18: Branch Protection on `main`

**Files:**
- None (GitHub Settings operation)

Ensures nothing can be pushed directly to main without a PR. This is a one-time setup that prevents accidental direct-to-main commits.

**Step 1: Open GitHub branch protection settings**

Go to: GitHub → SpearlanceOS repo → Settings → Branches → Add branch protection rule

**Step 2: Configure protection for `main`**

| Setting | Value |
|---------|-------|
| Branch name pattern | `main` |
| Require pull request before merging | ✓ |
| Require approvals | 0 (solo dev — set later if team grows) |
| Dismiss stale reviews | ✓ |
| Require status checks before merging | ✓ (if CI exists) |
| Require linear history | ✓ |
| Do not allow bypassing | ✓ (admins included — even YOU can't push to main directly) |
| Restrict pushes that delete | ✓ |

**Step 3: Verify**

```bash
git checkout main
echo "test" >> .test-file
git add .test-file
git commit -m "test: should fail to push"
env -u GITHUB_TOKEN git push origin main 2>&1 | head -10
# Expected: rejected by branch protection
git reset --hard HEAD~1
rm -f .test-file
```

If push fails with "protected branch": ✓ working as intended.
If push succeeds: protection rule didn't activate — recheck Step 2.

**Step 4: No commit needed** (this is a GitHub setting, not a file change)

---

### Task 19: Update CLAUDE.md and stack.json with Dev Env Refs

**Files:**
- Modify: `.claude/CLAUDE.md`
- Modify: `.claude/stack.json`

Final pass — record the dev project ref in stack.json so future sessions auto-discover it.

**Step 1: Update `.claude/stack.json`**

Add to existing JSON:

```json
{
  "framework": "react-vite",
  ...existing fields...,
  "environments": {
    "production": {
      "supabaseRef": "chikljxwgiskyjsnjelf",
      "vercelEnv": "Production",
      "url": "https://os.spearlance.com"
    },
    "development": {
      "supabaseRef": "<DEV_PROJECT_REF>",
      "vercelEnv": "Preview",
      "url": "http://localhost:8080"
    }
  }
}
```

**Step 2: Update `.claude/CLAUDE.md` with full env workflow**

The Environment section from Task 12 expands with firewall reference:

```markdown
## Environment: Dev/Main Split

Two Supabase projects:
- **Production** (`chikljxwgiskyjsnjelf`): `os.spearlance.com`, main branch only — 🛡 firewalled
- **Development** (`<DEV_PROJECT_REF>`): local dev + Vercel previews + Playwright

### Safety Net

- **prod-firewall hook** (`.claude/hooks/prod-firewall.sh`): blocks destructive prod commands at tool layer
- **prod-safety rule** (`.claude/rules/prod-safety.md`): documents firewall + escape valve
- **predev script** (Stripe live-key check): blocks `npm run dev` if live keys in `.env.local`
- **pre-commit hook**: blocks commits containing live Stripe keys or `.env` files
- **branch protection on main**: no direct pushes, PR required

### Daily Workflow

```bash
git checkout -b feat/something
npm run db:current             # 🟢 should show DEV
npm run dev                    # localhost reads .env.local → dev Supabase
# write code, test, push
git push origin feat/something # → Vercel preview → dev Supabase
# PR review → merge to main
# Vercel auto-rebuilds production → prod Supabase
```

### Migration Promotion

```bash
# Test on dev (safe)
npx supabase db push --project-ref <DEV_REF>

# Merge PR to main, then promote to prod (requires confirmation):
npm run prod:confirm           # type "PRODUCTION"
npx supabase db push --project-ref chikljxwgiskyjsnjelf
```
```

**Step 3: Commit**

```bash
git add .claude/CLAUDE.md .claude/stack.json
git commit -m "docs: record dev environment in stack.json and CLAUDE.md"
```

---

## Updated Task Dependency Graph

```
Task 0 (Pre-flight safety) ─── REQUIRED FIRST
  ↓
Task 1 (Create dev project) ──┬── Task 2 (Env files)
                               ├── Task 3 (Push migrations to dev)
                               ├── Task 4 (DB helper scripts)
                               ├── Task 5 (Write seed.sql)
                               ├── Task 7 (Deploy script --env)
                               ├── Task 8 (Keepalive workflow)
                               └── Task 10 (Edge function secrets)

Task 3 + Task 4 + Task 5 ──── Task 6 (Run seed against dev)

Task 6 + Task 7 + Task 10 ─── Task 11 (Verify full flow)

Task 11 (Verify) ─────────────┬── Task 11.5 (Vercel — LAST)
                               ├── Task 12 (Update docs)
                               ├── Task 13 (GitHub secrets)
                               ├── Task 14 (Prod-firewall hook) 🛡
                               ├── Task 15 (Stripe key check) 🛡
                               ├── Task 16 (Pre-commit hook) 🛡
                               ├── Task 17 (Prod-safety rule) 🛡
                               ├── Task 18 (Branch protection) 🛡
                               └── Task 19 (Stack.json + CLAUDE.md)
```

**Parallelizable groups:**
- **Group A** (after Task 1): Tasks 2, 4, 5, 7, 8, 10
- **Group B** (after Task 6): Task 11 alone
- **Group C** (after Task 11): Tasks 12, 13, 14, 15, 16, 17, 18, 19, 11.5

**Critical path:** Task 0 → Task 1 → Task 3 → Task 6 → Task 11 → Task 14 (firewall) → Task 18 (branch protection)

**The two checkpoint gates:**
- After Task 11: dev environment fully working — pause for user verification before any prod-touching task (11.5)
- After Task 14: firewall live — all subsequent prod work goes through the firewall
