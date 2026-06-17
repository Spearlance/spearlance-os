import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MyTaskCard } from "@/components/tasks/MyTaskCard";
import type { MyTask } from "@/hooks/useMyTasks";

const base: MyTask = {
  id: "t1", title: "Write copy", description: null, status: "to_do",
  priority: "normal", due_date: null, client_id: "c1", client_name: "ABC",
  linked_channel_id: null,
};

const renderCard = (task: MyTask, onToggleComplete = vi.fn()) =>
  render(
    <MemoryRouter>
      <MyTaskCard task={task} onToggleComplete={onToggleComplete} />
    </MemoryRouter>
  );

describe("MyTaskCard completion", () => {
  it("fires onToggleComplete(task, true) when the complete checkbox is clicked", () => {
    const onToggle = vi.fn();
    renderCard(base, onToggle);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(base, true);
  });

  it("does not open the drawer when the complete checkbox is clicked", () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <MyTaskCard task={base} onClick={onClick} onToggleComplete={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
