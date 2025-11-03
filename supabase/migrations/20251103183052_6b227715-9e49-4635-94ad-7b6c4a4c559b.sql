-- Add columns to track AI avatar matching results
ALTER TABLE page_content_analysis
ADD COLUMN IF NOT EXISTS matched_avatar_id UUID REFERENCES avatars(id),
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS match_reasoning TEXT;