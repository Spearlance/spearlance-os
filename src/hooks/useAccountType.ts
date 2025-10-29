import { useClient } from "@/contexts/ClientContext";

export const useAccountType = () => {
  const { selectedClient } = useClient();
  
  const isSelfService = selectedClient?.account_type === 'self_service';
  const isManaged = selectedClient?.account_type === 'managed';
  const isInTrial = selectedClient?.subscription_status === 'trialing';
  const isActive = selectedClient?.subscription_status === 'active';
  const isPaused = selectedClient?.subscription_status === 'paused';
  
  const trialDaysRemaining = selectedClient?.trial_end_date 
    ? Math.ceil((new Date(selectedClient.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Check billing method for access control
  const billingMethod = selectedClient?.billing_method;
  const hasPaidAccess = billingMethod === 'direct' || billingMethod === 'free';
  
  // If user has active subscription, they have full access regardless of trial status
  const hasActiveSubscription = isActive && selectedClient?.stripe_subscription_id;
  
  return {
    isSelfService,
    isManaged,
    isInTrial,
    isActive,
    isPaused,
    trialDaysRemaining,
    billingMethod,
    hasAccess: isActive || isInTrial || hasPaidAccess || hasActiveSubscription,
  };
};
