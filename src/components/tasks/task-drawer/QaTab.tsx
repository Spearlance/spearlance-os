import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ClipboardCheck, ExternalLink, KeyRound, Loader2, RotateCcw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QaStateBadge } from "@/components/tasks/QaStateBadge";
import { isTerminalStatus } from "@/lib/taskStatus";
import {
  DEFAULT_QA_TARGET_STATE,
  QA_CLOSED_BY_LABELS,
  QA_MAX_ATTEMPTS,
  QA_TARGET_STATE_LABELS,
  QA_VERDICT_LABELS,
  findCredentialLeak,
  isValidCredentialRef,
  qaStateForVerdict,
  qaSubmissionBlocker,
  visibleQaRuns,
  type QaClosedBy,
  type QaFinding,
  type QaTargetState,
  type QaVerdict,
} from "@/lib/taskQa";

type QaRunRow = Database["public"]["Tables"]["task_qa_runs"]["Row"] & {
  submitter?: { name: string | null } | null;
};

export interface QaFields {
  acceptance_criteria: string;
  qa_target_url: string;
  qa_target_state: string;
  qa_credential_ref: string;
}

interface QaTabProps {
  task: {
    id: string;
    client_id: string;
    status: string;
    qa_state?: string | null;
    qa_state_changed_at?: string | null;
    qa_attempts?: number | null;
  };
  fields: QaFields;
  setFields: (fields: QaFields) => void;
  onUpdate: () => void;
  /** Lets the drawer mirror the pipeline state (tab indicator) without a refetch. */
  onStateChange?: (next: { qa_state: string | null; qa_state_changed_at: string | null }) => void;
}

const VERDICT_CLASSES: Record<QaVerdict, string> = {
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  approved_with_notes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  revisions_required: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  error: "bg-muted text-muted-foreground border-border",
};

function asFindings(value: Json): QaFinding[] {
  if (!Array.isArray(value)) return [];
  return value.map((f): QaFinding => {
    if (typeof f === "string") return { summary: f };
    if (f && typeof f === "object" && !Array.isArray(f)) {
      const o = f as Record<string, Json>;
      return {
        summary: typeof o.summary === "string" ? o.summary : JSON.stringify(f),
        severity: typeof o.severity === "string" ? (o.severity as QaFinding["severity"]) : undefined,
        location: typeof o.location === "string" ? o.location : undefined,
        detail: typeof o.detail === "string" ? o.detail : undefined,
        code: typeof o.code === "string" ? o.code : undefined,
      };
    }
    return { summary: JSON.stringify(f) };
  });
}

/**
 * QA tab of the task drawer: the falsifiable context the QA agent checks
 * against (criteria + target + optional Vault credential ref), the task's
 * place in the QA pipeline, and the append-only run log. "Record verdict"
 * lets a person close the loop by hand and can correct an earlier verdict by
 * superseding it (the old run stays, hidden by default).
 */
