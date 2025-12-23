import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import { InviteTeamMemberDialog } from "@/components/settings/InviteTeamMemberDialog";
import { TeamMembersList } from "@/components/settings/TeamMembersList";
import { ClientLogoUploader } from "@/components/settings/ClientLogoUploader";
import { BillingTab } from "@/components/settings/BillingTab";
import { UserProfileTab } from "@/components/settings/UserProfileTab";
import { AnalyticsSetupTab } from "@/components/settings/AnalyticsSetupTab";
import { ClaritySetupTab } from "@/components/settings/ClaritySetupTab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, Copy, Info, Globe, Loader2 } from "lucide-react";
import { SocialAccountsManager } from "@/components/social/SocialAccountsManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  const { selectedClient, refreshClients } = useClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [teamRefresh, setTeamRefresh] = useState(0);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [isClientSwitching, setIsClientSwitching] = useState(false);
  const { toast } = useToast();
  const { isCalReady, isLoading: isCalLoading } = useCalReady();
  const clientIdRef = useRef<string | null>(null);

  // Detect client switching
  useEffect(() => {
    if (selectedClient && selectedClient.id !== clientIdRef.current) {
      setIsClientSwitching(true);
      clientIdRef.current = selectedClient.id;
      
      // Give React time to re-render with new client before allowing operations
      const timer = setTimeout(() => {
        setIsClientSwitching(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedClient]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, role, avatar_url, job_title, department, bio, expertise_level, preferred_communication_style, focus_areas")
        .eq("id", user.id)
        .single();
      setUserProfile(profile);
      setUserRole(profile?.role || "");

      // Check if user is a primary contact for the selected client
      if (selectedClient) {
        const { data: primaryContact } = await supabase
          .from("client_primary_contacts")
          .select("id")
          .eq("client_id", selectedClient.id)
          .eq("user_id", user.id)
          .single();
        
        setIsPrimaryContact(!!primaryContact);
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [selectedClient, profileRefresh]);

  const handleSave = async () => {
    if (!userProfile) return;

    setLoading(true);
    
    // Update profile calendar settings
    if (userProfile.cal_booking_enabled !== undefined || userProfile.cal_availability_view_only !== undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            cal_booking_enabled: userProfile.cal_booking_enabled,
            cal_availability_view_only: userProfile.cal_availability_view_only,
          })
          .eq("id", user.id);
        
        if (error) {
          toast({ title: "Error saving settings", variant: "destructive" });
        } else {
          toast({ title: "Settings saved successfully" });
          await refreshClients();
        }
      }
    }
    
    setLoading(false);
  };

  const canEditClient = selectedClient && (userProfile?.role === 'admin' || userProfile?.role === 'fmm');
  const showCalendarTab = userProfile?.role === 'fmm' || userProfile?.role === 'admin';
  const canManageTeam = userProfile?.role === 'admin' || userProfile?.role === 'fmm' || isPrimaryContact;
  const canViewBilling = userProfile?.role === 'admin' || (userProfile?.role === 'client' && isPrimaryContact);
  const showAnalyticsTab = (userProfile?.role === 'admin' || userProfile?.role === 'fmm') && selectedClient?.website_unlocked;

  return (
    <div className="space-y-6">
      {isClientSwitching && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Switching client...</span>
          </div>
        </div>
      )}
      
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {!selectedClient && !userProfile ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Loading...
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {selectedClient && <TabsTrigger value="general">General</TabsTrigger>}
            {selectedClient && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
            {selectedClient && showCalendarTab && <TabsTrigger value="calendar">Calendar</TabsTrigger>}
            {selectedClient && <TabsTrigger value="team">Team</TabsTrigger>}
            {selectedClient && canViewBilling && <TabsTrigger value="billing">Billing</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            {userProfile && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <UserProfileTab
                      profile={userProfile}
                      onProfileUpdated={() => setProfileRefresh(prev => prev + 1)}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Business Timezone
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      This timezone is used for scheduling social media posts and other time-based activities
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={selectedClient?.timezone || 'America/New_York'}
                        onValueChange={async (value) => {
                          if (selectedClient) {
                            const { error } = await supabase
                              .from("clients")
                              .update({ timezone: value })
                              .eq("id", selectedClient.id);
                            
                            if (error) {
                              toast({ title: "Error updating timezone", variant: "destructive" });
                            } else {
                              toast({ title: "Timezone updated successfully" });
                              refreshClients();
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
          {selectedClient && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Company Logo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClientLogoUploader
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    currentLogoUrl={selectedClient.logo_url}
                    onLogoUpdated={(newUrl) => {
                      refreshClients();
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={selectedClient.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input value={selectedClient.status} disabled />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <SocialAccountsManager />

          {showAnalyticsTab && selectedClient && (
            <AnalyticsSetupTab client={selectedClient} />
          )}

          {(userProfile?.role === 'admin' || userProfile?.role === 'fmm') && selectedClient && (
            <ClaritySetupTab client={selectedClient} />
          )}
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
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Connect Google Calendar</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click below to sync your Google Calendar. This allows you to create, view, and edit events directly from the platform.
                    </p>
                    <Connect.GoogleCalendar 
                      className="w-full"
                      onSuccess={() => {
                        toast({
                          title: "Calendar Connected",
                          description: "Your Google Calendar has been connected successfully!"
                        });
                      }}
                      onCheckError={(error) => {
                        console.error("Calendar connection error:", error);
                        toast({
                          title: "Connection Error",
                          description: "Failed to connect calendar. Please try again.",
                          variant: "destructive"
                        });
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

          {(userProfile?.role === 'fmm' || userProfile?.role === 'admin') && (
            <Card>
              <CardHeader>
                <CardTitle>iCal Calendar Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Subscribe to your meetings calendar in any calendar app (Apple Calendar, Google Calendar, Outlook).
                </p>
                {userProfile?.ical_feed_token ? (
                  <div className="space-y-3">
                    <div>
                      <Label>Calendar Subscription URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          readOnly
                          value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-ical?token=${userProfile.ical_feed_token}`}
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-ical?token=${userProfile.ical_feed_token}`
                            );
                            toast({ title: "Copied to clipboard" });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <Alert className="bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                      <AlertDescription className="text-amber-900 dark:text-amber-100">
                        <strong>Note:</strong> Calendar apps typically refresh subscriptions every 12-24 hours. 
                        Newly logged meetings may not appear immediately in your external calendar.
                      </AlertDescription>
                    </Alert>

                    {selectedClient && (userProfile?.role === 'admin' || userProfile?.role === 'fmm') && (
                      <div className="space-y-2 pt-4">
                        <Label className="text-base font-semibold">Front Integration</Label>
                        <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                          <div>
                            <Label className="text-sm text-muted-foreground">Front Tag</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                                {(selectedClient as any).front_tag}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText((selectedClient as any).front_tag);
                                  toast({ title: "Front tag copied to clipboard" });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle>How to use</AlertTitle>
                            <AlertDescription className="text-sm space-y-1">
                              <p>Tag any conversation in Front with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{(selectedClient as any).front_tag}</code> to automatically log it in Communications → Logs.</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Make sure your Front webhook is configured to send to:<br />
                                <code className="text-xs break-all">https://hrmhqybdsdngsvhjqwma.supabase.co/functions/v1/front-webhook-handler</code>
                              </p>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">How to use:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Apple Calendar: File → New Calendar Subscription → Paste URL</li>
                        <li>Google Calendar: Settings → Add calendar → From URL → Paste URL</li>
                        <li>Outlook: Add calendar → Subscribe from web → Paste URL</li>
                      </ul>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase
                            .from("profiles")
                            .update({ ical_feed_token: null })
                            .eq("id", user.id);
                          await fetchUserProfile();
                          toast({ title: "Calendar subscription revoked" });
                        }
                      }}
                    >
                      Revoke Access
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const token = crypto.randomUUID();
                        await supabase
                          .from("profiles")
                          .update({ ical_feed_token: token })
                          .eq("id", user.id);
                        await fetchUserProfile();
                        toast({ title: "Calendar subscription URL generated" });
                      }
                    }}
                  >
                    Generate iCal Feed
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {selectedClient && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <InviteTeamMemberDialog 
                  clientId={selectedClient.id}
                  canManageTeam={canManageTeam}
                  onInviteSuccess={() => setTeamRefresh(prev => prev + 1)}
                />
              </CardHeader>
              <CardContent>
                <TeamMembersList 
                  clientId={selectedClient.id}
                  canManageTeam={canManageTeam}
                  refreshTrigger={teamRefresh}
                  userProfile={userProfile}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            {selectedClient && canViewBilling && (
              <BillingTab client={selectedClient} isAdmin={userRole === 'admin'} onUpdate={refreshClients} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
