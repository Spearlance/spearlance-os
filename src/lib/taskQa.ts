/**
 * AI-QA pipeline vocabulary. Lives in tasks.qa_state (NOT the status enum) and
 * task_qa_runs. Mirrors the CHECK constraints in migrations 20260902100002,
 * 20260902120001, 20260910100000 (qa_credential_ref) and 20260910100001
 * (acked_at / closed_by / supersedes).
 */
export type QaState = "ready_for_review" | "qa_running" | "revisions_required" | "qa_approved";
export type QaVerdict = "approved" | "approved_with_notes" | "revisions_required" | "error";
export type QaTargetState = "editor" | "published";
export type QaClosedBy = "agent" | "dispatch" | "reaper" | "manual" | "task_closed";

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

/**
 * Published is the default: the editor needs a logged-in browser session and
 * my.duda.co refuses headless clients, so an editor-state check can only come
 * back "unverifiable". Keep the option for humans doing manual QA.
 */
export const DEFAULT_QA_TARGET_STATE: QaTargetState = "published";

export const QA_CLOSED_BY_LABELS: Record<QaClosedBy, string> = {
  agent: "QA agent",
  dispatch: "delivery failed",
  reaper: "timed out",
  manual: "manual",
  task_closed: "task closed",
};

/** Retries the reaper allows before it hands the task to a human. Mirrors task_qa_reap(). */
export const QA_MAX_ATTEMPTS = 3;

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
  /** Machine tag set by dispatch / the reaper (no_ack, no_verdict, delivery_failed, task_closed). */
  code?: string;
}

// ---------------------------------------------------------------------------
// Send-to-QA validation
// ---------------------------------------------------------------------------

/**
 * Patterns that mean "a secret is sitting in the acceptance criteria". A live
 * login was found there on prod (2026-09-09) and went out over the dispatch
 * payload. Credentials go in Vault and are referenced by qa_credential_ref.
 *
 * Each entry: a regex and the phrase shown to the user. Case-insensitive.
 */
const CREDENTIAL_PATTERNS: ReadonlyArray<{ re: RegExp; what: string }> = [
  { re: /\b(?:password|passwd|pwd|passcode|pass)\s*(?:[:=]|\bis\b)\s*\S/i, what: "a password" },
  { re: /\bpw\s*[:=]\s*\S/i, what: "a password" },
  { re: /\b(?:api[_ -]?key|apikey|secret[_ -]?key|access[_ -]?token|auth[_ -]?token|bearer)\s*[:=]?\s*[A-Za-z0-9_\-.]{12,}/i, what: "an API key or token" },
  { re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/, what: "a Stripe key" },
  { re: /\bsk-[A-Za-z0-9]{20,}/, what: "an API key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}/, what: "a GitHub token" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, what: "an AWS access key" },
  { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, what: "a JWT" },
  // "login: user@x.com / hunter2", "user@x.com : hunter2"
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+\s*[/:|,]\s*\S{6,}/, what: "an email + password pair" },
  { re: /\b(?:login|credentials?|creds)\s*[:=]\s*\S+\s*[/:|,]\s*\S+/i, what: "login credentials" },
];

/**
 * Returns a human phrase ("a password") when `text` looks like it contains a
 * secret, otherwise null. Deliberately eager: a false positive costs one
 * rewrite, a false negative leaks a login to an external agent.
 */
export function findCredentialLeak(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const { re, what } of CREDENTIAL_PATTERNS) {
    if (re.test(text)) return what;
  }
  return null;
}

export interface QaSubmissionFields {
  acceptance_criteria: string | null | undefined;
  qa_target_url: string | null | undefined;
}

/**
 * Why a task cannot be sent to QA right now, or null when it can. Criteria and
 * a target URL are required (the agent otherwise reports an opinion as a
 * verdict), and the criteria must not carry a credential.
 */
export function qaSubmissionBlocker(fields: QaSubmissionFields): string | null {
  const criteria = (fields.acceptance_criteria ?? "").trim();
  const url = (fields.qa_target_url ?? "").trim();
  if (!criteria) return "Add acceptance criteria before sending to QA.";
  if (!url) return "Add the QA target URL before sending to QA.";
  if (!/^https?:\/\/\S+$/i.test(url)) return "The QA target URL must start with http:// or https://.";
  const leak = findCredentialLeak(criteria);
  if (leak) {
    return `The acceptance criteria look like they contain ${leak}. Put logins in Vault and reference them with a credential ref instead.`;
  }
  return null;
}

/** Vault name a task may point at. Mirrors tasks_qa_credential_ref_check. */
export const QA_CREDENTIAL_REF_RE = /^qa_cred_[a-z0-9_]{1,80}$/;

export function isValidCredentialRef(value: string | null | undefined): boolean {
  return !value || QA_CREDENTIAL_REF_RE.test(value);
}

// ---------------------------------------------------------------------------
// Run log helpers
// ---------------------------------------------------------------------------

export interface QaRunLike {
  id: string;
  superseded_by?: string | null;
}

/** Runs to show by default: corrected (superseded) runs are hidden. */
export function visibleQaRuns<T extends QaRunLike>(runs: T[], showSuperseded = false): T[] {
  return showSuperseded ? runs : runs.filter((r) => !r.superseded_by);
}
