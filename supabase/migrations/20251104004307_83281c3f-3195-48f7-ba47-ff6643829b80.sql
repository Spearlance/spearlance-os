-- Simplify blog_ai_preferences table to only essential fields
ALTER TABLE blog_ai_preferences
DROP COLUMN IF EXISTS brand_voice,
DROP COLUMN IF EXISTS target_audience,
DROP COLUMN IF EXISTS preferred_keywords,
DROP COLUMN IF EXISTS content_guidelines,
DROP COLUMN IF EXISTS industry_context;

-- Add custom_instructions field if it doesn't exist
ALTER TABLE blog_ai_preferences
ADD COLUMN IF NOT EXISTS custom_instructions TEXT;