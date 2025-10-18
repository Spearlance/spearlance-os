-- Add published_at column to support_articles table
ALTER TABLE public.support_articles 
ADD COLUMN published_at timestamptz;