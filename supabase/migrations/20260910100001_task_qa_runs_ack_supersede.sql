-- task_qa_runs: agent acknowledgement, who closed the run, and verdict
-- correction by supersession (task-QA hardening, items 1 and 7).
--
--   acked_at       set by POST /task-qa-agent/ack (or /claim). A webhook 200
--                  only proves delivery; this proves the agent picked the run up.
--   closed_by      agent | dispatch | reaper | manual | task_closed. Lets the
--                  dispatch loop guard tell a reaper retry from a delivery failure.
--   supersedes /   a corrected verdict is a NEW run pointing at the old one;
--   superseded_by  UIs show runs where superseded_by IS NULL by default. The
--                  log stays append-only: nothing on the old run changes except
--                  the pointer.
--
-- Down: supabase/migrations/down/20260910100001_task_qa_runs_ack_supersede.down.sql

ALTER TABLE public.task_qa_runs
  ADD COLUMN IF NOT EXISTS acked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by     text,
  ADD COLUMN IF NOT EXISTS supersedes    uuid REFERENCES public.task_qa_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.task_qa_runs(id) ON DELETE SET NULL;

ALTER TABLE public.task_qa_runs DROP CONSTRAINT IF EXISTS task_qa_runs_closed_by_check;
ALTER TABLE public.task_qa_runs
  ADD CONSTRAINT task_qa_runs_closed_by_check
  CHECK (closed_by IS NULL OR closed_by IN ('agent','dispatch','reaper','manual','task_closed'));

COMMENT ON COLUMN public.task_qa_runs.acked_at IS 'When the QA agent acknowledged the run (POST /ack or /claim). NULL = delivered but never picked up.';
COMMENT ON COLUMN public.task_qa_runs.closed_by IS 'What closed the run: agent, dispatch (delivery failure), reaper (stalled), manual (drawer), task_closed (task completed/cancelled mid-run).';
COMMENT ON COLUMN public.task_qa_runs.supersedes IS 'Run this one corrects. Set together with the old run''s superseded_by.';
COMMENT ON COLUMN public.task_qa_runs.superseded_by IS 'Run that corrected this one. Non-null runs are hidden by default in the UI.';

CREATE INDEX IF NOT EXISTS idx_task_qa_runs_open
  ON public.task_qa_runs (task_id) WHERE finished_at IS NULL;

-- Link a correction to the run it replaces. Callable by app users (RLS-equivalent
-- check via has_client_access) and by the service role (agent endpoint).
CREATE OR REPLACE FUNCTION public.task_qa_supersede_run(p_old uuid, p_new uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old public.task_qa_runs%ROWTYPE;
  v_new public.task_qa_runs%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM public.task_qa_runs WHERE id = p_old;
  SELECT * INTO v_new FROM public.task_qa_runs WHERE id = p_new;
  IF v_old.id IS NULL OR v_new.id IS NULL THEN
    RAISE EXCEPTION 'task_qa_supersede_run: run not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_old.task_id <> v_new.task_id THEN
    RAISE EXCEPTION 'task_qa_supersede_run: runs belong to different tasks' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT (auth.role() = 'service_role' OR public.has_client_access(auth.uid(), v_old.client_id)) THEN
    RAISE EXCEPTION 'task_qa_supersede_run: not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_old.finished_at IS NULL THEN
    RAISE EXCEPTION 'task_qa_supersede_run: cannot supersede an open run' USING ERRCODE = 'check_violation';
  END IF;
  IF v_old.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'task_qa_supersede_run: run already superseded by %', v_old.superseded_by USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.task_qa_runs SET superseded_by = p_new WHERE id = p_old;
  UPDATE public.task_qa_runs SET supersedes = p_old WHERE id = p_new;
END;
$$;

REVOKE ALL ON FUNCTION public.task_qa_supersede_run(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.task_qa_supersede_run(uuid, uuid) TO authenticated, service_role;
