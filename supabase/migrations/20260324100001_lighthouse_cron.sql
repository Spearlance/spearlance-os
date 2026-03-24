-- Schedule weekly Lighthouse audits (Sundays at 3 AM UTC)
select cron.schedule(
  'lighthouse-weekly-audit',
  '0 3 * * 0',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/lighthouse-audit',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
