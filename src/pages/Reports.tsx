import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportDrawer } from "@/components/reports/ReportDrawer";
import { CreateReportDialog } from "@/components/reports/CreateReportDialog";
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

const Reports = () => {
  const { selectedClient } = useClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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
    if (!selectedClient) {
      navigate("/");
      return;
    }
    loadUserRole();
    loadReports();
  }, [selectedClient, navigate]);

  useEffect(() => {
    loadReports();
  }, [filters]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const loadReports = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("reports")
        .select(`
          *,
          owner:profiles!owner_user_id(name)
        `)
        .eq("client_id", selectedClient.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      // Apply filters
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

      // Client-side date range filtering (for overlapping periods)
      let filteredData = (data || []) as Report[];
      if (filters.dateRange.from || filters.dateRange.to) {
        filteredData = filteredData.filter((report) => {
          if (!report.date_range_start || !report.date_range_end) return true;
          
          const reportStart = new Date(report.date_range_start);
          const reportEnd = new Date(report.date_range_end);
          const filterFrom = filters.dateRange.from;
          const filterTo = filters.dateRange.to;

          if (filterFrom && filterTo) {
            return reportStart <= filterTo && reportEnd >= filterFrom;
          }
          if (filterFrom) {
            return reportEnd >= filterFrom;
          }
          if (filterTo) {
            return reportStart <= filterTo;
          }
          return true;
        });
      }

      setReports(filteredData);
    } catch (error: any) {
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (reportId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ pinned: !currentPinned })
        .eq("id", reportId);

      if (error) throw error;

      toast({ title: currentPinned ? "Report unpinned" : "Report pinned" });
      loadReports();
    } catch (error: any) {
      toast({
        title: "Error updating pin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTagClick = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
  };

  const openDrawer = (report: Report) => {
    setSelectedReport(report);
    setDrawerOpen(true);
  };

  const isAdminOrFMM = userRole === "admin" || userRole === "fmm";

  const truncateSummary = (text: string | null) => {
    if (!text) return "No summary";
    return text.length > 180 ? text.substring(0, 180) + "..." : text;
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "—";
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${format(startDate, "MMM d")} to ${format(endDate, "MMM d, yyyy")}`;
    } catch {
      return "—";
    }
  };

  if (!selectedClient) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          {isAdminOrFMM && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Button>
          )}
        </div>

        {/* Filters */}
        <ReportFilters
          filters={filters}
          onFiltersChange={setFilters}
          clientId={selectedClient.id}
        />

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed">
            <p className="text-lg text-muted-foreground">
              {isAdminOrFMM
                ? "Add your first report"
                : "Your reports will appear here"}
            </p>
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
                      <button
                        onClick={() => togglePin(report.id, report.pinned)}
                        disabled={!isAdminOrFMM}
                        className="hover:scale-110 transition-transform disabled:cursor-default"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            report.pinned
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell
                      onClick={() => openDrawer(report)}
                      className="font-medium"
                    >
                      {report.name}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {report.tags.length > 0 ? (
                          report.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => handleTagClick(tag)}
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      onClick={() => openDrawer(report)}
                      className="max-w-xs"
                    >
                      <span className="text-muted-foreground">
                        {truncateSummary(report.summary)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <a
                        href={report.oviond_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                    <TableCell onClick={() => openDrawer(report)}>
                      {formatDateRange(report.date_range_start, report.date_range_end)}
                    </TableCell>
                    <TableCell onClick={() => openDrawer(report)}>
                      {report.owner?.name || "Unassigned"}
                    </TableCell>
                    <TableCell onClick={() => openDrawer(report)}>
                      <Badge variant={report.status === "Active" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => openDrawer(report)}>
                      {format(new Date(report.updated_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={selectedClient.id}
        onSuccess={(newReport) => {
          loadReports();
          setSelectedReport(newReport);
          setDrawerOpen(true);
        }}
      />

      <ReportDrawer
        report={selectedReport}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={loadReports}
        isAdminOrFMM={isAdminOrFMM}
      />
    </div>
  );
};

export default Reports;
