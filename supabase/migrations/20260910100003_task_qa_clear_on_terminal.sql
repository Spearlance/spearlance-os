-- Clear the QA pipeline when a task closes (task-QA hardening, item 5).
--
-- Nothing nulled qa_state when a task went to Done or into the Cancelled
-- column, so approved/running tasks kept their pill forever and an open run
-- could stay open. The frontend now writes qa_state = null alongside a
-- terminal status; this trigger is the backstop for every other writer
-- (edge functions, SQL, bridges).
--
-- BEFORE trigger so NEW is edited in place (no recursive UPDATE on tasks).
-- The stamp trigger only fires on UPDATE OF qa_state, so the timestamp is
-- set here too.
--
-- Down: supabase/migrations/down/20260910100003_task_qa_clear_on_terminal.down.sql

CREATE OR REPLACE FUNCTION public.tasks_clear_qa_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status IN ('done', 'cancelled')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.qa_state IS NOT NULL THEN
      NEW.qa_state := NULL;
      NEW.qa_state_changed_at := now();
    END IF;
    NEW.qa_attempts := 0;

    UPDATE public.task_qa_runs
    SET verdict     = 'error',
        finished_at = now(),
        closed_by   = 'task_closed',
        findings    = jsonb_build_array(jsonb_build_object('summary', 'task closed before QA finished', 'severity', 'note', 'code', 'task_closed'))
    WHERE task_id = NEW.id AND finished_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_clear_qa_on_close ON public.tasks;
CREATE TRIGGER tasks_clear_qa_on_close
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_clear_qa_on_close();

COMMENT ON TRIGGER tasks_clear_qa_on_close ON public.tasks IS
  'When status becomes done/cancelled: qa_state -> NULL, qa_attempts -> 0, open QA runs closed as error (task_closed).';
