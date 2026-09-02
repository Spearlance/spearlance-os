-- AI-QA pipeline state on tasks, kept OUT of the task_status enum.
--
-- Why a separate column: in this app `status` is derived from the kanban
-- column (TaskDrawer / DetailsTab / board drag all rewrite status to
-- task_columns.mapped_status), so a pipeline status with no matching column
-- would be silently reverted on the next save. qa_state is orthogonal to
-- status/column, is only read by QA-aware code, and is fully droppable
-- (down/20260902120001_tasks_qa_state.down.sql).
--
-- Lifecycle: NULL (not in QA) -> ready_for_review (human hands off)
--   -> qa_running (agent picked it up) -> revisions_required | qa_approved.
-- Completing or cancelling the task should clear it back to NULL.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS qa_state text,
  ADD COLUMN IF NOT EXISTS qa_state_changed_at timestamptz;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_qa_state_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_qa_state_check
  CHECK (qa_state IS NULL OR qa_state IN ('ready_for_review','qa_running','revisions_required','qa_approved'));

COMMENT ON COLUMN public.tasks.qa_state IS
  'AI QA pipeline state, orthogonal to status/column. NULL = not in QA.';

CREATE OR REPLACE FUNCTION public.tasks_stamp_qa_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qa_state IS DISTINCT FROM OLD.qa_state THEN
    NEW.qa_state_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_stamp_qa_state ON public.tasks;
CREATE TRIGGER tasks_stamp_qa_state
  BEFORE UPDATE OF qa_state ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_stamp_qa_state();

CREATE INDEX IF NOT EXISTS idx_tasks_qa_state
  ON public.tasks (client_id, qa_state) WHERE qa_state IS NOT NULL;
