import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────
// Threshold detection logic
// ─────────────────────────────────────────────

interface MetricSnapshot {
  current: number;
  previous: number;
}

interface ThresholdBreach {
  type: string;
  severity: string;
  message: string;
}

function detectThresholdBreaches(metrics: {
  conversionRate?: MetricSnapshot;
  lcpMs?: MetricSnapshot;
  clsScore?: MetricSnapshot;
  inpMs?: MetricSnapshot;
  rageClicks?: MetricSnapshot;
  rankingPosition?: MetricSnapshot;
}): ThresholdBreach[] {
  const breaches: ThresholdBreach[] = [];

  // Conversion rate drop >30%
  if (metrics.conversionRate !== undefined) {
    const { current, previous } = metrics.conversionRate;
    if (previous > 0) {
      const drop = (previous - current) / previous;
      if (drop > 0.3) {
        breaches.push({
          type: 'conversion_drop',
          severity: 'critical',
          message: `Conversion rate dropped ${(drop * 100).toFixed(1)}% (${previous.toFixed(2)}% → ${current.toFixed(2)}%)`,
        });
      }
    }
  }

  // LCP regression past 2500ms (was passing, now failing)
  if (metrics.lcpMs !== undefined) {
    const { current, previous } = metrics.lcpMs;
    if (previous <= 2500 && current > 2500) {
      breaches.push({
        type: 'cwv_lcp_fail',
        severity: 'high',
        message: `LCP regressed past 2500ms threshold (${previous}ms → ${current}ms)`,
      });
    }
  }

  // CLS regression past 0.1 (was passing, now failing)
  if (metrics.clsScore !== undefined) {
    const { current, previous } = metrics.clsScore;
    if (previous <= 0.1 && current > 0.1) {
      breaches.push({
        type: 'cwv_cls_fail',
        severity: 'high',
        message: `CLS regressed past 0.1 threshold (${previous} → ${current})`,
      });
    }
  }

  // INP regression past 200ms (was passing, now failing)
  if (metrics.inpMs !== undefined) {
    const { current, previous } = metrics.inpMs;
    if (previous <= 200 && current > 200) {
      breaches.push({
        type: 'cwv_inp_fail',
        severity: 'high',
        message: `INP regressed past 200ms threshold (${previous}ms → ${current}ms)`,
      });
    }
  }

  // Rage click spike >50% increase
  if (metrics.rageClicks !== undefined) {
    const { current, previous } = metrics.rageClicks;
    if (previous > 0) {
      const increase = (current - previous) / previous;
      if (increase > 0.5) {
        breaches.push({
          type: 'rage_click_spike',
          severity: 'medium',
          message: `Rage clicks spiked ${(increase * 100).toFixed(1)}% (${previous} → ${current})`,
        });
      }
    }
  }

  // Ranking drop >5 positions (higher number = worse rank)
  if (metrics.rankingPosition !== undefined) {
    const { current, previous } = metrics.rankingPosition;
    const drop = current - previous;
    if (drop > 5) {
      breaches.push({
        type: 'ranking_drop',
        severity: 'high',
        message: `Ranking dropped ${drop} positions (position ${previous} → ${current})`,
      });
    }
  }

  return breaches;
}

// Map breach type → optimization subcategory
function breachToSubcategory(breachType: string): string {
  const map: Record<string, string> = {
    cwv_lcp_fail: 'cwv_fix',
    cwv_cls_fail: 'cwv_fix',
    cwv_inp_fail: 'cwv_fix',
    conversion_drop: 'headline_cta',
    ranking_drop: 'meta_title',
    rage_click_spike: 'ux_friction',
  };
  return map[breachType] ?? 'ux_friction';
}

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
// Data fetchers
// ─────────────────────────────────────────────

