DROP FUNCTION IF EXISTS public.task_qa_resolve_credential(text);
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_qa_credential_ref_check;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS qa_credential_ref;
