-- Reporting layer, Phase 1 follow-up: marketing channel on leads.
--
-- `source` is the ingestion pipe (duda_form, zapier, ...) — an integration
-- fact. `channel` is the marketing channel the lead is attributed to
-- (google_ads, facebook_ads, email, website, phone, ...) — the thing reports
-- group by. Channel is passed explicitly in the ingest payload ("channel":
-- "Google Ads" -> 'google_ads'); when absent it is derived from gclid/UTMs,
-- then from the source as a last resort. Free-form but normalized, so new
-- channels need no schema change.

alter table reporting.leads add column channel text;

create index reporting_leads_client_channel_idx
  on reporting.leads (client_id, channel);

create or replace function reporting.normalize_channel(p_channel text)
returns text
language sql
immutable
set search_path to ''
as $$
  select nullif(btrim(regexp_replace(lower(coalesce(p_channel, '')), '[^a-z0-9]+', '_', 'g'), '_'), '');
$$;

create or replace function reporting.derive_channel(
  p_explicit text,
  p_source text,
  p_utm_source text,
  p_utm_medium text,
  p_gclid text
)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
  v text;
  us text := lower(btrim(coalesce(p_utm_source, '')));
  um text := lower(btrim(coalesce(p_utm_medium, '')));
begin
  v := reporting.normalize_channel(p_explicit);
  if v is not null then return v; end if;

  if nullif(btrim(coalesce(p_gclid, '')), '') is not null then return 'google_ads'; end if;

  if us in ('google', 'bing') and um in ('cpc', 'ppc', 'paid', 'paid_search', 'sem') then
    return case us when 'google' then 'google_ads' else 'microsoft_ads' end;
  end if;
  if us in ('facebook', 'fb', 'instagram', 'ig', 'meta') then return 'facebook_ads'; end if;
  if um = 'email' or us in ('email', 'newsletter', 'mailchimp', 'klaviyo') then return 'email'; end if;
  if um = 'organic' then return 'organic'; end if;
  if um = 'referral' then return 'referral'; end if;

  if p_source = 'duda_form' then return 'website'; end if;
  if p_source = 'call' then return 'phone'; end if;

  return null; -- shows up as unattributed in reports
end;
$$;

revoke execute on function reporting.normalize_channel(text) from public, anon, authenticated;
revoke execute on function reporting.derive_channel(text, text, text, text, text) from public, anon, authenticated;

-- ingest_lead: accept "channel" in the payload and derive when absent.
create or replace function reporting.ingest_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_client uuid;
  v_source text;
  v_source_ref text;
  v_email text;
  v_phone text;
  v_status text;
  v_channel text;
  v_occurred timestamptz;
  v_existing uuid;
  v_id uuid;
  v_inserted boolean;
