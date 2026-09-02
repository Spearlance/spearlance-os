-- ============================================================================
-- FALLBACK to STEP 1 — separate qa_state column.  ***GATED: pick ONE of
-- 20260902120000 (enum) or this file; do not apply both.***
-- ============================================================================
-- Zero blast radius: nothing existing reads qa_state; `status` keeps its three
-- values and keeps being derived from the kanban column, so drawer / board
-- saves cannot clobber the QA pipeline state. Fully droppable
-- (down/20260902120001_tasks_qa_state_alt.down.sql).
--
-- This file does NOT solve "not doing this". That still needs either the
-- 'cancelled' enum value (a one-line subset of 20260902120000) or a
-- cancelled_at timestamp; see the audit's recommendation.

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
