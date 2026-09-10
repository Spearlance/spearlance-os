-- QA credentials out of acceptance_criteria (task-QA hardening, item 6).
--
-- A live login was found in plain text in tasks.acceptance_criteria on prod
-- (2026-09-09); it went over the dispatch payload and into the run context.
-- From now on a task points at a Vault entry by name and the agent endpoint
-- resolves it server-side, only on /ack, /claim and /task/:id. The dispatch
-- payload and logs never carry the value.
--
-- Refs are restricted to the `qa_cred_` prefix so a task can never resolve
-- 'service_role_key' or any other project secret. Create one with:
--   select vault.create_secret('user@example.com / p4ssw0rd', 'qa_cred_acme_editor');
--
-- Down: supabase/migrations/down/20260910100000_task_qa_credential_ref.down.sql

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS qa_credential_ref text;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_qa_credential_ref_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_qa_credential_ref_check
  CHECK (qa_credential_ref IS NULL OR qa_credential_ref ~ '^qa_cred_[a-z0-9_]{1,80}$');

COMMENT ON COLUMN public.tasks.qa_credential_ref IS
  'Name of a Vault secret (qa_cred_*) holding the login the QA agent needs for the target. Resolved server-side by task-qa-agent; never stored on the task or sent in the dispatch payload.';

-- service_role only. SECURITY DEFINER so it can read vault.decrypted_secrets;
-- the prefix check is repeated here so the function is safe on its own.
CREATE OR REPLACE FUNCTION public.task_qa_resolve_credential(p_ref text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_value text;
BEGIN
  IF p_ref IS NULL OR p_ref !~ '^qa_cred_[a-z0-9_]{1,80}$' THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE name = p_ref
  LIMIT 1;
  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.task_qa_resolve_credential(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.task_qa_resolve_credential(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.task_qa_resolve_credential(text) TO service_role;

COMMENT ON FUNCTION public.task_qa_resolve_credential(text) IS
  'Returns the Vault secret named by a qa_cred_* ref, for task-qa-agent only. Returns NULL for any other name.';
