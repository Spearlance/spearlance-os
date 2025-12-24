-- Create task_watchers table
CREATE TABLE public.task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notify_on_complete BOOLEAN DEFAULT true,
  notify_on_status_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view watchers for tasks they have access to
CREATE POLICY "Users can view task watchers for accessible tasks"
ON public.task_watchers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

-- Users can add themselves or others as watchers
CREATE POLICY "Users can add watchers to accessible tasks"
ON public.task_watchers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

-- Users can update their own watcher settings or if they have access
CREATE POLICY "Users can update watcher settings"
ON public.task_watchers FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

-- Users can remove watchers from accessible tasks
CREATE POLICY "Users can remove watchers from accessible tasks"
ON public.task_watchers FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.has_client_access(auth.uid(), t.client_id)
  )
);

-- Update the completion notification trigger to also notify watchers
CREATE OR REPLACE FUNCTION public.create_task_completion_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  completer_name TEXT;
  v_assignee RECORD;
  v_watcher RECORD;
  v_duration_text TEXT;
  v_notified_users UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Only trigger when task is marked as done
  IF (NEW.status = 'done' AND OLD.status != 'done') THEN
    
    SELECT name INTO completer_name FROM profiles WHERE id = auth.uid();
    
    -- Calculate duration text if we have started_at
    IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
      v_duration_text := ' (completed in ' || 
        CASE 
          WHEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) < 3600 
            THEN ROUND(EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60) || ' minutes'
          WHEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) < 86400 
            THEN ROUND(EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 3600) || ' hours'
          ELSE ROUND(EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 86400, 1) || ' days'
        END || ')';
    ELSE
      v_duration_text := '';
    END IF;
    
    -- Notify task creator (if different from completer)
    IF NEW.creator_user_id IS NOT NULL AND NEW.creator_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        NEW.creator_user_id,
        'task_completed',
        'Task completed',
        completer_name || ' completed: ' || NEW.title || v_duration_text,
        '/tasks?selected=' || NEW.id,
        NEW.client_id,
        jsonb_build_object(
          'task_id', NEW.id,
          'task_title', NEW.title,
          'completed_by_id', auth.uid(),
          'completed_by', completer_name
        )
      );
      v_notified_users := array_append(v_notified_users, NEW.creator_user_id);
    END IF;
    
    -- Notify all assignees (except the completer)
    FOR v_assignee IN 
      SELECT ta.user_id 
      FROM task_assignees ta 
      WHERE ta.task_id = NEW.id 
        AND ta.user_id != auth.uid()
        AND ta.user_id != ALL(v_notified_users)
    LOOP
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        v_assignee.user_id,
        'task_completed',
        'Task completed',
        completer_name || ' completed: ' || NEW.title || v_duration_text,
        '/tasks?selected=' || NEW.id,
        NEW.client_id,
        jsonb_build_object(
          'task_id', NEW.id,
          'task_title', NEW.title,
          'completed_by_id', auth.uid(),
          'completed_by', completer_name
        )
      );
      v_notified_users := array_append(v_notified_users, v_assignee.user_id);
    END LOOP;
    
    -- Notify all watchers with notify_on_complete = true (except already notified)
    FOR v_watcher IN 
      SELECT tw.user_id 
      FROM task_watchers tw 
      WHERE tw.task_id = NEW.id 
        AND tw.notify_on_complete = true
        AND tw.user_id != auth.uid()
        AND tw.user_id != ALL(v_notified_users)
    LOOP
      INSERT INTO notifications (user_id, type, title, description, action_url, client_id, payload_json)
      VALUES (
        v_watcher.user_id,
        'task_completed',
        'Task completed',
        completer_name || ' completed: ' || NEW.title || v_duration_text,
        '/tasks?selected=' || NEW.id,
        NEW.client_id,
        jsonb_build_object(
          'task_id', NEW.id,
          'task_title', NEW.title,
          'completed_by_id', auth.uid(),
          'completed_by', completer_name,
          'watched_task', true
        )
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$function$;