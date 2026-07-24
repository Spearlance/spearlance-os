-- Nightly Windsor.ai sync (Search Console + Google Ads) at 9 AM UTC — after
-- GSC's ~2-day-lagged data for the trailing window has settled for the day.
--
-- Auth via Supabase Vault, NOT the app.settings.* GUCs the lighthouse cron
-- uses: those GUCs turn out to be unset on both dev and prod (ALTER DATABASE
-- SET is denied to the accessible roles), so that pattern never fired
-- successfully. Vault secrets 'project_url' and 'service_role_key' must be
-- created once per project (SQL editor / API):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
select cron.schedule(
  'windsor-sync-nightly',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/windsor-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
