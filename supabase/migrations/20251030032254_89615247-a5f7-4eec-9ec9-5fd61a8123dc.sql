-- Fix notify_ticket_message function to use correct column names
CREATE OR REPLACE FUNCTION public.notify_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_sender_name TEXT;
BEGIN
  -- Get ticket and sender info
  SELECT t.*, p.name as sender_name INTO v_ticket
  FROM tickets t
  LEFT JOIN profiles p ON p.id = NEW.author_user_id
  WHERE t.id = NEW.ticket_id;
  
  -- If message is from staff to client
  IF NEW.author_user_id != v_ticket.requester_user_id AND NOT NEW.is_internal_note THEN
    INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
    VALUES (
      v_ticket.requester_user_id,
      'ticket_message',
      '💬 New Response on Your Ticket',
      v_ticket.sender_name || ' replied to: ' || v_ticket.title,
      '/support/' || NEW.ticket_id,
      v_ticket.client_id,
      jsonb_build_object('ticket_id', NEW.ticket_id, 'message_preview', LEFT(NEW.message, 100))
    );
  -- If message is from client to staff
  ELSIF NEW.author_user_id = v_ticket.requester_user_id AND NOT NEW.is_internal_note THEN
    -- Notify owner
    IF v_ticket.owner_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        v_ticket.owner_user_id,
        'ticket_message',
        '💬 New Message on Ticket',
        v_ticket.sender_name || ' replied to: ' || v_ticket.title,
        '/support/' || NEW.ticket_id,
        v_ticket.client_id,
        jsonb_build_object('ticket_id', NEW.ticket_id, 'message_preview', LEFT(NEW.message, 100))
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;