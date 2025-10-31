import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    stripe_subscription_id?: string;
    stripe_plan_name?: string;
    billing_plan_id?: string;
    billing_method?: string;
    billing_plans?: {
      name: string;
      price_monthly: number;
      max_team_members: number | null;
    };
  };
  isAdmin?: boolean;
  onUpdate?: () => void;
}

export function BillingTab({ client, isAdmin = false, onUpdate }: BillingTabProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState(client.stripe_customer_id || "");
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState(client.stripe_subscription_id || "");
  const [savingStripeIds, setSavingStripeIds] = useState(false);
  const [fetchingPlanName, setFetchingPlanName] = useState(false);
  const [localPlanName, setLocalPlanName] = useState<string | null>(null);
  const { toast } = useToast();
  const { trialDaysRemaining, isInTrial } = useAccountType();

  // Reset Stripe ID fields when client changes
  useEffect(() => {
    setStripeCustomerId(client.stripe_customer_id || "");
    setStripeSubscriptionId(client.stripe_subscription_id || "");
    setLocalPlanName(client.stripe_plan_name || null);
  }, [client.id, client.stripe_customer_id, client.stripe_subscription_id, client.stripe_plan_name]);

  // Auto-fetch missing plan name when subscription ID exists
  useEffect(() => {
    const fetchMissingPlanName = async () => {
      if (client.stripe_subscription_id && !client.stripe_plan_name && !localPlanName && !fetchingPlanName) {
        console.log('Auto-fetching missing plan name for subscription:', client.stripe_subscription_id);
        setFetchingPlanName(true);
        try {
          const { data, error } = await supabase.functions.invoke('get-stripe-subscription-name', {
            body: { 
              subscription_id: client.stripe_subscription_id,
              client_id: client.id
            }
          });

          if (error) throw error;

          if (data?.success && data?.plan_name) {
            console.log('Successfully fetched plan name:', data.plan_name);
            // Update local state IMMEDIATELY
            setLocalPlanName(data.plan_name);
            // Then refresh from database (will eventually be consistent)
            onUpdate?.();
          }
        } catch (error: any) {
          console.error('Error fetching plan name:', error);
        } finally {
          setFetchingPlanName(false);
        }
      }
    };

    fetchMissingPlanName();
  }, [client.stripe_subscription_id, client.stripe_plan_name, localPlanName, client.id]);

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

  const validateStripeIds = () => {
    if (stripeCustomerId && !stripeCustomerId.startsWith('cus_')) {
      return { valid: false, error: "Customer ID must start with 'cus_'" };
    }
    if (stripeSubscriptionId && !stripeSubscriptionId.startsWith('sub_')) {
      return { valid: false, error: "Subscription ID must start with 'sub_'" };
    }
    return { valid: true };
  };

  const handleSaveStripeIds = async () => {
    const validation = validateStripeIds();
    if (!validation.valid) {
      toast({ 
        title: "Invalid Format", 
        description: validation.error, 
        variant: "destructive" 
      });
      return;
    }

    setSavingStripeIds(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          stripe_customer_id: stripeCustomerId || null,
          stripe_subscription_id: stripeSubscriptionId || null,
          billing_method: stripeCustomerId ? 'stripe' : client.billing_method,
          subscription_status: stripeSubscriptionId ? 'active' : client.subscription_status
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({ 
        title: "Stripe IDs saved", 
        description: "Billing will now sync with Stripe" 
      });

      // Fetch the plan name if subscription ID was provided
      if (stripeSubscriptionId) {
        setFetchingPlanName(true);
        try {
          const { data, error: planError } = await supabase.functions.invoke('get-stripe-subscription-name', {
            body: { 
              subscription_id: stripeSubscriptionId,
              client_id: client.id
            }
          });

          if (planError) {
            console.error('Error fetching plan name after save:', planError);
          } else if (data?.success && data?.plan_name) {
            console.log('Successfully fetched plan name after save:', data.plan_name);
            // Update local state IMMEDIATELY
            setLocalPlanName(data.plan_name);
          }
        } catch (planError) {
          console.error('Error fetching plan name:', planError);
        } finally {
          setFetchingPlanName(false);
        }
      }

      // Call onUpdate AFTER we've updated local state
      onUpdate?.();
    } catch (error: any) {
      console.error("Error saving Stripe IDs:", error);
      toast({ 
        title: "Error saving", 
        description: error.message || "Please try again later", 
        variant: "destructive" 
      });
    } finally {
      setSavingStripeIds(false);
    }
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
                {fetchingPlanName ? (
                  <span className="text-muted-foreground">Loading plan details...</span>
                ) : client.billing_method === 'direct' 
                  ? "Custom Plan"
                  : (localPlanName || client.stripe_plan_name)
                    ? (localPlanName || client.stripe_plan_name)
                    : (client.billing_plans?.name || "No Plan")
                }
              </p>
              {client.billing_plans?.price_monthly && client.billing_method !== 'direct' && (
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

          {isInTrial && client.billing_method !== 'direct' && (
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

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Link Existing Stripe Customer</CardTitle>
            <CardDescription>
              For existing Stripe customers: enter their IDs to link the account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripe-customer-id">Stripe Customer ID</Label>
              <Input
                id="stripe-customer-id"
                placeholder="cus_xxxxxxxxx"
                value={stripeCustomerId}
                onChange={(e) => setStripeCustomerId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-subscription-id">Stripe Subscription ID</Label>
              <Input
                id="stripe-subscription-id"
                placeholder="sub_xxxxxxxxx"
                value={stripeSubscriptionId}
                onChange={(e) => setStripeSubscriptionId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveStripeIds}
              disabled={savingStripeIds}
              className="w-full"
            >
              {savingStripeIds ? "Saving..." : "Save Stripe IDs"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>
            Update payment methods and view billing history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.billing_method !== 'direct' && (
            <Button
              onClick={() => setPricingModalOpen(true)}
              className="w-full"
              variant="outline"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          )}

          {client.stripe_customer_id && (client.billing_method === 'direct' || !isInTrial) && (
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

          {isInTrial && client.billing_method !== 'direct' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Billing management will be available once you add a payment method. 
                Click "Upgrade Plan" to add your payment details.
              </p>
            </div>
          )}

          {!isInTrial && (
            <p className="text-xs text-muted-foreground">
              The billing portal allows you to update payment methods, view invoices, and
              manage your subscription.
            </p>
          )}
        </CardContent>
      </Card>

      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
}
