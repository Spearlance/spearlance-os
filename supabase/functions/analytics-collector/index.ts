import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EventPayload {
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
    if (text.length > 4096) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload: EventPayload = JSON.parse(text);

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
          return new Response(null, { 
            status: 204,
            headers: corsHeaders 
          });
        }
      } catch (e) {
        console.error('URL parsing error:', e);
        return new Response(null, { 
          status: 204,
          headers: corsHeaders 
        });
      }
    }

    // Block known editor/platform paths as backup
    const urlToCheck = payload.url || payload.path || '';
    const isEditorPath = 
      urlToCheck.includes('my.duda.co') ||
      urlToCheck.includes('edit.duda.co') ||
      urlToCheck.includes('mywebsitemanager.co') ||
      urlToCheck.includes('/editor/') ||
      urlToCheck.includes('/preview/') ||
      urlToCheck.includes('/edit-site/');
      
    if (isEditorPath) {
      console.log('Blocked editor path:', urlToCheck);
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
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

    const { error: insertError } = await supabase
      .from('web_events')
      .insert(event);

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

    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
