import { describe, it, expect } from "vitest";
import { isQaState, qaStateLabel, qaStateForVerdict, QA_STATES } from "../taskQa";

describe("taskQa", () => {
  it("recognises only the four pipeline states", () => {
    for (const s of QA_STATES) expect(isQaState(s)).toBe(true);
    expect(isQaState("done")).toBe(false);
    expect(isQaState(null)).toBe(false);
  });

  it("labels states for humans", () => {
    expect(qaStateLabel("ready_for_review")).toBe("Ready for review");
    expect(qaStateLabel("something_new")).toBe("something new");
    expect(qaStateLabel(null)).toBe("");
  });

  it("maps verdicts onto the next pipeline state", () => {
    expect(qaStateForVerdict("approved")).toBe("qa_approved");
    expect(qaStateForVerdict("approved_with_notes")).toBe("qa_approved");
    expect(qaStateForVerdict("revisions_required")).toBe("revisions_required");
    expect(qaStateForVerdict("error")).toBeNull();
  });
});
