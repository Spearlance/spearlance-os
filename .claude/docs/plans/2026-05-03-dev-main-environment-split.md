# Dev/Main Environment Split — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Create a separate Supabase dev project with seed data so all development, testing, and previews run against dev — production is untouchable.

**Architecture:** Two Supabase projects (prod stays as-is, new dev project created via CLI). Vercel env vars scoped so Production env → prod Supabase, Preview env → dev Supabase. Local dev reads `.env.local` which points at dev. Manual migration gate — you run `db push` against prod yourself.

**Tech Stack:** Supabase CLI, Vite env vars, Vercel env scoping, GitHub Actions (keepalive cron), Node.js scripts

**Design doc:** `.claude/docs/plans/2026-05-03-dev-main-environment-split-design.md`

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

### Task 3: Link Dev Project and Push Migrations

**Files:**
- None (CLI operation against dev project)

**Step 1: Link to the dev project**

```bash
npx supabase link --project-ref <DEV_PROJECT_REF>
```

This changes the local CLI's linked project. The `config.toml` `project_id` stays as prod — linking is a local-only pointer.

Enter the DB password from Task 1 Step 1 when prompted.

**Step 2: Push all migrations to dev**

```bash
npx supabase db push --linked
```

This applies all ~150 migration files from `supabase/migrations/` to the dev project. Expected runtime: 5-30 minutes depending on network. All migrations should succeed since they're the same ones that ran on prod.

Expected output: each migration applied in order, ending with "Finished supabase db push."

If any migration fails: it means the migration has an issue that prod's existing state masked. Note the migration name and error — this would need investigation.

**Step 3: Verify schema was applied**

```bash
npx supabase db diff --linked
```

Expected: "No changes found" — dev schema matches migration history.

**Step 4: Re-link to prod to restore default**

```bash
npx supabase link --project-ref chikljxwgiskyjsnjelf
```

Enter prod DB password when prompted. This restores the link to production, which is the safer default when not actively working on dev.

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

### Task 6: Run Seed Against Dev Project

**Files:**
- None (CLI operation)

**Step 1: Create the auth user in dev Supabase**

Go to Supabase Dashboard → SpearlanceOS-Dev → Authentication → Users → Add User:
- Email: `test-admin@spearlance-dev.com`
- Password: `TestPassword123!`
- Auto confirm: Yes

Alternative via CLI (if `create-user` edge function is deployed):
```bash
# Deploy the create-user function to dev first
npx supabase functions deploy create-user --project-ref <DEV_PROJECT_REF>
```

**Step 2: Run the seed**

```bash
npm run db:link:dev
npm run db:push -- --include-seed
```

This applies any pending migrations AND runs `supabase/seed.sql`.

**Step 3: Assign admin role to the test user**

Connect to dev DB and run:

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> "
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'test-admin@spearlance-dev.com'
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET full_name = 'Test Admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'test-admin@spearlance-dev.com');
"
```

**Step 4: Verify seed data**

```bash
npx supabase db query --project-ref <DEV_PROJECT_REF> "SELECT name FROM public.clients ORDER BY name;"
```

Expected:
```
ABC Company
Demo Construction Co
Sunshine Dental
```

**Step 5: Re-link to prod**

```bash
npm run db:link:prod
```

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

### Task 9: Configure Vercel Environment Variables

**Files:**
- None (Vercel Dashboard operation)

**Step 1: Open Vercel Dashboard**

Go to: Vercel Dashboard → SpearlanceOS project → Settings → Environment Variables

**Step 2: Set Production-scoped variables** (already done if app is live — verify these exist)

| Variable | Scope | Value |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | Production | `https://chikljxwgiskyjsnjelf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production | (prod anon key) |
| `VITE_SUPABASE_PROJECT_ID` | Production | `chikljxwgiskyjsnjelf` |
| `VITE_APP_URL` | Production | `https://os.spearlance.com` |

**Step 3: Set Preview-scoped variables** (new — this is the key step)

| Variable | Scope | Value |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | Preview | `https://<DEV_PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Preview | (dev anon key from Task 1) |
| `VITE_SUPABASE_PROJECT_ID` | Preview | `<DEV_PROJECT_REF>` |
| `VITE_APP_URL` | Preview | (leave blank or set to `$VERCEL_URL`) |

**Step 4: Verify by pushing a test branch**

```bash
git checkout -b test/verify-preview-env
git push origin test/verify-preview-env
```

Wait for Vercel to build preview. Open the preview URL → check browser console for Supabase requests → they should hit `<DEV_PROJECT_REF>.supabase.co`, NOT `chikljxwgiskyjsnjelf.supabase.co`.

**Step 5: Clean up test branch**

```bash
git checkout feat/sos-tracker-v3
git branch -D test/verify-preview-env
git push origin --delete test/verify-preview-env
```

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
npm run db:link:dev && npm run db:push
```

Verify it applied to dev. Then delete the test migration:

```bash
rm supabase/migrations/99999999999999_test.sql
npm run db:link:prod
```

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

## Task Dependency Graph

```
Task 1 (Create project) ──┬── Task 2 (Env files)
                           ├── Task 3 (Link + push migrations)
                           ├── Task 4 (Package.json scripts) ──── Task 6 (Run seed)
                           ├── Task 5 (Write seed.sql) ────────── Task 6 (Run seed)
                           ├── Task 7 (Deploy script --env flag)
                           ├── Task 9 (Vercel env vars)
                           └── Task 10 (Edge function secrets)

Task 6 (Run seed) ─── Task 11 (Verify full flow)
Task 7, 9, 10 ─────── Task 11 (Verify full flow)

Task 8 (Keepalive workflow) ── Task 13 (GitHub secrets)

Task 11 (Verify) ── Task 12 (Update docs)
```

**Parallelizable groups:**
- Group A: Tasks 2, 3, 8 (after Task 1)
- Group B: Tasks 4, 5, 7 (after Task 1)
- Group C: Tasks 9, 10, 13 (Dashboard operations — after Task 1)
- Sequential: Task 6 requires Tasks 3-5, Task 11 requires Task 6 + Group C, Task 12 is last
