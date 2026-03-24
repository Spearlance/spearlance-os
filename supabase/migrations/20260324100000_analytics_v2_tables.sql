-- ============================================================
-- SOS Tracker v2 — New analytics tables
-- ============================================================

-- Core Web Vitals field data (collected from real users via tracker)
create table if not exists cwv_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  url text not null,
  lcp_ms int,
  cls float,
  inp_ms int,
  fcp_ms int,
  ttfb_ms int,
  device text check (device in ('desktop', 'mobile', 'tablet')),
  created_at timestamptz default now()
);

create index idx_cwv_metrics_client_date on cwv_metrics (client_id, created_at desc);

-- GA4 Measurement Protocol configuration per client
create table if not exists ga4_configs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  measurement_id text not null,
  api_secret text not null,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id)
);

-- Lighthouse lab audit results (from PageSpeed Insights API)
create table if not exists lighthouse_audits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  url text not null,
  strategy text not null check (strategy in ('mobile', 'desktop')),
  performance_score int,
  lcp_ms int,
  cls float,
  inp_ms int,
  fcp_ms int,
  ttfb_ms int,
  si_ms int,
  tbt_ms int,
  audit_data jsonb,
  created_at timestamptz default now()
);

create index idx_lighthouse_client_date on lighthouse_audits (client_id, created_at desc);

-- Add engagement columns to existing web_events table
alter table web_events add column if not exists scroll_depth int;
alter table web_events add column if not exists engaged_seconds int;

-- RLS policies
alter table cwv_metrics enable row level security;
alter table ga4_configs enable row level security;
alter table lighthouse_audits enable row level security;

create policy "Users can view cwv_metrics for their clients"
  on cwv_metrics for select
  using (client_id in (
    select id from clients where id in (
      select unnest(associated_client_ids) from profiles where id = auth.uid()
    )
    union
    select id from clients where exists (
      select 1 from profiles where id = auth.uid() and role in ('admin', 'fmm')
    )
  ));

create policy "Users can view ga4_configs for their clients"
  on ga4_configs for select
  using (client_id in (
    select id from clients where id in (
      select unnest(associated_client_ids) from profiles where id = auth.uid()
    )
    union
    select id from clients where exists (
      select 1 from profiles where id = auth.uid() and role in ('admin', 'fmm')
    )
  ));

create policy "Admins can manage ga4_configs"
  on ga4_configs for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'fmm')
  ));

create policy "Users can view lighthouse_audits for their clients"
  on lighthouse_audits for select
  using (client_id in (
    select id from clients where id in (
      select unnest(associated_client_ids) from profiles where id = auth.uid()
    )
    union
    select id from clients where exists (
      select 1 from profiles where id = auth.uid() and role in ('admin', 'fmm')
    )
  ));
