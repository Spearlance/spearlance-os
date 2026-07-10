import { lazy, Suspense } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CalProvider } from "@/components/CalProvider";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";
import { MainLayout } from "@/components/MainLayout";
import { RouteLoadingFallback } from "@/components/RouteLoadingFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicAssets = lazy(() => import("./pages/PublicAssets"));
const Meetings = lazy(() => import("./pages/Meetings"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const CommunicationLogs = lazy(() => import("./pages/CommunicationLogs"));
const CommunicationDetail = lazy(() => import("./pages/CommunicationDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const Assets = lazy(() => import("./pages/Assets"));
const Marketing = lazy(() => import("./pages/Marketing"));
const MarketingProfile = lazy(() => import("./pages/MarketingProfile"));
const BrandGuide = lazy(() => import("./pages/BrandGuide"));
const MoodBoard = lazy(() => import("./pages/MoodBoard"));
const MarketingTools = lazy(() => import("./pages/MarketingTools"));
const Avatar = lazy(() => import("./pages/Avatar"));
const LaunchPad = lazy(() => import("./pages/LaunchPad"));
const MarketingFlowchart = lazy(() => import("./pages/MarketingFlowchart"));
const MarketingIdeas = lazy(() => import("./pages/MarketingIdeas"));
const Reports = lazy(() => import("./pages/Reports"));
const SocialMedia = lazy(() => import("./pages/SocialMedia"));
const Support = lazy(() => import("./pages/Support"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const SupportDocs = lazy(() => import("./pages/SupportDocs"));
const SupportDocsCategory = lazy(() => import("./pages/SupportDocsCategory"));
const SupportDocsArticle = lazy(() => import("./pages/SupportDocsArticle"));
const AdminSupportDocs = lazy(() => import("./pages/AdminSupportDocs"));
const SopLibrary = lazy(() => import("./pages/SopLibrary"));
const SopCategory = lazy(() => import("./pages/SopCategory"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Admin2FASetup = lazy(() => import("./pages/Admin2FASetup"));
const CalendarCallback = lazy(() => import("./pages/CalendarCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const WebsiteFormSubmissions = lazy(() => import("./pages/WebsiteFormSubmissions"));
const SiteComments = lazy(() => import("./pages/SiteComments"));
const SiteCommentDetail = lazy(() => import("./pages/SiteCommentDetail"));
const Leads = lazy(() => import("./pages/Leads"));
const AdminBugReports = lazy(() => import("./pages/AdminBugReports"));
const MyBugReports = lazy(() => import("./pages/MyBugReports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SEO = lazy(() => import("./pages/SEO"));
const EmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const PromptTemplates = lazy(() => import("./pages/admin/PromptTemplates"));
const DesignerWorkload = lazy(() => import("./pages/admin/DesignerWorkload"));
const UserActivity = lazy(() => import("./pages/admin/UserActivity"));
const ExportData = lazy(() => import("./pages/admin/ExportData"));
const BlogWriter = lazy(() => import("./pages/BlogWriter"));
const ClientSuccessHub = lazy(() => import("./pages/ClientSuccessHub"));
const WebsiteBuilds = lazy(() => import("./pages/WebsiteBuilds"));
const WebsiteBuildDetail = lazy(() => import("./pages/WebsiteBuildDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <FeatureFlagProvider>
          <SaveStatusProvider>
            <BrowserRouter>
              <CalProvider>
                <ErrorBoundary>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Routes>
                      <Route path="/assets/share/:token" element={<PublicAssets />} />
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
                      <Route path="/my-tasks" element={<MainLayout><MyTasks /></MainLayout>} />
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
                      <Route path="/sop" element={<MainLayout><SopLibrary /></MainLayout>} />
                      <Route path="/sop/:category" element={<MainLayout><SopCategory /></MainLayout>} />
                      <Route path="/sop/:category/:slug" element={<MainLayout><SupportDocsArticle /></MainLayout>} />
                      <Route path="/admin/support-docs" element={<MainLayout><AdminSupportDocs /></MainLayout>} />
                      <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                      <Route path="/notifications" element={<MainLayout><Notifications /></MainLayout>} />
                      <Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
                      <Route path="/admin/email-templates" element={<MainLayout><EmailTemplates /></MainLayout>} />
                      <Route path="/admin/prompt-templates" element={<MainLayout><PromptTemplates /></MainLayout>} />
                      <Route path="/admin/designer-workload" element={<MainLayout><DesignerWorkload /></MainLayout>} />
                      <Route path="/admin/2fa-setup" element={<MainLayout><Admin2FASetup /></MainLayout>} />
                      <Route path="/admin/user-activity" element={<MainLayout><UserActivity /></MainLayout>} />
                      <Route path="/admin/export-data" element={<MainLayout><ExportData /></MainLayout>} />
                      <Route path="/website/form-submissions" element={<MainLayout><WebsiteFormSubmissions /></MainLayout>} />
                      <Route path="/website/comments" element={<MainLayout><SiteComments /></MainLayout>} />
                      <Route path="/website/comments/:id" element={<MainLayout><SiteCommentDetail /></MainLayout>} />
                      <Route path="/analytics" element={<MainLayout><Analytics /></MainLayout>} />
                      <Route path="/seo" element={<MainLayout><SEO /></MainLayout>} />
                      <Route path="/blog-writer" element={<MainLayout><BlogWriter /></MainLayout>} />
                      <Route path="/leads" element={<MainLayout><Leads /></MainLayout>} />
                      <Route path="/admin/bug-reports" element={<MainLayout><AdminBugReports /></MainLayout>} />
                      <Route path="/bug-reports" element={<MainLayout><MyBugReports /></MainLayout>} />
                      <Route path="/success-hub" element={<MainLayout><ClientSuccessHub /></MainLayout>} />
                      <Route path="/website/builds" element={<MainLayout><WebsiteBuilds /></MainLayout>} />
                      <Route path="/website/builds/:id" element={<MainLayout><WebsiteBuildDetail /></MainLayout>} />
                      <Route path="/calendar/callback" element={<CalendarCallback />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </CalProvider>
            </BrowserRouter>
          </SaveStatusProvider>
        </FeatureFlagProvider>
      </TooltipProvider>
    </HelmetProvider>
    <SonnerToaster richColors position="top-right" duration={3000} />
  </QueryClientProvider>
);

export default App;
