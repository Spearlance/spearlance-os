-- Ensure extensions schema is in search path for all database roles
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Grant usage on extensions schema to authenticated and anon roles
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- Update match_assets function to explicitly set search_path
CREATE OR REPLACE FUNCTION public.match_assets(
  query_embedding text,
  match_client_id uuid,
  match_threshold double precision DEFAULT 0.15,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  title text,
  file_url text,
  preview_url text,
  ai_description text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    assets.id,
    assets.title,
    assets.file_url,
    assets.preview_url,
    assets.ai_description,
    1 - (assets.ai_embedding <=> query_embedding::vector) AS similarity
  FROM assets
  WHERE
    assets.client_id = match_client_id
    AND assets.type IN ('image', 'video')
    AND assets.ai_embedding IS NOT NULL
    AND 1 - (assets.ai_embedding <=> query_embedding::vector) >= match_threshold
  ORDER BY assets.ai_embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;