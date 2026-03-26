import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckpointMetrics {
  sessions: number;
  conversions: number;
  lcp_ms: number | null;
  position: number | null;
  checked_at: string;
}

interface OutcomeMetrics {
  check_7d?: CheckpointMetrics;
  check_14d?: CheckpointMetrics;
  check_21d?: CheckpointMetrics;
}

interface BaselineMetrics {
  sessions?: number;
  conversions?: number;
  lcp_ms?: number | null;
  position?: number | null;
}

interface Recommendation {
  id: string;
  client_id: string;
  page_url: string | null;
  category: string;
  subcategory: string;
  priority: string;
  doctrine_rule: string | null;
  current_value: string | null;
  proposed_value: string | null;
  ai_reasoning: string | null;
  baseline_metrics: BaselineMetrics | null;
  outcome_metrics: OutcomeMetrics | null;
  status: string;
  applied_at: string;
  check_7d_at: string | null;
  check_14d_at: string | null;
  check_21d_at: string | null;
}

interface MonitorSummary {
  checked: number;
  monitoring: number;
  succeeded: number;
  regressed: number;
  errors: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const applied = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - applied) / (1000 * 60 * 60 * 24));
}

async function snapshotMetrics(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  pageUrl: string | null,
): Promise<CheckpointMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let sessions = 0;
  let conversions = 0;
  let lcpMs: number | null = null;
  let position: number | null = null;

  // Sessions from web_events (last 7 days, non-bot)
  try {
    let webEventsQuery = supabase
      .from("web_events")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("is_bot", false)
      .gte("received_at", sevenDaysAgo);

    if (pageUrl) {
      webEventsQuery = webEventsQuery.eq("page_url", pageUrl);
    }

    const { count } = await webEventsQuery;
    sessions = count ?? 0;
  } catch (err) {
    console.error("Error fetching web_events count:", err);
  }

  // Conversions from conversion_events (last 7 days, non-bot)
  try {
    let convQuery = supabase
      .from("conversion_events")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("is_bot", false)
      .gte("created_at", sevenDaysAgo);

    if (pageUrl) {
      convQuery = convQuery.eq("page_url", pageUrl);
    }

    const { count } = await convQuery;
    conversions = count ?? 0;
  } catch (err) {
    console.error("Error fetching conversion_events count:", err);
  }

  // Latest CWV for the URL
  if (pageUrl) {
    try {
      const { data: cwvData } = await supabase
        .from("cwv_metrics")
        .select("lcp_ms")
        .eq("client_id", clientId)
        .eq("page_url", pageUrl)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();

      if (cwvData) {
        lcpMs = cwvData.lcp_ms ?? null;
      }
    } catch {
      // CWV may not exist — not fatal
    }
  }

  // Latest SERP position for keywords targeting this URL
  if (pageUrl) {
    try {
      const { data: serpData } = await supabase
        .from("serp_snapshots")
        .select("position")
        .eq("client_id", clientId)
        .eq("page_url", pageUrl)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (serpData) {
        position = serpData.position ?? null;
      }
    } catch {
      // SERP may not exist — not fatal
    }
  }

  return {
    sessions,
    conversions,
    lcp_ms: lcpMs,
    position,
    checked_at: now.toISOString(),
  };
}

