-- Fix function search path security issue
DROP TRIGGER IF EXISTS meetings_edited_at_trigger ON meetings;
DROP FUNCTION IF EXISTS update_meeting_edited_at();

CREATE OR REPLACE FUNCTION update_meeting_edited_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER meetings_edited_at_trigger
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_meeting_edited_at();