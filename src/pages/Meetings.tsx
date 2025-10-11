import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      loadMeetings();
    }
  }, [selectedClient]);

  const loadMeetings = async () => {
    if (!selectedClient) return;

    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("client_id", selectedClient.id)
      .order("date_time", { ascending: false });

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
      </div>

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
    </div>
  );
}
