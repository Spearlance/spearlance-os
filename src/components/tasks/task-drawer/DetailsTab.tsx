import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { AssigneeSelector } from "../AssigneeSelector";
import { WatcherSelector } from "../WatcherSelector";
import { SubtaskList } from "../SubtaskList";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { quillModules, quillFormats } from "./quillConfig";

interface EditedTask {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  color: string;
  recurring_schedule: string;
  linked_channel_id: string;
  column_id: string;
}

interface TaskColumn {
  id: string;
  name: string;
  key: string;
  color: string;
  mapped_status: 'to_do' | 'in_progress' | 'done';
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Subtask {
  id: string;
  title: string;
  status: string;
  subtask_order: number;
}

interface DetailsTabProps {
  editedTask: EditedTask;
  setEditedTask: (task: EditedTask) => void;
  taskColumns: TaskColumn[];
  users: User[];
  selectedAssignees: string[];
  setSelectedAssignees: (ids: string[]) => void;
  selectedWatchers: string[];
  setSelectedWatchers: (ids: string[]) => void;
  subtasks: Subtask[];
  onSubtaskUpdate: () => void;
  isAdminOrFMM: boolean;
  task: any;
}

export function DetailsTab({
  editedTask,
  setEditedTask,
  taskColumns,
  users,
  selectedAssignees,
  setSelectedAssignees,
  selectedWatchers,
  setSelectedWatchers,
  subtasks,
  onSubtaskUpdate,
  isAdminOrFMM,
  task,
}: DetailsTabProps) {
  return (
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
            onUpdate={onSubtaskUpdate}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
