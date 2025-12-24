import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedMetrics {
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

interface DimensionItem {
  key: string;
  totalSessionCount: number;
  distinctUserCount: number;
  scrollDepth?: number;
  activeTime?: number;
}

// Parse the nested Clarity API response into flat metrics
function parseMetricsFromResponse(response: any): ParsedMetrics {
  const metrics: ParsedMetrics = {
    totalSessionCount: 0,
    distinctUserCount: 0,
    pagesPerSession: 0,
    scrollDepth: 0,
    activeTime: 0,
    rageClickCount: 0,
    deadClickCount: 0,
    quickbackCount: 0,
    javascriptErrorCount: 0,
  };

  // Handle case where response is not an array
  if (!Array.isArray(response)) {
    console.log('Response is not an array, checking for flat structure');
    // Fallback to flat structure if API returns that format
    if (response?.totalSessionCount !== undefined) {
      return {
        totalSessionCount: parseInt(response.totalSessionCount) || 0,
        distinctUserCount: parseInt(response.distinctUserCount) || 0,
        pagesPerSession: parseFloat(response.pagesPerSession) || 0,
        scrollDepth: parseFloat(response.scrollDepth) || 0,
        activeTime: parseInt(response.activeTime) || 0,
        rageClickCount: parseInt(response.rageClickCount) || 0,
        deadClickCount: parseInt(response.deadClickCount) || 0,
        quickbackCount: parseInt(response.quickbackCount) || 0,
        javascriptErrorCount: parseInt(response.javascriptErrorCount) || 0,
      };
    }
    return metrics;
  }

  console.log(`Parsing ${response.length} metric items from response`);

  // Parse the nested array structure from Clarity API
  for (const item of response) {
    const info = item.information?.[0];
    if (!info) {
      console.log(`No information found for metricName: ${item.metricName}`);
      continue;
    }

    console.log(`Processing metric: ${item.metricName}`, JSON.stringify(info).substring(0, 200));

    switch (item.metricName) {
      case 'Traffic':
        metrics.totalSessionCount = parseInt(info.totalSessionCount) || 0;
        metrics.distinctUserCount = parseInt(info.distinctUserCount) || 0;
        metrics.pagesPerSession = parseFloat(info.pagesPerSessionPercentage) || parseFloat(info.pagesPerSession) || 0;
        break;
      case 'ScrollDepth':
        metrics.scrollDepth = parseFloat(info.averageScrollDepth) || parseFloat(info.scrollDepth) || 0;
        break;
      case 'EngagementTime':
      case 'ActiveTime':
        metrics.activeTime = parseInt(info.activeTime) || parseInt(info.averageActiveTime) || 0;
        break;
      case 'RageClickCount':
      case 'RageClicks':
        metrics.rageClickCount = parseInt(info.subTotal) || parseInt(info.count) || parseInt(info.rageClickCount) || 0;
        break;
      case 'DeadClickCount':
      case 'DeadClicks':
        metrics.deadClickCount = parseInt(info.subTotal) || parseInt(info.count) || parseInt(info.deadClickCount) || 0;
        break;
      case 'QuickbackClick':
      case 'Quickbacks':
        metrics.quickbackCount = parseInt(info.subTotal) || parseInt(info.count) || parseInt(info.quickbackCount) || 0;
        break;
      case 'ScriptErrorCount':
      case 'JavascriptErrors':
        metrics.javascriptErrorCount = parseInt(info.subTotal) || parseInt(info.count) || parseInt(info.javascriptErrorCount) || 0;
        break;
    }
  }

  console.log('Parsed metrics:', metrics);
  return metrics;
}

// Parse dimension data from the nested response
function parseDimensionData(response: any): DimensionItem[] {
  const items: DimensionItem[] = [];

  if (!Array.isArray(response)) {
    // Check if dimensionData exists in a flat structure
    if (response?.dimensionData && Array.isArray(response.dimensionData)) {
      return response.dimensionData.map((item: any) => ({
        key: item.key || '',
        totalSessionCount: parseInt(item.totalSessionCount) || 0,
        distinctUserCount: parseInt(item.distinctUserCount) || 0,
        scrollDepth: parseFloat(item.scrollDepth) || undefined,
        activeTime: parseInt(item.activeTime) || undefined,
      }));
    }
    return items;
  }

  // Look for Traffic metric which contains dimension data
  for (const item of response) {
    if (item.metricName === 'Traffic' && item.information && Array.isArray(item.information)) {
      for (const info of item.information) {
        if (info.key || info.dimensionKey) {
          items.push({
            key: info.key || info.dimensionKey || '',
            totalSessionCount: parseInt(info.totalSessionCount) || 0,
            distinctUserCount: parseInt(info.distinctUserCount) || 0,
            scrollDepth: parseFloat(info.scrollDepth) || undefined,
            activeTime: parseInt(info.activeTime) || undefined,
          });
        }
      }
    }
  }

  return items;
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
    console.log(`Clarity data received${dimension ? ` for ${dimension}` : ''}:`, JSON.stringify(data).substring(0, 1000));
    
    return data;
  } catch (error) {
    console.error('Error fetching Clarity data:', error);
    return null;
  }
}

