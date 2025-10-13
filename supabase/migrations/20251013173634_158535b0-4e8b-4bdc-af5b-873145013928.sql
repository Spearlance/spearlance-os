-- Add new columns to avatars table for enhanced AI features
ALTER TABLE avatars 
ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS generated_image_urls text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS primary_image_url text;

-- Add comment for documentation
COMMENT ON COLUMN avatars.ai_summary_generated_at IS 'Timestamp when AI summary was last generated';
COMMENT ON COLUMN avatars.generated_image_urls IS 'Array of up to 3 generated avatar image URLs';
COMMENT ON COLUMN avatars.primary_image_url IS 'User-selected primary avatar image URL';