-- Add started_at and completed_at columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create a trigger to automatically set these timestamps
CREATE OR REPLACE FUNCTION public.set_task_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set started_at when task first moves to in_progress
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  
  -- Set completed_at when task moves to done
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at := NOW();
    -- Also set started_at if it was never set (task went directly to done)
    IF NEW.started_at IS NULL THEN
      NEW.started_at := NEW.created_at;
    END IF;
  END IF;
  
  -- Clear completed_at if task is moved out of done
  IF OLD.status = 'done' AND NEW.status != 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS set_task_timestamps_trigger ON public.tasks;
CREATE TRIGGER set_task_timestamps_trigger
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_timestamps();