begin
  v_client := (p ->> 'client_id')::uuid;
  if v_client is null then
    raise exception 'client_id is required' using errcode = '22023';
  end if;

  v_source := coalesce(nullif(btrim(coalesce(p ->> 'source', '')), ''), 'manual');
  if v_source not in ('duda_form', 'lovable_lp', 'call', 'zapier', 'hubspot', 'manual') then
    raise exception 'invalid source: %', v_source using errcode = '22023';
  end if;

  v_status := coalesce(nullif(btrim(coalesce(p ->> 'status', '')), ''), 'mql');
  if v_status not in ('new', 'mql', 'sql', 'disqualified') then
    raise exception 'invalid status: %', v_status using errcode = '22023';
  end if;

  v_source_ref := nullif(btrim(coalesce(p ->> 'source_ref', '')), '');
  v_email := nullif(lower(btrim(coalesce(p ->> 'email', ''))), '');
  v_phone := nullif(regexp_replace(coalesce(p ->> 'phone', ''), '\D', '', 'g'), '');
  v_occurred := coalesce((p ->> 'occurred_at')::timestamptz, now());
  v_channel := reporting.derive_channel(
    p ->> 'channel', v_source, p ->> 'utm_source', p ->> 'utm_medium', p ->> 'gclid');

  if v_source_ref is null then
    select id into v_existing
    from reporting.leads
    where client_id = v_client
      and created_at > now() - interval '24 hours'
      and ((v_email is not null and email = v_email)
        or (v_phone is not null and phone = v_phone))
    order by created_at desc
    limit 1;

    if v_existing is not null then
      return jsonb_build_object('id', v_existing, 'action', 'deduplicated');
    end if;
  end if;

  insert into reporting.leads as l
    (client_id, source, source_ref, channel, name, email, phone, message,
     utm_source, utm_medium, utm_campaign, utm_term, utm_content,
     gclid, landing_url, status, status_reason, hubspot_contact_id,
     mql_at, sql_at, created_at, updated_at)
  values
    (v_client, v_source, v_source_ref, v_channel,
     nullif(btrim(coalesce(p ->> 'name', '')), ''),
     v_email, v_phone,
     nullif(btrim(coalesce(p ->> 'message', '')), ''),
     p ->> 'utm_source', p ->> 'utm_medium', p ->> 'utm_campaign',
     p ->> 'utm_term', p ->> 'utm_content',
     p ->> 'gclid', p ->> 'landing_url',
     v_status,
     nullif(btrim(coalesce(p ->> 'status_reason', '')), ''),
     nullif(btrim(coalesce(p ->> 'hubspot_contact_id', '')), ''),
     case when v_status in ('mql', 'sql') then v_occurred end,
     case when v_status = 'sql' then v_occurred end,
     v_occurred, v_occurred)
  on conflict (source, source_ref) where source_ref is not null
  do update set
    name = coalesce(l.name, excluded.name),
    email = coalesce(l.email, excluded.email),
    phone = coalesce(l.phone, excluded.phone),
    message = coalesce(l.message, excluded.message),
    channel = coalesce(l.channel, excluded.channel),
    utm_source = coalesce(l.utm_source, excluded.utm_source),
    utm_medium = coalesce(l.utm_medium, excluded.utm_medium),
    utm_campaign = coalesce(l.utm_campaign, excluded.utm_campaign),
    utm_term = coalesce(l.utm_term, excluded.utm_term),
    utm_content = coalesce(l.utm_content, excluded.utm_content),
    gclid = coalesce(l.gclid, excluded.gclid),
    landing_url = coalesce(l.landing_url, excluded.landing_url),
    hubspot_contact_id = coalesce(l.hubspot_contact_id, excluded.hubspot_contact_id),
    updated_at = now()
  returning id, (xmax = 0) into v_id, v_inserted;

  return jsonb_build_object(
    'id', v_id,
    'action', case when v_inserted then 'inserted' else 'updated' end);
end;
$$;

-- Duda-mapped leads are website channel.
create or replace function reporting.map_duda_submission_row(
  p_id uuid,
  p_client_id uuid,
  p_form_data jsonb,
  p_page_url text,
  p_submitted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_obj jsonb;
  v_first text;
  v_last text;
  v_name text;
  v_ts timestamptz;
begin
  if p_client_id is null then
    return; -- orphaned submission, nothing to attribute
  end if;

  v_obj := reporting.duda_form_object(p_form_data);

  v_first := reporting.duda_extract(v_obj, 'First Name', 'first_name', 'firstName',
    'Parent Name', 'Parent''s Name', 'Contact Name', 'Child''s First Name', 'Child First Name', 'NAME', 'Name');
  v_last := reporting.duda_extract(v_obj, 'Last Name', 'last_name', 'lastName',
    'Child''s Last Name', 'Child Last Name');
  v_name := nullif(btrim(concat_ws(' ', v_first, v_last)), '');
  v_ts := coalesce(p_submitted_at, now());

  insert into reporting.leads
    (client_id, source, source_ref, channel, name, email, phone, message, landing_url,
     status, mql_at, created_at, updated_at)
  values
    (p_client_id,
     'duda_form',
     p_id::text,
     'website',
     v_name,
     reporting.duda_extract(v_obj, 'Email', 'EMAIL', 'email', 'Parent Email', 'Contact Email'),
     reporting.duda_extract(v_obj, 'Phone', 'phone', 'PHONE', 'Phone Number', 'phone_number'),
     reporting.duda_extract(v_obj, 'Details', 'Message', 'message', 'Comments', 'Description', 'Inquiry'),
     p_page_url,
     'mql',                -- TODO(spam): see 20260724100001
     v_ts,
     v_ts,
     v_ts)
  on conflict (source, source_ref) where source_ref is not null do nothing;
end;
$$;

-- Backfill channel on existing leads.
update reporting.leads
set channel = reporting.derive_channel(null, source, utm_source, utm_medium, gclid)
where channel is null;

-- Views: channel appended (create or replace keeps existing columns in place).
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
  count(*) filter (where mql_at is not null) as reached_mql_count,
  count(*) filter (where sql_at is not null) as reached_sql_count,
  channel
from reporting.leads
group by client_id, source, channel, created_at::date;

create or replace view reporting.v_leads_daily
with (security_invoker = on) as
select
  client_id,
  created_at::date as lead_date,
  source,
  count(*)::bigint as lead_count,
  channel
from reporting.leads
group by client_id, created_at::date, source, channel;
