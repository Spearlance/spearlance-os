import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"];
type Note = Database["public"]["Tables"]["marketing_flow_channel_notes"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ChannelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onUpdate: () => void;
  isAdminOrFMM: boolean;
}

export function ChannelDrawer({ open, onOpenChange, channel, onUpdate, isAdminOrFMM }: ChannelDrawerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "client">("internal");
  const [ownership, setOwnership] = useState(channel.ownership);
  const [status, setStatus] = useState(channel.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadNotes();
      loadTasks();
      setOwnership(channel.ownership);
      setStatus(channel.status);
    }
  }, [open, channel.id]);

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("marketing_flow_channel_notes")
      .select("*")
      .eq("channel_id", channel.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
    } else {
      setNotes(data || []);
    }
  };

  const loadTasks = async () => {
    const { data: links, error: linksError } = await supabase
      .from("marketing_flow_task_links")
      .select("task_id")
      .eq("channel_id", channel.id);

    if (linksError) {
      console.error("Error loading task links:", linksError);
      return;
    }

    if (links && links.length > 0) {
      const taskIds = links.map((l) => l.task_id);
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (tasksError) {
        console.error("Error loading tasks:", tasksError);
      } else {
        setTasks(tasksData || []);
      }
    } else {
      setTasks([]);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("marketing_flow_channel_notes")
        .insert({
          channel_id: channel.id,
          body: newNote,
          visibility: noteVisibility,
          created_by: user.id,
        });

      if (error) throw error;

      setNewNote("");
      setNoteVisibility("internal");
      loadNotes();
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("marketing_flow_channels")
        .update({
          ownership,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", channel.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel updated successfully",
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating channel:", error);
      toast({
        title: "Error",
        description: "Failed to update channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (taskStatus: string) => {
    const statusMap: Record<string, string> = {
      to_do: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      done: "bg-green-100 text-green-700",
      blocked: "bg-red-100 text-red-700",
    };
    return statusMap[taskStatus] || "bg-gray-100 text-gray-700";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{channel.name}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-2">
              <Label>Ownership</Label>
              <Select
                value={ownership}
                onValueChange={(value: any) => setOwnership(value)}
                disabled={!isAdminOrFMM}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spearlance">Spearlance</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value: any) => setStatus(value)}
                disabled={!isAdminOrFMM}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="not_used">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Progress</Label>
              <div className="text-2xl font-semibold text-primary">
                {Math.round(Number(channel.progress) || 0)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Based on completed tasks
              </p>
            </div>

            {isAdminOrFMM && (
              <Button onClick={handleUpdateChannel} disabled={loading} className="w-full">
                Save Changes
              </Button>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate("/tasks")}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{task.title}</div>
                      <Badge className={`mt-1 ${getStatusBadgeClass(task.status)}`}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tasks linked yet
                </div>
              )}
            </div>

            {isAdminOrFMM && (
              <Button variant="outline" className="w-full" onClick={() => navigate("/tasks")}>
                <Plus className="h-4 w-4 mr-2" />
                Manage Tasks
              </Button>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            {isAdminOrFMM && (
              <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                <Label>Add Note</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note..."
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Select value={noteVisibility} onValueChange={(value: any) => setNoteVisibility(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="client">Client Visible</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
                    Add Note
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={note.visibility === "internal" ? "secondary" : "default"}>
                        {note.visibility === "internal" ? "Internal" : "Client Visible"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No notes yet
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
