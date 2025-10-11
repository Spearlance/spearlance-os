import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Connect } from "@calcom/atoms";
import { AvailabilitySettings } from "@calcom/atoms";
import { useCalReady } from "@/components/CalProvider";

export default function Settings() {
  const { selectedClient } = useClient();
  const [client, setClient] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isCalReady, isLoading: isCalLoading } = useCalReady();
  const [hasManagedAccount, setHasManagedAccount] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

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
  }, []);

  useEffect(() => {
    if (userProfile?.cal_managed_user_id) {
      setHasManagedAccount(true);
    } else {
      setHasManagedAccount(false);
    }
  }, [userProfile]);

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

  const handleCreateManagedAccount = async () => {
    setIsCreatingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }
      
      const { data, error } = await supabase.functions.invoke('cal-create-managed-user', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Calendar Account Setup Complete",
          description: "Your Cal.com account is now connected. You can proceed with Google Calendar integration."
        });
        
        // Refresh profile to get updated Cal.com data
        await fetchUserProfile();
        setHasManagedAccount(true);
      } else {
        throw new Error(data.error || "Failed to setup calendar account");
      }
    } catch (error: any) {
      console.error("Setup error:", error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup calendar account",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAccount(false);
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
          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isCalLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading calendar integration...</p>
                </div>
              ) : !import.meta.env.VITE_CAL_OAUTH_CLIENT_ID ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-4">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-foreground">Calendar Integration Not Configured</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Cal.com credentials need to be configured to enable calendar integration.
                  </p>
                </div>
              ) : !hasManagedAccount ? (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-foreground">Setup Calendar Integration</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Initialize your Cal.com account to enable calendar booking features and connect your Google Calendar.
                  </p>
                  <Button 
                    onClick={handleCreateManagedAccount}
                    disabled={isCreatingAccount}
                    size="lg"
                  >
                    {isCreatingAccount ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting up...
                      </>
                    ) : (
                      "Setup Calendar Account"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Connect Google Calendar</h3>
                    <Connect.GoogleCalendar 
                      className="w-full"
                      onSuccess={async () => {
                        toast({
                          title: "Calendar Connected",
                          description: "Your Google Calendar has been connected successfully!"
                        });
                        
                        // Update cal_connected status
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase
                            .from("profiles")
                            .update({ cal_connected: true })
                            .eq("id", user.id);
                        }
                        
                        fetchUserProfile();
                      }}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">Availability Settings</h3>
                    <AvailabilitySettings 
                      onUpdateSuccess={() => {
                        toast({
                          title: "Availability Updated",
                          description: "Your availability has been saved"
                        });
                      }}
                      onUpdateError={() => {
                        toast({
                          title: "Update Failed",
                          description: "Failed to update availability",
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                </div>
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
