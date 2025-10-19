-- Update existing posts with incomplete content to 'idea' status
UPDATE social_media_posts
SET status = 'idea'
WHERE status = 'draft'
  AND (caption_text IS NULL OR image_url IS NULL);

-- Keep posts with both caption AND image as 'draft'
-- (No action needed, they already have status = 'draft' and have content)