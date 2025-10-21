import { useState, useEffect } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnboardingProgress } from "./OnboardingProgress";
import { ChatMessage } from "@/components/chatbot/ChatMessage";
import { ChatInput } from "@/components/chatbot/ChatInput";
import { LaunchPadSubmission } from "@/lib/launchpadTypes";
import { FileText, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  useEffect(() => {
    initializeConversation();
  }, [submission.id]);

  // Helper function to generate context-aware greeting
  const generateContextualGreeting = (currentSubmission: LaunchPadSubmission, currentCompleteness: typeof completeness): string => {
    const existingData = currentSubmission.responses_json || {};
    const companyName = existingData.discovery?.company?.brand_name || existingData.discovery?.company?.legal_name;
    const servicesCount = existingData.discovery?.model?.services?.length || 0;
    const goalsCount = existingData.discovery?.goals?.quarter_goals?.length || 0;
    const competitorsCount = existingData.discovery?.competition?.competitors?.length || 0;
    const hasStory = existingData.discovery?.story?.completed;
    const hasVoice = existingData.discovery?.voice?.tone;

    const stage = currentSubmission.stage;
    const stageCompleteness = currentCompleteness[stage as keyof typeof currentCompleteness] || 0;

    // Discovery Stage Greetings
    if (stage === 'discovery') {
      const missingItems: string[] = [];
      if (!companyName) missingItems.push('company details');
      if (servicesCount === 0) missingItems.push('services');
      if (goalsCount === 0) missingItems.push('goals');
      if (competitorsCount === 0) missingItems.push('competitors');
      if (!hasVoice) missingItems.push('brand voice');
      if (!hasStory) missingItems.push('your story');

      if (stageCompleteness === 0) {
        return `Hi! I'm your marketing AI assistant. I'm excited to learn about your business so I can help you grow!\n\nThis will take about 15-20 minutes. I'll ask you some questions about your company, what you offer, and where you want to go. Sound good?\n\nLet's start with the basics - what's your company's legal name, and what do people actually call you (your brand name)?`;
      } else if (stageCompleteness < 100) {
        return `Hi! Let me catch you up on where we are. 🎯\n\n${companyName ? `✓ Company: ${companyName}\n` : ''}${servicesCount > 0 ? `✓ ${servicesCount} services listed\n` : ''}${goalsCount > 0 ? `✓ ${goalsCount} goals defined\n` : ''}${competitorsCount > 0 ? `✓ ${competitorsCount} competitors tracked\n` : ''}${hasVoice ? '✓ Brand voice defined\n' : ''}${hasStory ? '✓ Your story captured\n' : ''}\n⏳ Still need: ${missingItems.join(', ')}\n\nWe're ${Math.round(stageCompleteness)}% through Discovery. Let's keep going! ${missingItems.length > 0 ? `Want to tell me about ${missingItems[0]}?` : 'What should we focus on next?'}`;
      } else {
        return `Great progress! Discovery stage complete! 🎉\n\n✓ Discovery: 100% ✅\n\nWe have solid info on your company, goals, and brand voice. Ready to move to the Marketing stage and build out your service offerings?`;
      }
    }

    // Marketing Stage Greetings
    if (stage === 'marketing') {
      const discoveryComplete = currentCompleteness.discovery >= 100;
      
      if (stageCompleteness === 0) {
        return `${discoveryComplete ? 'Excellent! Discovery complete! 🎉\n\n' : ''}Welcome to the Marketing stage. Now we'll dive deeper into each of your ${servicesCount} services - understanding what makes them unique, who they're for, and how to position them.\n\nLet's start with your first service. Which one should we focus on?`;
      } else if (stageCompleteness < 100) {
        return `Great progress! Here's where we are: 🚀\n\n✓ Discovery: ${currentCompleteness.discovery}% ${currentCompleteness.discovery >= 100 ? '✅' : ''}\n✓ Marketing: ${Math.round(stageCompleteness)}% (in progress)\n\nWe're building out marketing details for your services. Let's continue with service differentiators, key benefits, and positioning. Which service should we focus on next?`;
      } else {
        return `Amazing work! Marketing stage complete! 🎉\n\n✓ Discovery: 100% ✅\n✓ Marketing: 100% ✅\n\nYou've built comprehensive service profiles. Ready to move to the Avatar stage and define your ideal customer?`;
      }
    }

    // Avatar Stage Greetings
    if (stage === 'avatar') {
      const discoveryComplete = currentCompleteness.discovery >= 100;
      const marketingComplete = currentCompleteness.marketing >= 100;
      
      if (stageCompleteness === 0) {
        return `Welcome to the Avatar stage! 🎯\n\n${discoveryComplete ? '✓ Discovery: 100% ✅\n' : ''}${marketingComplete ? '✓ Marketing: 100% ✅\n' : ''}\nWe've built a strong foundation. Now we're creating your ideal customer avatar - understanding who your perfect customer is, their challenges, goals, and what makes them choose you.\n\nLet's start: Who is your ideal customer? Tell me about them - their role, industry, or business type.`;
      } else if (stageCompleteness < 100) {
        return `Welcome back! Here's where we are: 🚀\n\n✓ Discovery: ${currentCompleteness.discovery}% ${currentCompleteness.discovery >= 100 ? '✅' : ''}\n✓ Marketing: ${currentCompleteness.marketing}% ${currentCompleteness.marketing >= 100 ? '✅' : ''}\n✓ Avatar: ${Math.round(stageCompleteness)}% (in progress)\n\nWe're defining your ideal customer. Let's continue building out their profile - their pain points, goals, and decision-making factors. What else can you tell me about them?`;
      } else {
        return `Incredible! Avatar stage complete! 🎉\n\n✓ Discovery: 100% ✅\n✓ Marketing: 100% ✅\n✓ Avatar: 100% ✅\n\nYou've completed all stages! Your Launchpad profile is ready. Time to finalize and launch! 🚀`;
      }
    }

    // Default fallback
    return `Hi! Welcome back to your Launchpad journey. ${companyName ? `Let's continue building your marketing foundation for ${companyName}.` : 'Ready to continue?'}`;
  };

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
          title: 'Launchpad Onboarding',
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

      // Generate context-aware greeting
      const greetingContent = generateContextualGreeting(submission, completeness);

      const greeting: Message = {
        role: 'assistant',
        content: greetingContent,
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

  const handleRefresh = async () => {
    if (!selectedClient || !conversationId) return;
    
    setIsLoading(true);
    try {
      // Archive current conversation
      await supabase
        .from('chat_conversations')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          client_id: selectedClient.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: 'Launchpad Onboarding',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Update submission with new conversation ID
      await supabase
        .from('launchpad_submissions')
        .update({ onboarding_conversation_id: newConversation.id })
        .eq('id', submission.id);

      setConversationId(newConversation.id);

      // Generate fresh context-aware greeting
      const greetingContent = generateContextualGreeting(submission, completeness);
      
      const greeting: Message = {
        role: 'assistant',
        content: greetingContent,
        timestamp: new Date(),
      };

      setMessages([greeting]);

      // Save initial message
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: newConversation.id,
          role: 'assistant',
          content: greeting.content,
        });

      toast({
        title: 'Chat Refreshed',
        description: 'Started a new conversation with updated context.',
      });

      setShowRefreshDialog(false);
    } catch (error: any) {
      console.error('Error refreshing chat:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh chat',
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
            <h2 className="text-2xl font-bold">Launchpad Chat</h2>
            <div className="flex gap-2">
              <AlertDialog open={showRefreshDialog} onOpenChange={setShowRefreshDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading || !conversationId}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Refresh Chat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start Fresh Conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will start a new conversation with an updated summary of your progress. 
                      Your data is saved - only the chat history will be archived.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefresh}>
                      Refresh
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToForm}
              >
                <FileText className="mr-2 h-4 w-4" />
                Switch to Form
              </Button>
            </div>
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
