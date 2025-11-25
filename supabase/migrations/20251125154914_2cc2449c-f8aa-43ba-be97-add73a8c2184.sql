-- Create duda_conversations table
CREATE TABLE duda_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  duda_conversation_uuid TEXT UNIQUE NOT NULL,
  duda_page_uuid TEXT,
  conversation_number INTEGER,
  device TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  deleted BOOLEAN DEFAULT false,
  created_by_account TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Create duda_conversation_comments table
CREATE TABLE duda_conversation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES duda_conversations(id) ON DELETE CASCADE,
  duda_comment_uuid TEXT UNIQUE NOT NULL,
  comment_text TEXT NOT NULL,
  author_account TEXT,
  is_internal_reply BOOLEAN DEFAULT false,
  author_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_duda_conversations_client_id ON duda_conversations(client_id);
CREATE INDEX idx_duda_conversations_site_id ON duda_conversations(site_id);
CREATE INDEX idx_duda_conversations_status ON duda_conversations(status);
CREATE INDEX idx_duda_conversation_comments_conversation_id ON duda_conversation_comments(conversation_id);

-- Enable RLS
ALTER TABLE duda_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE duda_conversation_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duda_conversations
CREATE POLICY "Users can view conversations for accessible clients"
  ON duda_conversations FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert conversations for accessible clients"
  ON duda_conversations FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update conversations for accessible clients"
  ON duda_conversations FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

-- RLS Policies for duda_conversation_comments
CREATE POLICY "Users can view comments for accessible conversations"
  ON duda_conversation_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duda_conversations
      WHERE duda_conversations.id = duda_conversation_comments.conversation_id
      AND has_client_access(auth.uid(), duda_conversations.client_id)
    )
  );

CREATE POLICY "Users can insert comments for accessible conversations"
  ON duda_conversation_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM duda_conversations
      WHERE duda_conversations.id = duda_conversation_comments.conversation_id
      AND has_client_access(auth.uid(), duda_conversations.client_id)
    )
  );

CREATE POLICY "Users can update comments for accessible conversations"
  ON duda_conversation_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM duda_conversations
      WHERE duda_conversations.id = duda_conversation_comments.conversation_id
      AND has_client_access(auth.uid(), duda_conversations.client_id)
    )
  );

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE duda_conversation_comments;

-- Create trigger to update updated_at on conversations
CREATE TRIGGER update_duda_conversations_updated_at
  BEFORE UPDATE ON duda_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at on comments
CREATE TRIGGER update_duda_conversation_comments_updated_at
  BEFORE UPDATE ON duda_conversation_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();