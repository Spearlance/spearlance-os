import { ChatMessage as ChatMessageType } from './types';
import { format } from 'date-fns';
import { Bot, User, Calendar, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { SaveOfferDialog } from '@/components/marketing/SaveOfferDialog';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Detect GSO content
  const isGSOContent = !isUser && (
    message.content.includes('Strategy Snapshot') ||
    message.content.includes('GSO One-Pager') ||
    message.content.includes('Lead Pack') ||
    message.content.includes('Money Model') ||
    message.content.includes('Core Four') ||
    (message.content.includes('Hook') && message.content.includes('Retain') && message.content.includes('Reward'))
  );

  // Extract title from GSO content
  const extractTitle = () => {
    const lines = message.content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('**Offer Name')) {
        return line.replace(/^#+ /, '').replace(/\*\*/g, '').replace('Offer Name:', '').trim();
      }
    }
    return 'Untitled Offer';
  };

  // Parse GSO content into structured format
  const parseGSOContent = () => {
    return {
      raw_markdown: message.content,
      parsed_at: new Date().toISOString(),
    };
  };

  // Check if message contains meeting data
  const hasMeetingData = message.content.includes('"date_time"') && 
                          message.content.includes('"summary"');

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-xs text-muted-foreground italic px-4 py-2 bg-muted/30 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  // Try to parse meeting cards from AI response
  let meetingCards = null;
  if (!isUser && hasMeetingData) {
    try {
      const jsonMatch = message.content.match(/\{[\s\S]*"items"[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.items && Array.isArray(data.items) && data.items.length > 0 && data.items[0].date_time) {
          meetingCards = data.items.slice(0, 3); // Show max 3 meetings
        }
      }
    } catch (e) {
      // Not valid JSON or not meeting data, continue normally
    }
  }

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2.5 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-card border border-border"
        )}>
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                ul: ({ node, ...props }) => <ul className="list-disc ml-4 space-y-1 my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 space-y-1 my-2" {...props} />,
                li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="my-2" {...props} />,
              }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
          {meetingCards && (
            <div className="mt-3 space-y-2">
              {meetingCards.map((meeting: any) => (
                <div 
                  key={meeting.id}
                  className="p-3 bg-muted/50 rounded-md border border-border hover:bg-muted/70 transition-colors cursor-pointer"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2">
                          {meeting.summary?.split('\n')[0]?.replace(/^#+\s*/, '') || 'Meeting'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(meeting.date_time).toLocaleDateString()} at{' '}
                          {new Date(meeting.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {meeting.attendees && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {meeting.attendees}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {meeting.status}
                      </Badge>
                      {meeting.decisions_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {meeting.decisions_count} decisions
                        </Badge>
                      )}
                      {meeting.next_steps_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {meeting.next_steps_count} steps
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => navigate('/meetings')}
              >
                View All Meetings
              </Button>
            </div>
          )}

          {isGSOContent && (
            <div className="mt-3 pt-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Offer
              </Button>
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {format(message.timestamp, 'h:mm a')}
        </div>

        {showSaveDialog && (
          <SaveOfferDialog
            open={showSaveDialog}
            onOpenChange={setShowSaveDialog}
            content={parseGSOContent()}
            defaultTitle={extractTitle()}
          />
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};
