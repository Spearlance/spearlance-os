-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add AI metadata columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS ai_description TEXT,
ADD COLUMN IF NOT EXISTS ai_embedding vector(768),
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Create index for fast vector similarity searches
CREATE INDEX IF NOT EXISTS assets_ai_embedding_idx 
ON public.assets 
USING ivfflat (ai_embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment for documentation
COMMENT ON COLUMN public.assets.ai_description IS 'AI-generated description of the asset for semantic search';
COMMENT ON COLUMN public.assets.ai_embedding IS '768-dimensional vector embedding for semantic similarity matching';
COMMENT ON COLUMN public.assets.ai_processed_at IS 'Timestamp when AI analysis was completed';