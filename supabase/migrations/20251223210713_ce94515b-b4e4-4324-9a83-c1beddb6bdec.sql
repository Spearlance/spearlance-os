-- Add search_volume and clicks columns to seo_keywords table
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS search_volume INTEGER;
ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS clicks INTEGER;