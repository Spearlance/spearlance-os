-- ============================================================
-- SpearlanceOS Dev Seed Data
-- ============================================================
-- Idempotent: safe to re-run.
--   - Reference rows (billing_plans, clients) use ON CONFLICT (id) DO NOTHING
--   - Variable fixture rows (leads, tickets, web_events) DELETE-by-fixture-id
--     then re-INSERT so the dataset stays clean across runs.
--
-- Auth dependency:
--   The test admin user (test-admin@spearlance-dev.com) must be created via
--   the Supabase Dashboard before running this seed. See Task 6 Step 2 in
--   .claude/docs/plans/2026-05-03-dev-main-environment-split.md
--
-- Fixed UUIDs (deterministic):
--   Billing plans:    00000000-0000-0000-0000-0000000000a0/a1
--   ABC Company:      00000000-0000-0000-0000-0000000000c1
--   Demo Construction:00000000-0000-0000-0000-0000000000c2
--   Sunshine Dental:  00000000-0000-0000-0000-0000000000c3
-- ============================================================

-- ------------------------------------------------------------
-- 1. Billing plans (reference data)
-- ------------------------------------------------------------
INSERT INTO public.billing_plans (id, name, price_monthly, features, max_team_members, is_portal_only)
VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'Starter',   299, ARRAY['1 website','2 users']::text[],     2,   false),
  ('00000000-0000-0000-0000-0000000000a1', 'Unlimited', 999, ARRAY['unlimited websites','team']::text[], 999, false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Clients (reference data)
-- ------------------------------------------------------------
INSERT INTO public.clients (id, name, domain, status, billing_status, billing_plan_id, front_tag, auto_blog_mode, website_unlocked, subscription_status, company_name, industry)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'ABC Company',          'abc-company-test.com',   'active', 'good', '00000000-0000-0000-0000-0000000000a1', 'abc-company',         'auto',   true,  'active',   'ABC Company',          'general'),
  ('00000000-0000-0000-0000-0000000000c2', 'Demo Construction Co', 'demo-construction.com',  'active', 'good', '00000000-0000-0000-0000-0000000000a0', 'demo-construction',   'manual', true,  'trialing', 'Demo Construction Co', 'construction'),
  ('00000000-0000-0000-0000-0000000000c3', 'Sunshine Dental',      'sunshine-dental-test.com','active','good', '00000000-0000-0000-0000-0000000000a0', 'sunshine-dental',     'manual', false, 'active',   'Sunshine Dental',      'healthcare')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Admin role + profile linkage
-- ------------------------------------------------------------
-- Wrapped in DO block so the seed survives running before the auth user exists.
-- After creating the user via Dashboard, re-run the seed and this block will populate.
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'test-admin@spearlance-dev.com'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Skipping admin-dependent seed: auth user test-admin@spearlance-dev.com not found yet';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET name = 'Test Admin',
      role = 'admin',
      associated_client_ids = ARRAY[
        '00000000-0000-0000-0000-0000000000c1'::uuid,
        '00000000-0000-0000-0000-0000000000c2'::uuid,
        '00000000-0000-0000-0000-0000000000c3'::uuid
      ]
  WHERE id = v_admin_id;
END $$;

-- ------------------------------------------------------------
-- 4. Leads (DELETE-first idempotency)
-- ------------------------------------------------------------
DELETE FROM public.leads
WHERE client_id IN (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3'
);

INSERT INTO public.leads (client_id, name, email, phone, status, created_at)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'John Smith',  'john@example.com',  '555-0101', 'new',       now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000c1', 'Jane Doe',    'jane@example.com',  '555-0102', 'contacted', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000c2', 'Bob Builder', 'bob@example.com',   '555-0201', 'new',       now() - interval '2 days');

-- ------------------------------------------------------------
-- 5. Tickets (admin-dependent, DELETE-first idempotency)
-- ------------------------------------------------------------
DELETE FROM public.tickets
WHERE client_id IN (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3'
);

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'test-admin@spearlance-dev.com'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Skipping ticket seed: auth user not found yet';
    RETURN;
  END IF;

  INSERT INTO public.tickets (client_id, title, category, priority, status, requester_user_id, created_at)
  VALUES
    ('00000000-0000-0000-0000-0000000000c1', 'Update homepage banner',          'website', 'normal', 'open',        v_admin_id, now() - interval '2 days'),
    ('00000000-0000-0000-0000-0000000000c1', 'Fix contact form',                 'website', 'high',   'in_progress', v_admin_id, now() - interval '1 day'),
    ('00000000-0000-0000-0000-0000000000c2', 'Add Google Ads conversion event',  'ads',     'normal', 'open',        v_admin_id, now() - interval '5 days');
END $$;

-- ------------------------------------------------------------
-- 6. Web events (CWV / pageview fixtures for SOS Tracker)
-- ------------------------------------------------------------
DELETE FROM public.web_events
WHERE client_id IN (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-0000000000c3'
);

INSERT INTO public.web_events (client_id, received_at, ts_ms, sid, type, url, path, meta)
VALUES
  ('00000000-0000-0000-0000-0000000000c1', now() - interval '1 day',  (extract(epoch from now() - interval '1 day')  * 1000)::bigint, 'sid-fixture-1', 'cwv',      'https://abc-company-test.com/',        '/', '{"lcp":1200,"fid":50,"cls":0.05}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c1', now() - interval '2 days', (extract(epoch from now() - interval '2 days') * 1000)::bigint, 'sid-fixture-2', 'cwv',      'https://abc-company-test.com/',        '/', '{"lcp":1400,"fid":70,"cls":0.08}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c1', now() - interval '1 hour', (extract(epoch from now() - interval '1 hour') * 1000)::bigint, 'sid-fixture-3', 'pageview', 'https://abc-company-test.com/',        '/', '{"referrer":"google"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c2', now() - interval '1 day',  (extract(epoch from now() - interval '1 day')  * 1000)::bigint, 'sid-fixture-4', 'cwv',      'https://demo-construction.com/',       '/', '{"lcp":2500,"fid":120,"cls":0.15}'::jsonb);
