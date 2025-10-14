import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MessageSquare, X, Trash2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { useChatbot } from './useChatbot';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export const ChatbotWidget = () => {
  const { selectedClient } = useClient();
  const { 
    messages, 
    isLoading, 
    error, 
    isOpen, 
    setIsOpen, 
    sendMessage, 
    clearMessages 
  } = useChatbot();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
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

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={handleOpen}
        disabled={!selectedClient}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        title={selectedClient ? "Open SpearlanceAI" : "Select a client first"}
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[400px] p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle>SpearlanceAI</SheetTitle>
                <SheetDescription>
                  {selectedClient?.name || 'No client selected'}
                </SheetDescription>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages Area */}
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

          {/* Input Area */}
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