export function QaTab({ task, fields, setFields, onUpdate, onStateChange }: QaTabProps) {
  const [qaState, setQaState] = useState<string | null>(task.qa_state ?? null);
  const [qaChangedAt, setQaChangedAt] = useState<string | null>(task.qa_state_changed_at ?? null);
  // The drawer re-reads the row after mount; follow it.
  useEffect(() => {
    setQaState(task.qa_state ?? null);
    setQaChangedAt(task.qa_state_changed_at ?? null);
  }, [task.qa_state, task.qa_state_changed_at]);
  const [runs, setRuns] = useState<QaRunRow[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<QaVerdict>("approved");
  const [notes, setNotes] = useState("");
  const [correctPrevious, setCorrectPrevious] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    const { data, error } = await supabase
      .from("task_qa_runs")
      .select("*, submitter:profiles!task_qa_runs_submitted_by_fkey(name)")
      .eq("task_id", task.id)
      .order("started_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load QA runs", { description: error.message });
    }
    setRuns((data as QaRunRow[]) ?? []);
    setLoadingRuns(false);
  }, [task.id]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const persistFields = () => ({
    acceptance_criteria: fields.acceptance_criteria || null,
    qa_target_url: fields.qa_target_url || null,
    qa_target_state: fields.qa_target_state || null,
    qa_credential_ref: fields.qa_credential_ref.trim() || null,
  });

  const setState = async (next: string | null, successMessage: string) => {
    setBusy(true);
    // The QA context is saved together with the state so the agent never picks
    // up a task whose criteria only exist in unsaved drawer edits.
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...persistFields(), qa_state: next })
      .eq("id", task.id)
      .select("qa_state, qa_state_changed_at")
      .single();
    setBusy(false);
    if (error) {
      toast.error("Couldn't update QA state", { description: error.message });
      return false;
    }
    setQaState(data?.qa_state ?? null);
    setQaChangedAt(data?.qa_state_changed_at ?? null);
    onStateChange?.({ qa_state: data?.qa_state ?? null, qa_state_changed_at: data?.qa_state_changed_at ?? null });
    toast.success(successMessage);
    onUpdate();
    return true;
  };

  const closed = isTerminalStatus(task.status);
  const blocker = qaSubmissionBlocker(fields);
  const criteriaLeak = findCredentialLeak(fields.acceptance_criteria);
  const credentialRefInvalid = !isValidCredentialRef(fields.qa_credential_ref.trim());
  const canSend = !blocker && !credentialRefInvalid;

  const handleSendToQa = () => {
    if (blocker) {
      toast.error("Can't send to QA", { description: blocker });
      return;
    }
    if (credentialRefInvalid) {
      toast.error("Can't send to QA", { description: "Credential ref must look like qa_cred_client_editor (lowercase, digits, underscores)." });
      return;
    }
    return setState("ready_for_review", "Sent to QA");
  };
  const handleWithdraw = () => setState(null, "Removed from QA");

  const visibleRuns = useMemo(() => visibleQaRuns(runs, showSuperseded), [runs, showSuperseded]);
  const supersededCount = runs.length - visibleQaRuns(runs, false).length;
  const latestClosedRun = useMemo(
    () => runs.find((r) => r.finished_at && !r.superseded_by) ?? null,
    [runs],
  );
  const openRun = useMemo(() => runs.find((r) => !r.finished_at) ?? null, [runs]);

  const handleRecordVerdict = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const findings: QaFinding[] = notes.trim()
      ? [{ summary: notes.trim(), severity: verdict === "revisions_required" ? "major" : "note" }]
      : [];
    const supersedes = correctPrevious && latestClosedRun ? latestClosedRun.id : null;
    const { data: inserted, error: runError } = await supabase
      .from("task_qa_runs")
      .insert({
        task_id: task.id,
        client_id: task.client_id,
        verdict,
        target_url: fields.qa_target_url || null,
        target_state: fields.qa_target_state || null,
        findings: findings as unknown as Json,
        finished_at: new Date().toISOString(),
        acked_at: new Date().toISOString(),
        closed_by: "manual",
        submitted_by: user?.id ?? null,
        agent_thread_path: "manual",
        supersedes,
      })
      .select("id")
      .single();
    if (runError || !inserted) {
      setBusy(false);
      toast.error("Couldn't record verdict", { description: runError?.message });
      return;
    }
    if (supersedes) {
      const { error: supErr } = await supabase.rpc("task_qa_supersede_run", { p_old: supersedes, p_new: inserted.id });
      if (supErr) {
        toast.error("Verdict saved, but the old run couldn't be marked as corrected", { description: supErr.message });
      }
    }
    const next = qaStateForVerdict(verdict);
    setBusy(false);
    if (next) {
      await setState(next, `Verdict recorded: ${QA_VERDICT_LABELS[verdict]}`);
    } else {
      toast.success("Verdict recorded");
      onUpdate();
    }
    setNotes("");
    setCorrectPrevious(false);
    loadRuns();
  };

  const attempts = task.qa_attempts ?? 0;

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-5">
        {/* Context the agent checks against */}
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="qa-criteria">
              Acceptance criteria <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="qa-criteria"
              value={fields.acceptance_criteria}
              onChange={(e) => setFields({ ...fields, acceptance_criteria: e.target.value })}
              placeholder={"What must be true on the page for this task to be done? One check per line, e.g.\n- Hero H2 reads \"Roof repair in Concord NH\"\n- Phone number in header matches the client record\n- Contact form submits without errors"}
              className={cn("min-h-[110px] text-sm", criteriaLeak && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!criteriaLeak}
            />
            {criteriaLeak ? (
              <p className="text-xs text-destructive">
                This looks like it contains {criteriaLeak}. Logins never go here: store them in Vault and reference them below.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Written so it can be proven false. The QA agent checks the page against exactly this.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="qa-url">
                QA target URL <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="qa-url"
                  type="url"
                  value={fields.qa_target_url}
                  onChange={(e) => setFields({ ...fields, qa_target_url: e.target.value })}
                  placeholder="https://www.client-site.com/page"
                />
                {fields.qa_target_url && (
                  <Button asChild variant="outline" size="icon" aria-label="Open QA target">
                    <a href={fields.qa_target_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check against</Label>
              <Select
                value={fields.qa_target_state || DEFAULT_QA_TARGET_STATE}
                onValueChange={(v) => setFields({ ...fields, qa_target_state: v as QaTargetState })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QA_TARGET_STATE_LABELS) as QaTargetState[]).map((s) => (
                    <SelectItem key={s} value={s}>{QA_TARGET_STATE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {fields.qa_target_state === "editor" && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The editor needs a logged-in browser session, so the agent can only report it as unverifiable. Use the published site unless a person is doing the check.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="qa-cred" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Credential ref <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="qa-cred"
              value={fields.qa_credential_ref}
              onChange={(e) => setFields({ ...fields, qa_credential_ref: e.target.value })}
              placeholder="qa_cred_acme_editor"
              className={cn("font-mono text-sm", credentialRefInvalid && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={credentialRefInvalid}
              spellCheck={false}
            />
            <p className={cn("text-xs", credentialRefInvalid ? "text-destructive" : "text-muted-foreground")}>
              {credentialRefInvalid
                ? "Must look like qa_cred_client_editor: lowercase letters, digits and underscores."
                : "Name of a Vault secret holding the login the agent needs. The value is resolved server-side and never stored on the task."}
            </p>
          </div>
        </section>

        {/* Pipeline state + actions */}
        <section className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">QA status</span>
            {qaState ? (
              <QaStateBadge qaState={qaState} />
            ) : (
              <span className="text-sm text-muted-foreground">Not in QA</span>
            )}
            {qaChangedAt && qaState && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(qaChangedAt), { addSuffix: true })}
              </span>
            )}
            {attempts > 0 && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                attempt {Math.min(attempts, QA_MAX_ATTEMPTS)} of {QA_MAX_ATTEMPTS}
              </Badge>
            )}
          </div>

          {qaState === "qa_running" && openRun && (
            <p className="text-xs text-muted-foreground">
              Run opened {formatDistanceToNow(new Date(openRun.started_at), { addSuffix: true })}
              {openRun.acked_at
                ? `, agent acknowledged ${formatDistanceToNow(new Date(openRun.acked_at), { addSuffix: true })}.`
                : ", waiting for the agent to acknowledge. Re-queued automatically after 5 minutes if it doesn't."}
            </p>
          )}

          {closed ? (
            <p className="text-xs text-muted-foreground">
              This task is closed. Reopen it to send it through QA again.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleSendToQa}
                disabled={busy || !canSend || qaState === "ready_for_review" || qaState === "qa_running"}
                title={blocker ?? undefined}
              >
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {qaState === "revisions_required" ? "Send back to QA" : "Send to QA"}
              </Button>
              {qaState && qaState !== "qa_running" && (
                <Button size="sm" variant="outline" onClick={handleWithdraw} disabled={busy}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Remove from QA
                </Button>
              )}
            </div>
          )}

          {!closed && blocker && qaState !== "ready_for_review" && qaState !== "qa_running" && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{blocker}</p>
          )}
        </section>

        {/* Manual verdict: closes the loop by hand, or corrects the agent */}
        {!closed && (
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Record a verdict</h4>
              <p className="text-xs text-muted-foreground">
                For manual QA, or to overrule the agent. Appends a run to the log.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Verdict</Label>
                <Select value={verdict} onValueChange={(v) => setVerdict(v as QaVerdict)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QA_VERDICT_LABELS) as QaVerdict[]).map((v) => (
                      <SelectItem key={v} value={v}>{QA_VERDICT_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="qa-notes">Findings</Label>
                <Textarea
                  id="qa-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What you checked and what you found"
                  className="min-h-[38px] text-sm"
                />
              </div>
            </div>
            {latestClosedRun && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={correctPrevious}
                  onCheckedChange={(v) => setCorrectPrevious(v === true)}
                  className="mt-0.5"
                />
                <span>
                  This corrects the latest verdict
                  {latestClosedRun.verdict ? ` (${QA_VERDICT_LABELS[latestClosedRun.verdict as QaVerdict] ?? latestClosedRun.verdict})` : ""}.
                  The old run stays in the log, marked as superseded.
                </span>
              </label>
            )}
            <Button size="sm" variant="secondary" onClick={handleRecordVerdict} disabled={busy}>
              Record verdict
            </Button>
          </section>
        )}

        {/* Run log */}
        <section className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">QA runs</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {supersededCount > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={showSuperseded} onCheckedChange={(v) => setShowSuperseded(v === true)} />
                  show {supersededCount} corrected
                </label>
              )}
              <span>{visibleRuns.length} shown</span>
            </div>
          </div>
          {loadingRuns ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading
            </div>
          ) : visibleRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {visibleRuns.map((run) => {
                const findings = asFindings(run.findings);
                const verdictKey = (run.verdict ?? "error") as QaVerdict;
                const who = run.submitter?.name || (run.agent_thread_path === "manual" ? "Manual" : "QA agent");
                const closedBy = run.closed_by as QaClosedBy | null;
                const closedByLabel = closedBy && closedBy !== "agent" && closedBy !== "manual" ? QA_CLOSED_BY_LABELS[closedBy] : null;
                const isSuperseded = !!run.superseded_by;
                return (
                  <li
                    key={run.id}
                    className={cn("rounded-md border p-3 space-y-2 bg-muted/20", isSuperseded && "opacity-60 border-dashed")}
                  >
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", VERDICT_CLASSES[verdictKey])}>
                        {run.verdict ? QA_VERDICT_LABELS[verdictKey] ?? run.verdict : "In progress"}
                      </Badge>
                      {closedByLabel && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {closedByLabel}
                        </Badge>
                      )}
                      {isSuperseded && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">corrected</Badge>
                      )}
                      {run.supersedes && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">correction</Badge>
                      )}
                      <span className="text-muted-foreground">
                        {who} · {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        {run.finished_at && run.verdict ? "" : run.acked_at ? " · running" : " · not acknowledged yet"}
                      </span>
                      {run.target_url && (
                        <a
                          href={run.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {run.target_state ? QA_TARGET_STATE_LABELS[run.target_state as QaTargetState] ?? run.target_state : "target"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {findings.length > 0 && (
                      <ul className="space-y-1">
                        {findings.map((f, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            {f.severity && (
                              <span className={cn(
                                "shrink-0 text-[10px] uppercase tracking-wide mt-0.5",
                                f.severity === "blocker" || f.severity === "major" ? "text-red-600 dark:text-red-300" : "text-muted-foreground"
                              )}>
                                {f.severity}
                              </span>
                            )}
                            <span className="min-w-0">
                              {f.summary}
                              {f.location && <span className="text-muted-foreground"> — {f.location}</span>}
                              {f.detail && <span className="block text-xs text-muted-foreground">{f.detail}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
