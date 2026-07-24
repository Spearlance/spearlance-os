-- Reporting layer, Phase 1: ingest_lead RPC used by the ingest-lead and
-- hubspot-status edge functions. Lives in SQL because PostgREST upserts cannot
-- target the partial unique index on (source, source_ref); this function can.
--
-- Behavior:
--   * source_ref present  -> idempotent upsert on (source, source_ref); an
--     existing row keeps its values, missing fields are filled in.
--   * source_ref absent   -> dedupe within 24h on (client_id, email) or
--     (client_id, phone) to absorb double submits.
-- Returns {id, action: inserted|updated|deduplicated}.

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
    (client_id, source, source_ref, name, email, phone, message,
     utm_source, utm_medium, utm_campaign, utm_term, utm_content,
     gclid, landing_url, status, status_reason, hubspot_contact_id,
     mql_at, sql_at, created_at, updated_at)
  values
    (v_client, v_source, v_source_ref,
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

revoke execute on function reporting.ingest_lead(jsonb) from public, anon, authenticated;
grant execute on function reporting.ingest_lead(jsonb) to service_role;
