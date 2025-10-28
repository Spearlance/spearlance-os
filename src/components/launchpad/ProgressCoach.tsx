import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { LaunchPadStage } from "@/lib/launchpadTypes";

interface ProgressCoachProps {
  stage: LaunchPadStage;
  completeness: number;
  stageLabel: string;
}

const COACH_MESSAGES: Record<string, Record<string, string>> = {
  discovery: {
    "0-30": "Great start! The story upload helps your AI write in your unique voice.",
    "31-70": "You're making progress! Don't overthink it—you can always edit later.",
    "71-100": "Almost there! Just a few more details and you'll move to the next stage.",
  },
  marketing: {
    "0-30": "Let's define how you serve your customers. This powers your content creation.",
    "31-70": "Looking good! Your posting plan will help maintain consistent content.",
    "71-100": "Nice work! Your marketing foundation is almost complete.",
  },
  avatar: {
    "0-100": "Sit tight! Your AI is analyzing 18+ data points to build your ideal customer profile...",
  },
  complete: {
    "0-100": "🎉 Congratulations! Your marketing foundation is set. Let's put it to work!",
  },
};

export function ProgressCoach({ stage, completeness, stageLabel }: ProgressCoachProps) {
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Check localStorage for dismissal status (per session)
    const sessionDismissed = sessionStorage.getItem(`coach-dismissed-${stage}`);
    if (sessionDismissed) {
      setDismissed(true);
      return;
    }

    // Determine message based on completeness
    const stageMessages = COACH_MESSAGES[stage] || {};
    let selectedMessage = "";

    if (completeness <= 30) {
      selectedMessage = stageMessages["0-30"];
    } else if (completeness <= 70) {
      selectedMessage = stageMessages["31-70"];
    } else {
      selectedMessage = stageMessages["71-100"];
    }

    if (!selectedMessage && stageMessages["0-100"]) {
      selectedMessage = stageMessages["0-100"];
    }

    setMessage(selectedMessage);
  }, [stage, completeness]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`coach-dismissed-${stage}`, "true");
  };

  if (dismissed || !message) return null;

  return (
    <Card className="fixed bottom-6 left-6 max-w-sm p-4 shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-background z-50 animate-in slide-in-from-left-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">Progress Tip</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
