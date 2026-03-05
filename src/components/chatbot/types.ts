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
  data?: StructuredData;
  failed?: boolean;
  errorMessage?: string;
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

export type StructuredData =
  | { type: 'task'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'report'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'ticket'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'meeting'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'service'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'avatar'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'asset'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'channel'; items: Record<string, unknown>[]; total_count?: number; next_offset?: number | null }
  | { type: 'pending_action'; action: string; confirm_id: string; preview: Record<string, unknown> };
