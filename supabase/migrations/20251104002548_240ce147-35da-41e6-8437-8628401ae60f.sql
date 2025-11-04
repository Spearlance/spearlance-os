-- Add selected_days column to blog_content_strategy
ALTER TABLE blog_content_strategy 
  ADD COLUMN IF NOT EXISTS selected_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7];