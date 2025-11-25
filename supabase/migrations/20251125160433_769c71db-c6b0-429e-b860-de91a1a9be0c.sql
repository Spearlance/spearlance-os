-- Add visibility and editor_link columns to duda_conversation_comments
ALTER TABLE duda_conversation_comments
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
ADD COLUMN IF NOT EXISTS editor_link text;

-- Update RLS policy to filter internal comments for client users
DROP POLICY IF EXISTS "Users can view comments for accessible conversations" ON duda_conversation_comments;

CREATE POLICY "Users can view comments for accessible conversations"
ON duda_conversation_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM duda_conversations
    WHERE duda_conversations.id = duda_conversation_comments.conversation_id
    AND has_client_access(auth.uid(), duda_conversations.client_id)
  )
  AND (
    -- Admins and FMMs can see all comments
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
    OR
    -- Client users can only see public comments
    (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'client'
      )
    )
  )
);