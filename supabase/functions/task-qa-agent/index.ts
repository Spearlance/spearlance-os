import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import {
  CLIENT_QA_SELECT,
  QA_VERDICTS,
  RUN_SUMMARY_SELECT,
  TASK_QA_SELECT,
  json,
  loadLocationsByClient,
  loadOpenRun,
  loadTaskContext,
  qaStateForVerdict,
  withNap,
  resolveCredential,
  secretMatches,
  type QaVerdict,
  type RunSummary,
} from '../_shared/taskQa.ts';

// The QA agent's door into SpearlanceOS. One shared secret (`x-qa-secret`
// header = QA_AGENT_SECRET), no Supabase keys handed out. Deployed with
// verify_jwt = false.
//
//   GET  /task-qa-agent/queue[?state=ready_for_review,qa_running]
//                                        tasks waiting (default ready_for_review) + context,
//                                        each with `run` = its open run (or null)
//   GET  /task-qa-agent/task/:id         one task's context bundle, credential, open run, all runs
//   POST /task-qa-agent/ack              { run_id }  -> marks the run acked, returns the bundle
//   POST /task-qa-agent/claim            { task_id } -> opens (or adopts) a run, acks it, task -> qa_running
//   POST /task-qa-agent/verdict          { run_id | task_id, verdict, findings?, evidence?,
//                                          doctrine_version?, client_record_hash?,
//                                          agent_thread_path?, target_url?, target_state?,
//                                          supersedes_run_id? }
//
// Push mode (task-qa-dispatch) delivers run_id in its payload; the agent must
// /ack it before starting work or the reaper re-queues the task after 5 min.
// Pull mode uses /queue + /claim (claim acks implicitly), or just /verdict
// with task_id, which opens and closes a run in one call.
//
// Credentials: a task may carry qa_credential_ref (a Vault name). The value
// is resolved here, returned ONLY on /ack, /claim and /task/:id as
// `credential: { ref, value }`, and never logged.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-qa-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const QUEUE_STATES = ['ready_for_review', 'qa_running'] as const;

interface VerdictBody {
  run_id?: string;
  task_id?: string;
  verdict?: string;
  findings?: unknown;
  evidence?: unknown;
  doctrine_version?: string;
  client_record_hash?: string;
  agent_thread_path?: string;
  target_url?: string;
  target_state?: string;
  supersedes_run_id?: string;
}

