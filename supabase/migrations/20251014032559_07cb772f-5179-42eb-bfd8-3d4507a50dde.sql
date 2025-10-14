-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations for accessible clients" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view messages for accessible conversations" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all conversations" ON chat_conversations;

-- Create new role-aware SELECT policy for chat_conversations
CREATE POLICY "Role-based conversation access"
ON chat_conversations
FOR SELECT
TO authenticated
USING (
  -- Admins and FMMs can see all conversations for accessible clients
  ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'fmm')) AND has_client_access(auth.uid(), client_id))
  OR
  -- Clients can only see their own conversations for accessible clients
  (auth.uid() = user_id AND has_client_access(auth.uid(), client_id))
);

-- Create new role-aware SELECT policy for chat_messages
CREATE POLICY "Role-based message access"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (
      -- Admins and FMMs can see all messages for accessible clients
      ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'fmm')) AND has_client_access(auth.uid(), chat_conversations.client_id))
      OR
      -- Clients can only see messages from their own conversations
      (chat_conversations.user_id = auth.uid() AND has_client_access(auth.uid(), chat_conversations.client_id))
    )
  )
);