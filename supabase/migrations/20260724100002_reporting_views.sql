-- Reporting layer, Phase 1: dashboard views.
-- All views are security_invoker so the RLS policies on the underlying tables
-- govern who sees which rows (internal staff = all, client users = own client).
-- Consumers filter by client_id / date columns and aggregate as needed.

-- Per client / source / day funnel counts (current status), filterable by
-- lead_date range and source. reached_* columns count leads that ever hit the
-- stage (via mql_at / sql_at), independent of current status.
create view reporting.v_lead_funnel
with (security_invoker = on) as
select
  client_id,
  source,
  created_at::date as lead_date,
  count(*)::bigint as total_count,
  count(*) filter (where status = 'new') as new_count,
  count(*) filter (where status = 'mql') as mql_count,
  count(*) filter (where status = 'sql') as sql_count,
  count(*) filter (where status = 'disqualified') as disqualified_count,
  count(*) filter (where mql_at is not null) as reached_mql_count,
  count(*) filter (where sql_at is not null) as reached_sql_count
from reporting.leads
group by 1, 2, 3;

-- Per client / day / source lead counts.
create view reporting.v_leads_daily
with (security_invoker = on) as
select
  client_id,
  created_at::date as lead_date,
  source,
  count(*)::bigint as lead_count
from reporting.leads
group by 1, 2, 3;

-- MQL -> SQL conversion by MQL cohort month: of the leads that became MQL in a
-- given month, how many went on to SQL, at what rate, and how fast (median).
create view reporting.v_mql_to_sql
with (security_invoker = on) as
select
  client_id,
  date_trunc('month', mql_at)::date as mql_month,
  count(*)::bigint as mql_count,
  count(*) filter (where sql_at is not null) as sql_count,
  round(count(*) filter (where sql_at is not null)::numeric / nullif(count(*), 0), 4) as conversion_rate,
  round((percentile_cont(0.5) within group (order by extract(epoch from (sql_at - mql_at)) / 86400.0)
    filter (where sql_at is not null))::numeric, 2) as median_days_mql_to_sql
from reporting.leads
where mql_at is not null
group by 1, 2;

-- Thin PostgREST-facing view over metrics_daily.
create view reporting.v_metrics_daily
with (security_invoker = on) as
select
  client_id,
  metric_date,
  metric,
  value,
  meta
from reporting.metrics_daily;
