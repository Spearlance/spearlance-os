-- Migrate any submissions currently on 'access' stage to 'assets'
UPDATE launchpad_submissions 
SET stage = 'assets' 
WHERE stage = 'access';

-- Remove 'access' key from completed_at jsonb for all records
UPDATE launchpad_submissions
SET completed_at = completed_at - 'access'
WHERE completed_at ? 'access';

-- Drop the default constraint temporarily
ALTER TABLE launchpad_submissions 
  ALTER COLUMN stage DROP DEFAULT;

-- Drop the old enum and create a new one without 'access'
ALTER TYPE launchpad_stage RENAME TO launchpad_stage_old;

CREATE TYPE launchpad_stage AS ENUM (
  'discovery',
  'marketing',
  'assets',
  'avatar',
  'complete'
);

-- Update the column to use new enum
ALTER TABLE launchpad_submissions 
  ALTER COLUMN stage TYPE launchpad_stage 
  USING stage::text::launchpad_stage;

-- Restore the default
ALTER TABLE launchpad_submissions 
  ALTER COLUMN stage SET DEFAULT 'discovery'::launchpad_stage;

-- Clean up old enum
DROP TYPE launchpad_stage_old;