-- Enable realtime change events on tasks + task_assignees so the staff
-- "My Tasks" view and client task boards stay in sync live (two-way sync).
-- RLS still applies to the realtime stream: subscribers only receive events
-- for rows they can read.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already in the publication
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already in the publication
END $$;
