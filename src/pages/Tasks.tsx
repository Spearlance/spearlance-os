import { useEffect, useState } from "react";
import { useClient } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, MessageSquare, Paperclip, Filter, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TemplateStageManager } from "@/components/tasks/TemplateStageManager";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_user_id: string | null;
  client_id: string;
  related_asset_ids: string[];
  related_meeting_ids: string[];
  linked_channel_id: string | null;
  profiles?: {
    name: string;
  };
}

export default function Tasks() {
  const { selectedClient } = useClient();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    to_do: [],
    in_progress: [],
    done: [],
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [marketingChannels, setMarketingChannels] = useState<Array<{id: string, name: string}>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast } = useToast();

  const isAdminOrFMM = userRole === 'admin' || userRole === 'fmm';

  useEffect(() => {
    loadUserRole();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadTasks();
      loadMarketingChannels();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient && currentUserId) {
      console.log('Filters changed:', { assignmentFilter, channelFilter });
      loadTasks();
    }
  }, [assignmentFilter, channelFilter]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data) setUserRole(data.role);
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadMarketingChannels = async () => {
    if (!selectedClient) return;

    // First get the flow IDs for this client
    const { data: flows } = await supabase
      .from('marketing_flows')
      .select('id')
      .eq('client_id', selectedClient.id);

    if (!flows || flows.length === 0) {
      setMarketingChannels([]);
      return;
    }

    const flowIds = flows.map(f => f.id);

    // Then get stages for those flows
    const { data: stages } = await supabase
      .from('marketing_flow_stages')
      .select('id')
      .in('flow_id', flowIds);

    if (!stages || stages.length === 0) {
      setMarketingChannels([]);
      return;
    }

    const stageIds = stages.map(s => s.id);

    // Finally get channels for those stages
    const { data, error } = await supabase
      .from('marketing_flow_channels')
      .select('id, name')
      .in('stage_id', stageIds)
      .order('name');

    if (error) {
      console.error('Error loading marketing channels:', error);
      return;
    }

    if (data) {
      setMarketingChannels(data);
      console.log('Loaded channels:', data);
    }
  };

  const loadTasks = async () => {
    if (!selectedClient) return;

    let query = supabase
      .from("tasks")
      .select(`
        *,
        profiles:assignee_user_id (name)
      `)
      .eq("client_id", selectedClient.id);

    // Apply assignment filter
    if (assignmentFilter === 'mine' && currentUserId) {
      query = query.eq('assignee_user_id', currentUserId);
    }

    // Apply channel filter
    if (channelFilter !== 'all') {
      console.log('Filtering by channel:', channelFilter);
      query = query.eq('linked_channel_id', channelFilter);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading tasks", variant: "destructive" });
      return;
    }

    const grouped: Record<string, Task[]> = {
      to_do: [],
      in_progress: [],
      done: [],
    };

    data?.forEach((task: any) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    setTasks(grouped);
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceColumn = [...tasks[source.droppableId]];
    const destColumn = source.droppableId === destination.droppableId 
      ? sourceColumn 
      : [...tasks[destination.droppableId]];

    const [movedTask] = sourceColumn.splice(source.index, 1);
    movedTask.status = destination.droppableId as string;
    destColumn.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceColumn,
      [destination.droppableId]: destColumn,
    });

    const { error } = await supabase
      .from("tasks")
      .update({ status: destination.droppableId as any })
      .eq("id", draggableId);

    if (error) {
      toast({ title: "Error updating task", variant: "destructive" });
      loadTasks();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "normal": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
      </div>

      <Tabs defaultValue="board" className="space-y-6">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          {isAdminOrFMM && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          {/* Filter Section */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            {/* Assignment Filter */}
            <ToggleGroup 
              type="single" 
              value={assignmentFilter} 
              onValueChange={(value) => value && setAssignmentFilter(value as 'all' | 'mine')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="all" className="text-sm">
                All Tasks
              </ToggleGroupItem>
              <ToggleGroupItem value="mine" className="text-sm">
                My Tasks
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {marketingChannels.map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {(assignmentFilter !== 'all' || channelFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssignmentFilter('all');
                  setChannelFilter('all');
                }}
                className="ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-6">
          {["to_do", "in_progress", "done"].map((columnId) => (
            <div key={columnId} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg capitalize">
                  {columnId.replace("_", " ")}
                </h2>
                <Badge variant="secondary">{tasks[columnId].length}</Badge>
              </div>

              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] rounded-lg p-4 transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                    }`}
                  >
                    {tasks[columnId].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            }`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs shrink-0">
                                  {task.priority}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {task.profiles && (
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {task.profiles.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                )}
                                {task.due_date && (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </div>
                                )}
                                {task.related_meeting_ids.length > 0 && (
                                  <MessageSquare className="h-3 w-3" />
                                )}
                                {task.related_asset_ids.length > 0 && (
                                  <Paperclip className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={loadTasks}
          isAdminOrFMM={isAdminOrFMM}
        />
      )}
        </TabsContent>

        {isAdminOrFMM && (
          <TabsContent value="templates" className="space-y-0">
            <TemplateStageManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
