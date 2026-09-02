-- Fire the QA agent when a task is handed off for review.
--
-- AFTER UPDATE OF qa_state, only on the transition INTO 'ready_for_review',
-- posts {task_id} to the task-qa-dispatch edge function via pg_net. The
-- function decides what to do (push to the agent's webhook, or nothing if no
-- webhook is configured, in which case the task simply waits for the agent to
-- pull it or for a human to record a verdict).
--
-- Auth via Supabase Vault ('project_url', 'service_role_key'), the pattern
-- from 20260725110000_windsor_sync_cron.sql. NOT app.settings.* GUCs (unset on
-- both projects) and NOT a hard-coded URL (20260305000003 hard-codes prod and
-- so misfires from dev). Both Vault secrets must exist on the target project
-- before this trigger can do anything; if they are missing it logs a WARNING
-- and lets the update through.
--
-- Down: supabase/migrations/down/20260902140000_task_qa_dispatch_trigger.down.sql

CREATE OR REPLACE FUNCTION public.notify_task_qa_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'task_qa_dispatch: vault secrets project_url/service_role_key missing; task % not dispatched', NEW.id;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/task-qa-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('task_id', NEW.id, 'source', 'trigger')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_qa_dispatch ON public.tasks;
CREATE TRIGGER task_qa_dispatch
  AFTER UPDATE OF qa_state ON public.tasks
  FOR EACH ROW
  WHEN (NEW.qa_state = 'ready_for_review' AND OLD.qa_state IS DISTINCT FROM NEW.qa_state)
  EXECUTE FUNCTION public.notify_task_qa_dispatch();

COMMENT ON TRIGGER task_qa_dispatch ON public.tasks IS
  'Posts to the task-qa-dispatch edge function when a task enters ready_for_review.';
