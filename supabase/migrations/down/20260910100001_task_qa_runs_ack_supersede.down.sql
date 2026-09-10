DROP FUNCTION IF EXISTS public.task_qa_supersede_run(uuid, uuid);
DROP INDEX IF EXISTS public.idx_task_qa_runs_open;
ALTER TABLE public.task_qa_runs DROP CONSTRAINT IF EXISTS task_qa_runs_closed_by_check;
ALTER TABLE public.task_qa_runs
  DROP COLUMN IF EXISTS superseded_by,
  DROP COLUMN IF EXISTS supersedes,
  DROP COLUMN IF EXISTS closed_by,
  DROP COLUMN IF EXISTS acked_at;
