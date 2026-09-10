-- Canonical NAP (name / address / phone / hours) per client location.
--
-- Until now the only "where is this business" data was clients.hq_city and
-- clients.service_areas, so the QA agent could never PASS a contact-info
-- check, only report it unverifiable (the Team Ryan failure). This table is
-- the source of truth the agent compares a page against; it is also the
-- canonical record for citations / GBP work.
--
-- Distinct from client_service_locations (an SEO city-page planner: service x
-- city targets, no address). Purely additive: nothing reads it until the
-- agent bundle and the Marketing Profile card do.
--
-- hours: { "mon": [{"open":"08:00","close":"17:00"}], ..., "sun": [] }
--   missing key or []  = closed that day
--   {} (default)       = hours unknown (agent treats as unverifiable)
--
-- Down: supabase/migrations/down/20260910120000_client_locations.down.sql

CREATE TABLE IF NOT EXISTS public.client_locations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label            text NOT NULL DEFAULT 'Main location',
  is_primary       boolean NOT NULL DEFAULT false,
  business_name    text,                     -- NAP name as it must appear on the site; NULL = clients.brand_name
  phone            text,                     -- display form, e.g. (603) 555-0100
  phone_digits     text GENERATED ALWAYS AS (NULLIF(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), '')) STORED,
  email            text,
  address_line1    text,
  address_line2    text,
  city             text,
  state            text,                     -- 2-letter for US
  postal_code      text,
  country          text NOT NULL DEFAULT 'US',
  hours            jsonb NOT NULL DEFAULT '{}'::jsonb,
  hours_note       text,                     -- "Closed on federal holidays"
  google_place_id  text,
  gbp_location_id  text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_locations_hours_is_object CHECK (jsonb_typeof(hours) = 'object'),
  CONSTRAINT client_locations_label_not_blank CHECK (length(btrim(label)) > 0)
);

COMMENT ON TABLE public.client_locations IS
  'Canonical NAP per client location: the name, address, phone and hours a page must match. Primary location = the one citations and QA compare against by default.';
COMMENT ON COLUMN public.client_locations.hours IS
  'Per-day intervals: {"mon":[{"open":"08:00","close":"17:00"}],...}. Missing/empty day = closed; {} = unknown.';
COMMENT ON COLUMN public.client_locations.phone_digits IS
  'Digits only, derived from phone; for matching against whatever format a page uses.';

CREATE INDEX IF NOT EXISTS idx_client_locations_client
  ON public.client_locations (client_id, is_primary DESC, label);

-- At most one primary per client.
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_locations_primary
  ON public.client_locations (client_id) WHERE is_primary;

DROP TRIGGER IF EXISTS update_client_locations_updated_at ON public.client_locations;
CREATE TRIGGER update_client_locations_updated_at
  BEFORE UPDATE ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The first location a client gets becomes primary automatically, so the
-- agent bundle always has a canonical record once anything exists.
CREATE OR REPLACE FUNCTION public.client_locations_default_primary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT NEW.is_primary
     AND NOT EXISTS (SELECT 1 FROM public.client_locations WHERE client_id = NEW.client_id AND is_primary) THEN
    NEW.is_primary := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_locations_default_primary ON public.client_locations;
CREATE TRIGGER client_locations_default_primary
  BEFORE INSERT ON public.client_locations
  FOR EACH ROW EXECUTE FUNCTION public.client_locations_default_primary();

-- Promote one location to primary (clears the previous one in the same statement).
CREATE OR REPLACE FUNCTION public.client_locations_set_primary(p_location uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_client uuid;
BEGIN
  SELECT client_id INTO v_client FROM public.client_locations WHERE id = p_location;
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'client_locations_set_primary: location not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT (auth.role() = 'service_role' OR public.has_client_access(auth.uid(), v_client)) THEN
    RAISE EXCEPTION 'client_locations_set_primary: not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.client_locations SET is_primary = false WHERE client_id = v_client AND is_primary AND id <> p_location;
  UPDATE public.client_locations SET is_primary = true  WHERE id = p_location AND NOT is_primary;
END;
$$;

REVOKE ALL ON FUNCTION public.client_locations_set_primary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_locations_set_primary(uuid) TO authenticated, service_role;

ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view locations for accessible clients" ON public.client_locations;
CREATE POLICY "Users can view locations for accessible clients"
  ON public.client_locations FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users can add locations for accessible clients" ON public.client_locations;
CREATE POLICY "Users can add locations for accessible clients"
  ON public.client_locations FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users can edit locations for accessible clients" ON public.client_locations;
CREATE POLICY "Users can edit locations for accessible clients"
  ON public.client_locations FOR UPDATE
  USING (public.has_client_access(auth.uid(), client_id))
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users can delete locations for accessible clients" ON public.client_locations;
CREATE POLICY "Users can delete locations for accessible clients"
  ON public.client_locations FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));