async function getConversionRateByPage(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, { conversions: number; sessions: number }>> {
  // Conversions per page
  const { data: convData } = await supabase
    .from('conversion_events')
    .select('page_url')
    .eq('client_id', clientId)
    .eq('is_bot', false)
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  // Sessions per page
  const { data: sessData } = await supabase
    .from('web_events')
    .select('page_url')
    .eq('client_id', clientId)
    .eq('event_type', 'pageview')
    .eq('is_bot', false)
    .gte('received_at', startDate)
    .lt('received_at', endDate);

  const result: Record<string, { conversions: number; sessions: number }> = {};

  for (const row of convData ?? []) {
    const url = row.page_url || '(unknown)';
    result[url] = result[url] ?? { conversions: 0, sessions: 0 };
    result[url].conversions++;
  }

  for (const row of sessData ?? []) {
    const url = row.page_url || '(unknown)';
    result[url] = result[url] ?? { conversions: 0, sessions: 0 };
    result[url].sessions++;
  }

  return result;
}

async function getLatestCwvByUrl(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, { lcp: number | null; cls: number | null; inp: number | null }>> {
  const { data } = await supabase
    .from('cwv_metrics')
    .select('page_url, lcp_ms, cls_score, inp_ms')
    .eq('client_id', clientId)
    .gte('measured_at', startDate)
    .lt('measured_at', endDate)
    .order('measured_at', { ascending: false });

  const result: Record<string, { lcp: number | null; cls: number | null; inp: number | null }> = {};

  for (const row of data ?? []) {
    const url = row.page_url || '(unknown)';
    // Keep most recent (first due to descending sort)
    if (!result[url]) {
      result[url] = {
        lcp: row.lcp_ms ?? null,
        cls: row.cls_score ?? null,
        inp: row.inp_ms ?? null,
      };
    }
  }

  return result;
}

async function getClarityTotals(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<{ rageClicks: number; deadClicks: number }> {
  const { data } = await supabase
    .from('clarity_daily_metrics')
    .select('rage_click_count, dead_click_count')
    .eq('client_id', clientId)
    .gte('metric_date', startDate)
    .lt('metric_date', endDate);

  let rageClicks = 0;
  let deadClicks = 0;

  for (const row of data ?? []) {
    rageClicks += row.rage_click_count ?? 0;
    deadClicks += row.dead_click_count ?? 0;
  }

  return { rageClicks, deadClicks };
}

async function getLatestRanksByKeyword(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('serp_snapshots')
    .select('keyword, position')
    .eq('client_id', clientId)
    .gte('snapshot_date', startDate)
    .lt('snapshot_date', endDate)
    .order('snapshot_date', { ascending: false });

  const result: Record<string, number> = {};

  for (const row of data ?? []) {
    if (!result[row.keyword] && row.position !== null) {
      result[row.keyword] = row.position;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id ?? null;
    } catch {
      // No body — run for all clients
    }

    // Fetch active clients (or the specified one)
    let clientQuery = supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true);

    if (targetClientId) {
      clientQuery = clientQuery.eq('id', targetClientId);
    }

    const { data: clients, error: clientsError } = await clientQuery;

    if (clientsError) throw new Error(`Error fetching clients: ${clientsError.message}`);
    if (!clients?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active clients found', alerts: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Running threshold checks for ${clients.length} client(s)`);

    // Date windows
    const today = daysAgo(0);
    const minus7 = daysAgo(7);
    const minus14 = daysAgo(14);

    const results = { clients: 0, alerts: 0, errors: [] as string[] };

    for (const client of clients) {
      try {
        console.log(`Processing client: ${client.id} (${client.name})`);
        const recommendations: Array<Record<string, unknown>> = [];

        // ── Conversion rate ────────────────────────────────────────────
        const [currentConv, previousConv] = await Promise.all([
          getConversionRateByPage(supabase, client.id, minus7, today),
          getConversionRateByPage(supabase, client.id, minus14, minus7),
        ]);

        for (const url of new Set([...Object.keys(currentConv), ...Object.keys(previousConv)])) {
          const cur = currentConv[url] ?? { conversions: 0, sessions: 0 };
          const prev = previousConv[url] ?? { conversions: 0, sessions: 0 };

          if (cur.sessions < 10 || prev.sessions < 10) continue; // not enough data

          const curRate = cur.conversions / cur.sessions;
          const prevRate = prev.conversions / prev.sessions;

          const breaches = detectThresholdBreaches({
            conversionRate: { current: curRate * 100, previous: prevRate * 100 },
          });

          for (const breach of breaches) {
            recommendations.push({
              client_id: client.id,
              page_url: url,
              category: 'alert',
              subcategory: breachToSubcategory(breach.type),
              priority: breach.severity,
              current_value: `${(curRate * 100).toFixed(2)}%`,
              proposed_value: `Investigate and fix — ${breach.message}`,
              baseline_metrics: {
                current_sessions: cur.sessions,
                current_conversions: cur.conversions,
                previous_sessions: prev.sessions,
                previous_conversions: prev.conversions,
              },
            });
          }
        }

        // ── CWV ───────────────────────────────────────────────────────
        const [currentCwv, previousCwv] = await Promise.all([
          getLatestCwvByUrl(supabase, client.id, minus7, today),
          getLatestCwvByUrl(supabase, client.id, minus14, minus7),
        ]);

        for (const url of new Set([...Object.keys(currentCwv), ...Object.keys(previousCwv)])) {
          const cur = currentCwv[url];
          const prev = previousCwv[url];

          if (!cur || !prev) continue;

          const metricsToCheck: Parameters<typeof detectThresholdBreaches>[0] = {};

          if (cur.lcp !== null && prev.lcp !== null) {
            metricsToCheck.lcpMs = { current: cur.lcp, previous: prev.lcp };
          }
          if (cur.cls !== null && prev.cls !== null) {
            metricsToCheck.clsScore = { current: cur.cls, previous: prev.cls };
          }
          if (cur.inp !== null && prev.inp !== null) {
            metricsToCheck.inpMs = { current: cur.inp, previous: prev.inp };
          }

          const breaches = detectThresholdBreaches(metricsToCheck);

          for (const breach of breaches) {
            recommendations.push({
              client_id: client.id,
              page_url: url,
              category: 'alert',
              subcategory: breachToSubcategory(breach.type),
              priority: breach.severity,
              current_value: JSON.stringify({ lcp: cur.lcp, cls: cur.cls, inp: cur.inp }),
              proposed_value: `Investigate and fix — ${breach.message}`,
              baseline_metrics: {
                current: cur,
                previous: prev,
              },
            });
          }
        }

        // ── Clarity behavioral ────────────────────────────────────────
        const [currentClarity, previousClarity] = await Promise.all([
          getClarityTotals(supabase, client.id, minus7, today),
          getClarityTotals(supabase, client.id, minus14, minus7),
        ]);

        if (previousClarity.rageClicks > 0) {
          const breaches = detectThresholdBreaches({
            rageClicks: {
              current: currentClarity.rageClicks,
              previous: previousClarity.rageClicks,
            },
          });

          for (const breach of breaches) {
            recommendations.push({
              client_id: client.id,
              page_url: null,
              category: 'alert',
              subcategory: breachToSubcategory(breach.type),
              priority: breach.severity,
              current_value: `${currentClarity.rageClicks} rage clicks`,
              proposed_value: `Investigate and fix — ${breach.message}`,
              baseline_metrics: {
                current_rage_clicks: currentClarity.rageClicks,
                previous_rage_clicks: previousClarity.rageClicks,
                current_dead_clicks: currentClarity.deadClicks,
                previous_dead_clicks: previousClarity.deadClicks,
              },
            });
          }
        }

        // ── Rankings ──────────────────────────────────────────────────
        const [currentRanks, previousRanks] = await Promise.all([
          getLatestRanksByKeyword(supabase, client.id, minus7, today),
          getLatestRanksByKeyword(supabase, client.id, minus14, minus7),
        ]);

        for (const keyword of new Set([...Object.keys(currentRanks), ...Object.keys(previousRanks)])) {
          const cur = currentRanks[keyword];
          const prev = previousRanks[keyword];

          if (cur === undefined || prev === undefined) continue;

          const breaches = detectThresholdBreaches({
            rankingPosition: { current: cur, previous: prev },
          });

          for (const breach of breaches) {
            recommendations.push({
              client_id: client.id,
              page_url: null,
              category: 'alert',
              subcategory: breachToSubcategory(breach.type),
              priority: breach.severity,
              current_value: `Position ${cur} for "${keyword}"`,
              proposed_value: `Investigate and fix — ${breach.message}`,
              baseline_metrics: {
                keyword,
                current_position: cur,
                previous_position: prev,
              },
            });
          }
        }

        // ── Persist recommendations ───────────────────────────────────
        if (recommendations.length > 0) {
          const { error: insertError } = await supabase
            .from('optimization_recommendations')
            .insert(recommendations);

          if (insertError) {
            console.error(`Error inserting recommendations for ${client.id}:`, insertError);
            results.errors.push(`Client ${client.id}: ${insertError.message}`);
          } else {
            console.log(`Inserted ${recommendations.length} alert(s) for client ${client.id}`);
            results.alerts += recommendations.length;
          }
        } else {
          console.log(`No threshold breaches for client ${client.id}`);
        }

        results.clients++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing client ${client.id}:`, err);
        results.errors.push(`Client ${client.id}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Fatal error in optimization-alerts:', err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
