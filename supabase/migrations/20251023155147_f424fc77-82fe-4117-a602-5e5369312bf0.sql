-- Update the trigger function to use auth.uid() for the assigner instead of creator_user_id
CREATE OR REPLACE FUNCTION public.create_task_assignment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigner_name TEXT;
  assigner_id UUID;
BEGIN
  -- Get the current authenticated user making the change
  assigner_id := auth.uid();
  
  -- Only create notification if assignee changed and is not the person doing the assigning
  IF (NEW.assignee_user_id IS NOT NULL 
      AND (OLD.assignee_user_id IS NULL OR NEW.assignee_user_id != OLD.assignee_user_id)
      AND NEW.assignee_user_id != assigner_id) THEN
    
    -- Get the name of the person who assigned the task (current user)
    SELECT name INTO assigner_name FROM profiles WHERE id = assigner_id;
    
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
        'assigned_by_id', assigner_id,
        'assigned_by', assigner_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;