import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientProvider } from "@/contexts/ClientContext";
import { MobileNoticeBanner } from "@/components/MobileNoticeBanner";
import { Session } from "@supabase/supabase-js";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { TrialStatusBanner } from "@/components/TrialStatusBanner";
import { PricingModal } from "@/components/billing/PricingModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SubscriptionLockoutBanner } from "@/components/billing/SubscriptionLockoutBanner";
import { useAccountType } from "@/hooks/useAccountType";
import { Lock, Bug } from "lucide-react";
import { ReportBugDialog } from "@/components/support/ReportBugDialog";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const { isAccessLocked, isInGracePeriod } = useAccountType();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = userFirstName || "there";
    
    if (hour >= 5 && hour < 12) {
      return `Good Morning, ${firstName} ☀️`;
    } else if (hour >= 12 && hour < 17) {
      return `Good Afternoon, ${firstName} ✨`;
    } else if (hour >= 17 && hour < 21) {
      return `Good Evening, ${firstName} 🌙`;
    } else {
      return `Working Late, ${firstName}? 🌟`;
    }
  };

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
      } else {
        // Fetch user profile to get first name
        supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.name) {
              const firstName = data.name.split(" ")[0];
              setUserFirstName(firstName);
            }
          });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


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
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-semibold">{getGreeting()}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsBugReportOpen(true)}
                className="relative"
              >
                <Bug className="h-5 w-5" />
              </Button>
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <MobileNoticeBanner />
            
            {/* Show lockout banner if access issues */}
            {(isAccessLocked || isInGracePeriod) && <SubscriptionLockoutBanner />}
            
            {/* Show trial banner only if no access issues */}
            {!isAccessLocked && !isInGracePeriod && (
              <TrialStatusBanner onUpgradeClick={() => setPricingModalOpen(true)} />
            )}
            
            {/* Block content if locked */}
            {isAccessLocked ? (
              <div className="text-center py-20">
                <Lock className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  Access to features is currently suspended.
                </p>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget />

      <PricingModal
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
      />

      <ReportBugDialog
        open={isBugReportOpen}
        onOpenChange={setIsBugReportOpen}
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
