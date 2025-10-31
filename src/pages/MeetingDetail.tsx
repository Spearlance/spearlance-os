import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Edit, Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReactMarkdown from "react-markdown";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedMeeting, setEditedMeeting] = useState<Meeting | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [newDecision, setNewDecision] = useState("");
  const [newNextStep, setNewNextStep] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadMeeting();
      loadUserRole();
    }
  }, [id]);

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
    setEditedMeeting(data);
  };

  const handleSaveEdit = async () => {
    if (!editedMeeting || !meeting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("meetings")
      .update({
        date_time: editedMeeting.date_time,
        summary: editedMeeting.summary,
        attendees: editedMeeting.attendees,
        decisions: editedMeeting.decisions,
        next_steps: editedMeeting.next_steps,
        tags: editedMeeting.tags,
        last_edited_by: user.id,
      })
      .eq("id", meeting.id);

    if (error) {
      toast({ title: "Error saving changes", variant: "destructive" });
      return;
    }

    toast({ title: "Changes saved successfully" });
    setIsEditing(false);
    loadMeeting();
  };

  const handleCancelEdit = () => {
    setEditedMeeting(meeting);
    setIsEditing(false);
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

  const canEdit = userRole === "admin" || userRole === "fmm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meeting Details</h1>
          <p className="text-muted-foreground">
            {new Date(meeting.date_time).toLocaleString()}
          </p>
        </div>
        {canEdit && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Meeting
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting Date & Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={editedMeeting?.date_time 
                  ? new Date(editedMeeting.date_time).toISOString().slice(0, 16)
                  : ""}
                onChange={(e) =>
                  setEditedMeeting({ 
                    ...editedMeeting!, 
                    date_time: new Date(e.target.value).toISOString() 
                  })
                }
              />
            </div>
          ) : (
            <p>{new Date(meeting.date_time).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Input
              value={editedMeeting?.attendees || ""}
              onChange={(e) =>
                setEditedMeeting({ ...editedMeeting!, attendees: e.target.value })
              }
              placeholder="John Doe, Jane Smith"
            />
          ) : (
            <p>{meeting.attendees || "No attendees listed"}</p>
          )}
        </CardContent>
      </Card>

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
              {isEditing ? (
                <Textarea
                  value={editedMeeting?.summary || ""}
                  onChange={(e) =>
                    setEditedMeeting({ ...editedMeeting!, summary: e.target.value })
                  }
                  className="min-h-[200px]"
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{meeting.summary}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  value={editedMeeting?.tags.join(", ") || ""}
                  onChange={(e) =>
                    setEditedMeeting({
                      ...editedMeeting!,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder="strategy, review, planning"
                />
              ) : (
                <div className="flex gap-2">
                  {meeting.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newDecision}
                      onChange={(e) => setNewDecision(e.target.value)}
                      placeholder="Add a decision"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newDecision.trim()) {
                            setEditedMeeting({
                              ...editedMeeting!,
                              decisions: [...(editedMeeting?.decisions || []), newDecision.trim()],
                            });
                            setNewDecision("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newDecision.trim()) {
                          setEditedMeeting({
                            ...editedMeeting!,
                            decisions: [...(editedMeeting?.decisions || []), newDecision.trim()],
                          });
                          setNewDecision("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {(editedMeeting?.decisions || []).map((decision, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                        <span className="flex-1">{decision}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditedMeeting({
                              ...editedMeeting!,
                              decisions: editedMeeting!.decisions.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : meeting.decisions.length > 0 ? (
                <ul className="list-disc list-inside space-y-2">
                  {meeting.decisions.map((decision, i) => (
                    <li key={i}>{decision}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No decisions recorded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newNextStep}
                      onChange={(e) => setNewNextStep(e.target.value)}
                      placeholder="Add a next step"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newNextStep.trim()) {
                            setEditedMeeting({
                              ...editedMeeting!,
                              next_steps: [...(editedMeeting?.next_steps || []), newNextStep.trim()],
                            });
                            setNewNextStep("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newNextStep.trim()) {
                          setEditedMeeting({
                            ...editedMeeting!,
                            next_steps: [...(editedMeeting?.next_steps || []), newNextStep.trim()],
                          });
                          setNewNextStep("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {(editedMeeting?.next_steps || []).map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                        <span className="flex-1">{step}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditedMeeting({
                              ...editedMeeting!,
                              next_steps: editedMeeting!.next_steps.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : meeting.next_steps.length > 0 ? (
                <ul className="list-disc list-inside space-y-2">
                  {meeting.next_steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No next steps recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
