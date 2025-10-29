import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_date?: string;
  color?: string;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtask_count?: number;
  completed_subtasks?: number;
}

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: () => void;
  groupBy?: "status" | "priority";
}

export const TaskListView = ({
  tasks,
  onTaskClick,
  onCreateTask,
  groupBy = "status",
}: TaskListViewProps) => {
  const groupTasks = () => {
    if (groupBy === "status") {
      return {
        "To Do": tasks.filter((t) => t.status === "to_do"),
        "In Progress": tasks.filter((t) => t.status === "in_progress"),
        Done: tasks.filter((t) => t.status === "done"),
      };
    } else {
      return {
        Urgent: tasks.filter((t) => t.priority === "urgent"),
        High: tasks.filter((t) => t.priority === "high"),
        Normal: tasks.filter((t) => t.priority === "normal"),
        Low: tasks.filter((t) => t.priority === "low"),
      };
    }
  };

  const groupedTasks = groupTasks();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {Object.entries(groupedTasks).map(([group, groupTasks]) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{group}</h3>
            <span className="text-sm text-muted-foreground">({groupTasks.length})</span>
          </div>
          <div className="space-y-2">
            {groupTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this group</p>
            ) : (
              groupTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
