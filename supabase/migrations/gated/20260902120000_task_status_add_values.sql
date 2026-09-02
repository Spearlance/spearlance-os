-- ============================================================================
-- STEP 1 — task_status enum expansion.  ***GATED — DO NOT APPLY YET***
-- ============================================================================
-- Lives in migrations/gated/ (ignored by the Supabase CLI and by
-- .claude/tmp/applymig.sh, which only read top-level migrations/*.sql) so it
-- cannot ship by accident. Move it up one directory when the preconditions in
-- docs/task-qa-migration-audit.md are met. Its timestamp is deliberately LATER
-- than steps 2 and 3 so promoting it afterwards keeps migration order monotonic.
--
-- Why gated (see audit, Step 1):
--   * Postgres cannot DROP an enum value: this is one-way.
--   * In this app `status` is DERIVED from the kanban column. TaskDrawer,
--     DetailsTab and the board's drag handler rewrite status to
--     task_columns.mapped_status, so a pipeline status with no matching
--     column is silently reverted on the next save.
--   * 15 "open = not done" predicates (app, edge functions, and the Campfire
--     bridge digest in the Campfire repo) must exclude terminal states first,
--     or 'cancelled' tasks keep being nagged.
--
-- Postgres rule: a value added by ALTER TYPE ... ADD VALUE cannot be USED in
-- the same transaction. Keep this file to ADD VALUE statements only.
--
-- Ordinal placement: workflow states are inserted BEFORE 'done' and
-- 'cancelled' after it, so if anything ever sorts by enum ordinal the order
-- reads to_do, in_progress, blocked, ready_for_review, qa_running,
-- revisions_required, qa_approved, done, cancelled. (Nothing in the repo
-- sorts by status today.)

ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'blocked'            BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'ready_for_review'   BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'qa_running'         BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'revisions_required' BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'qa_approved'        BEFORE 'done';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'cancelled'          AFTER  'done';
