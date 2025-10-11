import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  requester?: {
    name: string;
  };
}

export default function Support() {
  const { selectedClient } = useClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      loadTickets();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
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
                <TableCell>{ticket.requester?.name || "Unknown"}</TableCell>
                <TableCell>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
