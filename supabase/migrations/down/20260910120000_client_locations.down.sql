DROP FUNCTION IF EXISTS public.client_locations_set_primary(uuid);
DROP TRIGGER IF EXISTS client_locations_default_primary ON public.client_locations;
DROP FUNCTION IF EXISTS public.client_locations_default_primary();
DROP TABLE IF EXISTS public.client_locations;
