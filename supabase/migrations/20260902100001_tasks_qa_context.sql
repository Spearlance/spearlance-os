-- STEP 2 — QA context columns on tasks (nullable, unread by existing code,
-- droppable: see supabase/migrations/down/20260902100001_tasks_qa_context.down.sql).
--
-- DEVIATION FROM THE BRIEF (flagged, not worked around):
--   The brief proposed origin_type / origin_ref. tasks ALREADY has
--   external_source / external_ref (20260731000000_duda_comments_webhook.sql,
--   comment: "Origin system for webhook-created tasks (e.g. duda_comment)")
--   plus a partial index on (client_id, external_source, external_ref). Adding
--   a second origin pair would leave two half-populated answers to "where did
--   this task come from". This file therefore does NOT add origin_type /
--   origin_ref; use external_source in {duda_comment, email, slack, campfire,
--   meeting, manual} and external_ref for the pointer. If a separate pair is
--   still wanted, uncomment the block at the bottom.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS acceptance_criteria text,
  ADD COLUMN IF NOT EXISTS viktor_thread_path  text,
  ADD COLUMN IF NOT EXISTS qa_target_url       text,
  ADD COLUMN IF NOT EXISTS qa_target_state     text;

-- Named constraint so the down migration (and any later change) can address it.
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_qa_target_state_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_qa_target_state_check
  CHECK (qa_target_state IS NULL OR qa_target_state IN ('editor', 'published'));

COMMENT ON COLUMN public.tasks.acceptance_criteria IS
  'Falsifiable definition of done, written at assignment time; the QA agent checks the page against this.';
COMMENT ON COLUMN public.tasks.viktor_thread_path IS
  'Path of the agent thread / conversation that originated or is tracking this task.';
COMMENT ON COLUMN public.tasks.qa_target_url IS
  'URL the QA agent must inspect (Duda editor site URL or published page).';
COMMENT ON COLUMN public.tasks.qa_target_state IS
  'Which rendering of the target to audit: editor or published.';

-- Optional, per brief (intentionally left out; see header):
-- ALTER TABLE public.tasks
--   ADD COLUMN IF NOT EXISTS origin_type text
--     CHECK (origin_type IS NULL OR origin_type IN ('email','slack','campfire','meeting','manual')),
--   ADD COLUMN IF NOT EXISTS origin_ref  text;
