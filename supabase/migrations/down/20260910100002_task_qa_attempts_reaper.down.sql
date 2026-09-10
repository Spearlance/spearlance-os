SELECT cron.unschedule('task-qa-reap');
DROP FUNCTION IF EXISTS public.task_qa_reap(timestamptz);
DROP TRIGGER IF EXISTS task_qa_runs_reset_attempts ON public.task_qa_runs;
DROP FUNCTION IF EXISTS public.task_qa_runs_reset_attempts();
-- restore the pre-reaper stamp trigger body (20260902120001)
CREATE OR REPLACE FUNCTION public.tasks_stamp_qa_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.qa_state IS DISTINCT FROM OLD.qa_state THEN
    NEW.qa_state_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS qa_attempts;
-- task_comments.user_id is left nullable on purpose: NULL (system) rows may exist.
