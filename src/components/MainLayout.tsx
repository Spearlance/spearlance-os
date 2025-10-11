import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientProvider, useClient } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckSquare, Upload, HelpCircle } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { BookMeetingDialog } from "@/components/meetings/BookMeetingDialog";
import { ViewScheduleDialog } from "@/components/meetings/ViewScheduleDialog";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CreateAssetDialog } from "@/components/assets/CreateAssetDialog";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedClient } = useClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [fmmProfile, setFmmProfile] = useState<any>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [viewScheduleDialogOpen, setViewScheduleDialogOpen] = useState(false);
  const [createMeetingDialogOpen, setCreateMeetingDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [createAssetDialogOpen, setCreateAssetDialogOpen] = useState(false);
  const [createTicketDialogOpen, setCreateTicketDialogOpen] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch user profile and FMM details
  useEffect(() => {
    if (!session?.user) return;

    const fetchProfiles = async () => {
      try {
        // Get current user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        setUserProfile(profile);

        // If user is a client, fetch their FMM's profile
        if (profile?.role === "client" && selectedClient) {
          const { data: fmm } = await supabase
            .from("profiles")
            .select("*")
            .contains("associated_client_ids", [selectedClient.id])
            .eq("role", "fmm")
            .maybeSingle();

          setFmmProfile(fmm);
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    fetchProfiles();
  }, [session, selectedClient]);

  const getMeetingButtonConfig = () => {
    // Admins and FMMs always see "New Meeting" (manual creation)
    if (userProfile?.role === "admin" || userProfile?.role === "fmm") {
      return { show: true, label: "New Meeting", action: "manual" };
    }

    // Client users - check FMM's calendar settings
    if (userProfile?.role === "client" && fmmProfile) {
      // Check if FMM has calendar connected
      if (!fmmProfile.cal_connected) {
        return { show: false, label: "", action: "none" };
      }

      // Check booking permissions
      if (fmmProfile.cal_booking_enabled) {
        if (fmmProfile.cal_availability_view_only) {
          return { show: true, label: "View Schedule", action: "view" };
        } else {
          return { show: true, label: "Book Meeting", action: "book" };
        }
      }
    }

    return { show: false, label: "", action: "none" };
  };

  const meetingButton = getMeetingButtonConfig();

  const handleMeetingButtonClick = () => {
    if (meetingButton.action === "book") {
      setBookingDialogOpen(true);
    } else if (meetingButton.action === "view") {
      setViewScheduleDialogOpen(true);
    } else if (meetingButton.action === "manual") {
      setCreateMeetingDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Spearlance Marketing OS</h1>
            </div>
            <div className="flex items-center gap-2">
              {meetingButton.show && (
                <Button variant="ghost" size="sm" onClick={handleMeetingButtonClick}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {meetingButton.label}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setCreateTaskDialogOpen(true)}>
                <CheckSquare className="h-4 w-4 mr-2" />
                New Task
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCreateAssetDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Asset
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCreateTicketDialogOpen(true)}>
                <HelpCircle className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Booking Dialogs */}
      <BookMeetingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        fmmUsername={fmmProfile?.cal_username}
        fmmEventTypeId={fmmProfile?.cal_event_type_id}
      />
      <ViewScheduleDialog
        open={viewScheduleDialogOpen}
        onOpenChange={setViewScheduleDialogOpen}
        fmmUsername={fmmProfile?.cal_username}
        fmmEventTypeId={fmmProfile?.cal_event_type_id}
      />

      {/* Creation Dialogs */}
      <CreateMeetingDialog
        open={createMeetingDialogOpen}
        onOpenChange={setCreateMeetingDialogOpen}
      />
      <CreateTaskDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
      />
      <CreateAssetDialog
        open={createAssetDialogOpen}
        onOpenChange={setCreateAssetDialogOpen}
      />
      <CreateTicketDialog
        open={createTicketDialogOpen}
        onOpenChange={setCreateTicketDialogOpen}
      />
    </SidebarProvider>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <ClientProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </ClientProvider>
  );
}
