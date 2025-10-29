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
import { FileText, Image, Link as LinkIcon, FileVideo, FileAudio, ExternalLink, X, Plus, Trash2 } from "lucide-react";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AssigneeSelector } from "./AssigneeSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";

interface TaskDrawerProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isAdminOrFMM?: boolean;
}

export function TaskDrawer({ task, open, onOpenChange, onUpdate, isAdminOrFMM = false }: TaskDrawerProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [color, setColor] = useState(task.color || "#6B7280");
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [relatedAssets, setRelatedAssets] = useState<any[]>([]);
  const [relatedMeetings, setRelatedMeetings] = useState<any[]>([]);
  const [relatedChannels, setRelatedChannels] = useState<any[]>([]);
  const [showLinkAssetDialog, setShowLinkAssetDialog] = useState(false);
  const [showLinkMeetingDialog, setShowLinkMeetingDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [availableMeetings, setAvailableMeetings] = useState<any[]>([]);
  const [showLinkChannelDialog, setShowLinkChannelDialog] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadComments();
    loadUsers();
    loadRelatedItems();
    loadCurrentAssignees();
  }, [task.id]);

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
        title,
        description,
        status,
        priority,
        due_date: dueDate || null,
        color,
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

    toast({ title: "Task updated successfully" });
    onUpdate();
    onOpenChange(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("task_comments")
      .insert({
        task_id: task.id,
        user_id: user.id,
        body: newComment,
      });

    if (error) {
      toast({ title: "Error adding comment", variant: "destructive" });
      return;
    }

    setNewComment("");
    loadComments();
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
      <SheetContent className="sm:max-w-[600px] w-full">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6 flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to_do">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
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
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)}
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
                            style={{ backgroundColor: color }}
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
                                color === colorOption ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                              }`}
                              style={{ backgroundColor: colorOption }}
                              onClick={() => setColor(colorOption)}
                              aria-label={`Select color ${colorOption}`}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 pt-4">
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
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
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
                      <p className="text-sm">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2 mt-4 pt-4 border-t">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddComment}>Add Comment</Button>
            </div>
          </TabsContent>

          <TabsContent value="related" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
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
                                  <div className="font-medium text-sm">{meeting.summary}</div>
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
                            <div className="font-medium text-sm">{meeting.summary}</div>
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

      </SheetContent>
    </Sheet>
  );
}
