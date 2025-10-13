-- Add audit fields to meetings table
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

-- Create trigger to update last_edited_at
CREATE OR REPLACE FUNCTION update_meeting_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_edited_at_trigger
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_meeting_edited_at();

-- Add ical_feed_token to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS ical_feed_token text;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_ical_token ON profiles(ical_feed_token);