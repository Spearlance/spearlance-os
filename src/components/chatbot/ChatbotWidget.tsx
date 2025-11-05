import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MessageSquare, Archive, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClient } from '@/contexts/ClientContext';
import { useChatbot } from './useChatbot';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import spearlanceLogo from '@/assets/spearlance-logo-white.png';

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
    isOfferMode,
    setIsOpen,
    setIsOfferMode,
    setActiveConversationId,
    sendMessage, 
    clearMessages,
    createNewConversation,
    archiveConversation
  } = useChatbot();
  
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleOpen = () => {
    if (selectedClient) {
      setIsOpen(true);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpen}
          disabled={!selectedClient}
          className="ai-bubble group relative h-16 w-16 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title={selectedClient ? "Open SpearlanceAI" : "Select a client first"}
        >
          {/* Logo */}
          <img 
            src={spearlanceLogo} 
            alt="Spearlance AI"
            className="ai-logo relative z-10 h-8 w-8 m-auto"
          />
          
          {/* Sparkle particles */}
          <span className="sparkle sparkle-1">✨</span>
          <span className="sparkle sparkle-2">✨</span>
          <span className="sparkle sparkle-3">✨</span>
          <span className="sparkle sparkle-4">✨</span>
          <span className="sparkle sparkle-5">✨</span>
          
          {/* Shine overlay */}
          <div className="shine-overlay" />
        </button>
      </div>

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
            
            <div className="pt-2 flex gap-2">
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between">
                    <span>Previous Chats</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px] z-50 bg-background">
                  <DropdownMenuLabel>Your Conversations</DropdownMenuLabel>
                  <DropdownMenuItem 
                    disabled={isCreatingConversation}
                    onClick={async (e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      setIsCreatingConversation(true);
                      
                      await new Promise(resolve => setTimeout(resolve, 150));
                      
                      await createNewConversation();
                      setIsCreatingConversation(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {isCreatingConversation ? "Creating..." : "Start New Conversation"}
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

              <Button
                variant={isOfferMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsOfferMode(!isOfferMode)}
                className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  isOfferMode && "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30"
                )}
              >
                Offer Mode
              </Button>
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
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">SpearlanceAI</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your expert co-pilot for {selectedClient?.name}
                </p>
                <ul className="text-xs text-muted-foreground space-y-2 text-left max-w-sm mx-auto">
                  <li className="font-medium text-foreground mb-3">I can help you:</li>
                  <li>📊 <span className="font-medium">Default Mode:</span> Pull data, get insights, and marketing advice</li>
                  <li>🎯 <span className="font-medium">Offer Mode:</span> Guided 6-step complete offer creation workflow</li>
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

            {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
              <TypingIndicator />
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={!selectedClient}
            isOfferMode={isOfferMode}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
