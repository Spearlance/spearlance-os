export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any; // Structured data for cards
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
