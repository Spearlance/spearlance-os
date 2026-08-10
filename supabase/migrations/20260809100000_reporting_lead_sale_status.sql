-- Sale status + deal value on reporting.leads.
--
-- The funnel previously ended at SQL, so "Conversion" on the dashboard was
-- MQL→SQL rate — a proxy. Sales close the loop: marking a lead 'sale' (with an
-- optional dollar value) lets the dashboard report actual closed business and
-- revenue attributable to marketing.

alter table reporting.leads drop constraint leads_status_check;
alter table reporting.leads add constraint leads_status_check
  check (status in ('new', 'mql', 'sql', 'sale', 'disqualified'));

alter table reporting.leads add column sale_at timestamptz;
alter table reporting.leads add column sale_value numeric check (sale_value >= 0);

-- A sale implies the lead passed through MQL and SQL — stamp all three stages
-- so cohort views (v_mql_to_sql counts sql_at) include closed deals. Explicit
-- values still win; a stage is only stamped when unset.
create or replace function reporting.maintain_lead_stage_timestamps()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.status in ('mql', 'sql', 'sale') and new.mql_at is null then
    new.mql_at := now();
  end if;
  if new.status in ('sql', 'sale') and new.sql_at is null then
    new.sql_at := now();
  end if;
  if new.status = 'sale' and new.sale_at is null then
    new.sale_at := now();
  end if;
  return new;
end;
$$;

-- Column list must keep the live view's order (create or replace can't drop or
-- reorder) — sale columns are appended after channel.
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
  channel,
  count(*) filter (where status = 'sale') as sale_count,
  coalesce(sum(sale_value) filter (where status = 'sale'), 0) as sale_value
from reporting.leads
group by client_id, source, channel, created_at::date;
