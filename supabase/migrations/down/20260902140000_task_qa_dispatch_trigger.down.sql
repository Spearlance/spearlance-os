-- DOWN for 20260902140000_task_qa_dispatch_trigger.sql
DROP TRIGGER IF EXISTS task_qa_dispatch ON public.tasks;
DROP FUNCTION IF EXISTS public.notify_task_qa_dispatch();
