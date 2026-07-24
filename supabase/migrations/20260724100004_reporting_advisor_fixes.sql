-- Reporting layer, Phase 1: fixes for supabase advisor findings on the new
-- reporting objects.
--
-- 1. SECURITY DEFINER functions were executable by anon/authenticated via
--    /rest/v1/rpc — revoke; only service_role (and triggers, which run as the
--    table owner regardless of EXECUTE grants) need them.
-- 2. auth_rls_initplan: wrap auth.uid() in (select ...) so it is evaluated
--    once per query instead of once per row.
-- 3. multiple_permissive_policies: merge the internal-staff and client-access
--    SELECT policies into one OR'd policy per table (same semantics).

revoke execute on function reporting.resolve_client(text) from public, anon, authenticated;
revoke execute on function reporting.map_duda_submission() from public, anon, authenticated;
revoke execute on function reporting.map_duda_submission_row(uuid, uuid, jsonb, text, timestamptz) from public, anon, authenticated;
revoke execute on function reporting.duda_form_object(jsonb) from public, anon, authenticated;
revoke execute on function reporting.duda_extract(jsonb, variadic text[]) from public, anon, authenticated;
revoke execute on function reporting.slugify(text) from public, anon, authenticated;
revoke execute on function reporting.normalize_lead_contact() from public, anon, authenticated;

grant execute on function reporting.resolve_client(text) to service_role;
grant execute on function reporting.map_duda_submission_row(uuid, uuid, jsonb, text, timestamptz) to service_role;

drop policy "Internal staff can view all leads" on reporting.leads;
drop policy "Clients can view own leads" on reporting.leads;
drop policy "Internal staff can view all metrics" on reporting.metrics_daily;
drop policy "Clients can view own metrics" on reporting.metrics_daily;

create policy "Internal staff and client users can view leads"
  on reporting.leads for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );

create policy "Internal staff and client users can view metrics"
  on reporting.metrics_daily for select to authenticated
  using (
    public.is_internal_staff((select auth.uid()))
    or public.has_client_access((select auth.uid()), client_id)
  );
