import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, Link as LinkIcon, FileVideo, FileAudio, ExternalLink, X, Plus, Trash2, Clock, Globe } from "lucide-react";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AssigneeSelector } from "./AssigneeSelector";
import { WatcherSelector } from "./WatcherSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { SubtaskList } from "./SubtaskList";
import { MentionTextarea } from "./MentionTextarea";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface TaskDrawerProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isAdminOrFMM?: boolean;
}

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ]
};

const quillFormats = [
  'bold', 'italic', 'underline',
  'list', 'bullet',
  'link'
];

export function TaskDrawer({ task, open, onOpenChange, onUpdate, isAdminOrFMM = false }: TaskDrawerProps) {
  const [editedTask, setEditedTask] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority || 'medium',
    due_date: task.due_date || '',
    color: task.color || '',
    recurring_schedule: task.recurring_schedule || '',
    linked_channel_id: task.linked_channel_id || '',
    column_id: task.column_id || '',
  });
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);
  const [relatedAssets, setRelatedAssets] = useState<any[]>([]);
  const [relatedMeetings, setRelatedMeetings] = useState<any[]>([]);
  const [relatedChannels, setRelatedChannels] = useState<any[]>([]);
  const [linkedWebsitePage, setLinkedWebsitePage] = useState<{ id: string; name: string; build_id: string; build_name: string } | null>(null);
  const [showLinkAssetDialog, setShowLinkAssetDialog] = useState(false);
  const [showLinkMeetingDialog, setShowLinkMeetingDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [availableMeetings, setAvailableMeetings] = useState<any[]>([]);
  const [showLinkChannelDialog, setShowLinkChannelDialog] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [taskColumns, setTaskColumns] = useState<Array<{ id: string; name: string; key: string; color: string; mapped_status: 'to_do' | 'in_progress' | 'done' }>>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Normalize editedTask.status based on column_id to prevent enum errors
  useEffect(() => {
    if (!taskColumns.length || !editedTask.column_id) return;

    const col = taskColumns.find(c => c.id === editedTask.column_id);
    if (col && editedTask.status !== col.mapped_status) {
      setEditedTask(prev => ({
        ...prev,
        status: col.mapped_status,
      }));
    }
  }, [taskColumns, editedTask.column_id]);

  // Helper function to extract meeting title from summary
  const extractMeetingTitle = (summary: string): string => {
    // Check if summary starts with markdown heading
    if (summary.startsWith('# ')) {
      const lines = summary.split('\n');
      // Remove the '# ' prefix and return the first line
      return lines[0].substring(2).trim();
    }
    // Fallback: return first 50 characters of summary
    return summary.substring(0, 50) + (summary.length > 50 ? '...' : '');
  };

  // Helper function to render comment text with highlighted mentions
  const renderCommentWithMentions = (text: string) => {
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    const parts = text.split(mentionPattern);
    
    return parts.map((part, index) => {
      // Odd indices are the captured groups (mentions)
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    loadComments();
    loadUsers();
    loadRelatedItems();
    loadCurrentAssignees();
    loadCurrentWatchers();
    loadSubtasks();
    loadTaskColumns();
    loadLinkedWebsitePage();
    
    // Listen for column updates
    const handleColumnUpdate = () => {
      loadTaskColumns();
    };
    
    window.addEventListener('taskColumnsUpdated', handleColumnUpdate);
    
    return () => {
      window.removeEventListener('taskColumnsUpdated', handleColumnUpdate);
    };
  }, [task.id, task.client_id]);

  const loadCurrentWatchers = async () => {
    const { data } = await supabase
      .from("task_watchers")
      .select("user_id")
      .eq("task_id", task.id);
    
    if (data) {
      setSelectedWatchers(data.map(w => w.user_id));
    }
  };

  const loadCurrentAssignees = async () => {
    const { data } = await supabase
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", task.id);
    
    if (data) {
      setSelectedAssignees(data.map(a => a.user_id));
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("task_comments")
      .select(`
        *,
        profiles:user_id (name)
      `)
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });

    setComments(data || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role")
      .neq("role", "client");

    setUsers(data || []);
  };

  const loadRelatedItems = async () => {
    if (task.related_asset_ids && task.related_asset_ids.length > 0) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id, title, type, preview_url, file_url")
      .in("id", task.related_asset_ids);

      setRelatedAssets(assets || []);
    } else {
      setRelatedAssets([]);
    }

    if (task.related_meeting_ids && task.related_meeting_ids.length > 0) {
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, summary, date_time, status")
        .in("id", task.related_meeting_ids);

      setRelatedMeetings(meetings || []);
    } else {
      setRelatedMeetings([]);
    }

    // Load related channels
    const { data: links } = await supabase
      .from("marketing_flow_task_links")
      .select("channel_id")
      .eq("task_id", task.id);

    if (links && links.length > 0) {
      const channelIds = links.map(l => l.channel_id);
      const { data: channels } = await supabase
        .from("marketing_flow_channels")
        .select(`
          id,
          name,
          status,
          marketing_flow_stages!inner (
            name,
            marketing_flows!inner (
              client_id
            )
          )
        `)
        .in("id", channelIds);

      setRelatedChannels(channels || []);
    } else {
      setRelatedChannels([]);
    }
  };

  const loadSubtasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, status, subtask_order")
      .eq("parent_task_id", task.id)
      .order("subtask_order", { ascending: true });
    
    setSubtasks(data || []);
  };

  const loadTaskColumns = async () => {
    const { data } = await supabase
      .from("task_columns")
      .select("id, name, key, color, mapped_status")
      .eq("client_id", task.client_id)
      .order("display_order");
    
    setTaskColumns(data || []);
  };

  const loadLinkedWebsitePage = async () => {
    const { data } = await supabase
      .from("website_build_tasks")
      .select(`
        page_id,
        website_build_pages!inner(id, name, build_id, website_builds!inner(id, name))
      `)
      .eq("task_id", task.id)
      .not("page_id", "is", null)
      .limit(1)
      .maybeSingle();
    
    if (data && data.website_build_pages) {
      const page = data.website_build_pages as any;
      setLinkedWebsitePage({
        id: page.id,
        name: page.name,
        build_id: page.build_id,
        build_name: page.website_builds?.name || 'Unknown Build',
      });
    } else {
      setLinkedWebsitePage(null);
    }
  };

  const loadAvailableAssets = async () => {
      const { data } = await supabase
        .from("assets")
        .select("id, title, type, preview_url, file_url")
        .eq("client_id", task.client_id)
        .order("title");
    setAvailableAssets(data || []);
  };

  const loadAvailableMeetings = async () => {
    const { data } = await supabase
      .from("meetings")
      .select("id, summary, date_time, status")
      .eq("client_id", task.client_id)
      .order("date_time", { ascending: false });
    setAvailableMeetings(data || []);
  };

  const loadAvailableChannels = async () => {
    const { data: flow } = await supabase
      .from("marketing_flows")
      .select("id")
      .eq("client_id", task.client_id)
      .single();
    
    if (!flow) {
      setAvailableChannels([]);
      return;
    }
    
    const { data: channels } = await supabase
      .from("marketing_flow_channels")
      .select(`
        id,
        name,
        status,
        marketing_flow_stages!inner (
          name,
          flow_id
        )
      `)
      .eq("marketing_flow_stages.flow_id", flow.id)
      .order("name");
    
    setAvailableChannels(channels || []);
  };

  const handleLinkAsset = async (assetId: string) => {
    const currentIds = task.related_asset_ids || [];
    if (currentIds.includes(assetId)) {
      toast({ title: "Asset already linked" });
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ related_asset_ids: [...currentIds, assetId] })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error linking asset", variant: "destructive" });
      return;
    }

    toast({ title: "Asset linked successfully" });
    task.related_asset_ids = [...currentIds, assetId];
    loadRelatedItems();
    setShowLinkAssetDialog(false);
  };

  const handleUnlinkAsset = async (assetId: string) => {
    const currentIds = task.related_asset_ids || [];
    const { error } = await supabase
      .from("tasks")
      .update({ related_asset_ids: currentIds.filter(id => id !== assetId) })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error unlinking asset", variant: "destructive" });
      return;
    }

    toast({ title: "Asset unlinked successfully" });
    task.related_asset_ids = currentIds.filter(id => id !== assetId);
    loadRelatedItems();
  };

  const handleLinkMeeting = async (meetingId: string) => {
    const currentIds = task.related_meeting_ids || [];
    if (currentIds.includes(meetingId)) {
      toast({ title: "Meeting already linked" });
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ related_meeting_ids: [...currentIds, meetingId] })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error linking meeting", variant: "destructive" });
      return;
    }

    toast({ title: "Meeting linked successfully" });
    task.related_meeting_ids = [...currentIds, meetingId];
    loadRelatedItems();
    setShowLinkMeetingDialog(false);
  };

  const handleUnlinkMeeting = async (meetingId: string) => {
    const currentIds = task.related_meeting_ids || [];
    const { error } = await supabase
      .from("tasks")
      .update({ related_meeting_ids: currentIds.filter(id => id !== meetingId) })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Error unlinking meeting", variant: "destructive" });
      return;
    }

    toast({ title: "Meeting unlinked successfully" });
    task.related_meeting_ids = currentIds.filter(id => id !== meetingId);
    loadRelatedItems();
  };

  const handleLinkChannel = async (channelId: string) => {
    const { data: existingLink } = await supabase
      .from("marketing_flow_task_links")
      .select("id")
      .eq("task_id", task.id)
      .eq("channel_id", channelId)
      .maybeSingle();
    
    if (existingLink) {
      toast({ title: "Channel already linked" });
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("marketing_flow_task_links")
      .insert({
        task_id: task.id,
        channel_id: channelId,
        created_by: user.id
      });
    
    if (error) {
      toast({ title: "Error linking channel", variant: "destructive" });
      return;
    }
    
    toast({ title: "Channel linked successfully" });
    loadRelatedItems();
    setShowLinkChannelDialog(false);
  };

  const handleUnlinkChannel = async (channelId: string) => {
    const { error } = await supabase
      .from("marketing_flow_task_links")
      .delete()
      .eq("task_id", task.id)
      .eq("channel_id", channelId);
    
    if (error) {
      toast({ title: "Error unlinking channel", variant: "destructive" });
      return;
    }
    
    toast({ title: "Channel unlinked successfully" });
    setRelatedChannels(relatedChannels.filter(c => c.id !== channelId));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <FileVideo className="h-4 w-4" />;
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const handleSave = async () => {
    // Update task basic info
    const { error: taskError } = await supabase
      .from("tasks")
      .update({
        title: editedTask.title,
        description: editedTask.description || null,
        status: editedTask.status,
        priority: editedTask.priority,
        due_date: editedTask.due_date || null,
        color: editedTask.color || null,
        column_id: editedTask.column_id || null,
      })
      .eq("id", task.id);

    if (taskError) {
      toast({ title: "Error updating task", variant: "destructive" });
      return;
    }

    // Sync assignees - delete existing first
    const { error: deleteError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", task.id);

    if (deleteError) {
      toast({ title: "Error updating assignees", variant: "destructive" });
      return;
    }

    // Insert new assignees
    if (selectedAssignees.length > 0) {
      const assigneeInserts = selectedAssignees.map(userId => ({
        task_id: task.id,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from("task_assignees")
        .insert(assigneeInserts);

      if (insertError) {
        toast({ title: "Error updating assignees", variant: "destructive" });
        return;
      }
    }

    // Sync watchers - delete existing first
    const { error: deleteWatchersError } = await supabase
      .from("task_watchers")
      .delete()
      .eq("task_id", task.id);

    if (deleteWatchersError) {
      toast({ title: "Error updating watchers", variant: "destructive" });
      return;
    }

    // Insert new watchers
    if (selectedWatchers.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      const watcherInserts = selectedWatchers.map(userId => ({
        task_id: task.id,
        user_id: userId,
        notify_on_complete: true,
        created_by: user?.id,
      }));

      const { error: insertWatchersError } = await supabase
        .from("task_watchers")
        .insert(watcherInserts);

      if (insertWatchersError) {
        toast({ title: "Error updating watchers", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Task updated successfully" });
    onUpdate();
    onOpenChange(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract mentioned user names
      const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
      const mentions = [...newComment.matchAll(mentionPattern)].map(m => m[1]);
      
      // Find mentioned user IDs
      const mentionedUsers = users.filter(u => 
        mentions.some(mention => u.name.toLowerCase() === mention.toLowerCase())
      );
      const mentionedUserIds = mentionedUsers.map(u => u.id);

      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from("task_comments")
        .insert({
          task_id: task.id,
          body: newComment,
          user_id: user.id,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Insert mentions and create notifications
      if (comment && mentionedUserIds.length > 0) {
        const { error: mentionsError } = await supabase
          .from("task_comment_mentions")
          .insert(
            mentionedUserIds.map(userId => ({
              comment_id: comment.id,
              mentioned_user_id: userId,
            }))
          );

        if (mentionsError) {
          console.error("Error creating mentions:", mentionsError);
        }

        // Get current user profile for notification
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        // Create notifications for mentioned users
        for (const userId of mentionedUserIds) {
          await supabase.from("notifications").insert({
            user_id: userId,
            client_id: task.client_id,
            type: "mention",
            title: `${currentProfile?.name || "Someone"} mentioned you in a task`,
            description: `"${newComment.slice(0, 100)}${newComment.length > 100 ? "..." : ""}"`,
            action_url: `/tasks?task=${task.id}`,
            payload_json: {
              task_id: task.id,
              task_title: task.title,
              comment_id: comment.id,
            },
          });
        }
      }

      setNewComment("");
      loadComments();
      toast({
        title: "Comment added",
        description: mentionedUserIds.length > 0 
          ? `${mentionedUserIds.length} user(s) will be notified`
          : undefined,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    try {
      // First delete all task comments
      const { error: commentsError } = await supabase
        .from("task_comments")
        .delete()
        .eq("task_id", task.id);

      if (commentsError) throw commentsError;

      // Then delete all channel links
      const { error: linksError } = await supabase
        .from("marketing_flow_task_links")
        .delete()
        .eq("task_id", task.id);

      if (linksError) throw linksError;

      // Finally delete the task itself
      const { error: taskError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (taskError) throw taskError;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6 flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editedTask.title} onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <div className="border rounded-md overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={editedTask.description}
                      onChange={(value) => setEditedTask({ ...editedTask, description: value })}
                      modules={quillModules}
                      formats={quillFormats}
                      className="bg-background [&_.ql-editor]:min-h-[100px]"
                      placeholder="Add a description..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editedTask.column_id || editedTask.status} 
                      onValueChange={(columnId) => {
                        const selectedColumn = taskColumns.find(col => col.id === columnId);
                        if (selectedColumn) {
                          setEditedTask({ 
                            ...editedTask, 
                            status: selectedColumn.mapped_status,
                            column_id: columnId
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {taskColumns.length > 0 ? (
                            (() => {
                              const currentColumn = taskColumns.find(col => col.id === editedTask.column_id);
                              return currentColumn ? (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: currentColumn.color }}
                                  />
                                  {currentColumn.name}
                                </div>
                              ) : editedTask.status;
                            })()
                          ) : editedTask.status}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {taskColumns.length > 0 ? (
                          taskColumns.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: column.color }}
                                />
                                {column.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="to_do">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={editedTask.priority} onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      value={editedTask.due_date} 
                      onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>Assignees</Label>
                    <AssigneeSelector
                      users={users}
                      selectedUserIds={selectedAssignees}
                      onSelectionChange={setSelectedAssignees}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 px-2">
                          <div 
                            className="h-6 w-full rounded border-2 border-background" 
                            style={{ backgroundColor: editedTask.color }}
                          />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
                        <div className="flex gap-2">
                          {["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"].map((colorOption) => (
                            <button
                              key={colorOption}
                              type="button"
                              className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                                editedTask.color === colorOption ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                              }`}
                              style={{ backgroundColor: colorOption }}
                              onClick={() => setEditedTask({ ...editedTask, color: colorOption })}
                              aria-label={`Select color ${colorOption}`}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notify on completion</Label>
                  <WatcherSelector
                    users={users}
                    selectedUserIds={selectedWatchers}
                    onSelectionChange={setSelectedWatchers}
                  />
                  <p className="text-xs text-muted-foreground">
                    These users will be notified when this task is completed
                  </p>
                </div>


                {/* Task Duration Display */}
                {(task.started_at || task.completed_at) && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {task.status === 'done' && task.started_at && task.completed_at ? (
                        <span className="text-muted-foreground">
                          Completed in{' '}
                          <span className="font-medium text-foreground">
                            {(() => {
                              const start = new Date(task.started_at);
                              const end = new Date(task.completed_at);
                              const diffMs = end.getTime() - start.getTime();
                              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                              const diffDays = Math.floor(diffHours / 24);
                              const remainingHours = diffHours % 24;
                              if (diffDays > 0) return `${diffDays}d ${remainingHours}h`;
                              if (diffHours > 0) return `${diffHours}h`;
                              return 'Less than 1h';
                            })()}
                          </span>
                        </span>
                      ) : task.status === 'in_progress' && task.started_at ? (
                        <span className="text-muted-foreground">
                          In progress for{' '}
                          <span className="font-medium text-foreground">
                            {(() => {
                              const start = new Date(task.started_at);
                              const now = new Date();
                              const diffMs = now.getTime() - start.getTime();
                              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                              const diffDays = Math.floor(diffHours / 24);
                              const remainingHours = diffHours % 24;
                              if (diffDays > 0) return `${diffDays}d ${remainingHours}h`;
                              if (diffHours > 0) return `${diffHours}h`;
                              return 'Less than 1h';
                            })()}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Subtasks Section */}
                <div className="border-t pt-4 mt-4">
                  <SubtaskList 
                    parentTaskId={task.id}
                    subtasks={subtasks}
                    onUpdate={() => {
                      loadSubtasks();
                      onUpdate();
                    }}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.profiles?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.profiles?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{renderCommentWithMentions(comment.body)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2 mt-4 pt-4 border-t">
              <MentionTextarea
                placeholder="Add a comment... (type @ to mention someone)"
                value={newComment}
                onChange={setNewComment}
                users={users}
                rows={3}
              />
              <Button onClick={handleAddComment}>Add Comment</Button>
            </div>
          </TabsContent>

          <TabsContent value="related" className="mt-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {/* Linked Website Page */}
                {linkedWebsitePage && (
                  <div>
                    <h3 className="font-medium mb-3">Linked Website Page</h3>
                    <div
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => navigate(`/website/builds/${linkedWebsitePage.build_id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{linkedWebsitePage.name}</div>
                          <div className="text-xs text-muted-foreground">{linkedWebsitePage.build_name}</div>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Related Channels */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Related Channels</h3>
                    <Dialog open={showLinkChannelDialog} onOpenChange={setShowLinkChannelDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={loadAvailableChannels}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Link Channel
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link Channel to Task</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {availableChannels.map((channel) => (
                              <Card
                                key={channel.id}
                                className="cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => handleLinkChannel(channel.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium">{channel.name}</div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        Stage: {channel.marketing_flow_stages.name}
                                      </div>
                                    </div>
                                    <Badge variant="outline">{channel.status}</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {relatedChannels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No channels linked to this task</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className="relative group flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                          onClick={() => navigate("/marketing/flow")}
                        >
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlinkChannel(channel.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 pr-8">
                            <div className="font-medium text-sm">{channel.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Stage: {channel.marketing_flow_stages.name}
                            </div>
                          </div>
                          <Badge variant="outline">{channel.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related Assets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Related Assets</h3>
                    <Dialog open={showLinkAssetDialog} onOpenChange={setShowLinkAssetDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={loadAvailableAssets}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Link Asset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link Asset to Task</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="grid grid-cols-2 gap-3">
                            {availableAssets.map((asset) => (
                              <Card
                                key={asset.id}
                                className="cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => handleLinkAsset(asset.id)}
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    {(asset.preview_url || (asset.type === 'image' && asset.file_url)) ? (
                                      <div className="w-full h-20 bg-muted rounded overflow-hidden">
                                        <img
                                          src={asset.preview_url || asset.file_url}
                                          alt={asset.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
                                        {getTypeIcon(asset.type)}
                                      </div>
                                    )}
                                    <div className="font-medium text-xs truncate">{asset.title}</div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {relatedAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets linked to this task</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {relatedAssets.map((asset) => (
                        <Card
                          key={asset.id}
                          className="relative group cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => navigate("/assets")}
                        >
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlinkAsset(asset.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              {(asset.preview_url || (asset.type === 'image' && asset.file_url)) ? (
                                <div className="w-full h-24 bg-muted rounded overflow-hidden">
                                  <img
                                    src={asset.preview_url || asset.file_url}
                                    alt={asset.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                                  {getTypeIcon(asset.type)}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-sm truncate">{asset.title}</div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {asset.type}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related Meetings */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Related Meetings</h3>
                    <Dialog open={showLinkMeetingDialog} onOpenChange={setShowLinkMeetingDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={loadAvailableMeetings}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Link Meeting
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link Meeting to Task</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-2">
                            {availableMeetings.map((meeting) => (
                              <div
                                key={meeting.id}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                                onClick={() => handleLinkMeeting(meeting.id)}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{extractMeetingTitle(meeting.summary)}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(meeting.date_time).toLocaleString()}
                                  </div>
                                </div>
                                <Badge variant="outline">{meeting.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {relatedMeetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings linked to this task</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="group flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                          onClick={() => navigate(`/meetings/${meeting.id}`)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{extractMeetingTitle(meeting.summary)}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(meeting.date_time).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{meeting.status}</Badge>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkMeeting(meeting.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Action Buttons - Always Visible */}
        <div className="flex gap-2 pt-4 mt-4 border-t">
          <Button onClick={handleSave} className="flex-1">Save Changes</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {isAdminOrFMM && (
            <DeleteTaskDialog
              taskTitle={task.title}
              taskId={task.id}
              onConfirm={handleDeleteTask}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </div>

      </SheetContent>
    </Sheet>
  );
}
