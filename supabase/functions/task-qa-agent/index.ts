import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import {
  CLIENT_QA_SELECT,
  QA_VERDICTS,
  TASK_QA_SELECT,
  json,
  loadTaskContext,
  qaStateForVerdict,
  secretMatches,
  type QaVerdict,
} from '../_shared/taskQa.ts';

// The QA agent's door into SpearlanceOS. One shared secret (`x-qa-secret`
// header = QA_AGENT_SECRET), no Supabase keys handed out. Deployed with
// verify_jwt = false.
//
//   GET  /task-qa-agent/queue            tasks waiting at ready_for_review (+ context)
//   GET  /task-qa-agent/task/:id         one task's context bundle + its runs
//   POST /task-qa-agent/claim            { task_id }  -> opens a run, task -> qa_running
//   POST /task-qa-agent/verdict          { run_id | task_id, verdict, findings?, evidence?,
//                                          doctrine_version?, client_record_hash?,
//                                          agent_thread_path?, target_url?, target_state? }
//
// Push mode (task-qa-dispatch) delivers run_id in its payload; pull mode uses
// /queue + /claim (or just /verdict with task_id, which opens and closes a run
// in one call).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-qa-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(TASK_QA_SELECT)
        .eq('qa_state', 'ready_for_review')
        .order('qa_state_changed_at', { ascending: true });
      if (error) throw error;
      const clientIds = [...new Set((tasks ?? []).map((t) => t.client_id))];
      const { data: clients } = clientIds.length
        ? await supabase.from('clients').select(CLIENT_QA_SELECT).in('id', clientIds)
        : { data: [] };
      const byId = new Map((clients ?? []).map((c) => [c.id, c]));
      return json(200, {
        count: tasks?.length ?? 0,
        tasks: (tasks ?? []).map((t) => ({ ...t, client: byId.get(t.client_id) ?? null })),
      }, corsHeaders);
    }

    // ---- GET /task/:id ----
    if (req.method === 'GET' && route === 'task' && routeId) {
      const ctx = await loadTaskContext(supabase, routeId);
      if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);
      const { data: runs } = await supabase
        .from('task_qa_runs')
        .select('*')
        .eq('task_id', routeId)
        .order('started_at', { ascending: false });
      return json(200, { ...ctx, runs: runs ?? [] }, corsHeaders);
    }

    if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, corsHeaders);

    let body: VerdictBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' }, corsHeaders);
    }

    // ---- POST /claim ----
    if (route === 'claim') {
      if (!body.task_id) return json(400, { error: 'task_id required' }, corsHeaders);
      const ctx = await loadTaskContext(supabase, body.task_id);
      if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);
      if (ctx.task.qa_state !== 'ready_for_review') {
        return json(409, { error: `Task is ${ctx.task.qa_state ?? 'not in QA'}, not ready_for_review` }, corsHeaders);
      }
      const { data: run, error } = await supabase
        .from('task_qa_runs')
        .insert({
          task_id: ctx.task.id,
          client_id: ctx.task.client_id,
          target_url: body.target_url ?? ctx.task.qa_target_url,
          target_state: body.target_state ?? ctx.task.qa_target_state,
          agent_thread_path: body.agent_thread_path ?? ctx.task.viktor_thread_path,
        })
        .select('id, started_at')
        .single();
      if (error) throw error;
      await supabase.from('tasks').update({ qa_state: 'qa_running' }).eq('id', ctx.task.id);
      return json(200, { run_id: run.id, started_at: run.started_at, ...ctx }, corsHeaders);
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

      const finished = new Date().toISOString();
      const runFields = {
        verdict,
        finished_at: finished,
        findings: body.findings ?? [],
        evidence: body.evidence ?? [],
        doctrine_version: body.doctrine_version ?? null,
        client_record_hash: body.client_record_hash ?? null,
      };

      let runId: string;
      let taskId: string;

      if (body.run_id) {
        const { data: run, error } = await supabase
          .from('task_qa_runs')
          .select('id, task_id, verdict, agent_thread_path')
          .eq('id', body.run_id)
          .maybeSingle();
        if (error) throw error;
        if (!run) return json(404, { error: 'Run not found' }, corsHeaders);
        if (body.task_id && body.task_id !== run.task_id) {
          return json(409, { error: 'run_id belongs to a different task' }, corsHeaders);
        }
        if (run.verdict) return json(409, { error: `Run already closed with verdict ${run.verdict}` }, corsHeaders);
        const { error: upErr } = await supabase
          .from('task_qa_runs')
          .update({ ...runFields, agent_thread_path: body.agent_thread_path ?? run.agent_thread_path })
          .eq('id', run.id);
        if (upErr) throw upErr;
        runId = run.id;
        taskId = run.task_id;
      } else {
        // Pull mode without a claim: open and close the run in one go
        const ctx = await loadTaskContext(supabase, body.task_id!);
        if (!ctx) return json(404, { error: 'Task not found' }, corsHeaders);
        const { data: run, error } = await supabase
          .from('task_qa_runs')
          .insert({
            task_id: ctx.task.id,
            client_id: ctx.task.client_id,
            target_url: body.target_url ?? ctx.task.qa_target_url,
            target_state: body.target_state ?? ctx.task.qa_target_state,
            agent_thread_path: body.agent_thread_path ?? ctx.task.viktor_thread_path,
            ...runFields,
          })
          .select('id')
          .single();
        if (error) throw error;
        runId = run.id;
        taskId = ctx.task.id;
      }

      const nextState = qaStateForVerdict(verdict);
      const { error: taskErr } = await supabase.from('tasks').update({ qa_state: nextState }).eq('id', taskId);
      if (taskErr) throw taskErr;

      return json(200, { ok: true, run_id: runId, task_id: taskId, qa_state: nextState }, corsHeaders);
    }

    return json(404, { error: `Unknown route "${route}". Use /queue, /task/:id, /claim, /verdict` }, corsHeaders);
  } catch (error) {
    console.error('task-qa-agent error:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' }, corsHeaders);
  }
});
