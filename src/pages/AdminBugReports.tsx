import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bug, Trophy, TrendingUp, Clock, CheckCircle2, ExternalLink, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BugReportDrawer } from "@/components/admin/BugReportDrawer";

export default function AdminBugReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [denialDialogOpen, setDenialDialogOpen] = useState(false);
  const [selectedBugForDenial, setSelectedBugForDenial] = useState<any>(null);
  const [denialReason, setDenialReason] = useState("");
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: bugReports, isLoading } = useQuery({
    queryKey: ["admin-bug-reports", statusFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from("bug_reports")
        .select(`
          *,
          client:clients(name),
          reporter:reporter_user_id(id, name, email, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["bug-report-stats"],
    queryFn: async () => {
      const { data: allBugs } = await supabase.from("bug_reports").select("*");
      const { data: thisMonth } = await supabase
        .from("bug_reports")
        .select("*")
        .gte("created_at", new Date(new Date().setDate(1)).toISOString());
      
      const { data: fixed } = await supabase
        .from("bug_reports")
        .select("*")
        .eq("status", "fixed")
        .gte("created_at", new Date(new Date().setDate(1)).toISOString());

      const { data: critical } = await supabase
        .from("bug_reports")
        .select("*")
        .in("severity", ["critical", "high"])
        .in("status", ["submitted", "triaged", "in_progress"]);

      return {
        total: allBugs?.length || 0,
        thisMonth: thisMonth?.length || 0,
        fixed: fixed?.length || 0,
        criticalOpen: critical?.length || 0,
      };
    },
  });

  const handleUpdateStatus = async (bugId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "fixed") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bug_reports")
        .update(updates)
        .eq("id", bugId);

      if (error) throw error;

      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-report-stats"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAwardPoints = async (bugId: string, points: number) => {
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ reward_points: points, reward_awarded: true })
        .eq("id", bugId);

      if (error) throw error;

      toast({ title: `Awarded ${points} points!`, description: "Reporter will be notified." });
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDenyReport = async () => {
    if (!selectedBugForDenial || !denialReason.trim()) return;
    
    if (denialReason.trim().length < 20) {
      toast({ 
        title: "Denial reason too short", 
        description: "Please provide at least 20 characters explaining why this report is being denied.",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bug_reports")
        .update({
          status: 'denied',
          denial_reason: denialReason.trim(),
          denied_at: new Date().toISOString(),
          denied_by: user.id,
          reward_awarded: false,
          reward_points: 0,
        })
        .eq("id", selectedBugForDenial.id);

      if (error) throw error;

      toast({ 
        title: "Bug report denied", 
        description: "The reporter will be notified with your explanation." 
      });
      
      setDenialDialogOpen(false);
      setSelectedBugForDenial(null);
      setDenialReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-report-stats"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
      cosmetic: "outline",
    };
    return colors[severity] || "default";
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      submitted: "default",
      triaged: "secondary",
      in_progress: "default",
      fixed: "default",
      wont_fix: "outline",
      duplicate: "outline",
      denied: "destructive",
    };
    return colors[status] || "default";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8" />
              Bug Reports
            </h1>
            <p className="text-muted-foreground">Manage and track bug reports from users</p>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Review Policy:</strong> We reserve the right to deny reports that are not valid bugs (feature requests, user errors, misunderstandings, etc.). Denied reports do not earn points.
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats?.thisMonth || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fixed This Month</p>
                <p className="text-2xl font-bold">{stats?.fixed || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical/High Open</p>
                <p className="text-2xl font-bold">{stats?.criticalOpen || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="triaged">Triaged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="wont_fix">Won't Fix</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="cosmetic">Cosmetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Bug Reports List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center">Loading bug reports...</Card>
          ) : bugReports?.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No bug reports found
            </Card>
          ) : (
            bugReports?.map((bug) => (
              <Card 
                key={bug.id} 
                className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedBug(bug);
                  setDrawerOpen(true);
                }}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{bug.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span>Client: {bug.client?.name}</span>
                        <span>•</span>
                        <span>{format(new Date(bug.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(bug.severity)}>
                        {bug.severity}
                      </Badge>
                      <Badge variant={getStatusColor(bug.status)}>
                        {bug.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm">{bug.description}</p>

                  {/* Screenshots */}
                  {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {bug.screenshot_urls.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="h-20 w-20 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={bug.status}
                      onValueChange={(value) => handleUpdateStatus(bug.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="triaged">Triaged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="wont_fix">Won't Fix</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
                    </Select>

                    {bug.status !== 'denied' && !bug.reward_awarded && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedBugForDenial(bug);
                          setDenialDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny Report
                      </Button>
                    )}

                    {bug.status !== 'denied' && !bug.reward_awarded && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAwardPoints(bug.id, 5)}
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          5 pts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAwardPoints(bug.id, 15)}
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          15 pts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAwardPoints(bug.id, 30)}
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          30 pts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAwardPoints(bug.id, 50)}
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          50 pts
                        </Button>
                      </div>
                    )}

                    {bug.reward_awarded && (
                      <Badge variant="secondary">
                        <Trophy className="h-3 w-3 mr-1" />
                        {bug.reward_points} pts awarded
                      </Badge>
                    )}

                    {bug.status === 'denied' && (
                      <div className="flex-1">
                        <Alert variant="destructive" className="mt-4">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Report Denied:</strong> {bug.denial_reason}
                            {bug.denied_at && (
                              <p className="text-xs mt-1">
                                Denied on {format(new Date(bug.denied_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Denial Dialog */}
        <Dialog open={denialDialogOpen} onOpenChange={setDenialDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deny Bug Report</DialogTitle>
              <DialogDescription>
                Explain why this report is being denied. The reporter will see this message.
              </DialogDescription>
            </DialogHeader>

            {selectedBugForDenial && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-sm">{selectedBugForDenial.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedBugForDenial.description}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="denialReason">Denial Reason (min. 20 characters) *</Label>
                  <Textarea
                    id="denialReason"
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    placeholder="e.g., This is a feature request, not a bug. Please submit feature requests through the appropriate channel..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {denialReason.length}/20 characters (be specific and constructive)
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This action will set the status to "denied" and ensure no points are awarded. Be professional and constructive in your explanation.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDenialDialogOpen(false);
                  setDenialReason("");
                  setSelectedBugForDenial(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDenyReport}
                disabled={denialReason.trim().length < 20}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deny Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bug Report Drawer */}
        <BugReportDrawer
          bug={selectedBug}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-bug-reports"] });
            queryClient.invalidateQueries({ queryKey: ["bug-report-stats"] });
          }}
        />
      </div>
  );
}
