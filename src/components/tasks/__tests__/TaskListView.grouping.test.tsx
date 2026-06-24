import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskListView } from "@/components/tasks/TaskListView";

const columns = [
  { id: "c-review", key: "review", name: "In Review", color: "#000", mapped_status: "in_progress" as const },
  { id: "c-done", key: "done", name: "Done", color: "#0a0", mapped_status: "done" as const },
];

const tasks = [
  { id: "t1", title: "Custom-column task", priority: "normal", status: "in_progress", column_id: "c-review" },
];

describe("TaskListView grouping", () => {
  it("places a task in its column even when column.key != status enum", () => {
    render(
      <TaskListView
        tasks={tasks}
        taskColumns={columns}
        onTaskClick={vi.fn()}
        onCreateTask={vi.fn()}
      />
    );
    // The count badge in the AccordionTrigger is always visible (not gated by expand state).
    // "In Review" group should show count "1" when the task is correctly grouped by column_id.
    const triggers = screen.getAllByRole("button");
    const reviewTrigger = triggers.find((btn) =>
      btn.textContent?.includes("In Review")
    );
    expect(reviewTrigger).toBeDefined();
    // The badge text should contain "1" (one task grouped here)
    expect(reviewTrigger!.textContent).toContain("1");
  });
});
