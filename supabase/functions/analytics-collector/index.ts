import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// v1 payload format (backwards compat)
interface V1Payload {
  workspaceKey: string;
  type: 'page_view' | 'content_view' | 'lead_submitted' | 'scroll_depth' | 'engaged_time';
  ts: number;
  sid: string;
  uid?: string;
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  entry?: boolean;
  content_type?: 'blog' | 'local_page';
  slug?: string;
  form?: string;
  value?: number;
  userAgent?: string;
  [key: string]: any;
}

// v2 batched payload format
interface V2Payload {
  k: string; // workspace key
  v: V2Event[]; // array of events
}

interface V2Event {
  t: string; // event type: 'pv', 'cwv', 'eng'
  [key: string]: any;
}

function parseUserAgent(ua: string): { family: string; device: string } {
  const lowerUA = ua.toLowerCase();

  let family = 'Unknown';
  if (lowerUA.includes('chrome')) family = 'Chrome';
  else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) family = 'Safari';
  else if (lowerUA.includes('firefox')) family = 'Firefox';
  else if (lowerUA.includes('edge')) family = 'Edge';

  let device = 'Desktop';
  if (lowerUA.includes('mobile')) device = 'Mobile';
  else if (lowerUA.includes('tablet')) device = 'Tablet';

  return { family, device };
}

