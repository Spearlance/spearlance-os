-- Reaper for stalled QA runs + attempt counter (task-QA hardening, item 2).
--
-- Push mode marks a task qa_running as soon as the webhook accepts the event,
-- so a task can sit there forever if the agent never actually starts. Every
-- 5 minutes pg_cron runs task_qa_reap():
--   a. open run, not acked, started > 5 min ago   -> close 'error' (no_ack)
--   b. open run, acked, started > 45 min ago      -> close 'error' (no_verdict)
--   both: tasks.qa_attempts += 1, task back to ready_for_review (which re-fires
--         the dispatch trigger). On the 3rd failure the task goes to
--         revisions_required instead and a system comment lands it on a human.
--
-- qa_attempts resets to 0 when a run closes with a real verdict (trigger) and
-- when a person (re)submits the task to QA from outside qa_running.
--
-- task_comments.user_id becomes nullable so the reaper can write a system
-- comment; the FK was already ON DELETE SET NULL, which never worked with the
-- NOT NULL.
--
-- Down: supabase/migrations/down/20260910100002_task_qa_attempts_reaper.down.sql

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS qa_attempts integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.tasks.qa_attempts IS
  'Consecutive QA dispatches that stalled (no ack / no verdict). Reset on a real verdict or a fresh human submission. 3 = stop retrying.';

ALTER TABLE public.task_comments ALTER COLUMN user_id DROP NOT NULL;

-- 1) Reset attempts on a real verdict.
CREATE OR REPLACE FUNCTION public.task_qa_runs_reset_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.verdict IN ('approved','approved_with_notes','revisions_required')
     AND (TG_OP = 'INSERT' OR OLD.verdict IS DISTINCT FROM NEW.verdict) THEN
    UPDATE public.tasks SET qa_attempts = 0 WHERE id = NEW.task_id AND qa_attempts <> 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_qa_runs_reset_attempts ON public.task_qa_runs;
CREATE TRIGGER task_qa_runs_reset_attempts
  AFTER INSERT OR UPDATE OF verdict ON public.task_qa_runs
  FOR EACH ROW EXECUTE FUNCTION public.task_qa_runs_reset_attempts();

-- 2) Reset attempts when a human (re)submits. The reaper's own retry is
--    qa_running -> ready_for_review and must NOT reset.
CREATE OR REPLACE FUNCTION public.tasks_stamp_qa_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qa_state IS DISTINCT FROM OLD.qa_state THEN
    NEW.qa_state_changed_at := now();
    IF NEW.qa_state = 'ready_for_review' AND OLD.qa_state IS DISTINCT FROM 'qa_running' THEN
      NEW.qa_attempts := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) The reaper. Returns one row per run it closed so it can be run by hand.
CREATE OR REPLACE FUNCTION public.task_qa_reap(p_now timestamptz DEFAULT now())
RETURNS TABLE (o_run_id uuid, o_task_id uuid, o_reason text, o_attempts integer, o_next_state text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  r record;
  v_attempts integer;
  v_reason   text;
  v_finding  text;
  v_next     text;
BEGIN
  FOR r IN
    SELECT q.id, q.task_id, q.acked_at
    FROM public.task_qa_runs q
    WHERE q.finished_at IS NULL
      AND (
        (q.acked_at IS NULL     AND q.started_at < p_now - interval '5 minutes')
        OR
        (q.acked_at IS NOT NULL AND q.started_at < p_now - interval '45 minutes')
      )
    ORDER BY q.started_at
    FOR UPDATE SKIP LOCKED
  LOOP
    IF r.acked_at IS NULL THEN
      v_reason  := 'no_ack';
      v_finding := 'agent never acknowledged the dispatch';
    ELSE
      v_reason  := 'no_verdict';
      v_finding := 'agent acknowledged but never returned a verdict';
    END IF;

    UPDATE public.task_qa_runs
    SET verdict     = 'error',
        finished_at = p_now,
        closed_by   = 'reaper',
        findings    = jsonb_build_array(jsonb_build_object('summary', v_finding, 'severity', 'blocker', 'code', v_reason))
    WHERE id = r.id;

    UPDATE public.tasks
    SET qa_attempts = qa_attempts + 1
    WHERE id = r.task_id
    RETURNING qa_attempts INTO v_attempts;

    IF v_attempts >= 3 THEN
      v_next := 'revisions_required';
      UPDATE public.tasks SET qa_state = 'revisions_required' WHERE id = r.task_id;
      INSERT INTO public.task_comments (task_id, user_id, body)
      VALUES (
        r.task_id,
        NULL,
        format('QA could not complete: %s attempts, last failure "%s". Needs a human review before it goes back to QA.', v_attempts, v_finding)
      );
    ELSE
      v_next := 'ready_for_review';
      UPDATE public.tasks SET qa_state = 'ready_for_review' WHERE id = r.task_id;
    END IF;

    o_run_id := r.id; o_task_id := r.task_id; o_reason := v_reason; o_attempts := v_attempts; o_next_state := v_next;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.task_qa_reap(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.task_qa_reap(timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.task_qa_reap(timestamptz) TO service_role;

COMMENT ON FUNCTION public.task_qa_reap(timestamptz) IS
  'Closes stalled QA runs (no ack > 5 min, no verdict > 45 min), bumps tasks.qa_attempts, retries or hands off to a human after 3.';

-- 4) Schedule. cron.schedule with an existing jobname replaces the job.
SELECT cron.schedule('task-qa-reap', '*/5 * * * *', $cron$ SELECT public.task_qa_reap(); $cron$);
