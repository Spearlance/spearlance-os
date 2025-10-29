import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightWebsite?: boolean;
}

export function PricingModal({ open, onOpenChange, highlightWebsite = false }: PricingModalProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const handleCheckout = async (priceId: string, tierKey: string) => {
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

    setLoading(`${tierKey}-${billingPeriod}`);

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

  const pricingTiers = {
    starter: {
      name: "Starter",
      description: "Best for small teams or solo operators who want structure and clarity",
      users: "1 User",
      monthly: {
        price: 99,
        priceId: "price_1AbCdEfGhIjKlMnO",
        perMonth: 99
      },
      annual: {
        price: 499,
        priceId: "price_1XyZaBcDeFgHiJkL",
        perMonth: 41.58,
        savings: 689
      },
      features: [
        "Full Platform Access – All-in-one marketing hub",
        "AI Daily Guidance – Know what to do next",
        "Built-In Templates – For ads, SEO, and content",
        "Dashboard – See what's working fast",
        "Marketing Assistant – Weekly check-ins for consistency",
        "Smart Reminders – Never miss key tasks",
        "Easy Upgrades – Add users or coaching anytime"
      ],
      popular: false
    },
    unlimited: {
      name: "Unlimited",
      description: "Best for growing teams who want expert help and complete marketing control",
      users: "Unlimited Users",
      monthly: {
        price: 297,
        priceId: "price_1SKNIdJtbnnNcxGrzgUguBit",
        perMonth: 297
      },
      annual: {
        price: 2097,
        priceId: "price_1SKNMHJtbnnNcxGrjN6gcLQB",
        perMonth: 174.75,
        savings: 1467
      },
      features: [
        "Everything in Starter, plus:",
        "Unlimited Team Access – Train your entire staff",
        "Priority Setup – Quick personalized onboarding",
        "Free Website Redesign ($2,000 Value)",
        "Unlimited Website Edits Included",
        "1 Private Coaching Session ($500 Value)",
        "3 Months Private Slack Channel ($600 Value)"
      ],
      popular: true
    }
  };

  // Calculate days remaining if in trial
  const daysRemaining = selectedClient?.trial_end_date 
    ? Math.ceil((new Date(selectedClient.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          {highlightWebsite && (
            <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium flex items-center justify-center gap-2">
                <span>💡</span>
                <span>Tip: Unlimited plan includes professional website + unlimited edits for free – a $750 value plus tax credits!</span>
              </p>
            </div>
          )}
          {daysRemaining > 0 && (
            <div className="text-sm text-center text-yellow-600 font-medium">
              {daysRemaining} days left in trial
            </div>
          )}
        </DialogHeader>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <ToggleGroup 
            type="single" 
            value={billingPeriod} 
            onValueChange={(value) => value && setBillingPeriod(value as 'monthly' | 'annual')}
            className="bg-muted p-0.5 rounded-lg text-sm"
          >
            <ToggleGroupItem value="monthly" className="px-4 py-1.5">
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem value="annual" className="px-4 py-1.5">
              Annual
              <Badge variant="secondary" className="ml-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                Save 41%
              </Badge>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-3">
          {Object.entries(pricingTiers).map(([key, tier]) => {
            const selectedPlan = billingPeriod === 'monthly' ? tier.monthly : tier.annual;
            const isLoadingThis = loading === `${key}-${billingPeriod}`;
            
            return (
              <Card 
                key={key}
                className={tier.popular ? "border-2 border-primary relative" : ""}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className={cn(tier.popular ? "pt-8" : "", "pb-4")}>
                  <CardTitle className="flex items-center justify-between">
                    {tier.name}
                  </CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="text-2xl font-bold text-foreground mt-2">
                    ${selectedPlan.price}
                    <span className="text-base font-normal text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-green-600 font-medium">
                      ${(selectedPlan as any).perMonth}/month • Save ${(selectedPlan as any).savings}/year
                    </p>
                  )}
                  <Badge variant="secondary" className="w-fit mt-2">
                    {tier.users}
                  </Badge>
                </CardHeader>
                
                <CardContent className="py-4">
                  <ul className="space-y-1.5">
                    {tier.features.map((feature) => {
                      const isBonus = feature.includes('($');
                      return (
                        <li 
                          key={feature} 
                          className={cn(
                            "flex items-start gap-2",
                            isBonus && "mt-2 pt-2 border-t"
                          )}
                        >
                          {isBonus ? (
                            <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          )}
                          <span className={cn(
                            "text-sm",
                            isBonus && "font-semibold text-purple-700 dark:text-purple-300"
                          )}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button
                    className={tier.popular ? "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" : "w-full"}
                    onClick={() => handleCheckout(selectedPlan.priceId, key)}
                    disabled={loading !== null}
                  >
                    {isLoadingThis ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        {tier.popular && <Sparkles className="mr-2 h-4 w-4" />}
                        Choose {tier.name}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-3 text-center text-xs text-muted-foreground">
          <p>Need a Fractional Marketing Manager? <a href="#" className="text-primary hover:underline">Contact us for custom pricing</a></p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
