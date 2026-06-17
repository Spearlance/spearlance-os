import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  column_id?: string;
  due_date?: string;
  color?: string;
  assignees?: Array<{ id: string; name: string; avatar_url?: string }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  subtask_count?: number;
  completed_subtasks?: number;
}

interface TaskListViewProps {
  tasks: Task[];
  taskColumns: Array<{ id: string; key: string; name: string; color: string; mapped_status?: string }>;
  onTaskClick: (task: Task) => void;
  onCreateTask: () => void;
  groupBy?: "status" | "priority";
}

export const TaskListView = ({
  tasks,
  taskColumns,
  onTaskClick,
  onCreateTask,
  groupBy = "status",
}: TaskListViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const groupTasks = () => {
    if (groupBy === "status") {
      // Dynamically create groups based on taskColumns
      const grouped: Record<string, Task[]> = {};
      
      // Initialize groups for each column
      taskColumns.forEach(column => {
        grouped[column.name] = [];
      });
      
      // Group tasks by column identity, falling back to mapped_status
      tasks.forEach(task => {
        const column =
          taskColumns.find(col => col.id === task.column_id) ??
          taskColumns.find(col => col.mapped_status === task.status);
        if (column) {
          grouped[column.name].push(task);
        }
      });
      
      return grouped;
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

      <Accordion 
        type="multiple" 
        value={expandedCategories}
        onValueChange={setExpandedCategories}
        className="space-y-2"
      >
        {Object.entries(groupedTasks).map(([group, groupTasks]) => {
          // Find the column color for visual consistency
          const columnColor = taskColumns.find(col => col.name === group)?.color || "#6B7280";
          
          return (
            <AccordionItem 
              key={group} 
              value={group}
              className="border rounded-lg"
              style={{ borderColor: `${columnColor}40` }}
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: columnColor }}
                  />
                  <h3 className="font-semibold text-lg">{group}</h3>
                  <span 
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${columnColor}20`,
                      color: columnColor
                    }}
                  >
                    {groupTasks.length}
                  </span>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {groupTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks in this category</p>
                  ) : (
                    groupTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => onTaskClick(task)} 
                      />
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
