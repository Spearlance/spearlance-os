import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Types
// ============================================================
interface DataforSEOTask {
  keyword: string;
  location_code: number;
  language_code: string;
  device: string;
  [key: string]: any;
}

interface SerpParseResult {
  position: number | null;
  url: string | null;
  serpFeatures: string[];
  competitorUrls: Array<{ position: number; url: string; domain: string }>;
}

// ============================================================
// Helpers
// ============================================================
function stripWww(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^www\./, '');
  }
}

function parseSerpResult(task: any, clientUrl: string): SerpParseResult {
  const clientDomain = stripWww(clientUrl);
  const result = task?.result?.[0];

  if (!result) {
    return { position: null, url: null, serpFeatures: [], competitorUrls: [] };
  }

  const items: any[] = result.items || [];
  const serpFeatures: string[] = [];

  for (const item of items) {
    if (item.type && item.type !== 'organic' && !serpFeatures.includes(item.type)) {
      serpFeatures.push(item.type);
    }
  }

  const organicItems = items.filter((i: any) => i.type === 'organic');

  let position: number | null = null;
  let matchedUrl: string | null = null;

  for (const item of organicItems) {
    const itemDomain = stripWww(item.url || '');
    if (itemDomain === clientDomain) {
      position = item.rank_absolute ?? item.position ?? null;
      matchedUrl = item.url || null;
      break;
    }
  }

  const competitorUrls = organicItems
    .filter((i: any) => stripWww(i.url || '') !== clientDomain)
    .slice(0, 10)
    .map((i: any) => ({
      position: i.rank_absolute ?? i.position ?? 0,
      url: i.url || '',
      domain: stripWww(i.url || ''),
    }));

  return { position, url: matchedUrl, serpFeatures, competitorUrls };
}

function buildDataforSEOAuthHeader(): string {
  const login = Deno.env.get('DATAFORSEO_LOGIN') || '';
  const password = Deno.env.get('DATAFORSEO_PASSWORD') || '';
  return `Basic ${btoa(`${login}:${password}`)}`;
}

