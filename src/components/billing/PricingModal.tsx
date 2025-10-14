import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, interval: string) => {
    if (!selectedClient) return;

    // Only allow Stripe checkout for Stripe billing clients
    if ((selectedClient as any).billing_method !== 'stripe') {
      toast({
        title: "Not Available",
        description: "This client is not on a Stripe billing plan. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setLoading(interval);

    // Safety timeout - reset loading after 5 seconds
    const timeoutId = setTimeout(() => {
      setLoading(null);
    }, 5000);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: priceId,
          clientId: selectedClient.id
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        // Note: page will navigate away, timeout will handle edge cases
      } else {
        clearTimeout(timeoutId);
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const features = [
    "Full LaunchPad Access",
    "Unlimited Tasks & Projects",
    "Asset Library & Management",
    "Avatar Builder",
    "Marketing Flowchart & Ideas",
    "Team Collaboration",
    "Reports & Analytics",
    "Priority Email Support"
  ];

  // Calculate days remaining if in trial
  const daysRemaining = selectedClient?.trial_end_date 
    ? Math.ceil((new Date(selectedClient.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            {daysRemaining > 0 ? (
              <span className="text-yellow-600 font-medium">
                {daysRemaining} days remaining in your free trial • Select a plan to continue after trial
              </span>
            ) : (
              "Select a plan to continue using Spearlance Marketing OS"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Monthly Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Monthly
              </CardTitle>
              <CardDescription className="text-3xl font-bold text-foreground mt-2">
                $99<span className="text-base font-normal text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleCheckout('price_1AbCdEfGhIjKlMnO', 'month')}
                disabled={loading !== null}
              >
                {loading === 'month' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Choose Monthly'
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Yearly Plan - Highlighted */}
          <Card className="border-2 border-primary relative">
            <div className="absolute -top-3 left-0 right-0 flex justify-center">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Best Value - Save $689
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="flex items-center justify-between">
                Yearly
              </CardTitle>
              <CardDescription className="text-3xl font-bold text-foreground mt-2">
                $499<span className="text-base font-normal text-muted-foreground">/year</span>
              </CardDescription>
              <p className="text-sm text-green-600 font-medium">
                Save 58% compared to monthly! ($41.58/month)
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" 
                onClick={() => handleCheckout('price_1XyZaBcDeFgHiJkL', 'year')}
                disabled={loading !== null}
              >
                {loading === 'year' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Choose Yearly
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Need a Fractional Marketing Manager? <a href="#" className="text-primary hover:underline">Contact us for custom pricing</a></p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
