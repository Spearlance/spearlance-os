-- Reporting layer, Phase 1 follow-up: manual data management from the app.
--
-- Until now writes were service-role only (edge functions). The Reporting
-- page's "Manage data" section lets admins and FMMs add leads manually, fix
-- statuses/channels, and correct metrics — so those two roles (not
-- web_designer) get write policies. A trigger keeps the stage timestamps
-- (mql_at / sql_at) consistent regardless of which writer sets the status.

-- Stage timestamps follow status on any insert/update path (UI, SQL, edge
-- functions): reaching a stage stamps it if unset; explicit values win.
create or replace function reporting.maintain_lead_stage_timestamps()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.status in ('mql', 'sql') and new.mql_at is null then
    new.mql_at := now();
  end if;
  if new.status = 'sql' and new.sql_at is null then
    new.sql_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function reporting.maintain_lead_stage_timestamps() from public, anon, authenticated;

create trigger maintain_lead_stage_timestamps
  before insert or update of status on reporting.leads
  for each row execute function reporting.maintain_lead_stage_timestamps();

create policy "Admins and FMMs can insert leads"
  on reporting.leads for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can update leads"
  on reporting.leads for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can delete leads"
  on reporting.leads for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can insert metrics"
  on reporting.metrics_daily for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can update metrics"
  on reporting.metrics_daily for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can delete metrics"
  on reporting.metrics_daily for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

grant insert, update, delete on reporting.leads, reporting.metrics_daily to authenticated;
