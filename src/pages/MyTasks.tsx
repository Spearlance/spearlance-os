import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClient } from "@/contexts/ClientContext";
import { useMyTasks, GroupBy, MyTask } from "@/hooks/useMyTasks";
import { MyTaskCard } from "@/components/tasks/MyTaskCard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  ExternalLink,
  CheckSquare,
  Calendar,
  Building2,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyTasks() {
  const navigate = useNavigate();
  const { clients, setSelectedClient } = useClient();
  const { 
    tasks, 
    loading, 
    refetch, 
    getGrouped, 
    totalCount 
  } = useMyTasks();
  
  const [groupBy, setGroupBy] = useState<GroupBy>("due_date");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : !prev[key],
    }));
  };

  const isGroupExpanded = (key: string) => {
    return expandedGroups[key] !== false; // Default to expanded
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Get grouped data based on filtered tasks
  const groupedData = getGrouped(groupBy);

  // Filter groups based on filtered tasks
  const getFilteredGroupData = () => {
    const result: typeof groupedData = {};
    const filteredTaskIds = new Set(filteredTasks.map(t => t.id));
    
    Object.entries(groupedData).forEach(([key, group]) => {
      const filteredGroupTasks = group.tasks.filter(t => filteredTaskIds.has(t.id));
      if (filteredGroupTasks.length > 0) {
        result[key] = {
          ...group,
          tasks: filteredGroupTasks,
        };
      }
    });
    
    return result;
  };

  const filteredGroupData = getFilteredGroupData();

  const handleViewInBoard = (task: MyTask) => {
    // Find the client and switch to it
    const client = clients.find(c => c.id === task.client_id);
    if (client) {
      setSelectedClient(client);
      navigate("/tasks");
    }
  };

  const handleTaskClick = (task: MyTask) => {
    // Convert MyTask to format expected by TaskDrawer
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      color: task.color,
      client_id: task.client_id,
      linked_channel_id: task.linked_channel_id,
      tags: task.tags,
      is_recurring: task.is_recurring,
      is_recurring_instance: task.is_recurring_instance,
    });
  };

  const groupByOptions = [
    { value: "due_date", label: "Due Date", icon: Calendar },
    { value: "client", label: "Client", icon: Building2 },
    { value: "priority", label: "Priority", icon: Flag },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount} task{totalCount !== 1 ? 's' : ''} across all clients
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              {groupByOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Groups */}
      {Object.keys(filteredGroupData).length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || priorityFilter !== "all" 
              ? "No matching tasks" 
              : "No tasks assigned to you"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || priorityFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Tasks assigned to you will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredGroupData).map(([key, group]) => {
            const isExpanded = isGroupExpanded(key);
            
            return (
              <Collapsible
                key={key}
                open={isExpanded}
                onOpenChange={() => toggleGroup(key)}
              >
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2 -ml-2 hover:bg-transparent"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <span className="font-semibold text-lg">{group.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {group.tasks.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  
                  {/* View All in Board - only for client grouping */}
                  {groupBy === "client" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const client = clients.find(c => c.id === key);
                        if (client) {
                          setSelectedClient(client);
                          navigate("/tasks");
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Board
                    </Button>
                  )}
                </div>
                
                <CollapsibleContent className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.tasks.map(task => (
                      <MyTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        showClient={groupBy !== "client"}
                        onViewInBoard={() => handleViewInBoard(task)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}
