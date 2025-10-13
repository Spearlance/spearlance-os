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
        title={selectedClient ? "Open AI Assistant" : "Select a client first"}
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
                <SheetTitle>AI Assistant</SheetTitle>
                <SheetDescription>
                  {selectedClient?.name || 'No client selected'}
                </SheetDescription>
              </div>
              <div className="flex gap-2">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Welcome to AI Assistant</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me about tasks, reports, meetings, and more for {selectedClient?.name}.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Try asking:</p>
                  <p className="italic">"What tasks are due this week?"</p>
                  <p className="italic">"Show me the latest reports"</p>
                  <p className="italic">"List all services"</p>
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
