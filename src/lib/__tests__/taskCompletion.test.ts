import { describe, it, expect, vi } from "vitest";

// Prevent the Supabase singleton from creating a real client (and its
// autoRefreshToken timer) when taskCompletion.ts is imported. Only pure
// functions are tested here — no Supabase calls are made.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { resolveCompletionUpdate, type CompletionColumn } from "@/lib/taskCompletion";

const columns: CompletionColumn[] = [
  { id: "col-todo", mapped_status: "to_do", display_order: 0 },
  { id: "col-prog", mapped_status: "in_progress", display_order: 1 },
  { id: "col-done", mapped_status: "done", display_order: 2 },
];

describe("resolveCompletionUpdate", () => {
  it("completing → status done + the done column", () => {
    expect(resolveCompletionUpdate(columns, true)).toEqual({
      status: "done",
      column_id: "col-done",
    });
  });

  it("un-completing → status to_do + the lowest-order to_do column", () => {
    const reordered: CompletionColumn[] = [
      { id: "col-todo-b", mapped_status: "to_do", display_order: 5 },
      { id: "col-todo-a", mapped_status: "to_do", display_order: 1 },
    ];
    expect(resolveCompletionUpdate(reordered, false)).toEqual({
      status: "to_do",
      column_id: "col-todo-a",
    });
  });

  it("returns null column_id when no column maps to the target status", () => {
    const onlyProg: CompletionColumn[] = [
      { id: "col-prog", mapped_status: "in_progress", display_order: 0 },
    ];
    expect(resolveCompletionUpdate(onlyProg, true)).toEqual({
      status: "done",
      column_id: null,
    });
  });

  it("tolerates empty column list", () => {
    expect(resolveCompletionUpdate([], true)).toEqual({ status: "done", column_id: null });
  });
});
