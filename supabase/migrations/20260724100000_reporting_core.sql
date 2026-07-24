-- Reporting layer, Phase 1 (Invictus pilot)
-- Core schema: reporting.leads + reporting.metrics_daily, RLS, grants, helpers.
--
-- Why a dedicated `reporting` schema instead of public: public.leads already
-- exists (Spearlance's own launchpad leads) and would collide. The schema also
-- gives external dashboards a clean PostgREST surface.
-- NOTE: `reporting` must be added to the PostgREST exposed schemas for the
-- project (Dashboard > Settings > API, or Management API postgrest config).
-- Done via API for dev; repeat at prod promotion time.

create schema if not exists reporting;

grant usage on schema reporting to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- reporting.leads — one row per lead-shaped record, all sources
-- ---------------------------------------------------------------------------

create table reporting.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source text not null check (source in ('duda_form', 'lovable_lp', 'call', 'zapier', 'hubspot', 'manual')),
  -- Duda submission id, HubSpot contact id, CallRail call id, ... Unique per
  -- source where present so ingest is idempotent.
  source_ref text,
  name text,
  email text,          -- lowercased on insert (trigger below); HubSpot join key
  phone text,          -- normalized to digits on insert; join key for call-level leads
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  landing_url text,
  status text not null default 'new' check (status in ('new', 'mql', 'sql', 'disqualified')),
  status_reason text,  -- e.g. 'spam', 'manual override', 'hubspot lifecycle sync'
  hubspot_contact_id text,
  mql_at timestamptz,
  sql_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index reporting_leads_source_source_ref_key
  on reporting.leads (source, source_ref)
  where source_ref is not null;

create index reporting_leads_client_created_idx on reporting.leads (client_id, created_at);
create index reporting_leads_client_status_idx on reporting.leads (client_id, status);
create index reporting_leads_client_email_idx on reporting.leads (client_id, email) where email is not null;
create index reporting_leads_client_phone_idx on reporting.leads (client_id, phone) where phone is not null;

-- Contact normalization: email lowercased, phone digits-only, empty -> null.
create or replace function reporting.normalize_lead_contact()
returns trigger
language plpgsql
set search_path to 'reporting'
as $$
begin
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  return new;
end;
$$;

create trigger normalize_lead_contact
  before insert or update on reporting.leads
  for each row execute function reporting.normalize_lead_contact();

create trigger set_updated_at
  before update on reporting.leads
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- reporting.metrics_daily — aggregate metrics that are not lead-level
-- (duda_calls, ad_spend, lp_sessions, ...)
-- ---------------------------------------------------------------------------

create table reporting.metrics_daily (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  metric_date date not null,
  metric text not null,
  value numeric not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, metric_date, metric)
);

create index reporting_metrics_daily_client_metric_idx
  on reporting.metrics_daily (client_id, metric, metric_date);

create trigger set_updated_at
  before update on reporting.metrics_daily
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Client resolution for ingest endpoints: accepts a client uuid, a Duda
-- site_id, or a slugified name/brand/company ('invictus-northwest-group').
-- ---------------------------------------------------------------------------

create or replace function reporting.slugify(p_text text)
returns text
language sql
immutable
set search_path to ''
as $$
  select btrim(regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'), '-');
$$;

create or replace function reporting.resolve_client(p_client text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if p_client is null or btrim(p_client) = '' then
    return null;
  end if;

  if p_client ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_id from public.clients where id = p_client::uuid;
    if v_id is not null then return v_id; end if;
  end if;

  select id into v_id from public.clients where site_id = p_client limit 1;
  if v_id is not null then return v_id; end if;

  select id into v_id
  from public.clients
  where reporting.slugify(name) = reporting.slugify(p_client)
     or reporting.slugify(brand_name) = reporting.slugify(p_client)
     or reporting.slugify(company_name) = reporting.slugify(p_client)
  limit 1;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: internal staff read everything, client users read their own client's
-- rows (same helpers the rest of the app uses). No insert/update/delete
-- policies on purpose — writes go through edge functions with service role.
-- ---------------------------------------------------------------------------

alter table reporting.leads enable row level security;
alter table reporting.metrics_daily enable row level security;

create policy "Internal staff can view all leads"
  on reporting.leads for select to authenticated
  using (public.is_internal_staff(auth.uid()));

create policy "Clients can view own leads"
  on reporting.leads for select to authenticated
  using (public.has_client_access(auth.uid(), client_id));

create policy "Internal staff can view all metrics"
  on reporting.metrics_daily for select to authenticated
  using (public.is_internal_staff(auth.uid()));

create policy "Clients can view own metrics"
  on reporting.metrics_daily for select to authenticated
  using (public.has_client_access(auth.uid(), client_id));

grant select on all tables in schema reporting to authenticated;
grant all on all tables in schema reporting to service_role;
alter default privileges in schema reporting grant select on tables to authenticated;
alter default privileges in schema reporting grant all on tables to service_role;
grant execute on function reporting.resolve_client(text) to service_role;
