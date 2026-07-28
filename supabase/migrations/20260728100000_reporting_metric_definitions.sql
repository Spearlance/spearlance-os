-- Reporting: metric registry (reporting.metric_definitions).
--
-- metrics_daily.metric was free text: a typo silently created a new metric and
-- the UI had nowhere to look up a label. This registry makes the set of
-- metrics data, not code — adding a metric is an INSERT here, no deploy.
--
-- unit matters: duda_calls counts click-to-call taps (clicks) while
-- google_calls counts calls placed (calls). Same family, different units, so
-- the UI must never add them into one "calls" total. Family subtotals are only
-- valid when every member shares a unit (and sums).

create table reporting.metric_definitions (
  metric        text primary key,
  label         text not null,
  family        text,
  unit          text not null,
  source        text,
  aggregation   text not null default 'sum'
                check (aggregation in ('sum', 'avg', 'max', 'last')),
  description   text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger set_updated_at
  before update on reporting.metric_definitions
  for each row execute function public.update_updated_at_column();

-- Definitions are presentation config, not client data: any signed-in user who
-- can see the reporting UI may read them (labels/units for rendering).
-- Writes: admins/FMMs, same roles that manage reporting data.
alter table reporting.metric_definitions enable row level security;

create policy "Authenticated users can view metric definitions"
  on reporting.metric_definitions for select to authenticated
  using (true);

create policy "Admins and FMMs can insert metric definitions"
  on reporting.metric_definitions for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can update metric definitions"
  on reporting.metric_definitions for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can delete metric definitions"
  on reporting.metric_definitions for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

-- select for authenticated / all for service_role flow from the default
-- privileges set in 20260724100000_reporting_core.sql.
grant insert, update, delete on reporting.metric_definitions to authenticated;

-- Seed the metrics that already exist in metrics_daily (must precede the FK).
insert into reporting.metric_definitions
  (metric, label, family, unit, source, description, display_order) values
  ('duda_calls',  'Website Calls',   'calls', 'clicks', 'duda',
   'Click-to-call taps on the Duda site. Counts intent to call, not connected calls.', 10),
  ('google_calls','Google Ads Calls','calls', 'calls',  'google_ads',
   'Calls placed from the ad phone number. Google Ads phone_calls field.', 20);

-- Enforce the registry: unregistered metric names error instead of silently
-- creating a phantom series. Backfilling a brand-new metric now requires its
-- definition INSERT first — deliberate. ON UPDATE CASCADE so a (rare,
-- deliberate) key rename follows through to the data.
alter table reporting.metrics_daily
  add constraint metrics_daily_metric_fkey
  foreign key (metric) references reporting.metric_definitions(metric)
  on update cascade;
