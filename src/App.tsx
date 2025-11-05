import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CalProvider } from "@/components/CalProvider";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Meetings from "./pages/Meetings";
import MeetingDetail from "./pages/MeetingDetail";
import CommunicationLogs from "./pages/CommunicationLogs";
import CommunicationDetail from "./pages/CommunicationDetail";
import Tasks from "./pages/Tasks";
import Assets from "./pages/Assets";
import Marketing from "./pages/Marketing";
import MarketingProfile from "./pages/MarketingProfile";
import BrandGuide from "./pages/BrandGuide";
import MoodBoard from "./pages/MoodBoard";
import MarketingTools from "./pages/MarketingTools";
import Avatar from "./pages/Avatar";
import LaunchPad from "./pages/LaunchPad";
import MarketingFlowchart from "./pages/MarketingFlowchart";
import MarketingIdeas from "./pages/MarketingIdeas";
import Reports from "./pages/Reports";
import SocialMedia from "./pages/SocialMedia";
import Support from "./pages/Support";
import TicketDetail from "./pages/TicketDetail";
import SupportDocs from "./pages/SupportDocs";
import SupportDocsCategory from "./pages/SupportDocsCategory";
import SupportDocsArticle from "./pages/SupportDocsArticle";
import AdminSupportDocs from "./pages/AdminSupportDocs";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import Admin2FASetup from "./pages/Admin2FASetup";
import CalendarCallback from "./pages/CalendarCallback";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import BackfillImages from "./pages/BackfillImages";
import WebsiteFormSubmissions from "./pages/WebsiteFormSubmissions";
import Leads from "./pages/Leads";
import AdminBugReports from "./pages/AdminBugReports";
import MyBugReports from "./pages/MyBugReports";
import Analytics from "./pages/Analytics";
import SEO from "./pages/SEO";
import EmailTemplates from "./pages/admin/EmailTemplates";
import BlogWriter from "./pages/BlogWriter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FeatureFlagProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CalProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
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
          <Route path="/communications/logs" element={<MainLayout><CommunicationLogs /></MainLayout>} />
          <Route path="/communications/logs/:id" element={<MainLayout><CommunicationDetail /></MainLayout>} />
            <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
            <Route path="/brand/guide" element={<MainLayout><BrandGuide /></MainLayout>} />
            <Route path="/brand/moodboard" element={<MainLayout><MoodBoard /></MainLayout>} />
            <Route path="/brand/assets" element={<MainLayout><Assets /></MainLayout>} />
            <Route path="/assets" element={<MainLayout><Assets /></MainLayout>} />
            <Route path="/marketing/services" element={<MainLayout><Marketing /></MainLayout>} />
            <Route path="/marketing/profile" element={<MainLayout><MarketingProfile /></MainLayout>} />
            <Route path="/marketing/ideas" element={<MainLayout><MarketingIdeas /></MainLayout>} />
            <Route path="/marketing/tools" element={<MainLayout><MarketingTools /></MainLayout>} />
            <Route path="/avatar" element={<MainLayout><Avatar /></MainLayout>} />
            <Route path="/launchpad" element={<MainLayout><LaunchPad /></MainLayout>} />
            <Route path="/marketing/flow" element={<MainLayout><MarketingFlowchart /></MainLayout>} />
            <Route path="/marketing/reports" element={<MainLayout><Reports /></MainLayout>} />
            <Route path="/social-media" element={<MainLayout><SocialMedia /></MainLayout>} />
            <Route path="/support" element={<MainLayout><Support /></MainLayout>} />
            <Route path="/support/:id" element={<MainLayout><TicketDetail /></MainLayout>} />
            <Route path="/support/docs" element={<MainLayout><SupportDocs /></MainLayout>} />
            <Route path="/support/docs/:category" element={<MainLayout><SupportDocsCategory /></MainLayout>} />
            <Route path="/support/docs/:category/:slug" element={<MainLayout><SupportDocsArticle /></MainLayout>} />
            <Route path="/admin/support-docs" element={<MainLayout><AdminSupportDocs /></MainLayout>} />
            <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
            <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
            <Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
            <Route path="/admin/email-templates" element={<MainLayout><EmailTemplates /></MainLayout>} />
            <Route path="/admin/2fa-setup" element={<MainLayout><Admin2FASetup /></MainLayout>} />
            <Route path="/backfill-images" element={<MainLayout><BackfillImages /></MainLayout>} />
            <Route path="/website/form-submissions" element={<MainLayout><WebsiteFormSubmissions /></MainLayout>} />
            <Route path="/analytics" element={<MainLayout><Analytics /></MainLayout>} />
            <Route path="/seo" element={<MainLayout><SEO /></MainLayout>} />
            <Route path="/blog-writer" element={<MainLayout><BlogWriter /></MainLayout>} />
            <Route path="/leads" element={<MainLayout><Leads /></MainLayout>} />
            <Route path="/admin/bug-reports" element={<MainLayout><AdminBugReports /></MainLayout>} />
            <Route path="/bug-reports" element={<MainLayout><MyBugReports /></MainLayout>} />
            <Route path="/calendar/callback" element={<CalendarCallback />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
            </Routes>
          </CalProvider>
        </BrowserRouter>
      </FeatureFlagProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
