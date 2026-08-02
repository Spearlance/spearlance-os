/**
 * reporting-config — admin-only helper for the Admin UI "Reporting webhook"
 * dialog. Returns everything needed to wire an external tool (Zapier, Lovable,
 * CallRail, ...) to the reporting ingest endpoints for one client:
 * the endpoint base URL, the shared WEBHOOK_SECRET, and the client's
 * identifiers (slug / uuid / Duda site_id).
 *
 * POST { client_id: "<uuid>" } with a user JWT (verify_jwt = true).
 * Only admins get a response — the webhook secret is the master ingest key.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'only admins can view reporting webhook config' }, 403);
    }

    const { client_id } = await req.json().catch(() => ({}));
    if (!client_id) return json({ error: 'client_id is required' }, 422);

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, name, site_id')
      .eq('id', client_id)
      .maybeSingle();

    if (clientError) throw clientError;
    if (!client) return json({ error: 'unknown client' }, 404);

    const secret = Deno.env.get('WEBHOOK_SECRET');
    if (!secret) return json({ error: 'WEBHOOK_SECRET is not configured in this environment' }, 500);

    // SUPABASE_URL is runtime-injected and always the raw *.supabase.co URL;
    // PUBLIC_SUPABASE_URL (function secret) carries the custom domain on prod.
    const publicUrl = Deno.env.get('PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL');

    return json({
      base_url: `${publicUrl}/functions/v1`,
      webhook_secret: secret,
      client: {
        id: client.id,
        name: client.name,
        slug: slugify(client.name),
        site_id: client.site_id ?? null,
      },
    });
  } catch (error) {
    console.error('reporting-config error:', error);
    return json({ error: 'internal error' }, 500);
  }
});
