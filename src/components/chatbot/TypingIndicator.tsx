import spearlanceLogo from '@/assets/spearlance-logo-white.png';

export const TypingIndicator = () => {
  return (
    <div className="flex gap-3 items-start mb-4 animate-fade-in">
      {/* Avatar with sparkles */}
      <div className="relative flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 backdrop-blur-sm flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20 animate-pulse">
          <img 
            src={spearlanceLogo} 
            alt="AI"
            className="h-4 w-4 opacity-90"
          />
        </div>
        
        {/* Floating sparkles */}
        <span className="sparkle sparkle-typing-1">✨</span>
        <span className="sparkle sparkle-typing-2">✨</span>
        <span className="sparkle sparkle-typing-3">✨</span>
      </div>

      {/* Typing text with animated dots */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 backdrop-blur-sm border border-primary/10">
        <span className="text-sm text-muted-foreground font-medium">
          SpearlanceAI is thinking
        </span>
        <div className="flex gap-1">
          <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
