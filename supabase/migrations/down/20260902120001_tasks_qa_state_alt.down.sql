-- DOWN for gated/20260902120001_tasks_qa_state_alt.sql.
DROP TRIGGER IF EXISTS tasks_stamp_qa_state ON public.tasks;
DROP FUNCTION IF EXISTS public.tasks_stamp_qa_state();
DROP INDEX IF EXISTS public.idx_tasks_qa_state;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_qa_state_check;
ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS qa_state,
  DROP COLUMN IF EXISTS qa_state_changed_at;
