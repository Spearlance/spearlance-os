-- Add index on chat_messages for faster historical conversation fetching
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
ON chat_messages(conversation_id, created_at);