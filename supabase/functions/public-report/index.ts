/**
 * public-report — token-authenticated read endpoint backing the public share
 * page at /reporting/share/<token>. No login, no webhook secret: the token in
 * the URL (from reporting.share_links) is the only credential. Admins create,
 * rotate, and disable tokens from the in-app Reporting page.
 *
 * GET ?token=<share token>&from=2026-07-01&to=2026-07-31
 * from/to default to the last 90 days. Returns the buildReport payload plus
 * client_name for the page header.
 */
import { corsHeaders, json, reportingClient } from '../_shared/reporting.ts';
import { buildReport } from '../_shared/reportData.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_RE = /^[0-9a-f]{16,128}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'method not allowed' }, 405);
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? ninetyDaysAgo;
  const to = url.searchParams.get('to') ?? today;

  if (!TOKEN_RE.test(token)) {
    return json({ error: 'invalid link' }, 404);
  }
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return json({ error: 'from/to must be YYYY-MM-DD' }, 422);
  }

  const supabase = reportingClient();

  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('client_id, enabled, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (linkError) {
    console.error('share link lookup error:', linkError);
    return json({ error: 'failed to load report' }, 500);
  }
  if (!link || !link.enabled) {
    return json({ error: 'invalid link' }, 404);
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return json({ error: 'link expired' }, 410);
  }

  // clients lives in public; this client instance is scoped to reporting.
  const { data: client } = await supabase
    .schema('public')
    .from('clients')
    .select('name, brand_name, company_name')
    .eq('id', link.client_id)
    .maybeSingle();

  try {
    const report = await buildReport(supabase, link.client_id, from, to);
    return json({
      client_name: client?.brand_name || client?.company_name || client?.name || 'Client',
      ...report,
    });
  } catch (error) {
    console.error('public report query error:', error);
    return json({ error: 'failed to build report' }, 500);
  }
});
