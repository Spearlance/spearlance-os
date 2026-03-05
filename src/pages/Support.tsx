import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, BookOpen, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  sla_due_at: string | null;
  requester?: {
    name: string;
  };
}

interface TicketStats {
  open: number;
  avgResponseMinutes: number;
  resolvedThisWeek: number;
}

export default function Support() {
  const { selectedClient } = useClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, avgResponseMinutes: 0, resolvedThisWeek: 0 });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedClient) {
      loadTickets();
      loadStats();
    }
  }, [selectedClient]);

  const loadTickets = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("tickets")
      .select(`
        *,
        requester_profile:profiles!tickets_requester_user_id_fkey (name)
      `)
      .eq("client_id", selectedClient.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tickets:", error);
      return;
    }

    // Map data to match our interface
    const mappedData = (data || []).map((ticket: any) => ({
      ...ticket,
      requester: ticket.requester_profile
    }));

    setTickets(mappedData as Ticket[]);
  };

  const loadStats = async () => {
    if (!selectedClient) return;

    // Get open tickets count
    const { count: openCount } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("client_id", selectedClient.id)
      .in("status", ["open", "in_progress", "waiting_on_client"]);

    // Get average response time
    const { data: avgData } = await supabase
      .from("tickets")
      .select("response_time_minutes")
      .eq("client_id", selectedClient.id)
      .not("response_time_minutes", "is", null);

    const avgResponse = avgData && avgData.length > 0
      ? avgData.reduce((sum, t) => sum + (t.response_time_minutes || 0), 0) / avgData.length
      : 0;

    // Get tickets resolved this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: resolvedCount } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("client_id", selectedClient.id)
      .eq("status", "resolved")
      .gte("resolved_at", oneWeekAgo.toISOString());

    setStats({
      open: openCount || 0,
      avgResponseMinutes: Math.round(avgResponse),
      resolvedThisWeek: resolvedCount || 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "waiting_on_client": return "secondary";
      case "resolved": return "outline";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      default: return "secondary";
    }
  };

  const getCategoryBadge = (category: string): "default" | "destructive" | "outline" | "secondary" => {
    return "outline";
  };

  const getSLAUrgency = (sla_due_at: string | null, created_at: string) => {
    if (!sla_due_at) return null;
    
    const now = new Date();
    const dueDate = new Date(sla_due_at);
    const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) {
      return { color: "destructive", text: "SLA Breached", icon: AlertCircle };
    } else if (hoursRemaining < 2) {
      return { color: "destructive", text: `${Math.round(hoursRemaining)}h remaining`, icon: Clock };
    } else if (hoursRemaining < 12) {
      return { color: "default", text: `${Math.round(hoursRemaining)}h remaining`, icon: Clock };
    } else if (hoursRemaining < 24) {
      return { color: "secondary", text: `${Math.round(hoursRemaining)}h remaining`, icon: Clock };
    }
    return null;
  };

  const formatAvgTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support</h1>
      </div>

      {/* Get Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>We're here to help you succeed. Choose how you'd like to get support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => {
                // Open chatbot widget - this would need to be implemented in ChatbotWidget
                toast.info("Opening SpearlanceAI...", { description: "Let's find an answer for you!" });
              }}
            >
              <MessageSquare className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Ask SpearlanceAI</div>
                <div className="text-xs text-muted-foreground">Get instant answers</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/support/docs")}
            >
              <BookOpen className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Browse Knowledge Base</div>
                <div className="text-xs text-muted-foreground">Search articles & guides</div>
              </div>
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">Can't find what you need?</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Support Ticket
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              We respond to all tickets within 48 hours
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgResponseMinutes > 0 ? formatAvgTime(stats.avgResponseMinutes) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">First response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Support Tickets</CardTitle>
          <CardDescription>View and manage all your support requests</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No support tickets yet</p>
              <p className="text-sm mt-2">Create your first ticket to get started</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const slaInfo = getSLAUrgency(ticket.sla_due_at, ticket.created_at);
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/support/${ticket.id}`)}
                      >
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant={getCategoryBadge(ticket.category)}>{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(ticket.status)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {slaInfo && ticket.status !== "resolved" ? (
                            <Badge variant={slaInfo.color as any} className="gap-1">
                              <slaInfo.icon className="h-3 w-3" />
                              {slaInfo.text}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{ticket.requester?.name || "Unknown"}</TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTicketDialog 
        open={createDialogOpen} 
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            // Refresh tickets after dialog closes
            loadTickets();
            loadStats();
          }
        }} 
      />
    </div>
  );
}
