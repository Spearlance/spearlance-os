import { describe, it, expect } from "vitest";
import {
  TASK_STATUSES,
  TERMINAL_TASK_STATUSES,
  isTerminalStatus,
  isOpenStatus,
  taskStatusLabel,
} from "../taskStatus";

describe("taskStatus", () => {
  it("treats done and cancelled as terminal, everything else as open", () => {
    expect(isTerminalStatus("done")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("to_do")).toBe(false);
    expect(isTerminalStatus("in_progress")).toBe(false);
    expect(isTerminalStatus("blocked")).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
    expect(isTerminalStatus(undefined)).toBe(false);
    expect(isOpenStatus("blocked")).toBe(true);
    expect(isOpenStatus("cancelled")).toBe(false);
  });

  it("lists every terminal status among the known statuses", () => {
    for (const s of TERMINAL_TASK_STATUSES) expect(TASK_STATUSES).toContain(s);
  });

  it("labels known statuses and humanises unknown ones", () => {
    expect(taskStatusLabel("in_progress")).toBe("In Progress");
    expect(taskStatusLabel("cancelled")).toBe("Cancelled");
    expect(taskStatusLabel("ready_for_review")).toBe("ready for review");
    expect(taskStatusLabel(null)).toBe("");
  });
});
