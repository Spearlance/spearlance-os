-- STEP 3 — append-only QA run log.
-- Down: supabase/migrations/down/20260902100002_task_qa_runs.down.sql
--
-- Corrections vs the brief:
--   * tasks.id is uuid (20251011164405 line 77), not bigint, so task_id is uuid.
--   * client_id gets a FK and is filled from the task by trigger when omitted,
--     so RLS can use has_client_access() like every other client-scoped table.
--   * submitted_by references profiles(id) (the repo's user FK convention).
--   * RLS enabled (every table in this schema has it). App users can SELECT
--     and INSERT for clients they can access; no UPDATE/DELETE policy, so the
--     log is append-only for app users. The QA agent (service role) bypasses
--     RLS to set finished_at / verdict on the row it opened.

CREATE TABLE IF NOT EXISTS public.task_qa_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id          uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  verdict            text CHECK (verdict IS NULL OR verdict IN ('approved','approved_with_notes','revisions_required','error')),
  target_url         text,
  target_state       text CHECK (target_state IS NULL OR target_state IN ('editor','published')),
  findings           jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence           jsonb NOT NULL DEFAULT '[]'::jsonb,
  doctrine_version   text,
  client_record_hash text,
  agent_thread_path  text,
  submitted_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.task_qa_runs IS
  'Append-only log of AI QA runs against a task. One row per run; verdict/finished_at are filled when the run completes.';

CREATE INDEX IF NOT EXISTS idx_task_qa_runs_task_started
  ON public.task_qa_runs (task_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_qa_runs_client_started
  ON public.task_qa_runs (client_id, started_at DESC);

-- Denormalise client_id from the task so callers may omit it and RLS stays cheap.
CREATE OR REPLACE FUNCTION public.task_qa_runs_set_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    SELECT t.client_id INTO NEW.client_id FROM public.tasks t WHERE t.id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_qa_runs_set_client ON public.task_qa_runs;
CREATE TRIGGER task_qa_runs_set_client
  BEFORE INSERT ON public.task_qa_runs
  FOR EACH ROW EXECUTE FUNCTION public.task_qa_runs_set_client();

ALTER TABLE public.task_qa_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QA runs for accessible clients" ON public.task_qa_runs;
CREATE POLICY "Users can view QA runs for accessible clients"
  ON public.task_qa_runs FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users can open QA runs for accessible clients" ON public.task_qa_runs;
CREATE POLICY "Users can open QA runs for accessible clients"
  ON public.task_qa_runs FOR INSERT
  WITH CHECK (
    public.has_client_access(
      auth.uid(),
      COALESCE(client_id, (SELECT t.client_id FROM public.tasks t WHERE t.id = task_id))
    )
  );
