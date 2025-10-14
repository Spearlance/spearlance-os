import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrialStatusBanner({ onUpgradeClick }: { onUpgradeClick: () => void }) {
  const { selectedClient } = useClient();
  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedClient || selectedClient.account_type !== 'self_service') {
      return;
    }

    if (selectedClient.subscription_status !== 'trialing') {
      return;
    }

    if (!selectedClient.trial_end_date) {
      return;
    }

    // Calculate days remaining
    const now = new Date();
    const trialEnd = new Date(selectedClient.trial_end_date);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setDaysRemaining(diffDays);

    // Check if dismissed today
    const dismissedDate = localStorage.getItem('trial-banner-dismissed');
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, [selectedClient]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trial-banner-dismissed', new Date().toDateString());
  };

  if (!selectedClient || 
      selectedClient.account_type !== 'self_service' || 
      selectedClient.subscription_status !== 'trialing' ||
      daysRemaining === null || 
      dismissed) {
    return null;
  }

  // Determine urgency level
  const getUrgencyConfig = () => {
    if (daysRemaining <= 0) {
      return {
        variant: "destructive" as const,
        message: "Your trial has ended",
        action: "Upgrade Now",
        icon: "🔴"
      };
    } else if (daysRemaining <= 7) {
      return {
        variant: "destructive" as const,
        message: `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your trial`,
        action: "Upgrade Now",
        icon: "⚠️"
      };
    } else if (daysRemaining <= 30) {
      return {
        variant: "default" as const,
        message: `${daysRemaining} days remaining in your trial`,
        action: "View Plans",
        icon: "⏰"
      };
    } else {
      return {
        variant: "default" as const,
        message: `${daysRemaining} days remaining in your free trial`,
        action: "View Plans",
        icon: "✨"
      };
    }
  };

  const config = getUrgencyConfig();

  return (
    <Alert 
      variant={config.variant}
      className={cn(
        "mb-6 flex items-center justify-between",
        config.variant === "destructive" ? "animate-pulse" : ""
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-2xl">{config.icon}</span>
        <AlertDescription className="flex items-center gap-2">
          <span className="font-medium">{config.message}</span>
          {daysRemaining > 0 && (
            <span className="text-sm opacity-80">
              • Upgrade to continue full access after trial
            </span>
          )}
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={onUpgradeClick}
          variant={config.variant === "destructive" ? "secondary" : "default"}
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {config.action}
        </Button>
        {daysRemaining > 7 && (
          <Button 
            onClick={handleDismiss}
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
