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
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import CreateChannelTaskDialog from "./CreateChannelTaskDialog";
import { DeleteChannelDialog } from "./DeleteChannelDialog";

type Channel = Database["public"]["Tables"]["marketing_flow_channels"]["Row"];
type Note = Database["public"]["Tables"]["marketing_flow_channel_notes"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ChannelDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onUpdate: () => void;
  isAdminOrFMM: boolean;
  clientName: string;
  clientId: string;
}

export function ChannelDrawer({ open, onOpenChange, channel, onUpdate, isAdminOrFMM, clientName, clientId }: ChannelDrawerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "client">("internal");
  const [assignedTo, setAssignedTo] = useState(channel.assigned_to);
  const [status, setStatus] = useState(channel.status);
  const [loading, setLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadNotes();
      loadTasks();
      setAssignedTo(channel.assigned_to);
      setStatus(channel.status);
    }
  }, [open, channel.id]);

  // Fetch current user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setCurrentUserRole(profile?.role || "");
      }
    };
    if (open) {
      fetchUserRole();
    }
  }, [open]);

  // Fetch team members based on role
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!clientId || !currentUserRole) return;

      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email, role")
          .contains("associated_client_ids", [clientId])
          .order("name");

        if (error) throw error;

        let filteredMembers = data || [];
        if (currentUserRole === "client") {
          filteredMembers = filteredMembers.filter((m) => m.role === "client");
        }

        setTeamMembers(filteredMembers);
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };

    if (open && currentUserRole) {
      fetchTeamMembers();
    }
  }, [open, currentUserRole, clientId]);

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
          assigned_to: assignedTo || null,
          status,
          ownership: "client", // Set default ownership
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

  const handleDeleteChannel = async () => {
    try {
      // First delete all task links
      const { error: linksError } = await supabase
        .from("marketing_flow_task_links")
        .delete()
        .eq("channel_id", channel.id);

      if (linksError) throw linksError;

      // Then delete all notes
      const { error: notesError } = await supabase
        .from("marketing_flow_channel_notes")
        .delete()
        .eq("channel_id", channel.id);

      if (notesError) throw notesError;

      // Finally delete the channel itself
      const { error: channelError } = await supabase
        .from("marketing_flow_channels")
        .delete()
        .eq("id", channel.id);

      if (channelError) throw channelError;

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      
      onOpenChange(false); // Close the drawer
      onUpdate(); // Refresh the parent view
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
      throw error; // Re-throw so DeleteChannelDialog can handle loading state
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
              <Label>Assigned To</Label>
              {loadingMembers ? (
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              ) : (
                <Select
                  value={assignedTo || "unassigned"}
                  onValueChange={(value) => setAssignedTo(value === "unassigned" ? null : value)}
                  disabled={!isAdminOrFMM}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

            <Button variant="outline" className="w-full" onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
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

        {isAdminOrFMM && (
          <div className="flex justify-end mt-6 pt-6 border-t">
            <DeleteChannelDialog
              channelName={channel.name}
              channelId={channel.id}
              onConfirm={handleDeleteChannel}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Channel
                </Button>
              }
            />
          </div>
        )}

        <CreateChannelTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          channelId={channel.id}
          clientId={clientId}
          onSuccess={() => {
            loadTasks();
            onUpdate();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
