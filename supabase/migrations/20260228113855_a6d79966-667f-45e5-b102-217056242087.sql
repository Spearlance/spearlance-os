CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'information_schema'
AS $$
  SELECT array_agg(table_name::text ORDER BY table_name)
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
$$;