async function callDataforSEO(endpoint: string, body: any[]): Promise<any | null> {
  const url = `https://api.dataforseo.com${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': buildDataforSEOAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`DataforSEO API error ${response.status} at ${endpoint}`);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 500));
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`DataforSEO fetch failed for ${endpoint}:`, err);
    return null;
  }
}

// ============================================================
// Main handler
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    let targetClientId: string | null = null;

    try {
      const body = await req.json();
      targetClientId = body?.client_id || null;
    } catch {
      // No body — sync all active configs
    }

    // Fetch dataforseo_configs with client website_url via join
    let query = supabase
      .from('dataforseo_configs')
      .select('*, clients(website_url)')
      .eq('is_active', true);

    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
      console.log(`Manual sync requested for client: ${targetClientId}`);
    }

    const { data: configs, error: configError } = await query;

    if (configError) {
      throw new Error(`Error fetching dataforseo_configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('No DataforSEO configurations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No configurations found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} DataforSEO configuration(s)`);

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const config of configs) {
      try {
        const clientId: string = config.client_id;
        const websiteUrl: string = config.clients?.website_url || '';

        // Get service-location combos
        const { data: serviceLocations } = await supabase
          .from('client_service_locations')
          .select('service_name, city, state')
          .eq('client_id', clientId)
          .eq('active', true);

        // Generate keyword matrix (3 variations per service-location combo)
        const generatedKeywords: string[] = [];
        for (const sl of serviceLocations || []) {
          const city = sl.city.toLowerCase();
          const state = sl.state.toLowerCase();
          generatedKeywords.push(`${sl.service_name.toLowerCase()} ${city} ${state}`);
          generatedKeywords.push(`${sl.service_name.toLowerCase()} company ${city} ${state}`);
          generatedKeywords.push(`${sl.service_name.toLowerCase()} services ${city} ${state}`);
        }

        // Fallback to tracked_keywords if no service locations configured (backwards compat)
        const legacyKeywords: string[] = config.tracked_keywords || [];
        const trackedKeywords = [...new Set([...generatedKeywords, ...legacyKeywords])];

        if (!trackedKeywords.length) {
          console.log(`No tracked keywords for client ${clientId}, skipping`);
          results.synced++;
          continue;
        }

        console.log(`Processing ${trackedKeywords.length} keywords for client ${clientId} (${generatedKeywords.length} generated, ${legacyKeywords.length} legacy)`);

        // Build SERP tasks — DataforSEO accepts up to 100 tasks per POST
        const serpTasks: DataforSEOTask[] = trackedKeywords.map((keyword) => ({
          keyword,
          location_code: config.location_code || 2840, // US default
          language_code: config.language_code || 'en',
          device: config.device || 'desktop',
          depth: 10,
          se_domain: 'google.com',
        }));

        // Batch into chunks of 100
        const BATCH_SIZE = 100;
        const allTaskResults: Array<{ keyword: string; taskResult: any }> = [];

        for (let i = 0; i < serpTasks.length; i += BATCH_SIZE) {
          const batch = serpTasks.slice(i, i + BATCH_SIZE);
          const batchKeywords = trackedKeywords.slice(i, i + BATCH_SIZE);

          const apiResponse = await callDataforSEO('/v3/serp/google/organic/live/advanced', batch);

          if (apiResponse?.tasks) {
            for (let j = 0; j < apiResponse.tasks.length; j++) {
              allTaskResults.push({
                keyword: batchKeywords[j],
                taskResult: apiResponse.tasks[j],
              });
            }
          }
        }

        // Parse and upsert serp_snapshots
        const snapshotDate = new Date().toISOString().split('T')[0];
        const snapshotsToUpsert: any[] = [];

        for (const { keyword, taskResult } of allTaskResults) {
          const parsed = parseSerpResult(taskResult, websiteUrl);

          snapshotsToUpsert.push({
            client_id: clientId,
            keyword,
            snapshot_date: snapshotDate,
            position: parsed.position,
            url: parsed.url,
            serp_features: parsed.serpFeatures,
            competitor_urls: parsed.competitorUrls,
            location_code: config.location_code || 2840,
            language_code: config.language_code || 'en',
            device: config.device || 'desktop',
            raw_response: taskResult,
            synced_at: new Date().toISOString(),
          });
        }

        if (snapshotsToUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('serp_snapshots')
            .upsert(snapshotsToUpsert, { onConflict: 'client_id,keyword,snapshot_date,device' });

          if (upsertError) {
            console.error(`serp_snapshots upsert error for ${clientId}:`, upsertError);
          } else {
            console.log(`Upserted ${snapshotsToUpsert.length} SERP snapshots for ${clientId}`);
          }
        }

        // Optionally fetch keyword volumes
        if (trackedKeywords.length > 0) {
          const volumeTasks = trackedKeywords.map((keyword) => ({
            keywords: [keyword],
            location_code: config.location_code || 2840,
            language_code: config.language_code || 'en',
          }));

          for (let i = 0; i < volumeTasks.length; i += BATCH_SIZE) {
            const batch = volumeTasks.slice(i, i + BATCH_SIZE);
            const batchKeywords = trackedKeywords.slice(i, i + BATCH_SIZE);

            const volumeResponse = await callDataforSEO(
              '/v3/keywords_data/google_ads/search_volume/live',
              batch
            );

            if (volumeResponse?.tasks) {
              for (let j = 0; j < volumeResponse.tasks.length; j++) {
                const keyword = batchKeywords[j];
                const taskData = volumeResponse.tasks[j];
                const volumeResult = taskData?.result?.[0];

                if (!volumeResult) continue;

                const { error: volUpdateError } = await supabase
                  .from('serp_snapshots')
                  .update({
                    search_volume: volumeResult.search_volume ?? null,
                    cpc: volumeResult.cpc ?? null,
                    keyword_difficulty: volumeResult.keyword_difficulty ?? null,
                  })
                  .eq('client_id', clientId)
                  .eq('keyword', keyword)
                  .eq('snapshot_date', snapshotDate);

                if (volUpdateError) {
                  console.error(`Volume update error for "${keyword}":`, volUpdateError);
                }
              }
            }
          }

          console.log(`Fetched keyword volumes for ${trackedKeywords.length} keywords`);
        }

        // Update last_synced_at on the config
        await supabase
          .from('dataforseo_configs')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', config.id);

        results.synced++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing config ${config.id}:`, err);
        results.failed++;
        results.errors.push(`Client ${config.client_id}: ${message}`);
      }
    }

    console.log('DataforSEO sync completed:', results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Fatal error in dataforseo-sync:', err);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
