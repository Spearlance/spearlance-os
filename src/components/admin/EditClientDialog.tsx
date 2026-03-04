import { useState, useEffect } from "react";
import { PRICING } from "@/lib/pricing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, Globe, Calendar, Clock, Copy, CreditCard } from "lucide-react";
import { ClientLogoUpload } from "./ClientLogoUpload";
import { AssetShareSettings } from "./AssetShareSettings";
import { format } from "date-fns";

const clientEditSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(255),
  status: z.enum(['active', 'archived', 'paused']),
  billing_method: z.enum(['stripe', 'direct', 'free']),
  subscription_status: z.string().optional(),
  stripe_customer_id: z.string().optional(),
  stripe_subscription_id: z.string().optional(),
  logo_url: z.string().optional(),
  site_id: z.string().optional(),
  website_unlocked: z.boolean().optional(),
});

type ClientEditForm = z.infer<typeof clientEditSchema>;

interface EditClientDialogProps {
  client: {
    id: string;
    name: string;
    status: 'active' | 'archived' | 'paused';
    billing_method?: 'stripe' | 'direct' | 'free';
    subscription_status?: string;
    logo_url?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    plan_name?: string;
    trial_end_date?: string;
    created_at?: string;
    updated_at?: string;
    site_id?: string;
    website_unlocked?: boolean;
    account_type?: string;
    asset_share_enabled?: boolean;
    asset_share_token?: string | null;
    asset_share_expires_at?: string | null;
  };
  assignedUsers: Array<{ id: string; name: string }>;
  onClientUpdated: () => void;
}

