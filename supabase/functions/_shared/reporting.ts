import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-spearlance-key',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * All reporting endpoints authenticate via the x-spearlance-key header,
 * compared against the WEBHOOK_SECRET Supabase secret. Returns an error
 * Response to send back, or null when the caller is authorized.
 */
export function requireSecret(req: Request): Response | null {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret) {
    console.error('WEBHOOK_SECRET is not configured');
    return json({ error: 'server not configured' }, 500);
  }
  const provided = req.headers.get('x-spearlance-key') ?? '';
  // Constant-time comparison
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  if (diff !== 0) {
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

/** Service-role client pointed at the reporting schema. */
export function reportingClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'reporting' }, auth: { persistSession: false } },
  );
}

/**
 * Resolve a client identifier (uuid, Duda site_id, or slugified name like
 * "invictus-northwest-group") to a clients.id via reporting.resolve_client.
 */
export async function resolveClient(
  supabase: SupabaseClient,
  client: unknown,
): Promise<string | null> {
  if (typeof client !== 'string' || client.trim() === '') return null;
  const { data, error } = await supabase.rpc('resolve_client', { p_client: client.trim() });
  if (error) {
    console.error('resolve_client error:', error);
    return null;
  }
  return (data as string | null) ?? null;
}
