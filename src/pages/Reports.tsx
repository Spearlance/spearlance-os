import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Star, Sparkles, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ReportDrawer } from "@/components/reports/ReportDrawer";
import { CreateReportDialog } from "@/components/reports/CreateReportDialog";
import { GenerateReportDialog } from "@/components/reports/GenerateReportDialog";
import { AIReportViewer } from "@/components/reports/AIReportViewer";
import { ReportFilters } from "@/components/reports/ReportFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Report {
  id: string;
  client_id: string;
  name: string;
  oviond_url: string;
  date_range_start: string | null;
  date_range_end: string | null;
  tags: string[];
  summary: string | null;
  owner_user_id: string | null;
  status: 'Active' | 'Archived';
  pinned: boolean;
  created_at: string;
  updated_at: string;
  owner?: {
    name: string;
  };
}

interface FilterState {
  search: string;
  tags: string[];
  status: 'all' | 'Active' | 'Archived';
  dateRange: { from: Date | null; to: Date | null };
  owner: string | null;
  pinnedOnly: boolean;
}

interface AIReport {
  id: string;
  client_id: string;
  report_type: string;
  report_name: string;
  date_range_start: string;
  date_range_end: string;
  report_content: string;
  executive_summary: string | null;
  created_at: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  'performance_summary': 'Performance Summary',
  'channel_deep_dive': 'Channel Deep Dive',
  'website_analytics': 'Website Analytics',
  'seo_report': 'SEO Report',
};

