-- Reporting layer, Phase 2: SEO (Search Console) + Google Ads data via Windsor.ai.
--
-- New dimensional tables (per account/day/query/page/campaign) that don't fit
-- metrics_daily's one-scalar-per-metric shape, plus the client -> Windsor
-- account mapping that drives the windsor-sync edge function.
--
-- Writes to the data tables are service-role only (the sync function);
-- connector_accounts is admin/FMM-managed from the Reporting page.

-- ---------------------------------------------------------------------------
-- reporting.connector_accounts — which Windsor accounts belong to which client
-- ---------------------------------------------------------------------------

create table reporting.connector_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector text not null check (connector in ('searchconsole', 'google_ads')),
  -- searchconsole: the site URL exactly as Windsor reports it as account_name,
  -- e.g. 'https://www.invictusnorthwestgroup.com/'. google_ads: the customer
  -- id, e.g. '960-512-0559'. A client may map several accounts per connector
  -- (www + non-www GSC properties, multiple Ads accounts).
  account_id text not null,
  label text,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, connector, account_id)
);

create index reporting_connector_accounts_active_idx
  on reporting.connector_accounts (connector, is_active) where is_active;
create index reporting_connector_accounts_client_idx
  on reporting.connector_accounts (client_id, connector);

create trigger set_updated_at
  before update on reporting.connector_accounts
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Search Console: daily totals + top-N query/page snapshots per account/day
-- ---------------------------------------------------------------------------

create table reporting.gsc_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid not null references reporting.connector_accounts(id) on delete cascade,
  metric_date date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(7,4),
  position numeric(6,2),
  synced_at timestamptz not null default now(),
  unique (client_id, connector_account_id, metric_date)
);
create index reporting_gsc_daily_client_date_idx
  on reporting.gsc_daily (client_id, metric_date);

create table reporting.gsc_queries_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid not null references reporting.connector_accounts(id) on delete cascade,
  metric_date date not null,
  query text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(7,4),
  position numeric(6,2),
  synced_at timestamptz not null default now(),
  unique (client_id, connector_account_id, metric_date, query)
);
create index reporting_gsc_queries_daily_client_date_idx
  on reporting.gsc_queries_daily (client_id, metric_date);

create table reporting.gsc_pages_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid not null references reporting.connector_accounts(id) on delete cascade,
  metric_date date not null,
  page text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(7,4),
  position numeric(6,2),
  synced_at timestamptz not null default now(),
  unique (client_id, connector_account_id, metric_date, page)
);
create index reporting_gsc_pages_daily_client_date_idx
  on reporting.gsc_pages_daily (client_id, metric_date);

-- ---------------------------------------------------------------------------
-- Google Ads: daily account totals + per-campaign daily rows
-- ---------------------------------------------------------------------------

create table reporting.google_ads_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid not null references reporting.connector_accounts(id) on delete cascade,
  metric_date date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  spend numeric(12,2) not null default 0,
  conversions numeric(12,2) not null default 0,
  cost_per_conversion numeric(12,2),
  ctr numeric(7,4),
  cpc numeric(10,4),
  search_impression_share numeric(6,4),
  synced_at timestamptz not null default now(),
  unique (client_id, connector_account_id, metric_date)
);
create index reporting_google_ads_daily_client_date_idx
  on reporting.google_ads_daily (client_id, metric_date);

create table reporting.google_ads_campaigns_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid not null references reporting.connector_accounts(id) on delete cascade,
  metric_date date not null,
  campaign text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  spend numeric(12,2) not null default 0,
  conversions numeric(12,2) not null default 0,
  cost_per_conversion numeric(12,2),
  ctr numeric(7,4),
  cpc numeric(10,4),
  search_impression_share numeric(6,4),
  synced_at timestamptz not null default now(),
  unique (client_id, connector_account_id, metric_date, campaign)
);
create index reporting_google_ads_campaigns_daily_client_date_idx
  on reporting.google_ads_campaigns_daily (client_id, metric_date);

-- ---------------------------------------------------------------------------
-- RLS: same merged read policy as leads/metrics_daily. Data tables have no
-- write policies on purpose (service-role sync only); connector_accounts is
-- writable by admins/FMMs for mapping management.
-- ---------------------------------------------------------------------------

alter table reporting.connector_accounts enable row level security;
alter table reporting.gsc_daily enable row level security;
alter table reporting.gsc_queries_daily enable row level security;
alter table reporting.gsc_pages_daily enable row level security;
alter table reporting.google_ads_daily enable row level security;
alter table reporting.google_ads_campaigns_daily enable row level security;

create policy "Internal staff and client users can view connector accounts"
  on reporting.connector_accounts for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view gsc daily"
  on reporting.gsc_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view gsc queries"
  on reporting.gsc_queries_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view gsc pages"
  on reporting.gsc_pages_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view google ads daily"
  on reporting.google_ads_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view google ads campaigns"
  on reporting.google_ads_campaigns_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Admins and FMMs can insert connector accounts"
  on reporting.connector_accounts for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can update connector accounts"
  on reporting.connector_accounts for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

create policy "Admins and FMMs can delete connector accounts"
  on reporting.connector_accounts for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::app_role)
    or public.has_role((select auth.uid()), 'fmm'::app_role)
  );

-- select for authenticated / all for service_role already flow from the
-- default privileges set in 20260724100000_reporting_core.sql.
grant insert, update, delete on reporting.connector_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Views (security_invoker; RLS on base tables governs visibility)
-- ---------------------------------------------------------------------------

create view reporting.v_gsc_daily
with (security_invoker = on) as
select client_id, connector_account_id, metric_date, clicks, impressions, ctr, position
from reporting.gsc_daily;

create view reporting.v_gsc_queries_daily
with (security_invoker = on) as
select client_id, connector_account_id, metric_date, query, clicks, impressions, ctr, position
from reporting.gsc_queries_daily;

create view reporting.v_gsc_pages_daily
with (security_invoker = on) as
select client_id, connector_account_id, metric_date, page, clicks, impressions, ctr, position
from reporting.gsc_pages_daily;

create view reporting.v_google_ads_daily
with (security_invoker = on) as
select client_id, connector_account_id, metric_date, clicks, impressions, spend,
       conversions, cost_per_conversion, ctr, cpc, search_impression_share
from reporting.google_ads_daily;

create view reporting.v_google_ads_campaigns_daily
with (security_invoker = on) as
select client_id, connector_account_id, metric_date, campaign, clicks, impressions, spend,
       conversions, cost_per_conversion, ctr, cpc, search_impression_share
from reporting.google_ads_campaigns_daily;
