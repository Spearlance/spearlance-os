import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Facebook, Instagram, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useClient } from "@/contexts/ClientContext";
import { ConnectSocialAccountDialog } from "./ConnectSocialAccountDialog";
import { LateSyncButton } from "./LateSyncButton";

export const SocialAccountsManager = () => {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Fetch Late profile
  const { data: lateProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['late-profile', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      
      const { data, error } = await supabase
        .from('late_profiles')
        .select('*')
        .eq('client_id', selectedClient.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClient?.id,
  });

  // Fetch connected accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['late-accounts', lateProfile?.id],
    queryFn: async () => {
      if (!lateProfile?.id) return [];

      const { data, error } = await supabase
        .from('late_social_accounts')
        .select('*')
        .eq('late_profile_id', lateProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lateProfile?.id,
  });

  // Create Late profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('late-create-profile', {
        body: { client_id: selectedClient?.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['late-profile'] });
      toast.success('Profile created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create profile');
    },
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-5 w-5" />;
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (isActive: boolean, tokenExpiresAt?: string) => {
    if (!isActive) {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
    if (tokenExpiresAt) {
      const expiresDate = new Date(tokenExpiresAt);
      const daysUntilExpiry = Math.floor((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 7) {
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Expires Soon</Badge>;
      }
    }
    return <Badge variant="default">Connected</Badge>;
  };

  const isLoading = profileLoading || accountsLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Media Connections</CardTitle>
              <CardDescription>
                Connect your Facebook and Instagram accounts to schedule posts
              </CardDescription>
            </div>
            {lateProfile && <LateSyncButton clientId={selectedClient?.id} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!lateProfile && !isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Before connecting social accounts, you need to create a profile for this client.
              </AlertDescription>
            </Alert>
          )}

          {!lateProfile && !isLoading && (
            <Button
              onClick={() => createProfileMutation.mutate()}
              disabled={createProfileMutation.isPending}
            >
              {createProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Profile
            </Button>
          )}

          {lateProfile && (
            <>
              {accounts && accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {account.profile_picture_url ? (
                            <Avatar>
                              <AvatarImage src={account.profile_picture_url} />
                              <AvatarFallback>{account.username?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              {getPlatformIcon(account.platform)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{account.display_name || account.username}</p>
                            <p className="text-sm text-muted-foreground capitalize">{account.platform}</p>
                          </div>
                        </div>
                        {getStatusBadge(account.is_active, account.token_expires_at || undefined)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !isLoading ? (
                <Alert>
                  <AlertDescription>
                    No social media accounts connected yet. Click the button below to get started.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button onClick={() => setShowConnectDialog(true)}>
                Connect Social Account
              </Button>
            </>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>

      {lateProfile && (
        <ConnectSocialAccountDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
          clientId={selectedClient?.id}
        />
      )}
    </div>
  );
};