const Reports = () => {
  const { selectedClient, loading: clientLoading } = useClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [aiReports, setAIReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedAIReport, setSelectedAIReport] = useState<AIReport | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiViewerOpen, setAIViewerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sendingWeeklyEmails, setSendingWeeklyEmails] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tags: [],
    status: 'Active',
    dateRange: { from: null, to: null },
    owner: null,
    pinnedOnly: false,
  });

  useEffect(() => {
    if (!selectedClient && !clientLoading) {
      navigate("/");
      return;
    }
    if (selectedClient) {
      loadUserRole();
      loadReports();
      loadAIReports();
    }
  }, [selectedClient, clientLoading, navigate]);

  // Check user role and restrict access for web_designer
  useEffect(() => {
    if ((userRole as string) === 'web_designer') {
      toast.error("Access Denied", { description: "Web designers don't have access to Reports" });
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    loadReports();
  }, [filters]);

  // Handle query parameter to auto-open report from email links
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (reportId && aiReports.length > 0) {
      const report = aiReports.find(r => r.id === reportId);
      if (report) {
        setSelectedAIReport(report);
        setAIViewerOpen(true);
        // Clear the query param for cleaner URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [aiReports, searchParams, setSearchParams]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const loadAIReports = async () => {
    if (!selectedClient) return;
    
    const { data, error } = await supabase
      .from("ai_generated_reports")
      .select("*")
      .eq("client_id", selectedClient.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAIReports(data);
    }
  };

  const loadReports = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("reports")
        .select(`*, owner:profiles!owner_user_id(name)`)
        .eq("client_id", selectedClient.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
      }
      if (filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.tags.length > 0) {
        query = query.contains("tags", filters.tags);
      }
      if (filters.owner) {
        query = query.eq("owner_user_id", filters.owner);
      }
      if (filters.pinnedOnly) {
        query = query.eq("pinned", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = (data || []) as Report[];
      if (filters.dateRange.from || filters.dateRange.to) {
        filteredData = filteredData.filter((report) => {
          if (!report.date_range_start || !report.date_range_end) return true;
          const reportStart = new Date(report.date_range_start);
          const reportEnd = new Date(report.date_range_end);
          const filterFrom = filters.dateRange.from;
          const filterTo = filters.dateRange.to;
          if (filterFrom && filterTo) return reportStart <= filterTo && reportEnd >= filterFrom;
          if (filterFrom) return reportEnd >= filterFrom;
          if (filterTo) return reportStart <= filterTo;
          return true;
        });
      }

      setReports(filteredData);
    } catch (error: any) {
      toast.error("Error loading reports", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (reportId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase.from("reports").update({ pinned: !currentPinned }).eq("id", reportId);
      if (error) throw error;
      toast.success(currentPinned ? "Report unpinned" : "Report pinned");
      loadReports();
    } catch (error: any) {
      toast.error("Error updating pin", { description: error.message });
    }
  };

  const handleTagClick = (tag: string) => {
    setFilters((prev) => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag] }));
  };

  const openDrawer = (report: Report) => { setSelectedReport(report); setDrawerOpen(true); };
  const openAIViewer = (report: AIReport) => { setSelectedAIReport(report); setAIViewerOpen(true); };

  const sendWeeklyEmails = async (testMode: boolean, clientId?: string) => {
    setSendingWeeklyEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-performance-emails', {
        body: { test_mode: testMode, client_id: clientId }
      });
      if (error) throw error;
      toast.success("Weekly emails sent!", { description: `${data.emails_sent} email(s) sent for ${data.clients_processed} client(s)` });
      loadAIReports();
    } catch (error: any) {
      toast.error("Error sending emails", { description: error.message });
    } finally {
      setSendingWeeklyEmails(false);
    }
  };

  const isAdminOrFMM = userRole === "admin" || userRole === "fmm";
  const truncateSummary = (text: string | null) => text ? (text.length > 180 ? text.substring(0, 180) + "..." : text) : "No summary";
  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "—";
    try { return `${format(new Date(start), "MMM d")} to ${format(new Date(end), "MMM d, yyyy")}`; } catch { return "—"; }
  };

  if (clientLoading || loading) {
    return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!selectedClient) {
    return <div className="flex items-center justify-center h-screen"><div className="text-center"><h2 className="text-2xl font-semibold mb-2">No Client Selected</h2><p className="text-muted-foreground">Please select a client to view reports</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          <div className="flex gap-2">
            <Button onClick={() => setGenerateDialogOpen(true)} variant="default">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Report
            </Button>
            {userRole === "admin" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={sendingWeeklyEmails}>
                    {sendingWeeklyEmails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send Weekly Emails
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => sendWeeklyEmails(true, selectedClient.id)}>
                    Test: This Client Only (to Garrett)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendWeeklyEmails(true)}>
                    Test: All Clients (to Garrett)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendWeeklyEmails(false)} className="text-primary">
                    Send to Team (All Clients)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAdminOrFMM && (
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Report
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Reports</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Generated ({aiReports.length})
            </TabsTrigger>
            <TabsTrigger value="manual">Manual ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ReportFilters filters={filters} onFiltersChange={setFilters} clientId={selectedClient.id} />
          </TabsContent>
          <TabsContent value="ai" className="mt-4" />
          <TabsContent value="manual" className="mt-4">
            <ReportFilters filters={filters} onFiltersChange={setFilters} clientId={selectedClient.id} />
          </TabsContent>
        </Tabs>

        {/* AI Reports Table */}
        {(activeTab === "all" || activeTab === "ai") && aiReports.length > 0 && (
          <div className="mb-8">
            {activeTab === "all" && <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Generated Reports</h2>}
            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiReports.map((report) => (
                    <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openAIViewer(report)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 text-xs"><Sparkles className="h-3 w-3" />AI</Badge>
                          {report.report_name}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{REPORT_TYPE_LABELS[report.report_type] || report.report_type}</Badge></TableCell>
                      <TableCell>{formatDateRange(report.date_range_start, report.date_range_end)}</TableCell>
                      <TableCell className="max-w-xs"><span className="text-muted-foreground">{truncateSummary(report.executive_summary)}</span></TableCell>
                      <TableCell>{format(new Date(report.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Manual Reports Table */}
        {(activeTab === "all" || activeTab === "manual") && (
          <>
            {activeTab === "all" && reports.length > 0 && <h2 className="text-lg font-semibold mb-3">Manual Reports</h2>}
            {reports.length === 0 ? (
              <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed">
                <p className="text-lg text-muted-foreground">{isAdminOrFMM ? "Add your first report" : "Your reports will appear here"}</p>
              </div>
            ) : (
              <div className="border rounded-lg bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="w-[80px]">Link</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => togglePin(report.id, report.pinned)} disabled={!isAdminOrFMM} className="hover:scale-110 transition-transform disabled:cursor-default">
                            <Star className={`h-4 w-4 ${report.pinned ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </button>
                        </TableCell>
                        <TableCell onClick={() => openDrawer(report)} className="font-medium">{report.name}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {report.tags.length > 0 ? report.tags.map((tag) => (<Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => handleTagClick(tag)}>{tag}</Badge>)) : <span className="text-muted-foreground text-sm">No tags</span>}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => openDrawer(report)} className="max-w-xs"><span className="text-muted-foreground">{truncateSummary(report.summary)}</span></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}><a href={report.oviond_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-4 w-4" /></a></TableCell>
                        <TableCell onClick={() => openDrawer(report)}>{formatDateRange(report.date_range_start, report.date_range_end)}</TableCell>
                        <TableCell onClick={() => openDrawer(report)}>{report.owner?.name || "Unassigned"}</TableCell>
                        <TableCell onClick={() => openDrawer(report)}><Badge variant={report.status === "Active" ? "default" : "secondary"}>{report.status}</Badge></TableCell>
                        <TableCell onClick={() => openDrawer(report)}>{format(new Date(report.updated_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      <CreateReportDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} clientId={selectedClient.id} onSuccess={(newReport) => { loadReports(); setSelectedReport(newReport); setDrawerOpen(true); }} />
      <GenerateReportDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen} clientId={selectedClient.id} onSuccess={(newReport) => { loadAIReports(); setSelectedAIReport(newReport); setAIViewerOpen(true); }} />
      <ReportDrawer report={selectedReport} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdate={loadReports} isAdminOrFMM={isAdminOrFMM} />
      <AIReportViewer report={selectedAIReport} open={aiViewerOpen} onOpenChange={setAIViewerOpen} onDelete={loadAIReports} />
    </div>
  );
};

export default Reports;
