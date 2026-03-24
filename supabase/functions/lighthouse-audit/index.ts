import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditRequest {
  client_id?: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: AuditRequest = req.method === 'POST' ? await req.json() : {};
    let clientIds: string[] = [];

    if (body.client_id) {
      clientIds = [body.client_id];
    } else {
      // Batch mode: audit all clients with website_url
      const { data: clients } = await supabase
        .from('clients')
        .select('id, website_url')
        .not('website_url', 'is', null)
        .eq('status', 'active');
      clientIds = (clients || []).map((c: any) => c.id);
    }

    const results = [];
    const PSI_API = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
    const apiKey = Deno.env.get('GOOGLE_PSI_API_KEY') || '';

    for (const clientId of clientIds) {
      const { data: client } = await supabase
        .from('clients')
        .select('website_url')
        .eq('id', clientId)
        .single();

      if (!client?.website_url) continue;

      const targetUrl = client.website_url.startsWith('http')
        ? client.website_url
        : `https://${client.website_url}`;

      for (const strategy of ['mobile', 'desktop'] as const) {
        try {
          const params = new URLSearchParams({
            url: targetUrl,
            strategy: strategy.toUpperCase(),
            category: 'PERFORMANCE',
          });
          if (apiKey) params.set('key', apiKey);

          const response = await fetch(`${PSI_API}?${params}`);
          if (!response.ok) {
            console.error(`PSI error for ${targetUrl} (${strategy}):`, await response.text());
            continue;
          }

          const data = await response.json();
          const lh = data.lighthouseResult;
          if (!lh) continue;

          const audits = lh.audits || {};
          const score = Math.round((lh.categories?.performance?.score || 0) * 100);

          const row = {
            client_id: clientId,
            url: targetUrl,
            strategy,
            performance_score: score,
            lcp_ms: Math.round((audits['largest-contentful-paint']?.numericValue || 0)),
            cls: Math.round((audits['cumulative-layout-shift']?.numericValue || 0) * 1000) / 1000,
            inp_ms: Math.round((audits['interaction-to-next-paint']?.numericValue || 0)),
            fcp_ms: Math.round((audits['first-contentful-paint']?.numericValue || 0)),
            ttfb_ms: Math.round((audits['server-response-time']?.numericValue || 0)),
            si_ms: Math.round((audits['speed-index']?.numericValue || 0)),
            tbt_ms: Math.round((audits['total-blocking-time']?.numericValue || 0)),
            audit_data: {
              opportunities: Object.values(audits)
                .filter((a: any) => a.details?.type === 'opportunity' && a.numericValue > 100)
                .map((a: any) => ({
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  savings_ms: Math.round(a.numericValue),
                }))
                .sort((a: any, b: any) => b.savings_ms - a.savings_ms)
                .slice(0, 10),
            },
          };

          const { error } = await supabase.from('lighthouse_audits').insert(row);
          if (error) console.error('Insert error:', error);

          results.push({ client_id: clientId, strategy, score, url: targetUrl });
        } catch (err) {
          console.error(`Audit error for ${targetUrl} (${strategy}):`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, audits: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lighthouse audit error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
