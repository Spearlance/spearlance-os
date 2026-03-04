import { ChatMessage as ChatMessageType } from './types';
import { format } from 'date-fns';
import { Calendar, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SaveOfferDialog } from '@/components/marketing/SaveOfferDialog';
import ReactMarkdown from 'react-markdown';
import spearlanceLogo from '@/assets/spearlance-logo.png';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: (content: string) => void;
}

export const ChatMessage = ({ message, onRetry }: ChatMessageProps) => {
  // Guard against undefined content
  if (!message || !message.content) {
    console.error('ChatMessage received invalid message:', message);
    return null;
  }

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { selectedClient } = useClient();
  
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // Fetch current user's profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setUserProfile(data);
        }
      }
    };
    
    fetchUserProfile();
  }, []);

  // Get user initials helper
  const getUserInitials = () => {
    if (!userProfile?.name) return 'U';
    const parts = userProfile.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userProfile.name.substring(0, 2).toUpperCase();
  };

  // Detect Complete Offer content
  const isCompleteOfferContent = !isUser && (
    message.content.includes('Strategy Snapshot') ||
    message.content.includes('Complete Offer One-Pager') ||
    message.content.includes('Lead Pack') ||
    message.content.includes('Money Model') ||
    message.content.includes('Core Four') ||
    (message.content.includes('Hook') && message.content.includes('Retain') && message.content.includes('Reward'))
  );
  
  // Only show Save Offer button if complete offer is finished (has all key sections)
  const isCompleteOfferFinished = isCompleteOfferContent && 
                                   message.content.includes('## Strategy Snapshot') &&
                                   message.content.includes('## Scores & Next Steps');

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

  // Parse Complete Offer content into structured format
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          <img 
            src={spearlanceLogo} 
            alt="SpearlanceAI" 
            className="w-5 h-5 object-contain"
          />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2.5 shadow-sm",
          isUser 
            ? message.failed
              ? "bg-destructive/10 border border-destructive/50 text-foreground"
              : "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        )}>
          {isUser && message.failed && (
            <div className="flex items-center gap-2 mb-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{message.errorMessage || 'Failed to send'}</span>
            </div>
          )}
          
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

          {isCompleteOfferFinished && (
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
          
          {isUser && message.failed && onRetry && (
            <div className="mt-3 pt-3 border-t border-destructive/20">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-destructive hover:bg-destructive/10 border-destructive/50"
                onClick={() => onRetry(message.content)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Message
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
        <Avatar className="w-8 h-8 flex-shrink-0">
          {userProfile?.avatar_url ? (
            <AvatarImage 
              src={userProfile.avatar_url} 
              alt={userProfile.name || 'User'}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getUserInitials()}
            </AvatarFallback>
          )}
        </Avatar>
      )}
    </div>
  );
};