async function hashIP(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isV2Payload(payload: any): payload is V2Payload {
  return typeof payload === 'object' && 'k' in payload && 'v' in payload && Array.isArray(payload.v);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const text = await req.text();
    if (text.length > 8192) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const raw = JSON.parse(text);

    // Detect v1 vs v2 format
    if (isV2Payload(raw)) {
      return await handleV2(raw, req, supabase);
    } else if (raw.workspaceKey) {
      return await handleV1(raw as V1Payload, req, supabase);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid payload format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================
// v2 handler — batched payloads from SOS Tracker v2
// ============================================================
async function handleV2(payload: V2Payload, req: Request, supabase: any) {
  const { data: workspace, error: wsError } = await supabase
    .from('analytics_workspace_keys')
    .select('client_id, active')
    .eq('workspace_key', payload.k)
    .maybeSingle();

  if (wsError || !workspace || !workspace.active) {
    console.error('Invalid workspace key:', payload.k);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const clientId = workspace.client_id;

  // Get client's website URL for domain validation
  const { data: client } = await supabase
    .from('clients')
    .select('website_url')
    .eq('id', clientId)
    .single();

  // Extract events by type
  const pageView = payload.v.find(e => e.t === 'pv');
  const cwvEvent = payload.v.find(e => e.t === 'cwv');
  const engEvent = payload.v.find(e => e.t === 'eng');

  if (!pageView) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Domain validation
  if (pageView.url && client?.website_url) {
    try {
      const eventDomain = new URL(pageView.url).hostname.replace(/^www\./, '');
      const clientDomain = new URL(
        client.website_url.startsWith('http')
          ? client.website_url
          : `https://${client.website_url}`
      ).hostname.replace(/^www\./, '');

      if (eventDomain !== clientDomain) {
        console.log('Blocked non-client domain:', eventDomain, 'Expected:', clientDomain);
        return new Response(null, { status: 204, headers: corsHeaders });
      }
    } catch (e) {
      console.error('URL parsing error:', e);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  }

  // Block editor paths
  const urlToCheck = pageView.url || pageView.path || '';
  if (isEditorPath(urlToCheck)) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Parse request metadata
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'unknown';
  const ua = req.headers.get('user-agent') || pageView.ua || 'Unknown';
  const { family, device } = parseUserAgent(ua);
  const ipSalt = Deno.env.get('IP_HASH_SALT') || 'default-salt-change-in-production';
  const ipHash = await hashIP(clientIP, ipSalt);

  // Insert page view into web_events
  const event = {
    client_id: clientId,
    received_at: new Date().toISOString(),
    ts_ms: pageView.ts,
    sid: pageView.sid,
    uid: null,
    type: 'page_view',
    url: pageView.url || null,
    path: pageView.path || null,
    title: pageView.title || null,
    referrer: pageView.ref || null,
    source: pageView.src || null,
    medium: pageView.med || null,
    utm_source: pageView.utm_source || null,
    utm_medium: pageView.utm_medium || null,
    utm_campaign: pageView.utm_campaign || null,
    utm_term: pageView.utm_term || null,
    utm_content: pageView.utm_content || null,
    entry: pageView.entry || false,
    ua_family: family,
    ua_device: device,
    ip_hash: ipHash,
    scroll_depth: engEvent?.scroll || null,
    engaged_seconds: engEvent?.time || null,
    meta: {},
  };

  const { error: insertError } = await supabase.from('web_events').insert(event);
  if (insertError) {
    console.error('web_events insert error:', insertError);
  }

  // Store CWV data if present
  if (cwvEvent && (cwvEvent.lcp || cwvEvent.cls !== undefined || cwvEvent.inp)) {
    const cwvRow = {
      client_id: clientId,
      url: pageView.url || pageView.path || '',
      lcp_ms: cwvEvent.lcp || null,
      cls: cwvEvent.cls !== undefined ? cwvEvent.cls : null,
      inp_ms: cwvEvent.inp || null,
      fcp_ms: cwvEvent.fcp || null,
      ttfb_ms: cwvEvent.ttfb || null,
      device: device.toLowerCase(),
    };

    const { error: cwvError } = await supabase.from('cwv_metrics').insert(cwvRow);
    if (cwvError) {
      console.error('cwv_metrics insert error:', cwvError);
    }
  }

  // GA4 Measurement Protocol fan-out
  const { data: ga4Config } = await supabase
    .from('ga4_configs')
    .select('measurement_id, api_secret')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .maybeSingle();

  if (ga4Config) {
    const ga4Url = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4Config.measurement_id}&api_secret=${ga4Config.api_secret}`;

    const ga4Payload = {
      client_id: pageView.sid,
      events: [{
        name: 'page_view',
        params: {
          page_location: pageView.url,
          page_title: pageView.title,
          page_referrer: pageView.ref,
          engagement_time_msec: (engEvent?.time || 0) * 1000,
        }
      }]
    };

    // Fire and forget — don't block the response
    fetch(ga4Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ga4Payload),
    }).catch(err => console.error('GA4 fan-out error:', err));
  }

  // Update last event timestamp
  await supabase
    .from('analytics_workspace_keys')
    .update({ last_event_at: new Date().toISOString() })
    .eq('workspace_key', payload.k);

  return new Response(null, { status: 204, headers: corsHeaders });
}

// ============================================================
// v1 handler — legacy single-event format (backwards compat)
// ============================================================
async function handleV1(payload: V1Payload, req: Request, supabase: any) {
  const { data: workspace, error: wsError } = await supabase
    .from('analytics_workspace_keys')
    .select('client_id, active')
    .eq('workspace_key', payload.workspaceKey)
    .maybeSingle();

  if (wsError || !workspace || !workspace.active) {
    console.error('Invalid workspace key:', payload.workspaceKey);
    return new Response(JSON.stringify({ error: 'Invalid workspace key' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get client's website URL for domain validation
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('website_url')
    .eq('id', workspace.client_id)
    .single();

  if (clientError || !client?.website_url) {
    console.error('Client website URL not found');
    return new Response(JSON.stringify({ error: 'Invalid client configuration' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate event URL matches client domain
  const eventUrl = payload.url || '';
  if (eventUrl) {
    try {
      const eventDomain = new URL(eventUrl).hostname.replace(/^www\./, '');
      const clientDomain = new URL(
        client.website_url.startsWith('http')
          ? client.website_url
          : `https://${client.website_url}`
      ).hostname.replace(/^www\./, '');

      if (eventDomain !== clientDomain) {
        console.log('Blocked non-client domain:', eventDomain, 'Expected:', clientDomain);
        return new Response(null, { status: 204, headers: corsHeaders });
      }
    } catch (e) {
      console.error('URL parsing error:', e);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  }

  // Block editor paths
  const urlToCheck = payload.url || payload.path || '';
  if (isEditorPath(urlToCheck)) {
    console.log('Blocked editor path:', urlToCheck);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'unknown';
  const ua = req.headers.get('user-agent') || payload.userAgent || 'Unknown';
  const { family, device } = parseUserAgent(ua);
  const ipSalt = Deno.env.get('IP_HASH_SALT') || 'default-salt-change-in-production';
  const ipHash = await hashIP(clientIP, ipSalt);

  const { workspaceKey, userAgent, ...eventData } = payload;

  const knownFields = ['type', 'ts', 'sid', 'uid', 'url', 'path', 'title', 'referrer',
                       'source', 'medium', 'utm_source', 'utm_medium', 'utm_campaign',
                       'utm_term', 'utm_content', 'entry', 'content_type', 'slug',
                       'form', 'value'];

  const meta = Object.keys(eventData).reduce((acc, key) => {
    if (!knownFields.includes(key)) {
      acc[key] = eventData[key];
    }
    return acc;
  }, {} as Record<string, any>);

  const event = {
    client_id: workspace.client_id,
    received_at: new Date().toISOString(),
    ts_ms: payload.ts,
    sid: payload.sid,
    uid: payload.uid || null,
    type: payload.type,
    url: payload.url || null,
    path: payload.path || null,
    title: payload.title || null,
    referrer: payload.referrer || null,
    source: payload.source || null,
    medium: payload.medium || null,
    utm_source: payload.utm_source || null,
    utm_medium: payload.utm_medium || null,
    utm_campaign: payload.utm_campaign || null,
    utm_term: payload.utm_term || null,
    utm_content: payload.utm_content || null,
    entry: payload.entry || false,
    content_type: payload.content_type || null,
    slug: payload.slug || null,
    form: payload.form || null,
    value: payload.value || null,
    ua_family: family,
    ua_device: device,
    ip_hash: ipHash,
    meta
  };

  const { error: insertError } = await supabase.from('web_events').insert(event);
  if (insertError) {
    console.error('Insert error:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to save event' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  await supabase
    .from('analytics_workspace_keys')
    .update({ last_event_at: new Date().toISOString() })
    .eq('workspace_key', payload.workspaceKey);

  return new Response(null, { status: 204, headers: corsHeaders });
}

// ============================================================
// Shared helpers
// ============================================================
function isEditorPath(url: string): boolean {
  return url.includes('my.duda.co') ||
    url.includes('edit.duda.co') ||
    url.includes('mywebsitemanager.co') ||
    url.includes('/editor/') ||
    url.includes('/preview/') ||
    url.includes('/edit-site/');
}
