-- Advisor fixes for reporting.share_links (flagged after promotion):
-- 1. multiple_permissive_policies: "Admins can manage" (FOR ALL) overlapped
--    "Internal staff can view" on SELECT. Split: one SELECT policy for
--    internal staff (includes admins), write policies for admins only.
-- 2. unindexed foreign key on created_by.

drop policy "Admins can manage share links" on reporting.share_links;
drop policy "Internal staff can view share links" on reporting.share_links;

create policy "Internal staff can view share links"
  on reporting.share_links for select to authenticated
  using (public.is_internal_staff((select auth.uid())));

create policy "Admins can insert share links"
  on reporting.share_links for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'::app_role));

create policy "Admins can update share links"
  on reporting.share_links for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'::app_role))
  with check (public.has_role((select auth.uid()), 'admin'::app_role));

create policy "Admins can delete share links"
  on reporting.share_links for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::app_role));

create index reporting_share_links_created_by_idx on reporting.share_links (created_by);
