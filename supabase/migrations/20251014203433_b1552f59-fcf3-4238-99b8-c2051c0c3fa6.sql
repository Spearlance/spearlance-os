-- Set default for completed_at column
ALTER TABLE launchpad_submissions 
ALTER COLUMN completed_at SET DEFAULT '{}'::jsonb;

-- Fix existing null values
UPDATE launchpad_submissions 
SET completed_at = '{}'::jsonb 
WHERE completed_at IS NULL;

-- Add constraint to prevent null values
ALTER TABLE launchpad_submissions 
ALTER COLUMN completed_at SET NOT NULL;