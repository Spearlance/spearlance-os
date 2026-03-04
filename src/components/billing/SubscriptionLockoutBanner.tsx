import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { useAccountType } from "@/hooks/useAccountType";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SubscriptionLockoutBanner = () => {
  const { selectedClient } = useClient();
  const { isInGracePeriod, isAccessLocked, graceDaysRemaining } = useAccountType();

  const handleUpdatePayment = async () => {
    if (!selectedClient?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { client_id: selectedClient.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error("Failed to open billing portal. Please contact support.");
    }
  };

  // Don't show banner if neither condition is true
  if (!isInGracePeriod && !isAccessLocked) {
    return null;
  }

  // Access locked - show full lockout message
  if (isAccessLocked) {
    return (
      <Alert variant="destructive" className="mb-6">
        <Lock className="h-5 w-5" />
        <AlertDescription>
          <div className="text-center py-8">
            <Lock className="h-16 w-16 mx-auto mb-4" />
            <p className="font-bold text-2xl mb-2">Account Access Suspended</p>
            <p className="mb-4">
              Your subscription payment has failed and the grace period has expired. 
              Please update your payment method to restore access.
            </p>
            <Button onClick={handleUpdatePayment} size="lg">
              Update Payment Method Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period active - show warning
  if (isInGracePeriod) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-bold text-lg mb-1">
                Payment Failed - {graceDaysRemaining} Day{graceDaysRemaining !== 1 ? 's' : ''} Remaining
              </p>
              <p>
                Your payment method failed. Please update it within {graceDaysRemaining} day{graceDaysRemaining !== 1 ? 's' : ''} to avoid losing access to the platform.
              </p>
            </div>
            <Button onClick={handleUpdatePayment} variant="secondary">
              Update Payment Method
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
