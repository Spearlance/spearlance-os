// Best-effort bridge: after the Duda comments webhook has persisted a task
// change for the Fairs client, forward a minimal event to a Viktor inbound
// webhook so Viktor can react quickly. Delivery is NOT durable — Viktor runs a
// recovery poll against tasks (keyed by task id + updated_at) to cover loss.
//
// Pure module (no Deno globals) so it can be unit-tested with Vitest.
//
// SIGNING: the Viktor source is HMAC-signed, but the header names / signed
// string / encoding are not documented anywhere we can verify. Rather than
// guess, dispatch requires an explicit `signer`. Until one is supplied the
// helper returns `signing_pending` and sends nothing, even when
// VIKTOR_FAIRS_WEBHOOK_URL and VIKTOR_FAIRS_WEBHOOK_SECRET are set.

export const FAIRS_CLIENT_ID = 'fe2879c1-adfe-42fe-a8f0-7dc68bb548e5';
export const DUDA_COMMENT_SOURCE = 'duda_comment';
export const DEFAULT_TIMEOUT_MS = 3000;

/** Handler actions that represent a persisted change worth forwarding. */
export const DISPATCHABLE_ACTIONS = [
  'task_created',
  'reply_appended',
  'edit_appended',
  'task_completed',
  'task_reopened',
  'deletion_noted',
] as const;
export type FairsEventType = (typeof DISPATCHABLE_ACTIONS)[number];

export interface FairsEvent {
  /** Same as event_id; top-level `id` for generic trigger-provider dedup. */
  id: string;
  event_id: string;
  task_id: string;
  client_id: string;
  external_source: string;
  event_type: FairsEventType;
  site_name: string | null;
  conversation_uuid: string | null;
  author: string | null;
  updated_at: string;
}

export interface DispatchConfig {
  url?: string | null;
  secret?: string | null;
}

/** Returns headers to attach for a signed body. Must only be provided once the
 * Viktor signing convention is verified. */
export type Signer = (body: string, secret: string) => Promise<Record<string, string>>;

export type DispatchResult =
  | 'skipped_scope'
  | 'disabled'
  | 'signing_pending'
  | 'sent'
  | 'http_error'
  | 'timeout'
  | 'network_error';

export const isDispatchable = (action: string): action is FairsEventType =>
  (DISPATCHABLE_ACTIONS as readonly string[]).includes(action);

export const inScope = (clientId: string, externalSource: string, action: string) =>
  clientId === FAIRS_CLIENT_ID && externalSource === DUDA_COMMENT_SOURCE && isDispatchable(action);

/** Stable per persisted state: retries of the same saved row yield the same id. */
export const buildEventId = (taskId: string, updatedAt: string) =>
  `${DUDA_COMMENT_SOURCE}:${taskId}:${updatedAt}`;

export function buildEvent(input: Omit<FairsEvent, 'id' | 'event_id' | 'external_source'>): FairsEvent {
  const id = buildEventId(input.task_id, input.updated_at);
  return {
    id,
    event_id: id,
    task_id: input.task_id,
    client_id: input.client_id,
    external_source: DUDA_COMMENT_SOURCE,
    event_type: input.event_type,
    site_name: input.site_name,
    conversation_uuid: input.conversation_uuid,
    author: input.author,
    updated_at: input.updated_at,
  };
}

export interface DispatchOptions {
  config: DispatchConfig;
  signer?: Signer;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  log?: (msg: string) => void;
}

/** Never throws. Logs only event_id/type/result — never the secret or payload. */
export async function dispatchFairsEvent(event: FairsEvent, opts: DispatchOptions): Promise<DispatchResult> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const tag = `[viktor-fairs] ${event.event_id} ${event.event_type}`;
  try {
    if (!inScope(event.client_id, event.external_source, event.event_type)) return 'skipped_scope';
    const { url, secret } = opts.config;
    if (!url || !secret) return 'disabled';
    if (!opts.signer) {
      log(`${tag} signing_pending (no verified signer configured; not sent)`);
      return 'signing_pending';
    }
    const body = JSON.stringify(event);
    const sigHeaders = await opts.signer(body, secret);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const res = await (opts.fetchImpl ?? fetch)(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sigHeaders },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        log(`${tag} http_error ${res.status}`);
        return 'http_error';
      }
      log(`${tag} sent`);
      return 'sent';
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      log(`${tag} timeout`);
      return 'timeout';
    }
    log(`${tag} network_error`);
    return 'network_error';
  }
}

/** True only when a send could actually happen (URL + secret + verified signer).
 * Callers use this to skip any extra DB work on the disabled path. */
export const canDispatch = (config: DispatchConfig, signer?: Signer) =>
  Boolean(config.url && config.secret && signer);

/** Resolves to `null` if `p` does not settle within `ms` (or rejects). */
export async function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(p).catch(() => null),
      new Promise<null>((r) => { timer = setTimeout(() => r(null), ms); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