function parseSourceFromDimension(dimensionKey: string): { source: string; medium: string | null } {
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

    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch {
      // No body or invalid JSON, continue with all clients
    }

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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const metricDate = yesterday.toISOString().split('T')[0];

    for (const config of configs) {
      try {
        console.log(`Processing client: ${config.client_id}`);

        // API Call 1: Base metrics (no dimension)
        const baseData = await fetchClarityData(config.api_token);

        if (baseData) {
          // Parse the nested response structure
          const parsedMetrics = parseMetricsFromResponse(baseData);
          
          console.log(`Upserting metrics for ${config.client_id}: sessions=${parsedMetrics.totalSessionCount}, users=${parsedMetrics.distinctUserCount}`);

          const { error: upsertError } = await supabase
            .from('clarity_daily_metrics')
            .upsert(
              {
                client_id: config.client_id,
                metric_date: metricDate,
                total_sessions: parsedMetrics.totalSessionCount,
                distinct_users: parsedMetrics.distinctUserCount,
                pages_per_session: parsedMetrics.pagesPerSession,
                scroll_depth: parsedMetrics.scrollDepth,
                engagement_time_seconds: parsedMetrics.activeTime,
                rage_click_count: parsedMetrics.rageClickCount,
                dead_click_count: parsedMetrics.deadClickCount,
                quick_back_count: parsedMetrics.quickbackCount,
                javascript_error_count: parsedMetrics.javascriptErrorCount,
                raw_response: baseData,
                synced_at: new Date().toISOString(),
              },
              { onConflict: 'client_id,metric_date' }
            );

          if (upsertError) {
            console.error(`Error upserting base metrics:`, upsertError);
          } else {
            console.log(`Synced base metrics: ${parsedMetrics.totalSessionCount} sessions, ${parsedMetrics.distinctUserCount} users`);
          }
        }

        // API Call 2: Traffic sources by Source dimension
        const sourcesData = await fetchClarityData(config.api_token, 'Source');
        
        if (sourcesData) {
          const dimensionItems = parseDimensionData(sourcesData);
          
          if (dimensionItems.length > 0) {
            const sourcesToUpsert = dimensionItems.map((item) => {
              const { source, medium } = parseSourceFromDimension(item.key);
              return {
                client_id: config.client_id,
                metric_date: metricDate,
                source,
                medium,
                sessions: item.totalSessionCount,
                users: item.distinctUserCount,
                synced_at: new Date().toISOString(),
              };
            });

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
          } else {
            console.log('No dimension data found for sources');
          }
        }

        // API Call 3: Page performance by URL dimension
        const pagesData = await fetchClarityData(config.api_token, 'URL');
        
        if (pagesData) {
          const dimensionItems = parseDimensionData(pagesData);
          
          if (dimensionItems.length > 0) {
            const pagesToUpsert = dimensionItems.map((item) => ({
              client_id: config.client_id,
              metric_date: metricDate,
              page_url: item.key || '/',
              page_title: null,
              sessions: item.totalSessionCount,
              users: item.distinctUserCount,
              scroll_depth: item.scrollDepth || null,
              engagement_time_seconds: item.activeTime || 0,
              synced_at: new Date().toISOString(),
            }));

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
          } else {
            console.log('No dimension data found for pages');
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
