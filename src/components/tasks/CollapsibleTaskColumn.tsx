import type { ComponentProps, CSSProperties } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/tasks/TaskCard";

type CardTask = ComponentProps<typeof TaskCard>["task"];

interface CollapsibleTaskColumnProps<T extends CardTask> {
  column: { key: string; name: string; color: string };
  tasks: T[];
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  onTaskClick: (task: T) => void;
}

/**
 * A board column that collapses to a vertical strip. Used for the terminal
 * columns (Done, Cancelled) so closed work stays out of the way but remains a
 * drop target and can be opened to review.
 */
export function CollapsibleTaskColumn<T extends CardTask>({
  column,
  tasks,
  expanded,
  onToggle,
  onTaskClick,
}: CollapsibleTaskColumnProps<T>) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out shrink-0",
        expanded ? "w-[320px]" : "w-[60px]"
      )}
    >
      {!expanded ? (
        <Droppable droppableId={column.key}>
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="h-full">
              <button
                onClick={() => onToggle(true)}
                className={cn(
                  "h-full w-full rounded-lg border-2 relative overflow-hidden hover:shadow-md transition-all",
                  snapshot.isDraggingOver && "ring-2 ring-offset-2"
                )}
                style={{
                  backgroundColor: `${column.color}15`,
                  borderColor: snapshot.isDraggingOver ? column.color : `${column.color}40`,
                  ...(snapshot.isDraggingOver && ({ "--tw-ring-color": column.color } as CSSProperties)),
                }}
                aria-label={`Expand ${column.name} column`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: column.color }}
                  >
                    {tasks.length}
                  </div>
                  <div
                    className="text-sm font-semibold tracking-wider"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  >
                    {column.name.toUpperCase()}
                  </div>
                </div>
              </button>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className="space-y-4 h-full">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: column.color }} />
            <h2 className="font-semibold text-lg flex-1">{column.name}</h2>
            <Badge variant="secondary">{tasks.length}</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(false)}
              className="h-8 w-8"
              aria-label={`Collapse ${column.name} column`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <Droppable droppableId={column.key}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "space-y-3 min-h-[200px] rounded-lg p-4 transition-colors",
                  snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/20"
                )}
                style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => onTaskClick(task)}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </div>
  );
}
