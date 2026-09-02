import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ClipboardCheck, ExternalLink, Loader2, RotateCcw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QaStateBadge } from "@/components/tasks/QaStateBadge";
import { isTerminalStatus } from "@/lib/taskStatus";
import {
  QA_TARGET_STATE_LABELS,
  QA_VERDICT_LABELS,
  qaStateForVerdict,
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
}

interface QaTabProps {
  task: {
    id: string;
    client_id: string;
    status: string;
    qa_state?: string | null;
    qa_state_changed_at?: string | null;
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
      };
    }
    return { summary: JSON.stringify(f) };
  });
}

/**
 * QA tab of the task drawer: the falsifiable context the QA agent checks
 * against (criteria + target), the task's place in the QA pipeline, and the
 * append-only run log. "Record verdict" lets a person close the loop by hand
 * until the agent is wired up, and doubles as manual QA.
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
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<QaVerdict>("approved");
  const [notes, setNotes] = useState("");

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

  const handleSendToQa = () => setState("ready_for_review", "Sent to QA");
  const handleWithdraw = () => setState(null, "Removed from QA");

  const handleRecordVerdict = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const findings: QaFinding[] = notes.trim() ? [{ summary: notes.trim(), severity: verdict === "revisions_required" ? "major" : "note" }] : [];
    const { error: runError } = await supabase.from("task_qa_runs").insert({
      task_id: task.id,
      client_id: task.client_id,
      verdict,
      target_url: fields.qa_target_url || null,
      target_state: fields.qa_target_state || null,
      findings: findings as unknown as Json,
      finished_at: new Date().toISOString(),
      submitted_by: user?.id ?? null,
      agent_thread_path: "manual",
    });
    if (runError) {
      setBusy(false);
      toast.error("Couldn't record verdict", { description: runError.message });
      return;
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
    loadRuns();
  };

  const closed = isTerminalStatus(task.status);
  const missingContext = !fields.acceptance_criteria.trim() || !fields.qa_target_url.trim();

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-5">
        {/* Context the agent checks against */}
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="qa-criteria">Acceptance criteria</Label>
            <Textarea
              id="qa-criteria"
              value={fields.acceptance_criteria}
              onChange={(e) => setFields({ ...fields, acceptance_criteria: e.target.value })}
              placeholder={"What must be true on the page for this task to be done? One check per line, e.g.\n- Hero H2 reads \"Roof repair in Concord NH\"\n- Phone number in header matches the client record\n- Contact form submits without errors"}
              className="min-h-[110px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Written so it can be proven false. The QA agent checks the page against exactly this.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="qa-url">QA target URL</Label>
              <div className="flex gap-2">
                <Input
                  id="qa-url"
                  type="url"
                  value={fields.qa_target_url}
                  onChange={(e) => setFields({ ...fields, qa_target_url: e.target.value })}
                  placeholder="https://my.duda.co/site/abc12345 or the live page"
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
                value={fields.qa_target_state || "editor"}
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
          </div>

          {closed ? (
            <p className="text-xs text-muted-foreground">
              This task is closed. Reopen it to send it through QA again.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSendToQa} disabled={busy || qaState === "ready_for_review" || qaState === "qa_running"}>
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

          {!closed && missingContext && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Add acceptance criteria and a target URL first, or the reviewer has nothing to check against.
            </p>
          )}
        </section>

        {/* Manual verdict: closes the loop until the agent posts its own */}
        {!closed && (
          <section className="space-y-3">
            <div>
              <h4 className="text-sm font-medium">Record a verdict</h4>
              <p className="text-xs text-muted-foreground">
                For manual QA, or to stand in for the agent while it's being wired up. Appends a run to the log.
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
            <Button size="sm" variant="secondary" onClick={handleRecordVerdict} disabled={busy}>
              Record verdict
            </Button>
          </section>
        )}

        {/* Run log */}
        <section className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">QA runs</h4>
            <span className="text-xs text-muted-foreground">{runs.length} total</span>
          </div>
          {loadingRuns ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => {
                const findings = asFindings(run.findings);
                const verdictKey = (run.verdict ?? "error") as QaVerdict;
                const who = run.submitter?.name || (run.agent_thread_path === "manual" ? "Manual" : "QA agent");
                return (
                  <li key={run.id} className="rounded-md border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", VERDICT_CLASSES[verdictKey])}>
                        {run.verdict ? QA_VERDICT_LABELS[verdictKey] ?? run.verdict : "In progress"}
                      </Badge>
                      <span className="text-muted-foreground">
                        {who} · {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        {run.finished_at && run.verdict ? "" : " · running"}
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
