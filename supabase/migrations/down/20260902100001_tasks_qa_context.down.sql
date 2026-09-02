-- DOWN for 20260902100001_tasks_qa_context.sql. Data in these columns is lost.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_qa_target_state_check;
ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS acceptance_criteria,
  DROP COLUMN IF EXISTS viktor_thread_path,
  DROP COLUMN IF EXISTS qa_target_url,
  DROP COLUMN IF EXISTS qa_target_state;
-- Only if the optional origin block was applied:
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS origin_type, DROP COLUMN IF EXISTS origin_ref;
