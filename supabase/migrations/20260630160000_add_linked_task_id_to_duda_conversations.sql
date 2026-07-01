-- Link a Duda site comment to the task created from it.
-- Enables the "Task created → View task" badge and prevents double-creating
-- a task for the same comment. Nullable + ON DELETE SET NULL so deleting the
-- task simply clears the link (the comment becomes actionable again).

ALTER TABLE public.duda_conversations
  ADD COLUMN IF NOT EXISTS linked_task_id UUID
  REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_duda_conversations_linked_task_id
  ON public.duda_conversations(linked_task_id);
