import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { selectedClient } = useClient();
  const [client, setClient] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [platformInitialized, setPlatformInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      setClient(selectedClient);
    }
  }, [selectedClient]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    checkPlatformStatus();
  }, []);

  const checkPlatformStatus = async () => {
    const { data } = await supabase
      .from('cal_platform_tokens')
      .select('id')
      .eq('token_type', 'access_token')
      .maybeSingle();
    
    setPlatformInitialized(!!data);
  };

  useEffect(() => {
    // Check if returning from OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    const calendarConnected = urlParams.get('calendar_connected');
    
    if (calendarConnected === 'true') {
      // Verify connection status
      supabase.functions.invoke('cal-connect-calendar', {
        body: { action: 'verify' }
      }).then(({ data }) => {
        if (data?.connected) {
          toast({
            title: "Calendar Connected",
            description: "Your Google Calendar has been successfully connected!"
          });
          
          // Refresh profile
          fetchUserProfile();
        }
      });
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const handleSave = async () => {
    if (!client) return;

    setLoading(true);
    const { error } = await supabase
      .from("clients")
      .update({
        website_url: client.website_url,
        oviond_url: client.oviond_url,
        drive_folder_url: client.drive_folder_url,
        canva_folder_url: client.canva_folder_url,
        booking_permissions: client.booking_permissions,
      })
      .eq("id", client.id);

    // Also update profile calendar settings if they exist
    if (userProfile && (userProfile.cal_booking_enabled !== undefined || userProfile.cal_availability_view_only !== undefined)) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            cal_booking_enabled: userProfile.cal_booking_enabled,
            cal_availability_view_only: userProfile.cal_availability_view_only,
          })
          .eq("id", user.id);
      }
    }

    if (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      toast({ title: "Settings saved successfully" });
    }
    setLoading(false);
  };

  const handleConnectCalendar = async () => {
    setLoading(true);
    try {
      // First ensure FMM has a managed Cal.com account
      if (!userProfile?.cal_managed_user_id) {
        // Create managed user first
        const { data: createData, error: createError } = await supabase.functions.invoke(
          'cal-create-managed-user',
          { body: { user_id: userProfile?.id } }
        );
        
        if (createError) throw createError;
        
        // Refresh profile to get cal_managed_user_id
        await fetchUserProfile();
      }

      // Initiate calendar connection
      const { data, error } = await supabase.functions.invoke('cal-connect-calendar', {
        body: { action: 'connect' }
      });

      if (error) throw error;

      // Redirect to Cal.com OAuth flow
      if (data.oauthUrl) {
        toast({
          title: "Redirecting to Cal.com",
          description: "You'll be redirected to connect your Google Calendar"
        });
        
        // Store return URL in localStorage for callback
        localStorage.setItem('cal_oauth_return', window.location.href);
        
        // Redirect to Cal.com
        window.open(data.oauthUrl, '_blank');
      }
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not initiate calendar connection",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) {
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cal-connect-calendar', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast({
        title: "Calendar Disconnected",
        description: "Your Google Calendar has been disconnected"
      });

      // Refresh profile
      await fetchUserProfile();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializePlatform = async () => {
    try {
      // Cal.com Platform OAuth URL
      const clientId = import.meta.env.VITE_CAL_PLATFORM_CLIENT_ID;
      if (!clientId) {
        toast({
          title: "Configuration Error",
          description: "Cal.com Platform Client ID is not configured",
          variant: "destructive"
        });
        return;
      }

      const redirectUri = `${window.location.origin}/calendar/platform-callback`;
      const state = crypto.randomUUID();
      
      // Store state for CSRF validation
      localStorage.setItem('cal_platform_oauth_state', state);
      
      const oauthUrl = `https://app.cal.com/oauth/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;
      
      window.location.href = oauthUrl;
    } catch (error) {
      toast({
        title: "Failed to initialize platform",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const canEditClient = client && (userProfile?.role === 'admin' || userProfile?.role === 'fmm');
  const showCalendarTab = userProfile?.role === 'fmm' || userProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {!client ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please select a client from the sidebar to manage settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            {showCalendarTab && <TabsTrigger value="calendar">Calendar</TabsTrigger>}
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={client.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={client.status} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={client.website_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, website_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Oviond URL</Label>
                <Input
                  value={client.oviond_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, oviond_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Drive Folder URL</Label>
                <Input
                  value={client.drive_folder_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, drive_folder_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label>Canva Folder URL</Label>
                <Input
                  value={client.canva_folder_url || ""}
                  onChange={(e) =>
                    setClient({ ...client, canva_folder_url: e.target.value })
                  }
                  placeholder="https://"
                />
              </div>
              <Button onClick={handleSave} disabled={loading}>
                Save Bookmarks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {userProfile?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Cal.com Platform Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {platformInitialized ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-800 dark:text-green-200">Platform OAuth Initialized</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Initialize Cal.com platform access to enable calendar features for your team. This is a one-time setup required by an admin.
                    </p>
                    <Button onClick={handleInitializePlatform}>
                      Initialize Platform OAuth
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Calendar Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userProfile?.cal_connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-800 dark:text-green-200">Google Calendar Connected</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnectCalendar}
                    disabled={loading}
                  >
                    {loading ? "Disconnecting..." : "Disconnect Calendar"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Calendar to enable booking
                    </p>
                  </div>
                  <Button onClick={handleConnectCalendar} disabled={loading}>
                    {loading ? "Connecting..." : "Connect Calendar"}
                  </Button>
                </div>
              )}
              
              {userProfile?.cal_connected && (
                <>
                  <div className="space-y-2">
                    <Label>Booking Preferences</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="booking-enabled"
                          checked={userProfile?.cal_booking_enabled || false}
                          onChange={(e) =>
                            setUserProfile({ ...userProfile, cal_booking_enabled: e.target.checked })
                          }
                          className="rounded"
                        />
                        <Label htmlFor="booking-enabled" className="font-normal">
                          Allow clients to book appointments
                        </Label>
                      </div>
                      
                      {userProfile?.cal_booking_enabled && (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="can-book"
                              checked={!userProfile?.cal_availability_view_only}
                              onChange={() =>
                                setUserProfile({ ...userProfile, cal_availability_view_only: false })
                              }
                              name="booking-mode"
                            />
                            <Label htmlFor="can-book" className="font-normal">
                              Clients can book appointments
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="view-only"
                              checked={userProfile?.cal_availability_view_only || false}
                              onChange={() =>
                                setUserProfile({ ...userProfile, cal_availability_view_only: true })
                              }
                              name="booking-mode"
                            />
                            <Label htmlFor="view-only" className="font-normal">
                              Clients can only view schedule
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button onClick={handleSave} disabled={loading}>
                    Save Calendar Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Team management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
