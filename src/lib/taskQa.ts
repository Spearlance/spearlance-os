/**
 * AI-QA pipeline vocabulary. Lives in tasks.qa_state (NOT the status enum) and
 * task_qa_runs. Mirrors the CHECK constraints in migrations 20260902100002 and
 * 20260902120001.
 */
export type QaState = "ready_for_review" | "qa_running" | "revisions_required" | "qa_approved";
export type QaVerdict = "approved" | "approved_with_notes" | "revisions_required" | "error";
export type QaTargetState = "editor" | "published";

export const QA_STATES: readonly QaState[] = [
  "ready_for_review",
  "qa_running",
  "revisions_required",
  "qa_approved",
];

export const QA_STATE_LABELS: Record<QaState, string> = {
  ready_for_review: "Ready for review",
  qa_running: "QA running",
  revisions_required: "Revisions required",
  qa_approved: "QA approved",
};

/** Tailwind classes for the qa_state pill; kept semantic (waiting / working / bad / good). */
export const QA_STATE_CLASSES: Record<QaState, string> = {
  ready_for_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  qa_running: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  revisions_required: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  qa_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

export const QA_VERDICT_LABELS: Record<QaVerdict, string> = {
  approved: "Approved",
  approved_with_notes: "Approved with notes",
  revisions_required: "Revisions required",
  error: "Error",
};

export const QA_TARGET_STATE_LABELS: Record<QaTargetState, string> = {
  editor: "Duda editor",
  published: "Published site",
};

export function isQaState(value: string | null | undefined): value is QaState {
  return !!value && (QA_STATES as readonly string[]).includes(value);
}

export function qaStateLabel(value: string | null | undefined): string {
  if (!value) return "";
  return isQaState(value) ? QA_STATE_LABELS[value] : value.replace(/_/g, " ");
}

/** The qa_state a verdict moves the task into. */
export function qaStateForVerdict(verdict: QaVerdict): QaState | null {
  switch (verdict) {
    case "approved":
    case "approved_with_notes":
      return "qa_approved";
    case "revisions_required":
      return "revisions_required";
    case "error":
      // Leave the task where it was; the run itself records the failure.
      return null;
  }
}

/** Shape of one entry in task_qa_runs.findings. Free-form JSON is tolerated by the UI. */
export interface QaFinding {
  summary: string;
  severity?: "blocker" | "major" | "minor" | "note";
  location?: string;
  detail?: string;
}
