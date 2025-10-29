-- Create table for tracking user mentions in task comments
CREATE TABLE task_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Enable Row Level Security
ALTER TABLE task_comment_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions in tasks they have access to
CREATE POLICY "Users can view mentions in accessible tasks"
  ON task_comment_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_comments tc
      JOIN tasks t ON t.id = tc.task_id
      WHERE tc.id = task_comment_mentions.comment_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );

-- Users can create mentions in tasks they have access to
CREATE POLICY "Users can create mentions in accessible tasks"
  ON task_comment_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_comments tc
      JOIN tasks t ON t.id = tc.task_id
      WHERE tc.id = task_comment_mentions.comment_id
      AND has_client_access(auth.uid(), t.client_id)
    )
  );