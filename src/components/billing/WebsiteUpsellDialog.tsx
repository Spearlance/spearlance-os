import { useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Globe, Sparkles, Users, Award, MessageCircle, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WebsiteUpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeClick: () => void;
}

export function WebsiteUpsellDialog({ open, onOpenChange, onUpgradeClick }: WebsiteUpsellDialogProps) {
  const { selectedClient } = useClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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

  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgradeClick();
  };

  const hasStripeCustomer = !!(selectedClient as any)?.stripe_customer_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Unlock Website Features</DialogTitle>
          <DialogDescription>
            Choose the best option for your business needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Website Add-on Option */}
          {hasStripeCustomer && (
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle>Website Add-on</CardTitle>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  $750
                  <span className="text-base font-normal text-muted-foreground ml-1">
                    one-time
                  </span>
                </div>
                <CardDescription className="mt-2">
                  Add website features to your current Starter plan
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Professional Website Editor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Form Submissions & Lead Capture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Custom Domain Support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm">Keep your current plan benefits</span>
                  </li>
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={handleAddWebsite}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Add Website ($750)
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Unlimited Plan Option */}
          <Card className="border-2 border-primary relative">
            <div className="absolute -top-3 left-0 right-0 flex justify-center">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Best Value
              </div>
            </div>

            <CardHeader className="pt-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Unlimited Plan</CardTitle>
              </div>
              <div className="text-3xl font-bold text-foreground">
                $297
                <span className="text-base font-normal text-muted-foreground ml-1">
                  /month
                </span>
              </div>
              <CardDescription className="mt-2">
                Website included + unlimited users & coaching
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Free Website Redesign ($2,000 Value)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited Team Access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    1 Private Coaching Session ($500 Value)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    3 Months Private Slack ($600 Value)
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  💰 Save $750 on website + get $3,100 in bonuses
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={handleUpgrade}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Unlimited
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
