import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import Tasks from "./pages/Tasks";
import Assets from "./pages/Assets";
import Avatar from "./pages/Avatar";
import LaunchPad from "./pages/LaunchPad";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import CalendarCallback from "./pages/CalendarCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <MainLayout>
                <Dashboard />
              </MainLayout>
            }
          />
          <Route path="/meetings" element={<MainLayout><Meetings /></MainLayout>} />
          <Route path="/meetings/:id" element={<MainLayout><MeetingDetail /></MainLayout>} />
          <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
          <Route path="/assets" element={<MainLayout><Assets /></MainLayout>} />
          <Route path="/avatar" element={<MainLayout><Avatar /></MainLayout>} />
          <Route path="/launchpad" element={<MainLayout><LaunchPad /></MainLayout>} />
          <Route path="/support" element={<MainLayout><Support /></MainLayout>} />
          <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
          <Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
          <Route path="/calendar/callback" element={<CalendarCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