function detectRegression(
  rec: Recommendation,
  checkpoint: CheckpointMetrics,
  checkLabel: "check_14d" | "check_21d",
): { regressed: boolean; doctrineRule: string } {
  const baseline = rec.baseline_metrics;
  if (!baseline) return { regressed: false, doctrineRule: "" };

  const subcategory = rec.subcategory;

  // meta_title / meta_desc: CTR-proxy (sessions) drop > 20%
  if (subcategory === "meta_title" || subcategory === "meta_desc") {
    const baselineSessions = baseline.sessions ?? 0;
    if (baselineSessions > 0) {
      const drop = (baselineSessions - checkpoint.sessions) / baselineSessions;
      if (drop > 0.2) {
        return { regressed: true, doctrineRule: "Section 12.2" };
      }
    }
    return { regressed: false, doctrineRule: "Section 12.2" };
  }

  // content_expand: primary keyword ranking dropped > 5 positions
  if (subcategory === "content_expand") {
    const baselinePos = baseline.position ?? null;
    const currentPos = checkpoint.position ?? null;
    if (baselinePos !== null && currentPos !== null) {
      if (currentPos - baselinePos > 5) {
        return { regressed: true, doctrineRule: "Section 14.2" };
      }
    }
    return { regressed: false, doctrineRule: "Section 14.2" };
  }

  // All others: sessions AND conversions both dropped > 20%
  const baselineSessions = baseline.sessions ?? 0;
  const baselineConversions = baseline.conversions ?? 0;
  if (baselineSessions > 0 && baselineConversions > 0) {
    const sessionDrop = (baselineSessions - checkpoint.sessions) / baselineSessions;
    const convDrop = (baselineConversions - checkpoint.conversions) / baselineConversions;
    if (sessionDrop > 0.2 && convDrop > 0.2) {
      return { regressed: true, doctrineRule: "Section 14.2" };
    }
  }

  return { regressed: false, doctrineRule: "" };
}

