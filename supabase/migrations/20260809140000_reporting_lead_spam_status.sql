-- Spam status: tracked, never counted.
--
-- Ingest auto-marks every lead 'mql' with no spam heuristics, so junk
-- submissions land in the funnel and inflate lead counts. 'spam' lets staff
-- flag them: spam leads are excluded from every funnel count (total, daily,
-- sources, channels, reached_*, cohorts) and hidden from the Manage Data list
-- by default, but stay in the table with a spam_count so volume is trackable.
-- Unlike 'disqualified' (a real lead that didn't count), 'spam' means "this
-- was never a lead at all".

alter table reporting.leads drop constraint leads_status_check;
alter table reporting.leads add constraint leads_status_check
  check (status in ('new', 'mql', 'sql', 'sale', 'disqualified', 'spam'));

-- Column list must keep the live view's order (create or replace can't drop or
-- reorder) — spam_count is appended after sale_value.
create or replace view reporting.v_lead_funnel
with (security_invoker = on) as
select
  client_id,
  source,
  created_at::date as lead_date,
  (count(*) filter (where status <> 'spam'))::bigint as total_count,
  count(*) filter (where status = 'new') as new_count,
  count(*) filter (where status = 'mql') as mql_count,
  count(*) filter (where status = 'sql') as sql_count,
  count(*) filter (where status = 'disqualified') as disqualified_count,
  count(*) filter (where mql_at is not null and status not in ('disqualified', 'spam')) as reached_mql_count,
  count(*) filter (where sql_at is not null and status not in ('disqualified', 'spam')) as reached_sql_count,
  channel,
  count(*) filter (where status = 'sale') as sale_count,
  coalesce(sum(sale_value) filter (where status = 'sale'), 0) as sale_value,
  count(*) filter (where status = 'spam') as spam_count
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
  and status not in ('disqualified', 'spam')
group by 1, 2;

-- Keeps the live column list (channel was appended by the channel migration).
create or replace view reporting.v_leads_daily
with (security_invoker = on) as
select
  client_id,
  created_at::date as lead_date,
  source,
  count(*)::bigint as lead_count,
  channel
from reporting.leads
where status <> 'spam'
group by client_id, created_at::date, source, channel;
