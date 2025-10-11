import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientProvider } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckSquare, Upload, HelpCircle } from "lucide-react";
import { Session } from "@supabase/supabase-js";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    <ClientProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold">Spearlance Marketing OS</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  New Meeting
                </Button>
                <Button variant="ghost" size="sm">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  New Task
                </Button>
                <Button variant="ghost" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Asset
                </Button>
                <Button variant="ghost" size="sm">
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
      </SidebarProvider>
    </ClientProvider>
  );
}
