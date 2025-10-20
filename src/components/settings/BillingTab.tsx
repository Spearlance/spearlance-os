import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, ExternalLink, Users } from "lucide-react";
import { PricingModal } from "@/components/billing/PricingModal";
import { useAccountType } from "@/hooks/useAccountType";

interface BillingTabProps {
  client: {
    id: string;
    name: string;
    subscription_status?: string;
    stripe_customer_id?: string;
    billing_plan_id?: string;
    billing_plans?: {
      name: string;
      price_monthly: number;
      max_team_members: number | null;
    };
  };
}

export function BillingTab({ client }: BillingTabProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const { toast } = useToast();
  const { trialDaysRemaining, isInTrial } = useAccountType();

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trialing":
        return "secondary";
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusDisplay = (status?: string) => {
    if (!status) return "No Subscription";
    return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { client_id: client.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      toast({
        title: "Failed to open billing portal",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-2xl font-bold">
                {client.billing_plans?.name || "No Plan"}
              </p>
              {client.billing_plans?.price_monthly && (
                <p className="text-muted-foreground">
                  ${client.billing_plans.price_monthly}/month
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium mb-2">Status</p>
              <Badge variant={getStatusBadgeVariant(client.subscription_status)}>
                {getStatusDisplay(client.subscription_status)}
              </Badge>
            </div>
          </div>

          {isInTrial && (
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium">Trial Period</p>
              <p className="text-muted-foreground">
                {trialDaysRemaining} days remaining in your trial
              </p>
            </div>
          )}

          {client.billing_plans?.max_team_members && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Team Member Limit</p>
                <p className="text-muted-foreground">
                  Up to {client.billing_plans.max_team_members} team members included
                </p>
              </div>
            </div>
          )}

          {client.stripe_customer_id && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Customer ID: {client.stripe_customer_id}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>
            Update payment methods and view billing history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setPricingModalOpen(true)}
            className="w-full"
            variant="outline"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>

          {client.stripe_customer_id && (
            <Button
              onClick={handleManageBilling}
              disabled={loadingPortal}
              className="w-full"
            >
              {loadingPortal ? (
                "Opening portal..."
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Billing
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            The billing portal allows you to update payment methods, view invoices, and
            manage your subscription.
          </p>
        </CardContent>
      </Card>

      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
}
