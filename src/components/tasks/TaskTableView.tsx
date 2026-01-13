import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Plus, Globe } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date?: string;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  linked_page_name?: string;
}

interface TaskTableViewProps {
  tasks: Task[];
  taskColumns: Array<{ key: string; name: string; color: string }>;
  onTaskClick: (task: Task) => void;
  onCreateTask: () => void;
}

export const TaskTableView = ({
  tasks,
  taskColumns,
  onTaskClick,
  onCreateTask,
}: TaskTableViewProps) => {
  return (
    <TooltipProvider>
      <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked Page</TableHead>
              <TableHead>Assignees</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onTaskClick(task)}
                >
                  <TableCell className="font-medium">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block max-w-[300px]">{task.title}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{task.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {taskColumns.find(col => col.key === task.status)?.name || task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.linked_page_name ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {task.linked_page_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {task.assignees?.slice(0, 3).map((assignee) => (
                        <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={assignee.avatar_url} />
                          <AvatarFallback className="text-xs">{assignee.name[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees && task.assignees.length > 3 && (
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            +{task.assignees.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {task.tags?.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: tag.color + "20", color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {task.tags && task.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{task.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>
    </TooltipProvider>
  );
};
