import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnboardingProgress } from "./OnboardingProgress";
import { ChatMessage } from "@/components/chatbot/ChatMessage";
import { ChatInput } from "@/components/chatbot/ChatInput";
import { LaunchPadSubmission } from "@/lib/launchpadTypes";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatOnboardingProps {
  submission: LaunchPadSubmission;
  onSwitchToForm: () => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function ChatOnboarding({ submission, onSwitchToForm }: ChatOnboardingProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState(() => ({
    discovery: submission.discovery_completeness || 0,
    marketing: submission.marketing_completeness || 0,
    avatar: submission.avatar_completeness || 0,
  }));

  useEffect(() => {
    initializeConversation();
  }, [submission.id]);

  const initializeConversation = async () => {
    if (!selectedClient) return;

    // Check if conversation already exists
    if (submission.onboarding_conversation_id) {
      setConversationId(submission.onboarding_conversation_id);
      await loadMessages(submission.onboarding_conversation_id);
    } else {
      // Create new conversation
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          client_id: selectedClient.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: 'Launch Pad Onboarding',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      setConversationId(conversation.id);

      // Update submission with conversation ID
      await supabase
        .from('launchpad_submissions')
        .update({ 
          onboarding_conversation_id: conversation.id,
          onboarding_mode: 'chat'
        })
        .eq('id', submission.id);

      // Generate context-aware greeting based on existing data
      const existingData = submission.responses_json || {};
      const hasDiscoveryData = existingData.discovery && Object.keys(existingData.discovery.company || {}).length > 0;
      const hasMarketingData = existingData.marketing?.services_completed;
      const companyName = existingData.discovery?.company?.brand_name || existingData.discovery?.company?.legal_name;
      const servicesCount = existingData.discovery?.model?.services?.length || 0;
      const goalsCount = existingData.discovery?.goals?.quarter_goals?.length || 0;

      let greetingContent = '';

      if (hasDiscoveryData) {
        // User has already filled discovery data in form mode
        greetingContent = `Hi! I see you've already started your Launch Pad${companyName ? ` for ${companyName}` : ''}. Great work so far! 🎉\n\nI've loaded what you've already shared. Let me review...\n\n✓ Company info captured\n${servicesCount > 0 ? `✓ ${servicesCount} services listed\n` : ''}${goalsCount > 0 ? `✓ ${goalsCount} goals defined\n` : ''}\nLet's continue from where you left off. ${hasMarketingData ? 'Ready to work on your ideal customer avatar?' : 'Want to add more details, or move on to the next stage?'}`;
      } else {
        // Fresh start
        greetingContent = `Hi! I'm your marketing AI assistant. I'm excited to learn about your business so I can help you grow!\n\nThis will take about 15-20 minutes. I'll ask you some questions about your company, what you offer, and where you want to go. Sound good?\n\nLet's start with the basics - what's your company's legal name, and what do people actually call you (your brand name)?`;
      }

      const greeting: Message = {
        role: 'assistant',
        content: greetingContent || 'Hi! I\'m your marketing AI assistant. Let\'s get started with your Launch Pad!',
        timestamp: new Date(),
      };

      setMessages([greeting]);

      // Save initial message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: greeting.content,
        });
    }
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const loadedMessages: Message[] = data
      .filter(msg => msg.content) // Filter out messages without content
      .map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content || '', // Ensure content is never undefined
        timestamp: new Date(msg.created_at),
      }));

    setMessages(loadedMessages);
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !selectedClient) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content,
        });

      // Call chat assistant with launchpad context
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          client_id: selectedClient.id,
          conversation_id: conversationId,
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          launchpad_mode: true,
          submission_id: submission.id,
          current_stage: submission.stage,
        },
      });

      if (error) throw error;

      console.log('[Frontend] Received response:', { 
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        responsePreview: data.response?.substring(0, 100),
        completeness: data.completeness,
        fullData: data
      });

      if (data.response && data.response.trim()) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update completeness if provided
        if (data.completeness !== undefined) {
          const stageKey = data.stage || submission.stage;
          setCompleteness(prev => ({
            ...prev,
            [stageKey]: data.completeness,
          }));
          
          // If stage is now 100%, reload page to get updated stage
          if (data.completeness >= 100) {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }

        // Save assistant message
        await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: data.response,
          });
      } else {
        console.error('[Frontend] Empty response received');
        console.error('[Frontend] data.response:', data.response);
        console.error('[Frontend] Full data object:', JSON.stringify(data));
        console.error('[Frontend] Response type:', typeof data.response);
        toast({
          title: 'No Response',
          description: 'The assistant did not provide a response. Please try again.',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[1fr,300px] gap-6">
        {/* Chat Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Launch Pad Chat</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToForm}
            >
              <FileText className="mr-2 h-4 w-4" />
              Switch to Form
            </Button>
          </div>

          <Card className="h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-pulse">AI is typing...</div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <ChatInput
                onSend={sendMessage}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </div>
          </Card>
        </div>

        {/* Progress Sidebar */}
        <div className="space-y-4">
          <OnboardingProgress
            currentStage={submission.stage}
            completeness={completeness}
            completedAt={submission.completed_at as Record<string, string>}
          />

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-2">Tips</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• Answer in your own words</li>
              <li>• You can correct yourself anytime</li>
              <li>• Progress is saved automatically</li>
              <li>• Switch to form mode if you prefer</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
