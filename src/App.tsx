import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
          <Route
            path="/meetings"
            element={
              <MainLayout>
                <div className="p-6">Meetings page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/tasks"
            element={
              <MainLayout>
                <div className="p-6">Tasks page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/assets"
            element={
              <MainLayout>
                <div className="p-6">Assets page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/avatar"
            element={
              <MainLayout>
                <div className="p-6">Avatar page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/launchpad"
            element={
              <MainLayout>
                <div className="p-6">Launch Pad page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/support"
            element={
              <MainLayout>
                <div className="p-6">Support page coming soon...</div>
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout>
                <div className="p-6">Settings page coming soon...</div>
              </MainLayout>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
