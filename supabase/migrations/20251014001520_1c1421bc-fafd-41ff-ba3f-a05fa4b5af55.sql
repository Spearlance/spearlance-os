-- Add timezone column to meetings table
ALTER TABLE meetings 
ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add a comment explaining the column
COMMENT ON COLUMN meetings.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London)';