/** Full bundle for a run the agent is (about to be) working on. */
async function runBundle(supabase: SupabaseClient, run: RunSummary) {
  const ctx = await loadTaskContext(supabase, run.task_id);
  if (!ctx) return null;
  const credential = await resolveCredential(supabase, ctx.task.qa_credential_ref);
  return {
    run_id: run.id,
    started_at: run.started_at,
    acked_at: run.acked_at,
    ...ctx,
    credential,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get('QA_AGENT_SECRET');
  if (!secretMatches(req.headers.get('x-qa-secret'), expected)) {
    return json(401, { error: 'Invalid or missing x-qa-secret' }, corsHeaders);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const url = new URL(req.url);
  // Path after the function name: /task-qa-agent/<route>[/<id>]
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.indexOf('task-qa-agent');
  const route = parts[fnIdx + 1] ?? '';
  const routeId = parts[fnIdx + 2];

  try {
    // ---- GET /queue ----
    if (req.method === 'GET' && route === 'queue') {
      const requested = (url.searchParams.get('state') ?? 'ready_for_review')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const bad = requested.filter((s) => !(QUEUE_STATES as readonly string[]).includes(s));
      if (bad.length) {
        return json(400, { error: `state must be one of ${QUEUE_STATES.join(', ')}`, invalid: bad }, corsHeaders);
      }

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(TASK_QA_SELECT)
        .in('qa_state', requested)
        .order('qa_state_changed_at', { ascending: true });
      if (error) throw error;

      const taskIds = (tasks ?? []).map((t) => t.id);
      const clientIds = [...new Set((tasks ?? []).map((t) => t.client_id))];
      const [{ data: clients }, { data: openRuns }] = await Promise.all([
        clientIds.length ? supabase.from('clients').select(CLIENT_QA_SELECT).in('id', clientIds) : Promise.resolve({ data: [] }),
        taskIds.length
          ? supabase.from('task_qa_runs').select(RUN_SUMMARY_SELECT).in('task_id', taskIds).is('finished_at', null)
          : Promise.resolve({ data: [] }),
      ]);
      const locationsByClient = await loadLocationsByClient(supabase, clientIds);
      const clientById = new Map((clients ?? []).map((c) => [c.id, withNap(c, locationsByClient.get(c.id) ?? [])]));
      const runByTask = new Map<string, RunSummary>();
      for (const r of (openRuns ?? []) as RunSummary[]) {
        const prev = runByTask.get(r.task_id);
        if (!prev || r.started_at > prev.started_at) runByTask.set(r.task_id, r);
      }

      return json(200, {
        count: tasks?.length ?? 0,
        states: requested,
        tasks: (tasks ?? []).map((t) => {
          const run = runByTask.get(t.id) ?? null;
          return {
            ...t,
            client: clientById.get(t.client_id) ?? null,
            run: run ? { id: run.id, started_at: run.started_at, acked_at: run.acked_at } : null,
          };
        }),
      }, corsHeaders);
    }

    // ---- GET /task/:id ----
    if (req.method === 'GET' && route === 'task' && routeId) {
      const ctx = await loadTaskContext(supabase, routeId);
      if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);
      const [{ data: runs }, openRun, credential] = await Promise.all([
        supabase.from('task_qa_runs').select('*').eq('task_id', routeId).order('started_at', { ascending: false }),
        loadOpenRun(supabase, routeId),
        resolveCredential(supabase, ctx.task.qa_credential_ref),
      ]);
      return json(200, {
        ...ctx,
        credential,
        open_run: openRun ? { id: openRun.id, started_at: openRun.started_at, acked_at: openRun.acked_at } : null,
        runs: runs ?? [],
      }, corsHeaders);
    }

    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, corsHeaders);

    let body: VerdictBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' }, corsHeaders);
    }

    // ---- POST /ack ----
    if (route === 'ack') {
      if (!body.run_id) return json(400, { error: 'run_id required' }, corsHeaders);
      const { data: run, error } = await supabase
        .from('task_qa_runs')
        .select(RUN_SUMMARY_SELECT)
        .eq('id', body.run_id)
        .maybeSingle();
      if (error) throw error;
      if (!run) return json(404, { error: 'Run not found' }, corsHeaders);
      if (run.finished_at) {
        return json(409, { error: `Run already closed (${run.verdict ?? 'no verdict'}, closed_by ${run.closed_by ?? 'unknown'})` }, corsHeaders);
      }
      let acked = run as RunSummary;
      if (!run.acked_at) {
        const { data: updated, error: upErr } = await supabase
          .from('task_qa_runs')
          .update({ acked_at: new Date().toISOString() })
          .eq('id', run.id)
          .select(RUN_SUMMARY_SELECT)
          .single();
        if (upErr) throw upErr;
        acked = updated as RunSummary;
      }
      const bundle = await runBundle(supabase, acked);
      if (!bundle) return json(404, { error: 'Task not found' }, corsHeaders);
      return json(200, bundle, corsHeaders);
    }

    // ---- POST /claim ----
    if (route === 'claim') {
      if (!body.task_id) return json(400, { error: 'task_id required' }, corsHeaders);
      const ctx = await loadTaskContext(supabase, body.task_id);
      if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);

      // Adopt an orphaned run instead of forcing a manual reset.
      const openRun = await loadOpenRun(supabase, ctx.task.id);
      if (openRun) {
        if (ctx.task.qa_state !== 'qa_running') {
          await supabase.from('tasks').update({ qa_state: 'qa_running' }).eq('id', ctx.task.id);
        }
        const { data: acked, error: ackErr } = await supabase
          .from('task_qa_runs')
          .update({
            acked_at: openRun.acked_at ?? new Date().toISOString(),
            ...(body.agent_thread_path ? { agent_thread_path: body.agent_thread_path } : {}),
          })
          .eq('id', openRun.id)
          .select(RUN_SUMMARY_SELECT)
          .single();
        if (ackErr) throw ackErr;
        const bundle = await runBundle(supabase, acked as RunSummary);
        return json(200, { ...bundle, adopted: true }, corsHeaders);
      }

      if (ctx.task.qa_state !== 'ready_for_review') {
        return json(409, { error: `Task is ${ctx.task.qa_state ?? 'not in QA'}, not ready_for_review` }, corsHeaders);
      }
      const now = new Date().toISOString();
      const { data: run, error } = await supabase
        .from('task_qa_runs')
        .insert({
          task_id: ctx.task.id,
          client_id: ctx.task.client_id,
          target_url: body.target_url ?? ctx.task.qa_target_url,
          target_state: body.target_state ?? ctx.task.qa_target_state,
          agent_thread_path: body.agent_thread_path ?? ctx.task.viktor_thread_path,
          acked_at: now,
        })
        .select(RUN_SUMMARY_SELECT)
        .single();
      if (error) throw error;
      await supabase.from('tasks').update({ qa_state: 'qa_running' }).eq('id', ctx.task.id);
      const bundle = await runBundle(supabase, run as RunSummary);
      return json(200, { ...bundle, adopted: false }, corsHeaders);
    }

    // ---- POST /verdict ----
    if (route === 'verdict') {
      const verdict = body.verdict as QaVerdict;
      if (!QA_VERDICTS.includes(verdict)) {
        return json(400, { error: `verdict must be one of ${QA_VERDICTS.join(', ')}` }, corsHeaders);
      }
      if (body.findings !== undefined && !Array.isArray(body.findings)) {
        return json(400, { error: 'findings must be an array' }, corsHeaders);
      }
      if (body.evidence !== undefined && !Array.isArray(body.evidence)) {
        return json(400, { error: 'evidence must be an array' }, corsHeaders);
      }
      if (!body.run_id && !body.task_id) {
        return json(400, { error: 'run_id or task_id required' }, corsHeaders);
      }
      if (body.supersedes_run_id && body.run_id) {
        return json(400, { error: 'supersedes_run_id is used with task_id, not run_id (a correction is a new run)' }, corsHeaders);
      }

      const finished = new Date().toISOString();
      const runFields = {
        verdict,
        finished_at: finished,
        closed_by: 'agent' as const,
        findings: body.findings ?? [],
        evidence: body.evidence ?? [],
        doctrine_version: body.doctrine_version ?? null,
        client_record_hash: body.client_record_hash ?? null,
      };

      let runId: string;
      let taskId: string;
      let supersededRunId: string | null = null;

      if (body.run_id) {
        // Close the run the agent was handed. Plain re-post on a closed run stays a 409.
        const { data: run, error } = await supabase
          .from('task_qa_runs')
          .select('id, task_id, verdict, finished_at, agent_thread_path')
          .eq('id', body.run_id)
          .maybeSingle();
        if (error) throw error;
        if (!run) return json(404, { error: 'Run not found' }, corsHeaders);
        if (body.task_id && body.task_id !== run.task_id) {
          return json(409, { error: 'run_id belongs to a different task' }, corsHeaders);
        }
        if (run.verdict || run.finished_at) {
          return json(409, {
            error: `Run already closed with verdict ${run.verdict ?? 'none'}. To correct it, POST { task_id, supersedes_run_id: "${run.id}", ... }`,
          }, corsHeaders);
        }
        const { error: upErr } = await supabase
          .from('task_qa_runs')
          .update({ ...runFields, agent_thread_path: body.agent_thread_path ?? run.agent_thread_path })
          .eq('id', run.id);
        if (upErr) throw upErr;
        runId = run.id;
        taskId = run.task_id;
      } else {
        // task_id path: open and close a run in one go, optionally as a
        // correction of an earlier closed run.
        const ctx = await loadTaskContext(supabase, body.task_id!);
        if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);

        if (body.supersedes_run_id) {
          const { data: old, error: oldErr } = await supabase
            .from('task_qa_runs')
            .select('id, task_id, finished_at, superseded_by')
            .eq('id', body.supersedes_run_id)
            .maybeSingle();
          if (oldErr) throw oldErr;
          if (!old) return json(404, { error: 'supersedes_run_id not found' }, corsHeaders);
          if (old.task_id !== ctx.task.id) return json(409, { error: 'supersedes_run_id belongs to a different task' }, corsHeaders);
          if (!old.finished_at) return json(409, { error: 'supersedes_run_id is still open; close it with run_id instead' }, corsHeaders);
          if (old.superseded_by) return json(409, { error: `Run already superseded by ${old.superseded_by}` }, corsHeaders);
          supersededRunId = old.id;
        }

        const { data: run, error } = await supabase
          .from('task_qa_runs')
          .insert({
            task_id: ctx.task.id,
            client_id: ctx.task.client_id,
            target_url: body.target_url ?? ctx.task.qa_target_url,
            target_state: body.target_state ?? ctx.task.qa_target_state,
            agent_thread_path: body.agent_thread_path ?? ctx.task.viktor_thread_path,
            acked_at: finished,
            supersedes: supersededRunId,
            ...runFields,
          })
          .select('id')
          .single();
        if (error) throw error;
        runId = run.id;
        taskId = ctx.task.id;

        if (supersededRunId) {
          const { error: supErr } = await supabase.rpc('task_qa_supersede_run', { p_old: supersededRunId, p_new: runId });
          if (supErr) throw supErr;
        }
      }

      const nextState = qaStateForVerdict(verdict);
      const { error: taskErr } = await supabase.from('tasks').update({ qa_state: nextState }).eq('id', taskId);
      if (taskErr) throw taskErr;

      return json(200, {
        ok: true,
        run_id: runId,
        task_id: taskId,
        qa_state: nextState,
        ...(supersededRunId ? { superseded_run_id: supersededRunId } : {}),
      }, corsHeaders);
    }

    return json(404, { error: `Unknown route "${route}". Use /queue, /task/:id, /ack, /claim, /verdict` }, corsHeaders);
  } catch (error) {
    console.error('task-qa-agent error:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' }, corsHeaders);
  }
});
