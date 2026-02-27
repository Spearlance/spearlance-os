import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Conversation } from './types';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useChatbot = () => {
  const { selectedClient } = useClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOfferMode, setIsOfferMode] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations when chat opens or client changes
  useEffect(() => {
    if (isOpen && selectedClient?.id) {
      loadConversations();
    }
  }, [isOpen, selectedClient?.id]);

  // Load active conversation messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    if (!selectedClient?.id) return;
    
    setIsLoadingConversations(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Fetch conversations with creator names
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          creator:profiles!chat_conversations_user_id_fkey (name)
        `)
        .eq('client_id', selectedClient.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Step 2: Get unique user IDs to fetch roles
      const userIds = [...new Set((data || []).map(conv => conv.user_id))];

      // Step 3: Fetch roles for these users
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Step 4: Create a map of user_id to role for quick lookup
      const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]));

      // Step 5: Transform data to include creator info
      const conversationsWithCreator = (data || []).map((conv: any) => ({
        ...conv,
        creator_name: conv.creator?.name || 'Unknown',
        creator_role: roleMap.get(conv.user_id) || 'client'
      }));
      
      setConversations(conversationsWithCreator);
      
      // Auto-select most recent conversation
      if (conversationsWithCreator.length > 0 && !activeConversationId) {
        setActiveConversationId(conversationsWithCreator[0].id);
      }
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: ChatMessage[] = data.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));

      setMessages(loadedMessages);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      toast({
        title: "Error",
        description: "Failed to load conversation.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (): Promise<string | null> => {
    if (!selectedClient?.id) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          client_id: selectedClient.id,
          user_id: user.id,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (error) throw error;

      setActiveConversationId(data.id);
      setConversations(prev => [data, ...prev]);
      setMessages([]);

      return data.id;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      toast({
        title: "Error",
        description: "Failed to create conversation.",
        variant: "destructive"
      });
      return null;
    }
  };

  const saveMessage = async (message: ChatMessage, conversationId?: string) => {
    const convId = conversationId || activeConversationId;
    if (!convId) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: convId,
          role: message.role,
          content: message.content
        });

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      // Auto-generate title from first user message
      const conversation = conversations.find(c => c.id === convId);
      if (conversation && conversation.title === 'New Conversation' && message.role === 'user') {
        const autoTitle = generateTitle(message.content);
        await supabase
          .from('chat_conversations')
          .update({ title: autoTitle })
          .eq('id', convId);
        
        setConversations(prev => 
          prev.map(c => c.id === convId ? { ...c, title: autoTitle } : c)
        );
      }
    } catch (err: any) {
      console.error('Error saving message:', err);
    }
  };

  const generateTitle = (firstMessage: string): string => {
    const cleaned = firstMessage.trim().slice(0, 50);
    return cleaned.length < firstMessage.trim().length ? cleaned + '...' : cleaned;
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }

      toast({
        title: "Conversation Archived",
        description: "This conversation will be auto-deleted in 30 days.",
      });
    } catch (err: any) {
      console.error('Error archiving conversation:', err);
      toast({
        title: "Error",
        description: "Failed to archive conversation.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (!selectedClient?.id || !content.trim()) return;

    // Create new conversation if none exists
    let conversationId = activeConversationId;
    
    if (!conversationId) {
      conversationId = await createNewConversation();
      
      if (!conversationId) {
        // Error toast already shown by createNewConversation()
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage, conversationId);

    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    // Set up timeout for AI response
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
      setError("Request timed out. The AI is taking longer than expected.");
      setIsLoading(false);
      toast({
        title: "Timeout",
        description: "AI response took too long. Please try again.",
        variant: "destructive"
      });
    }, 30000); // 30 seconds

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({ 
              role: m.role, 
              content: m.content 
            })),
            client_id: selectedClient.id,
            conversation_id: conversationId,
            offer_mode: isOfferMode
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (response.status === 429) {
        setError("Rate limit exceeded. Please try again in a few minutes.");
        toast({
          title: "Rate Limit Exceeded",
          description: "You've reached the maximum number of requests. Please wait a bit.",
          variant: "destructive"
        });
        return;
      }

      if (response.status === 403) {
        setError("Access denied to this client.");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this client's data.",
          variant: "destructive"
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return updated;
              });
            }
          } catch (e) {
            console.debug('Parse error (expected for incomplete chunks):', e);
          }
        }
      }

      // Save complete assistant message
      assistantMessage.content = assistantContent;
      await saveMessage(assistantMessage, conversationId);

      clearTimeout(timeoutId);

    } catch (err: any) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        // Mark the user message as failed
        setMessages(prev => {
          const updated = [...prev];
          const userMsgIndex = updated.findIndex(m => 
            m.role === 'user' && 
            m.content === content.trim() && 
            !m.failed
          );
          if (userMsgIndex !== -1) {
            updated[userMsgIndex] = {
              ...updated[userMsgIndex],
              failed: true,
              errorMessage: 'Request timed out. Please try again.'
            };
          }
          return updated;
        });
        setError('Request was cancelled or timed out.');
        return;
      }

      console.error('Chat error:', err);
      
      // Mark the user message as failed with specific error
      setMessages(prev => {
        const updated = [...prev];
        const userMsgIndex = updated.findIndex(m => 
          m.role === 'user' && 
          m.content === content.trim() && 
          !m.failed
        );
        if (userMsgIndex !== -1) {
          updated[userMsgIndex] = {
            ...updated[userMsgIndex],
            failed: true,
            errorMessage: err.message || 'Failed to send message'
          };
        }
        return updated;
      });
      
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to communicate with assistant. Click retry to try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const retryMessage = async (messageContent: string) => {
    // Remove the failed flag from the message first
    setMessages(prev => 
      prev.map(m => 
        m.content === messageContent && m.failed 
          ? { ...m, failed: false, errorMessage: undefined }
          : m
      )
    );
    
    // Clear any existing error state
    setError(null);
    
    // Resend the message using existing sendMessage logic
    await sendMessage(messageContent);
  };

  const clearMessages = () => {
    if (activeConversationId) {
      archiveConversation(activeConversationId);
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isLoadingConversations,
    error,
    isOpen,
    isOfferMode,
    setIsOpen,
    setIsOfferMode,
    setActiveConversationId,
    sendMessage,
    clearMessages,
    createNewConversation,
    archiveConversation,
    cancelRequest,
    retryMessage,
  };
};