export function EditClientDialog({ client, assignedUsers, onClientUpdated }: EditClientDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    assignedUsers.map(u => u.id)
  );
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [fetchingPlanName, setFetchingPlanName] = useState(false);
  const [localPlanName, setLocalPlanName] = useState<string | null>(client.plan_name || null);

  const form = useForm<ClientEditForm>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      name: client.name || "",
      status: client.status || "active",
      billing_method: client.billing_method || "stripe",
      subscription_status: client.subscription_status || "",
      stripe_customer_id: client.stripe_customer_id || "",
      stripe_subscription_id: client.stripe_subscription_id || "",
      logo_url: client.logo_url || "",
      site_id: client.site_id || "",
      website_unlocked: client.website_unlocked || false,
    },
  });

  useEffect(() => {
    if (open) {
      loadAvailableUsers();
    }
  }, [open]);

  const loadAvailableUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in("role", ["admin", "fmm"])
      .order("name");
    
    setAllUsers(data || []);
    setSelectedUserIds(assignedUsers.map(u => u.id));
  };

  const validateStripeIds = (customerId: string, subscriptionId: string) => {
    const errors: string[] = [];
    if (customerId && !customerId.startsWith('cus_')) {
      errors.push('Customer ID must start with "cus_"');
    }
    if (subscriptionId && !subscriptionId.startsWith('sub_')) {
      errors.push('Subscription ID must start with "sub_"');
    }
    return errors;
  };

  const fetchStripePlanName = async (subscriptionId: string) => {
    if (!subscriptionId) return null;
    
    setFetchingPlanName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('get-stripe-subscription-name', {
        body: { 
          subscription_id: subscriptionId,
          client_id: client.id
        }
      });

      if (error) throw error;

      if (data?.success && data?.plan_name) {
        setLocalPlanName(data.plan_name);
        return data.plan_name;
      }
    } catch (error: any) {
      // silent — plan name fetch is non-critical
    } finally {
      setFetchingPlanName(false);
    }
    return null;
  };

  const onSubmit = async (data: ClientEditForm) => {
    setIsLoading(true);
    try {
      // Validate Stripe IDs if provided
      if (data.stripe_customer_id || data.stripe_subscription_id) {
        const validationErrors = validateStripeIds(
          data.stripe_customer_id || '',
          data.stripe_subscription_id || ''
        );
        if (validationErrors.length > 0) {
          toast({
            title: "Invalid Stripe IDs",
            description: validationErrors.join('. '),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const updateData: any = {
        name: data.name,
        status: data.status,
        billing_method: data.billing_method,
        stripe_customer_id: data.stripe_customer_id || null,
        stripe_subscription_id: data.stripe_subscription_id || null,
        logo_url: data.logo_url || null,
        site_id: data.site_id || null,
        website_unlocked: data.website_unlocked || false,
      };

      // For direct/free billing, set subscription_status to active
      if (data.billing_method === 'direct' || data.billing_method === 'free') {
        updateData.subscription_status = 'active';
      } else if (data.subscription_status) {
        updateData.subscription_status = data.subscription_status;
      }

      const { error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", client.id);

      if (error) throw error;

      // Handle user assignments
      const currentUserIds = assignedUsers.map(u => u.id).sort();
      const newUserIds = [...selectedUserIds].sort();
      
      if (JSON.stringify(currentUserIds) !== JSON.stringify(newUserIds)) {
        const usersToAdd = selectedUserIds.filter(id => !assignedUsers.find(u => u.id === id));
        const usersToRemove = assignedUsers.filter(u => !selectedUserIds.includes(u.id)).map(u => u.id);
        
        // Add client to users' associated_client_ids
        for (const userId of usersToAdd) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("associated_client_ids")
            .eq("id", userId)
            .single();
          
          const currentClientIds = profile?.associated_client_ids || [];
          if (!currentClientIds.includes(client.id)) {
            await supabase
              .from("profiles")
              .update({ 
                associated_client_ids: [...currentClientIds, client.id] 
              })
              .eq("id", userId);
          }
        }
        
        // Remove client from users' associated_client_ids
        for (const userId of usersToRemove) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("associated_client_ids")
            .eq("id", userId)
            .single();
          
          const currentClientIds = profile?.associated_client_ids || [];
          await supabase
            .from("profiles")
            .update({ 
              associated_client_ids: currentClientIds.filter(id => id !== client.id)
            })
            .eq("id", userId);
        }
      }

      // Fetch plan name if subscription ID was provided
      if (data.stripe_subscription_id && data.stripe_subscription_id !== client.stripe_subscription_id) {
        await fetchStripePlanName(data.stripe_subscription_id);
      }

      toast({
        title: "Client updated successfully",
        description: `${data.name} has been updated.`,
      });

      setOpen(false);
      onClientUpdated();
    } catch (error) {
      toast({
        title: "Error updating client",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Client Information
          </DialogTitle>
          <DialogDescription>
            Update client details and configuration
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Logo Upload Section */}
            <ClientLogoUpload
              clientId={client.id}
              clientName={client.name}
              currentLogoUrl={client.logo_url}
              onLogoChange={(logoUrl) => form.setValue("logo_url", logoUrl || "")}
              onLogoSaved={onClientUpdated}
            />

            {(client as any).front_tag && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                <div className="text-sm font-medium">Front Integration</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {(client as any).front_tag}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText((client as any).front_tag);
                      toast({ title: "Front tag copied" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tag conversations in Front to auto-log communications.
                </p>
              </div>
            )}

            <Separator />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Method *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stripe">🔵 Stripe Subscription</SelectItem>
                      <SelectItem value="direct">💰 Direct Payment</SelectItem>
                      <SelectItem value="free">🎁 Free Access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How this client pays for services
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stripe Customer Linking Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Link Existing Stripe Customer
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  For existing Stripe customers: enter their IDs to link the account
                </p>
              </div>

              <FormField
                control={form.control}
                name="stripe_customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe Customer ID</FormLabel>
                    <FormControl>
                      <Input placeholder="cus_xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Must start with "cus_"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stripe_subscription_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stripe Subscription ID</FormLabel>
                    <FormControl>
                      <Input placeholder="sub_xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Must start with "sub_"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fetchingPlanName && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fetching plan details from Stripe...
                </div>
              )}

              {localPlanName && (
                <div className="space-y-1 p-2 border rounded-md bg-background">
                  <div className="text-xs font-medium text-muted-foreground">Detected Plan</div>
                  <div className="text-sm font-semibold">{localPlanName}</div>
                </div>
              )}

              {/* Show existing Stripe info if available */}
              {form.watch("billing_method") === "stripe" && client.subscription_status && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                  <div className="text-sm font-medium">Current Stripe Status</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={client.subscription_status === 'active' ? 'default' : 'secondary'}>
                        {client.subscription_status}
                      </Badge>
                    </div>
                    {client.trial_end_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Trial Ends:</span>
                        <span>{format(new Date(client.trial_end_date), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Website Management Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website Management
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Control access to the MyWebsiteManager editor
                </p>
              </div>

              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter MyWebsiteManager site ID" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      The unique site identifier from MyWebsiteManager
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website_unlocked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Website Access</FormLabel>
                      <FormDescription className="text-xs">
                        Allow client to access the website editor
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                <div className="text-xs font-medium text-muted-foreground">Unlock Requirements</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-foreground">Starter Plan:</span>
                    <span>{PRICING.format(PRICING.WEBSITE_ADDON)} one-time payment required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-foreground">Unlimited Plan:</span>
                    <span>Included free, unlock when site is ready</span>
                  </div>
                </div>
                {client.account_type && (
                  <Badge variant="outline" className="mt-2">
                    Current: {client.account_type}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Asset Sharing Portal Section */}
            <AssetShareSettings
              clientId={client.id}
              assetShareEnabled={client.asset_share_enabled || false}
              assetShareToken={client.asset_share_token || null}
              assetShareExpiresAt={client.asset_share_expires_at || null}
              onUpdate={onClientUpdated}
            />

            <Separator />

            <div className="space-y-2">
              <FormLabel>Assigned Users (Admins & FMMs)</FormLabel>
              <FormDescription className="text-xs">
                Select which admins and FMMs have access to this client
              </FormDescription>
              
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {allUsers.length > 0 ? (
                    allUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`user-${user.id}`} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                        >
                          {user.name}
                          <Badge variant="secondary" className="text-xs">
                            {user.role.toUpperCase()}
                          </Badge>
                        </label>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No admins or FMMs available
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} assigned
                </div>
              </div>
            </div>

            <Separator />

            {/* Metadata Section */}
            {(client.created_at || client.updated_at) && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                <div className="text-sm font-medium text-muted-foreground">Metadata</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {client.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div>{format(new Date(client.created_at), 'PPp')}</div>
                      </div>
                    </div>
                  )}
                  {client.updated_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Last Modified</div>
                        <div>{format(new Date(client.updated_at), 'PPp')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
