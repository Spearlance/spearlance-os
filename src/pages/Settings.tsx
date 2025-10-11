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
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      setClient(selectedClient);
    }
  }, [selectedClient]);

  useEffect(() => {
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
              <CardTitle>Calendar Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.cal_connected ? "Connected" : "Not connected"}
                  </p>
                </div>
                <Button
                  variant={userProfile?.cal_connected ? "outline" : "default"}
                  onClick={() => toast({ title: "Calendar connection coming soon" })}
                >
                  {userProfile?.cal_connected ? "Disconnect" : "Connect Calendar"}
                </Button>
              </div>
              
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
