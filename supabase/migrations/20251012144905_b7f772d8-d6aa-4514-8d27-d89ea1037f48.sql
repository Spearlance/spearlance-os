-- Change completed_at from timestamp to jsonb to support per-stage completion tracking
ALTER TABLE public.launchpad_submissions 
ALTER COLUMN completed_at TYPE jsonb 
USING CASE 
  WHEN completed_at IS NOT NULL THEN jsonb_build_object('complete', completed_at::text)
  ELSE '{}'::jsonb
END;

-- Add comment to explain the structure
COMMENT ON COLUMN public.launchpad_submissions.completed_at IS 'JSONB object storing completion timestamps for each stage: {"discovery": "2024-01-15T10:30:00Z", "access": "2024-01-15T11:45:00Z", "assets": "...", "avatar": "...", "complete": "..."}';

-- Create enum for launchpad stages if it doesn't exist
DO $$ BEGIN
  CREATE TYPE launchpad_stage AS ENUM ('discovery', 'access', 'assets', 'avatar', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alter stage column to use enum (it's currently text)
ALTER TABLE public.launchpad_submissions 
ALTER COLUMN stage TYPE launchpad_stage 
USING stage::launchpad_stage;