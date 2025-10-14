import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MessageSquare, Archive, ChevronDown } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { useChatbot } from './useChatbot';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const ChatbotWidget = () => {
  const { selectedClient } = useClient();
  const { 
    messages, 
    conversations,
    activeConversationId,
    isLoading, 
    isLoadingConversations,
    error, 
    isOpen, 
    setIsOpen,
    setActiveConversationId,
    sendMessage, 
    clearMessages,
    createNewConversation,
    archiveConversation
  } = useChatbot();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleOpen = () => {
    if (selectedClient) {
      setIsOpen(true);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={!selectedClient}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        title={selectedClient ? "Open SpearlanceAI" : "Select a client first"}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[400px] p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b pr-12">
            <SheetTitle>SpearlanceAI</SheetTitle>
            <SheetDescription className="truncate">
              {selectedClient?.name || 'No client selected'}
            </SheetDescription>
            
            <div className="pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    Previous Chats
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px]">
                  <DropdownMenuLabel>Your Conversations</DropdownMenuLabel>
                  <DropdownMenuItem onClick={createNewConversation}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start New Conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {isLoadingConversations && (
                    <DropdownMenuItem disabled>
                      Loading conversations...
                    </DropdownMenuItem>
                  )}
                  
                  {!isLoadingConversations && conversations.length === 0 && (
                    <DropdownMenuItem disabled>
                      No previous conversations
                    </DropdownMenuItem>
                  )}
                  
                  {!isLoadingConversations && conversations.map((conv) => (
                    <DropdownMenuItem
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className="flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`truncate flex-1 ${conv.id === activeConversationId ? 'font-semibold' : ''}`}>
                          {conv.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveConversation(conv.id);
                          }}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {conv.creator_name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          conv.creator_role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                          conv.creator_role === 'fmm' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {conv.creator_role?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Updated {new Date(conv.updated_at).toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {activeConversation && (
              <p className="text-xs text-muted-foreground mt-2">
                Auto-deletes {new Date(activeConversation.auto_delete_at).toLocaleDateString()}
              </p>
            )}
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">SpearlanceAI</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your expert co-pilot for {selectedClient?.name}
                </p>
                <ul className="text-xs text-muted-foreground space-y-2 text-left max-w-sm mx-auto">
                  <li className="font-medium text-foreground mb-3">I can help you:</li>
                  <li>📊 Pull data from your account (tasks, reports, avatars)</li>
                  <li>💡 Build complete offers and marketing campaigns</li>
                </ul>
                <div className="text-xs mt-4 space-y-1">
                  <p className="font-medium text-foreground">Try asking:</p>
                  <p className="opacity-70">• "Build an offer for my business"</p>
                  <p className="opacity-70">• "What tasks are due this week?"</p>
                  <p className="opacity-70">• "Write ad copy for [service]"</p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex gap-1 items-center text-muted-foreground text-sm mb-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={!selectedClient}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
