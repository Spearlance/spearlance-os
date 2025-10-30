-- Create RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_assets(
  query_embedding TEXT,
  match_client_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  file_url TEXT,
  preview_url TEXT,
  ai_description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
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
    AND 1 - (assets.ai_embedding <=> query_embedding::vector) > match_threshold
  ORDER BY assets.ai_embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;