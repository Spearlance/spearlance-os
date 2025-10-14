export interface Conversation {
  id: string;
  client_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  auto_delete_at: string;
  creator_name?: string;
  creator_role?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any; // Structured data for cards
}

export interface PersistedChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
}

export interface StructuredData {
  type: 'task' | 'report' | 'ticket' | 'meeting' | 'service' | 'avatar' | 'asset' | 'channel';
  items: any[];
  total_count?: number;
  next_offset?: number | null;
}
