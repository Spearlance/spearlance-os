-- Fix track_first_response function to use correct column names
CREATE OR REPLACE FUNCTION public.track_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_record RECORD;
BEGIN
  -- Get ticket info
  SELECT * INTO v_ticket_record
  FROM tickets
  WHERE id = NEW.ticket_id;
  
  -- If this is first message from staff (not client) and first_response_at is null
  IF NEW.is_internal_note = false AND v_ticket_record.first_response_at IS NULL THEN
    -- Check if message is from owner or admin (not the requester)
    IF NEW.author_user_id != v_ticket_record.requester_user_id THEN
      UPDATE tickets
      SET first_response_at = NEW.created_at
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;