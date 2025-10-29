-- Add SLA tracking columns to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;

-- Function to auto-assign ticket to FMM and set SLA
CREATE OR REPLACE FUNCTION auto_assign_ticket_to_fmm()
RETURNS TRIGGER AS $$
DECLARE
  v_fmm_id UUID;
BEGIN
  -- Find FMM assigned to this client
  SELECT id INTO v_fmm_id
  FROM profiles
  WHERE NEW.client_id = ANY(associated_client_ids)
    AND role = 'fmm'
  LIMIT 1;
  
  -- Assign ticket to FMM if found
  IF v_fmm_id IS NOT NULL THEN
    NEW.owner_user_id := v_fmm_id;
  END IF;
  
  -- Calculate SLA deadline (48 hours from creation)
  NEW.sla_due_at := NEW.created_at + INTERVAL '48 hours';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-assign on ticket creation
DROP TRIGGER IF EXISTS before_ticket_insert ON tickets;
CREATE TRIGGER before_ticket_insert
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION auto_assign_ticket_to_fmm();

-- Function to track ticket resolution and response times
CREATE OR REPLACE FUNCTION update_ticket_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set resolved_at when status changes to resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at := NOW();
    -- Calculate response time in minutes
    IF NEW.first_response_at IS NOT NULL THEN
      NEW.response_time_minutes := EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 60;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS before_ticket_update ON tickets;
CREATE TRIGGER before_ticket_update
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticket_timestamps();

-- Function to track first response time
CREATE OR REPLACE FUNCTION track_first_response()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_record RECORD;
BEGIN
  -- Get ticket info
  SELECT * INTO v_ticket_record
  FROM tickets
  WHERE id = NEW.ticket_id;
  
  -- If this is first message from staff (not client) and first_response_at is null
  IF NEW.is_internal = false AND v_ticket_record.first_response_at IS NULL THEN
    -- Check if message is from owner or admin (not the requester)
    IF NEW.sender_user_id != v_ticket_record.requester_user_id THEN
      UPDATE tickets
      SET first_response_at = NEW.created_at
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to track first response
DROP TRIGGER IF EXISTS after_ticket_message_insert ON ticket_messages;
CREATE TRIGGER after_ticket_message_insert
AFTER INSERT ON ticket_messages
FOR EACH ROW
EXECUTE FUNCTION track_first_response();

-- Function to create notifications for ticket events
CREATE OR REPLACE FUNCTION create_ticket_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_ids UUID[];
  v_requester_name TEXT;
  v_owner_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get requester name
    SELECT name INTO v_requester_name
    FROM profiles
    WHERE id = NEW.requester_user_id;
    
    -- Notify all admins about new ticket
    SELECT ARRAY_AGG(id) INTO v_admin_ids
    FROM profiles
    WHERE role = 'admin';
    
    IF v_admin_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      SELECT 
        unnest(v_admin_ids),
        'ticket_created',
        '🚨 New Support Ticket',
        v_requester_name || ' created: ' || NEW.title,
        '/support/' || NEW.id,
        NEW.client_id,
        jsonb_build_object(
          'ticket_id', NEW.id, 
          'priority', NEW.priority,
          'category', NEW.category,
          'sla_due_at', NEW.sla_due_at
        );
    END IF;
    
    -- Notify assigned FMM if exists
    IF NEW.owner_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        NEW.owner_user_id,
        'ticket_assigned',
        '📋 Support Ticket Assigned',
        'You have been assigned: ' || NEW.title,
        '/support/' || NEW.id,
        NEW.client_id,
        jsonb_build_object(
          'ticket_id', NEW.id, 
          'priority', NEW.priority,
          'category', NEW.category,
          'sla_due_at', NEW.sla_due_at
        )
      );
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify when owner changes
    IF NEW.owner_user_id IS NOT NULL AND (OLD.owner_user_id IS NULL OR NEW.owner_user_id != OLD.owner_user_id) THEN
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        NEW.owner_user_id,
        'ticket_assigned',
        '📋 Support Ticket Assigned',
        'You have been assigned: ' || NEW.title,
        '/support/' || NEW.id,
        NEW.client_id,
        jsonb_build_object('ticket_id', NEW.id, 'priority', NEW.priority)
      );
    END IF;
    
    -- Notify requester when status changes
    IF NEW.status != OLD.status THEN
      SELECT name INTO v_owner_name
      FROM profiles
      WHERE id = NEW.owner_user_id;
      
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        NEW.requester_user_id,
        'ticket_status_changed',
        '🎫 Ticket Status Updated',
        'Your ticket "' || NEW.title || '" is now ' || NEW.status,
        '/support/' || NEW.id,
        NEW.client_id,
        jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status, 'owner', v_owner_name)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for ticket notifications
DROP TRIGGER IF EXISTS after_ticket_change_notification ON tickets;
CREATE TRIGGER after_ticket_change_notification
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION create_ticket_notifications();

-- Function to notify about new ticket messages
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket RECORD;
  v_sender_name TEXT;
BEGIN
  -- Get ticket and sender info
  SELECT t.*, p.name as sender_name INTO v_ticket
  FROM tickets t
  LEFT JOIN profiles p ON p.id = NEW.sender_user_id
  WHERE t.id = NEW.ticket_id;
  
  -- If message is from staff to client
  IF NEW.sender_user_id != v_ticket.requester_user_id AND NOT NEW.is_internal THEN
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
  ELSIF NEW.sender_user_id = v_ticket.requester_user_id AND NOT NEW.is_internal THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for message notifications
DROP TRIGGER IF EXISTS after_message_insert_notification ON ticket_messages;
CREATE TRIGGER after_message_insert_notification
AFTER INSERT ON ticket_messages
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_message();