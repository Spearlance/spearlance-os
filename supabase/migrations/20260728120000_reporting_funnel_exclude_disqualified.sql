-- Disqualified leads no longer count as "reached MQL/SQL" or in MQL→SQL
-- cohorts.
--
-- The ingest pipeline auto-marks every lead 'mql' (no spam heuristics), so
-- mql_at is stamped on effectively all leads and reached_mql_count read as
-- total_count even after leads were manually disqualified — the dashboard
-- showed "99 of 99 reached MQL" over a table with disqualified rows.
-- Disqualifying a lead means "this never counted" (spam/junk), not "an MQL
-- that churned", so reached_* and the conversion cohort exclude leads whose
-- CURRENT status is disqualified. mql_at/sql_at stay stamped on the row:
-- re-qualifying a lead restores it to the funnel with its original timing.

-- Column list matches the live view (channel was appended by the channel
-- attribution migration) — create or replace can't drop/reorder columns.
create or replace view reporting.v_lead_funnel
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
  count(*) filter (where mql_at is not null and status <> 'disqualified') as reached_mql_count,
  count(*) filter (where sql_at is not null and status <> 'disqualified') as reached_sql_count,
  channel
from reporting.leads
group by client_id, source, channel, created_at::date;

create or replace view reporting.v_mql_to_sql
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
  and status <> 'disqualified'
group by 1, 2;
