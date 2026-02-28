-- Fix post-migration issues: pg_cron job pointing to old Lovable project
-- Old project: hrmhqybdsdngsvhjqwma
-- New project: chikljxwgiskyjsnjelf

-- 1. Unschedule the old cron job that points to the dead Lovable project
SELECT cron.unschedule('check-trial-expirations-daily');

-- 2. Reschedule with the correct new project URL and anon key
SELECT cron.schedule(
  'check-trial-expirations-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://chikljxwgiskyjsnjelf.supabase.co/functions/v1/check-trial-expirations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaWtsanh3Z2lza3lqc25qZWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTc2NjksImV4cCI6MjA4Nzc5MzY2OX0.H5JhYN2QQeuEgQPV1axLcWPN5Pdj0REAOtNfMgfuUl4"}'::jsonb
  ) as request_id;
  $$
);

-- 3. Stripe placeholder price IDs (price_1AbCdEfGhIjKlMnO, price_1XyZaBcDeFgHiJkL)
-- remain in subscription_pricing for now — stripe_price_id has a NOT NULL constraint.
-- Replace manually via Supabase dashboard once real Stripe price IDs are created.
