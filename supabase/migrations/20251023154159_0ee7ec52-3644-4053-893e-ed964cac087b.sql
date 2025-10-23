-- Add missing columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read_flag, created_at DESC);

-- Create notification trigger function for task assignments
CREATE OR REPLACE FUNCTION create_task_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  assigner_name TEXT;
BEGIN
  -- Only create notification if assignee changed and is not the creator
  IF (NEW.assignee_user_id IS NOT NULL 
      AND (OLD.assignee_user_id IS NULL OR NEW.assignee_user_id != OLD.assignee_user_id)
      AND NEW.assignee_user_id != NEW.creator_user_id) THEN
    
    -- Get the name of the person who assigned the task
    SELECT name INTO assigner_name FROM profiles WHERE id = NEW.creator_user_id;
    
    INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
    VALUES (
      NEW.assignee_user_id,
      'task_assigned',
      'New task assigned',
      assigner_name || ' assigned you: ' || NEW.title,
      '/tasks?selected=' || NEW.id,
      NEW.client_id,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'assigned_by_id', NEW.creator_user_id,
        'assigned_by', assigner_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task assignments
DROP TRIGGER IF EXISTS task_assignment_notification ON tasks;
CREATE TRIGGER task_assignment_notification
AFTER INSERT OR UPDATE OF assignee_user_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_task_assignment_notification();

-- Create notification trigger function for task completion
CREATE OR REPLACE FUNCTION create_task_completion_notification()
RETURNS TRIGGER AS $$
DECLARE
  completer_name TEXT;
BEGIN
  -- Notify task creator when someone completes their task
  IF (NEW.status = 'done' AND OLD.status != 'done' 
      AND NEW.creator_user_id IS NOT NULL 
      AND NEW.creator_user_id != NEW.assignee_user_id) THEN
    
    SELECT name INTO completer_name FROM profiles WHERE id = NEW.assignee_user_id;
    
    INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
    VALUES (
      NEW.creator_user_id,
      'task_completed',
      'Task completed',
      completer_name || ' completed: ' || NEW.title,
      '/tasks?selected=' || NEW.id,
      NEW.client_id,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'completed_by_id', NEW.assignee_user_id,
        'completed_by', completer_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for task completion
DROP TRIGGER IF EXISTS task_completion_notification ON tasks;
CREATE TRIGGER task_completion_notification
AFTER UPDATE OF status ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_task_completion_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;