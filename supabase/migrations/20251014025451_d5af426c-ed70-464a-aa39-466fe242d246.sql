-- Create chat_conversations table
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_at TIMESTAMPTZ,
  auto_delete_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days') NOT NULL
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations for accessible clients"
  ON chat_conversations FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create conversations for accessible clients"
  ON chat_conversations FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update own conversations for accessible clients"
  ON chat_conversations FOR UPDATE
  USING (has_client_access(auth.uid(), client_id) AND auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON chat_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages for accessible conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
        AND has_client_access(auth.uid(), chat_conversations.client_id)
    )
  );

CREATE POLICY "Users can insert messages for accessible conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
        AND has_client_access(auth.uid(), chat_conversations.client_id)
        AND chat_conversations.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_chat_conversations_client_user 
  ON chat_conversations(client_id, user_id, archived_at);

CREATE INDEX idx_chat_messages_conversation 
  ON chat_messages(conversation_id, created_at);

-- Trigger to update updated_at on chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add source_conversation_id to marketing_ideas for tracking
ALTER TABLE marketing_ideas 
ADD COLUMN source_conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL;