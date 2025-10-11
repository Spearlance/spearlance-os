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

export default function Settings() {
  const { selectedClient } = useClient();
  const [client, setClient] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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
  }, []);

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

  const handleCreateManagedUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'cal-create-managed-user',
        { body: { user_id: userProfile?.id } }
      );
      
      if (error) throw error;
      
      toast({
        title: "Cal.com Account Created",
        description: "Your managed Cal.com account has been set up successfully!"
      });
      
      // Refresh profile to get tokens
      await fetchUserProfile();
    } catch (error) {
      console.error('Create managed user error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Could not create managed user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
              {!userProfile?.cal_managed_user_id ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    To use calendar features, you need to set up your Cal.com account first.
                  </p>
                  <Button onClick={handleCreateManagedUser} disabled={loading}>
                    {loading ? "Setting up..." : "Set Up Cal.com Account"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Connect Google Calendar</h3>
                    <Connect.GoogleCalendar 
                      className="w-full"
                      onSuccess={() => {
                        toast({
                          title: "Calendar Connected",
                          description: "Your Google Calendar has been connected successfully!"
                        });
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
