import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare } from "lucide-react";

interface Meeting {
  id: string;
  date_time: string;
  attendees: string | null;
  summary: string;
  transcript_text: string | null;
  decisions: string[];
  next_steps: string[];
  tags: string[];
  recording_url: string | null;
}

export default function MeetingDetail() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({ title: "Error loading meeting", variant: "destructive" });
      return;
    }

    setMeeting(data);
  };

  const handleCreateTask = async () => {
    if (!selectedText || !meeting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Parse date from selected text (look for "by YYYY-MM-DD" pattern)
    const dateMatch = selectedText.match(/by (\d{4}-\d{2}-\d{2})/i);
    const dueDate = dateMatch ? dateMatch[1] : null;

    const { data: taskData, error } = await supabase
      .from("tasks")
      .insert({
        client_id: meeting.id,
        title: selectedText.substring(0, 100),
        description: selectedText,
        status: "to_do",
        assignee_user_id: user.id,
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating task", variant: "destructive" });
      return;
    }

    // Link task to meeting
    await supabase
      .from("meeting_tasks")
      .insert({
        meeting_id: meeting.id,
        task_id: taskData.id,
      });

    toast({ title: "Task created successfully" });
    setSelectedText("");
  };

  if (!meeting) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Meeting Details</h1>
        <p className="text-muted-foreground">
          {new Date(meeting.date_time).toLocaleString()}
        </p>
      </div>

      {meeting.attendees && (
        <Card>
          <CardHeader>
            <CardTitle>Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{meeting.attendees}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {meeting.transcript_text && (
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          )}
          <TabsTrigger value="actions">Decisions & Next Steps</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: meeting.summary }}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            {meeting.tags.map((tag, i) => (
              <Badge key={i} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </TabsContent>

        {meeting.transcript_text && (
          <TabsContent value="transcript">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transcript</CardTitle>
                {selectedText && (
                  <Button onClick={handleCreateTask} size="sm">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Create Task from Selection
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p
                  className="whitespace-pre-wrap text-sm"
                  onMouseUp={() => {
                    const selection = window.getSelection()?.toString();
                    if (selection) setSelectedText(selection);
                  }}
                >
                  {meeting.transcript_text}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="actions" className="space-y-4">
          {meeting.decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {meeting.decisions.map((decision, i) => (
                    <li key={i}>{decision}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {meeting.next_steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {meeting.next_steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
