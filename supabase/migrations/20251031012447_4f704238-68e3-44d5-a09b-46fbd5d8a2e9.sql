-- Update assets table to support 1536-dimensional embeddings from OpenAI
ALTER TABLE assets ALTER COLUMN ai_embedding TYPE vector(1536);