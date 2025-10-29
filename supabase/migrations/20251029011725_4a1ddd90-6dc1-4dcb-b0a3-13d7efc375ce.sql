-- Add column to track if social account requires approval before publishing
ALTER TABLE late_social_accounts 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Add index for common queries filtering by approval requirement
CREATE INDEX IF NOT EXISTS idx_late_social_accounts_requires_approval 
ON late_social_accounts(requires_approval) WHERE requires_approval = true;