async function createRevertRecommendation(
  supabase: ReturnType<typeof createClient>,
  original: Recommendation,
  checkMetrics: CheckpointMetrics,
  doctrineRule: string,
): Promise<void> {
  const appliedDate = new Date(original.applied_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const baseline = original.baseline_metrics ?? {};
  const baselineDesc = original.subcategory === "content_expand"
    ? `position ${baseline.position ?? "unknown"}`
    : `sessions ${baseline.sessions ?? "unknown"}`;
  const currentDesc = original.subcategory === "content_expand"
    ? `position ${checkMetrics.position ?? "unknown"}`
    : `sessions ${checkMetrics.sessions}`;

  await supabase.from("optimization_recommendations").insert({
    client_id: original.client_id,
    page_url: original.page_url,
    category: "alert",
    subcategory: original.subcategory,
    priority: "critical",
    doctrine_rule: doctrineRule,
    current_value: original.proposed_value,
    proposed_value: `REVERT: ${original.current_value ?? "original value"}`,
    ai_reasoning: `Change applied on ${appliedDate} caused regression. Baseline: ${baselineDesc}, Current: ${currentDesc}. Recommend reverting per Doctrine ${doctrineRule}.`,
    baseline_metrics: original.baseline_metrics,
    status: "pending",
  });

  console.log(`Created revert recommendation for rec ${original.id} (${doctrineRule})`);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("Starting optimization monitor run...");

    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id ?? null;
    } catch {
      // No body — process all clients
    }

    // Query applied/monitoring recommendations
    let query = supabase
      .from("optimization_recommendations")
      .select("*")
      .in("status", ["applied", "monitoring"])
      .not("applied_at", "is", null);

    if (targetClientId) {
      query = query.eq("client_id", targetClientId);
      console.log(`Filtering to client: ${targetClientId}`);
    }

    const { data: recs, error: recsError } = await query;

    if (recsError) {
      throw new Error(`Error fetching recommendations: ${recsError.message}`);
    }

    if (!recs || recs.length === 0) {
      console.log("No applied/monitoring recommendations found");
      return new Response(
        JSON.stringify({ checked: 0, monitoring: 0, succeeded: 0, regressed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Processing ${recs.length} recommendation(s)`);

    const summary: MonitorSummary = {
      checked: 0,
      monitoring: 0,
      succeeded: 0,
      regressed: 0,
      errors: [],
    };

    for (const rec of recs as Recommendation[]) {
      try {
        const days = daysSince(rec.applied_at);
        console.log(`Rec ${rec.id}: ${days} days since applied (${rec.subcategory})`);

        const outcomeMetrics: OutcomeMetrics = rec.outcome_metrics ?? {};
        let statusUpdate: string | null = null;
        let regressedRec = false;

        // ── 7-day check ──────────────────────────────────────────────────────
        if (rec.check_7d_at === null && days >= 7) {
          console.log(`Running 7-day check for rec ${rec.id}`);
          const metrics = await snapshotMetrics(supabase, rec.client_id, rec.page_url);
          outcomeMetrics.check_7d = metrics;

          await supabase
            .from("optimization_recommendations")
            .update({
              check_7d_at: new Date().toISOString(),
              status: "monitoring",
              outcome_metrics: outcomeMetrics,
            })
            .eq("id", rec.id);

          statusUpdate = "monitoring";
          summary.monitoring++;
          console.log(`7-day check complete for rec ${rec.id}: sessions=${metrics.sessions}, conversions=${metrics.conversions}`);
        }

        // ── 14-day check ─────────────────────────────────────────────────────
        if (rec.check_14d_at === null && days >= 14) {
          console.log(`Running 14-day check for rec ${rec.id}`);
          const metrics = await snapshotMetrics(supabase, rec.client_id, rec.page_url);
          outcomeMetrics.check_14d = metrics;

          const { regressed, doctrineRule } = detectRegression(rec, metrics, "check_14d");

          if (regressed) {
            console.log(`Regression detected at 14-day check for rec ${rec.id} (${doctrineRule})`);
            statusUpdate = "regressed";
            regressedRec = true;
            await createRevertRecommendation(supabase, rec, metrics, doctrineRule);
          }

          await supabase
            .from("optimization_recommendations")
            .update({
              check_14d_at: new Date().toISOString(),
              status: regressedRec ? "regressed" : (statusUpdate ?? rec.status),
              outcome_metrics: outcomeMetrics,
            })
            .eq("id", rec.id);

          if (regressedRec) {
            summary.regressed++;
          }
          console.log(`14-day check complete for rec ${rec.id}: sessions=${metrics.sessions}, regressed=${regressedRec}`);
        }

        // ── 21-day check ─────────────────────────────────────────────────────
        if (rec.check_21d_at === null && days >= 21) {
          console.log(`Running 21-day check for rec ${rec.id}`);
          const metrics = await snapshotMetrics(supabase, rec.client_id, rec.page_url);
          outcomeMetrics.check_21d = metrics;

          // If already regressed at 14d, keep regressed status
          const alreadyRegressed = rec.status === "regressed" || regressedRec;
          let finalStatus: string;
          let finalRegressed = alreadyRegressed;

          if (alreadyRegressed) {
            finalStatus = "regressed";
          } else {
            const { regressed, doctrineRule } = detectRegression(rec, metrics, "check_21d");
            if (regressed) {
              finalStatus = "regressed";
              finalRegressed = true;
              await createRevertRecommendation(supabase, rec, metrics, doctrineRule);
            } else {
              finalStatus = "succeeded";
            }
          }

          await supabase
            .from("optimization_recommendations")
            .update({
              check_21d_at: new Date().toISOString(),
              status: finalStatus,
              outcome_metrics: outcomeMetrics,
            })
            .eq("id", rec.id);

          if (finalRegressed && !regressedRec) {
            summary.regressed++;
          } else if (!finalRegressed) {
            summary.succeeded++;
          }

          console.log(`21-day check complete for rec ${rec.id}: final_status=${finalStatus}`);
        }

        summary.checked++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing rec ${rec.id}:`, err);
        summary.errors.push(`Rec ${rec.id}: ${msg}`);
      }
    }

    console.log("Optimization monitor run complete:", summary);

    return new Response(
      JSON.stringify({
        checked: summary.checked,
        monitoring: summary.monitoring,
        succeeded: summary.succeeded,
        regressed: summary.regressed,
        ...(summary.errors.length > 0 ? { errors: summary.errors } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in optimization monitor:", error);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
