import { describe, it, expect, vi } from 'vitest';
import {
  FAIRS_CLIENT_ID,
  buildEvent,
  buildEventId,
  dispatchFairsEvent,
  inScope,
  isDispatchable,
  type FairsEventType,
} from '../../supabase/functions/_shared/viktorFairsDispatch';

const SECRET = 'super-secret-value';
const cfg = { url: 'https://example.test/hook', secret: SECRET };
const signer = vi.fn(async () => ({ 'x-test-sig': 'sig' }));
const ev = (event_type: FairsEventType = 'task_created', client_id = FAIRS_CLIENT_ID) =>
  buildEvent({
    task_id: 't1',
    client_id,
    event_type,
    site_name: 'site',
    conversation_uuid: 'c1',
    author: 'Ann',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
const okFetch = () => vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;

describe('viktorFairsDispatch', () => {
  it('builds a minimal event with a stable id keyed by task id + updated_at', () => {
    const e = ev();
    expect(e.event_id).toBe(buildEventId('t1', '2026-01-01T00:00:00.000Z'));
    expect(ev().event_id).toBe(e.event_id);
    expect(Object.keys(e).sort()).toEqual(
      ['author', 'client_id', 'conversation_uuid', 'event_id', 'event_type', 'external_source', 'site_name', 'task_id', 'updated_at'].sort()
    );
    expect(e.external_source).toBe('duda_comment');
  });

  it('scopes to Fairs + duda_comment + persisted actions only', () => {
    for (const a of ['task_created', 'reply_appended', 'edit_appended', 'task_completed', 'task_reopened', 'deletion_noted'])
      expect(inScope(FAIRS_CLIENT_ID, 'duda_comment', a)).toBe(true);
    for (const a of ['duplicate_ignored', 'no_change', 'ignored_no_matching_task', 'ignored_unhandled_event'])
      expect(isDispatchable(a)).toBe(false);
    expect(inScope('other-client', 'duda_comment', 'task_created')).toBe(false);
    expect(inScope(FAIRS_CLIENT_ID, 'other', 'task_created')).toBe(false);
  });

  it('skips other clients without calling fetch', async () => {
    const f = okFetch();
    expect(await dispatchFairsEvent(ev('task_created', 'other'), { config: cfg, signer, fetchImpl: f })).toBe('skipped_scope');
    expect(f).not.toHaveBeenCalled();
  });

  it('is disabled by default when env is missing', async () => {
    const f = okFetch();
    expect(await dispatchFairsEvent(ev(), { config: {}, signer, fetchImpl: f })).toBe('disabled');
    expect(await dispatchFairsEvent(ev(), { config: { url: cfg.url }, signer, fetchImpl: f })).toBe('disabled');
    expect(f).not.toHaveBeenCalled();
  });

  it('does not send unsigned when no verified signer exists', async () => {
    const f = okFetch();
    expect(await dispatchFairsEvent(ev(), { config: cfg, fetchImpl: f, log: () => {} })).toBe('signing_pending');
    expect(f).not.toHaveBeenCalled();
  });

  it.each(['task_created', 'reply_appended', 'edit_appended', 'task_completed', 'task_reopened', 'deletion_noted'] as const)(
    'sends %s with signer headers and JSON body, never logging secret',
    async (t) => {
      const f = okFetch();
      const logs: string[] = [];
      expect(await dispatchFairsEvent(ev(t), { config: cfg, signer, fetchImpl: f, log: (m) => logs.push(m) })).toBe('sent');
      const [url, init] = (f as any).mock.calls[0];
      expect(url).toBe(cfg.url);
      expect(init.headers['x-test-sig']).toBe('sig');
      expect(JSON.parse(init.body).event_type).toBe(t);
      expect(logs.join('\n')).not.toContain(SECRET);
      expect(logs.join('\n')).not.toContain('Ann');
    }
  );

  it('returns http_error on non-2xx without throwing', async () => {
    const f = vi.fn(async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await dispatchFairsEvent(ev(), { config: cfg, signer, fetchImpl: f, log: () => {} })).toBe('http_error');
  });

  it('returns network_error when fetch or signer throws', async () => {
    const f = vi.fn(async () => { throw new TypeError('down'); }) as unknown as typeof fetch;
    expect(await dispatchFairsEvent(ev(), { config: cfg, signer, fetchImpl: f, log: () => {} })).toBe('network_error');
    const bad = async () => { throw new Error('boom'); };
    expect(await dispatchFairsEvent(ev(), { config: cfg, signer: bad, fetchImpl: okFetch(), log: () => {} })).toBe('network_error');
  });

  it('aborts after the bounded timeout', async () => {
    const f = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise((_r, reject) =>
          init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
        )
    ) as unknown as typeof fetch;
    const start = Date.now();
    expect(await dispatchFairsEvent(ev(), { config: cfg, signer, fetchImpl: f, timeoutMs: 50, log: () => {} })).toBe('timeout');
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
