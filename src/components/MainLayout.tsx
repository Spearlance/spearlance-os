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

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

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
              <h1 className="text-lg font-semibold">SpearlanceOS</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <MobileNoticeBanner />
            <TrialStatusBanner onUpgradeClick={() => setPricingModalOpen(true)} />
            {children}
          </main>
        </div>
      </div>

      {/* AI Chatbot Widget */}
      <ChatbotWidget />

      <PricingModal
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
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
