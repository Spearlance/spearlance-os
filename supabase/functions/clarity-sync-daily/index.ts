import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClarityMetrics {
  totalSessionCount: number;
  distinctUserCount: number;
  pagesPerSession: number;
  scrollDepth: number;
  activeTime: number;
  rageClickCount: number;
  deadClickCount: number;
  quickbackCount: number;
  javascriptErrorCount: number;
}

interface ClarityDimensionData {
  key: string;
  totalSessionCount: number;
  distinctUserCount: number;
  scrollDepth?: number;
  activeTime?: number;
}

async function fetchClarityData(apiToken: string, dimension?: string): Promise<any> {
  let url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1`;
  
  if (dimension) {
    url += `&dimension1=${dimension}`;
  }
  
  console.log(`Fetching Clarity data${dimension ? ` with dimension ${dimension}` : ''}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Clarity API error: ${response.status}`);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return null;
    }

    const data = await response.json();
    console.log(`Clarity data received${dimension ? ` for ${dimension}` : ''}:`, JSON.stringify(data).substring(0, 500));
    
    return data;
  } catch (error) {
    console.error('Error fetching Clarity data:', error);
    return null;
  }
}

function parseSourceFromDimension(dimensionKey: string): { source: string; medium: string | null } {
  // Dimension key format could be "google", "google / organic", "(direct)", etc.
  if (!dimensionKey || dimensionKey === '(not set)') {
    return { source: 'direct', medium: null };
  }
  
  if (dimensionKey.includes(' / ')) {
    const parts = dimensionKey.split(' / ');
    return { source: parts[0], medium: parts[1] || null };
  }
  
  return { source: dimensionKey, medium: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Starting Clarity daily sync...');

    // Check if a specific client_id was passed (for manual sync)
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch {
      // No body or invalid JSON, continue with all clients
    }

    // Get Clarity configs (all active or specific one for manual sync)
    let query = supabase
      .from('clarity_configs')
      .select('*');
    
    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
      console.log(`Manual sync requested for client: ${targetClientId}`);
    } else {
      query = query.eq('is_active', true);
    }

    const { data: configs, error: configError } = await query;

    if (configError) {
      throw new Error(`Error fetching configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No Clarity configurations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No configurations found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} Clarity configuration(s)`);

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Calculate yesterday's date (the date we're syncing data for)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const metricDate = yesterday.toISOString().split('T')[0];

    // Process each config
    for (const config of configs) {
      try {
        console.log(`Processing client: ${config.client_id}`);

        // API Call 1: Base metrics (no dimension)
        const baseData = await fetchClarityData(config.api_token);

        if (baseData) {
          const { error: upsertError } = await supabase
            .from('clarity_daily_metrics')
            .upsert(
              {
                client_id: config.client_id,
                metric_date: metricDate,
                total_sessions: baseData.totalSessionCount || 0,
                distinct_users: baseData.distinctUserCount || 0,
                pages_per_session: baseData.pagesPerSession || 0,
                scroll_depth: baseData.scrollDepth || 0,
                engagement_time_seconds: baseData.activeTime || 0,
                rage_click_count: baseData.rageClickCount || 0,
                dead_click_count: baseData.deadClickCount || 0,
                quick_back_count: baseData.quickbackCount || 0,
                javascript_error_count: baseData.javascriptErrorCount || 0,
                raw_response: baseData,
                synced_at: new Date().toISOString(),
              },
              { onConflict: 'client_id,metric_date' }
            );

          if (upsertError) {
            console.error(`Error upserting base metrics:`, upsertError);
          } else {
            console.log(`Synced base metrics: ${baseData.totalSessionCount} sessions, ${baseData.distinctUserCount} users`);
          }
        }

        // API Call 2: Traffic sources by Source dimension
        const sourcesData = await fetchClarityData(config.api_token, 'Source');
        
        if (sourcesData?.dimensionData && Array.isArray(sourcesData.dimensionData)) {
          const sourcesToUpsert = sourcesData.dimensionData.map((item: ClarityDimensionData) => {
            const { source, medium } = parseSourceFromDimension(item.key);
            return {
              client_id: config.client_id,
              metric_date: metricDate,
              source,
              medium,
              sessions: item.totalSessionCount || 0,
              users: item.distinctUserCount || 0,
              synced_at: new Date().toISOString(),
            };
          });

          if (sourcesToUpsert.length > 0) {
            // Delete existing sources for this date first to avoid conflicts
            await supabase
              .from('clarity_daily_sources')
              .delete()
              .eq('client_id', config.client_id)
              .eq('metric_date', metricDate);

            const { error: sourcesError } = await supabase
              .from('clarity_daily_sources')
              .insert(sourcesToUpsert);

            if (sourcesError) {
              console.error(`Error inserting sources:`, sourcesError);
            } else {
              console.log(`Synced ${sourcesToUpsert.length} traffic sources`);
            }
          }
        }

        // API Call 3: Page performance by URL dimension
        const pagesData = await fetchClarityData(config.api_token, 'URL');
        
        if (pagesData?.dimensionData && Array.isArray(pagesData.dimensionData)) {
          const pagesToUpsert = pagesData.dimensionData.map((item: ClarityDimensionData) => ({
            client_id: config.client_id,
            metric_date: metricDate,
            page_url: item.key || '/',
            page_title: null, // Clarity doesn't provide title in this endpoint
            sessions: item.totalSessionCount || 0,
            users: item.distinctUserCount || 0,
            scroll_depth: item.scrollDepth || null,
            engagement_time_seconds: item.activeTime || 0,
            synced_at: new Date().toISOString(),
          }));

          if (pagesToUpsert.length > 0) {
            // Delete existing pages for this date first to avoid conflicts
            await supabase
              .from('clarity_daily_pages')
              .delete()
              .eq('client_id', config.client_id)
              .eq('metric_date', metricDate);

            const { error: pagesError } = await supabase
              .from('clarity_daily_pages')
              .insert(pagesToUpsert);

            if (pagesError) {
              console.error(`Error inserting pages:`, pagesError);
            } else {
              console.log(`Synced ${pagesToUpsert.length} pages`);
            }
          }
        }

        // Update last_synced_at
        await supabase
          .from('clarity_configs')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', config.id);

        results.synced++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing config ${config.id}:`, error);
        results.failed++;
        results.errors.push(`Client ${config.client_id}: ${errorMessage}`);
      }
    }

    console.log('Clarity daily sync completed:', results);

    return new Response(
      JSON.stringify({ success: true, metricDate, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in Clarity daily sync:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
