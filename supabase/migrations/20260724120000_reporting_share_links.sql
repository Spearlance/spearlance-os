-- Reporting layer, Phase 1 follow-up: public share links for the in-app
-- reporting dashboard. One link per client; the token in the URL is the only
-- credential. /reporting/share/<token> renders a read-only dashboard via the
-- public-report edge function (service role validates the token; RLS is not
-- in play for public viewers).

create table reporting.share_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on reporting.share_links
  for each row execute function public.update_updated_at_column();

alter table reporting.share_links enable row level security;

-- Admins manage share links from the Reporting page; other internal staff can
-- see link status. Public viewers never touch this table directly (service
-- role only, via the public-report edge function).
create policy "Admins can manage share links"
  on reporting.share_links for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::app_role))
  with check (public.has_role((select auth.uid()), 'admin'::app_role));

create policy "Internal staff can view share links"
  on reporting.share_links for select to authenticated
  using (public.is_internal_staff((select auth.uid())));

grant select, insert, update, delete on reporting.share_links to authenticated;
grant all on reporting.share_links to service_role;
