-- Add brand_colors column to launchpad_submissions
ALTER TABLE public.launchpad_submissions 
ADD COLUMN IF NOT EXISTS brand_colors jsonb;