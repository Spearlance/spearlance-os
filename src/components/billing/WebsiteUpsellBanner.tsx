import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Globe, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebsiteUpsellBannerProps {
  onUpgradeClick: () => void;
}

export function WebsiteUpsellBanner({ onUpgradeClick }: WebsiteUpsellBannerProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if dismissed today
    const dismissedDate = localStorage.getItem('website-upsell-dismissed');
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('website-upsell-dismissed', new Date().toDateString());
  };

  const handleAddWebsite = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-website-checkout', {
        body: {
          clientId: selectedClient.id
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Website checkout error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Only show for eligible clients
  if (!selectedClient || 
      selectedClient.account_type !== 'self_service' ||
      (selectedClient as any).billing_method !== 'stripe' ||
      selectedClient.website_unlocked ||
      dismissed) {
    return null;
  }

  const hasStripeCustomer = !!(selectedClient as any).stripe_customer_id;

  return (
    <Alert className="mb-6 flex items-center justify-between border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-2xl">🌐</span>
        <AlertDescription className="flex flex-col gap-1">
          <span className="font-medium">
            {hasStripeCustomer 
              ? `Add a professional website + AI tools for ${PRICING.format(PRICING.WEBSITE_ADDON)}`
              : `Unlock your professional website with AI tools – ${PRICING.format(PRICING.WEBSITE_ADDON)} add-on`}
          </span>
          <span className="text-sm opacity-80">
            Included free in Unlimited plan
          </span>
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2">
        {hasStripeCustomer ? (
          <>
            <Button 
              onClick={handleAddWebsite}
              variant="default"
              size="sm"
              disabled={loading}
            >
              <Globe className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : `Add Website (${PRICING.format(PRICING.WEBSITE_ADDON)})`}
            </Button>
            <Button 
              onClick={onUpgradeClick}
              variant="ghost"
              size="sm"
            >
              or Upgrade to Unlimited
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        ) : (
          <Button 
            onClick={onUpgradeClick}
            variant="default"
            size="sm"
          >
            <Globe className="h-4 w-4 mr-2" />
            Get Your Website
          </Button>
        )}
        <Button 
          onClick={handleDismiss}
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
