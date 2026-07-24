-- Reporting layer, Phase 1: map Duda form submissions into reporting.leads.
--
-- Submissions arrive via the duda-form-webhook edge function which inserts
-- into public.website_form_submissions, so an AFTER INSERT trigger catches
-- every arrival path. form_data is either a jsonb object or a *stringified*
-- json object (Zapier sends both shapes in prod) — duda_form_object handles both.
--
-- TODO(spam): no spam heuristics exist in the DB today
-- (website_form_submissions.status only holds read/unread), so every mapped
-- submission gets status 'mql'. When spam filtering is wired up, route spam to
-- status 'disqualified' with status_reason 'spam' here.

-- Unwrap form_data: stringified json -> object; anything unparseable -> '{}'.
create or replace function reporting.duda_form_object(p_form_data jsonb)
returns jsonb
language plpgsql
immutable
set search_path to ''
as $$
begin
  if p_form_data is null then
    return '{}'::jsonb;
  end if;
  if jsonb_typeof(p_form_data) = 'string' then
    return (p_form_data #>> '{}')::jsonb;
  end if;
  if jsonb_typeof(p_form_data) = 'object' then
    return p_form_data;
  end if;
  return '{}'::jsonb;
exception when others then
  return '{}'::jsonb;
end;
$$;

-- First non-empty value among the given keys.
create or replace function reporting.duda_extract(p_obj jsonb, variadic p_keys text[])
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
  k text;
  v text;
begin
  foreach k in array p_keys loop
    v := btrim(coalesce(p_obj ->> k, ''));
    if v <> '' then
      return v;
    end if;
  end loop;
  return null;
end;
$$;

-- Map one website_form_submissions row into reporting.leads. Idempotent via
-- the (source, source_ref) unique index; used by both the trigger and backfill.
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

  -- Same key variants the duda-form-webhook notification path probes for.
  v_first := reporting.duda_extract(v_obj, 'First Name', 'first_name', 'firstName',
    'Parent Name', 'Parent''s Name', 'Contact Name', 'Child''s First Name', 'Child First Name', 'NAME', 'Name');
  v_last := reporting.duda_extract(v_obj, 'Last Name', 'last_name', 'lastName',
    'Child''s Last Name', 'Child Last Name');
  v_name := nullif(btrim(concat_ws(' ', v_first, v_last)), '');
  v_ts := coalesce(p_submitted_at, now());

  insert into reporting.leads
    (client_id, source, source_ref, name, email, phone, message, landing_url,
     status, mql_at, created_at, updated_at)
  values
    (p_client_id,
     'duda_form',
     p_id::text,
     v_name,
     reporting.duda_extract(v_obj, 'Email', 'EMAIL', 'email', 'Parent Email', 'Contact Email'),
     reporting.duda_extract(v_obj, 'Phone', 'phone', 'PHONE', 'Phone Number', 'phone_number'),
     reporting.duda_extract(v_obj, 'Details', 'Message', 'message', 'Comments', 'Description', 'Inquiry'),
     p_page_url,
     'mql',                -- TODO(spam): see header comment
     v_ts,
     v_ts,
     v_ts)
  on conflict (source, source_ref) where source_ref is not null do nothing;
end;
$$;

create or replace function reporting.map_duda_submission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform reporting.map_duda_submission_row(
    new.id, new.client_id, new.form_data, new.page_url, new.submitted_at);
  return new;
end;
$$;

create trigger map_to_reporting_lead
  after insert on public.website_form_submissions
  for each row execute function reporting.map_duda_submission();

-- Backfill: map every historical submission that has a client attached
-- (covers Invictus and everyone else; idempotent, safe to re-run).
select reporting.map_duda_submission_row(s.id, s.client_id, s.form_data, s.page_url, s.submitted_at)
from public.website_form_submissions s
where s.client_id is not null;
