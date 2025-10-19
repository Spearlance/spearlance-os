-- Allow NULL captions for draft social media posts
-- This enables the monthly planner workflow: create topic drafts first, then generate captions/images later

ALTER TABLE social_media_posts 
ALTER COLUMN caption_text DROP NOT NULL;