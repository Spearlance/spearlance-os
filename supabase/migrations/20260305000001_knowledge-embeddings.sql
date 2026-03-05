-- Create client_knowledge_embeddings table for polymorphic RAG storage
CREATE TABLE IF NOT EXISTS public.client_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_table, source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx
  ON public.client_knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_client_idx
  ON public.client_knowledge_embeddings (client_id);

CREATE INDEX IF NOT EXISTS knowledge_source_idx
  ON public.client_knowledge_embeddings (source_table, source_id);

-- RLS
ALTER TABLE public.client_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and FMMs can select knowledge embeddings"
  ON public.client_knowledge_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Service role has full access to knowledge embeddings"
  ON public.client_knowledge_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- match_knowledge RPC — follows match_assets pattern
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding text,
  match_client_id uuid,
  source_types text[] DEFAULT NULL,
  match_threshold double precision DEFAULT 0.2,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  source_table text,
  source_id uuid,
  content_text text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cke.id,
    cke.source_table,
    cke.source_id,
    cke.content_text,
    cke.metadata,
    1 - (cke.embedding <=> query_embedding::vector) AS similarity
  FROM client_knowledge_embeddings cke
  WHERE cke.client_id = match_client_id
    AND cke.embedding IS NOT NULL
    AND 1 - (cke.embedding <=> query_embedding::vector) >= match_threshold
    AND (source_types IS NULL OR cke.source_table = ANY(source_types))
  ORDER BY cke.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
