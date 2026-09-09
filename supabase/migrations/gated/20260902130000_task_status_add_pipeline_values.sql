-- ============================================================================
-- HELD: AI-QA pipeline states as task_status enum values.  ***DO NOT APPLY***
-- ============================================================================
-- Lives in migrations/gated/ (ignored by the Supabase CLI and by
-- .claude/tmp/applymig.sh, which only read top-level migrations/*.sql).
--
-- The chosen route stores the pipeline in tasks.qa_state instead
-- (20260902120001_tasks_qa_state.sql). This file is kept only in case that
-- decision is reversed. Precondition if it ever is: every client must get a
-- column mapped to each of these values (extend initialize_default_task_columns
-- and backfill), otherwise the drawer/board reverts the status on the next save.
-- 'qa_running' should still not be a status; derive it from an open
-- task_qa_runs row (finished_at IS NULL).
--
-- Postgres rule: a value added by ALTER TYPE ... ADD VALUE cannot be USED in
-- the same transaction. Keep this file to ADD VALUE statements only.

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'ready_for_review'   BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'qa_running'         BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'revisions_required' BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'qa_approved'        BEFORE 'done';
