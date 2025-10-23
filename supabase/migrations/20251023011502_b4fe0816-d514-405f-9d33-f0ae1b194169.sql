-- Add DELETE policy for tasks table to allow proper task deletion
CREATE POLICY "Users can delete tasks for accessible clients"
ON public.tasks FOR DELETE
USING (public.has_client_access(auth.uid(), client_id));

-- Add DELETE policy for task_comments table to allow deletion of comments when task is deleted
CREATE POLICY "Users can delete comments for accessible tasks"
ON public.task_comments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND public.has_client_access(auth.uid(), tasks.client_id)
  )
);