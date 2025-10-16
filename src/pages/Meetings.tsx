import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { TldvCallout } from "@/components/meetings/TldvCallout";
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Meeting {
  id: string;
  date_time: string;
  attendees: string | null;
  summary: string;
  decisions: string[];
  next_steps: string[];
  tags: string[];
}

export default function Meetings() {
  const { selectedClient } = useClient();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [hasTldv, setHasTldv] = useState<boolean>(false);
  const [checkingTldv, setCheckingTldv] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role || "");
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    const checkTldvStatus = async () => {
      if (!selectedClient) {
        setCheckingTldv(false);
        return;
      }
      
      setCheckingTldv(true);
      try {
        const { data, error } = await supabase
          .from('marketing_tools')
          .select('id')
          .eq('client_id', selectedClient.id)
          .eq('name', 'TLDV')
          .maybeSingle();
        
        if (error) throw error;
        setHasTldv(!!data);
      } catch (error) {
        console.error('Error checking TLDV status:', error);
        setHasTldv(false);
      } finally {
        setCheckingTldv(false);
      }
    };
    
    checkTldvStatus();
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient) {
      loadMeetings();
    }
  }, [selectedClient, statusFilter]);

  const loadMeetings = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("meetings")
      .select("*")
      .eq("client_id", selectedClient.id);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query.order("date_time", { ascending: false });

    if (error) {
      toast({ title: "Error loading meetings", variant: "destructive" });
      return;
    }

    setMeetings(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meetings</h1>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meetings</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Meeting
          </Button>
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'fmm') && (
        <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Calendar Sync Information</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Meetings logged here are available in your iCal subscription feed immediately, 
            but external calendar apps (Google Calendar, Apple Calendar, etc.) typically 
            refresh subscriptions every 12-24 hours.
          </AlertDescription>
        </Alert>
      )}

      {!checkingTldv && !hasTldv && (
        <TldvCallout />
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-center">Decisions</TableHead>
              <TableHead className="text-center">Next Steps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.map((meeting) => (
              <TableRow
                key={meeting.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/meetings/${meeting.id}`)}
              >
                <TableCell>
                  {new Date(meeting.date_time).toLocaleString()}
                </TableCell>
                <TableCell>{meeting.attendees || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {meeting.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{meeting.decisions.length}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{meeting.next_steps.length}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateMeetingDialog 
        open={showCreateDialog} 
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) loadMeetings();
        }} 
      />
    </div>
  );
}
