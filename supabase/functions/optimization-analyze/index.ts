import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { scorePageAgainstDoctrine, type PageAudit, type DoctrineGap } from "../_shared/doctrineScorer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageMetrics {
  url: string;
  path: string;
  pageviews: number;
  sessions: number;
  avg_engaged_seconds: number;
  avg_scroll_depth: number;
  entry_sessions: number;
}

interface ConversionMetrics {
  page_url: string;
  conversions: number;
  form_submits: number;
  phone_clicks: number;
}

interface CwvMetrics {
  url: string;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  device: string | null;
  measured_at: string;
}

interface ClarityPageMetrics {
  page_url: string;
  sessions: number;
  avg_scroll: number;
  avg_engagement: number;
}

interface ClarityBehavioral {
  rage_clicks: number;
  dead_clicks: number;
  quick_backs: number;
}

interface SerpSnapshot {
  keyword: string;
  position: number | null;
  url: string | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  serp_features: string[];
}

interface GapSignal {
  page_url: string;
  category: "seo" | "cro" | "content" | "alert";
  subcategory: string;
  priority: "critical" | "high" | "medium" | "low";
  doctrine_rule: string | null;
  current_value: string | null;
  description: string;
}

interface CycleSummary {
  gap_signals: GapSignal[];
  pages_analyzed: number;
  data_sources: string[];
  top_issues: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

/** Aggregate raw web_events rows into per-page metrics entirely in JS. */
function aggregateWebEvents(rows: Record<string, unknown>[]): Map<string, PageMetrics> {
  const map = new Map<string, PageMetrics>();

  for (const row of rows) {
    const url = (row.url as string) ?? "";
    const path = (row.path as string) ?? "";
    const sid = row.sid as string;
    const engaged = Number(row.engaged_seconds ?? 0);
    const scroll = Number(row.scroll_depth ?? 0);
    const isEntry = Boolean(row.entry);

    if (!map.has(url)) {
      map.set(url, { url, path, pageviews: 0, sessions: 0, avg_engaged_seconds: 0, avg_scroll_depth: 0, entry_sessions: 0 });
    }

    const p = map.get(url)!;
    p.pageviews++;
    p.avg_engaged_seconds = (p.avg_engaged_seconds * (p.pageviews - 1) + engaged) / p.pageviews;
    p.avg_scroll_depth = (p.avg_scroll_depth * (p.pageviews - 1) + scroll) / p.pageviews;
    if (isEntry) p.entry_sessions++;

    // session dedup tracked separately below — for now count unique sids via a side set
    // We'll recompute after loop via a secondary pass
    void sid;
  }

  // Second pass: count distinct sessions per URL
  const sidsByUrl = new Map<string, Set<string>>();
  for (const row of rows) {
    const url = (row.url as string) ?? "";
    const sid = row.sid as string;
    if (!sidsByUrl.has(url)) sidsByUrl.set(url, new Set());
    sidsByUrl.get(url)!.add(sid);
  }
  for (const [url, sids] of sidsByUrl) {
    const p = map.get(url);
    if (p) p.sessions = sids.size;
  }

  return map;
}

/** Aggregate raw conversion_events rows into per-page metrics. */
function aggregateConversions(rows: Record<string, unknown>[]): Map<string, ConversionMetrics> {
  const map = new Map<string, ConversionMetrics>();
  for (const row of rows) {
    const url = (row.page_url as string) ?? "";
    if (!map.has(url)) {
      map.set(url, { page_url: url, conversions: 0, form_submits: 0, phone_clicks: 0 });
    }
    const c = map.get(url)!;
    c.conversions++;
    if (row.event_type === "form_submit") c.form_submits++;
    if (row.event_type === "phone_click") c.phone_clicks++;
  }
  return map;
}

/** Aggregate raw clarity_daily_pages rows into per-page metrics. */
function aggregateClarityPages(rows: Record<string, unknown>[]): Map<string, ClarityPageMetrics> {
  const map = new Map<string, ClarityPageMetrics>();
  const countByUrl = new Map<string, number>();

  for (const row of rows) {
    const url = (row.page_url as string) ?? "";
    if (!map.has(url)) {
      map.set(url, { page_url: url, sessions: 0, avg_scroll: 0, avg_engagement: 0 });
      countByUrl.set(url, 0);
    }
    const p = map.get(url)!;
    const n = countByUrl.get(url)! + 1;
    p.sessions += Number(row.sessions ?? 0);
    p.avg_scroll = (p.avg_scroll * (n - 1) + Number(row.scroll_depth ?? 0)) / n;
    p.avg_engagement = (p.avg_engagement * (n - 1) + Number(row.engagement_time_seconds ?? 0)) / n;
    countByUrl.set(url, n);
  }

  return map;
}

/** Convert DoctrineGap severity to GapSignal priority. */
function severityToPriority(severity: DoctrineGap["severity"]): GapSignal["priority"] {
  return severity as GapSignal["priority"];
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
    // Parse optional client_id from body
    let targetClientId: string | null = null;
    try {
      const body = await req.json();
      targetClientId = body?.client_id ?? null;
    } catch {
      // No body — process all clients
    }

    const cycleDate = new Date().toISOString().split("T")[0];
    const since = thirtyDaysAgo();

    // ── 1. Resolve client list ─────────────────────────────────────────────
    let clientQuery = supabase
      .from("analytics_workspace_keys")
      .select("client_id")
      .eq("active", true);

    if (targetClientId) {
      clientQuery = clientQuery.eq("client_id", targetClientId);
    }

    const { data: workspaceRows, error: workspaceError } = await clientQuery;

    if (workspaceError) throw new Error(`Failed to fetch workspace keys: ${workspaceError.message}`);
    if (!workspaceRows || workspaceRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active workspace keys found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate client IDs
    const clientIds = [...new Set(workspaceRows.map((r: { client_id: string }) => r.client_id))];
    console.log(`Starting optimization analysis for ${clientIds.length} client(s) — cycle date: ${cycleDate}`);

    const results = { processed: 0, failed: 0, errors: [] as string[] };

    for (const clientId of clientIds) {
      let cycleId: string | null = null;

      try {
        // ── 2. Create optimization_cycles row (status=running) ─────────────
        const { data: cycleRow, error: cycleInsertError } = await supabase
          .from("optimization_cycles")
          .upsert(
            { client_id: clientId, cycle_date: cycleDate, status: "running", pages_analyzed: 0, data_sources_used: [] },
            { onConflict: "client_id,cycle_date" }
          )
          .select("id")
          .single();

        if (cycleInsertError) throw new Error(`Failed to create cycle: ${cycleInsertError.message}`);
        cycleId = cycleRow.id;

        // ── 3. Fetch all data sources ──────────────────────────────────────

        // a) SOS Tracker — web_events (raw, aggregate in JS)
        const { data: webEventRows, error: webEventsError } = await supabase
          .from("web_events")
          .select("url, path, sid, engaged_seconds, scroll_depth, entry")
          .eq("client_id", clientId)
          .eq("is_bot", false)
          .gte("received_at", since);

        if (webEventsError) console.error(`[${clientId}] web_events error:`, webEventsError.message);
        const pageMetrics = aggregateWebEvents((webEventRows ?? []) as Record<string, unknown>[]);

        // b) Conversions
        const { data: conversionRows, error: conversionError } = await supabase
          .from("conversion_events")
          .select("page_url, event_type")
          .eq("client_id", clientId)
          .eq("is_bot", false)
          .gte("created_at", since);

        if (conversionError) console.error(`[${clientId}] conversion_events error:`, conversionError.message);
        const conversionMetrics = aggregateConversions((conversionRows ?? []) as Record<string, unknown>[]);

        // c) CWV — latest per URL
        const { data: cwvRows, error: cwvError } = await supabase
          .from("cwv_metrics")
          .select("url, lcp_ms, cls, inp_ms, fcp_ms, ttfb_ms, device, measured_at")
          .eq("client_id", clientId)
          .order("measured_at", { ascending: false });

        if (cwvError) console.error(`[${clientId}] cwv_metrics error:`, cwvError.message);

        // Keep only the most recent entry per URL
        const cwvByUrl = new Map<string, CwvMetrics>();
        for (const row of (cwvRows ?? []) as CwvMetrics[]) {
          if (!cwvByUrl.has(row.url)) cwvByUrl.set(row.url, row);
        }

        // d) Clarity pages
        const { data: clarityPageRows, error: clarityPageError } = await supabase
          .from("clarity_daily_pages")
          .select("page_url, sessions, scroll_depth, engagement_time_seconds")
          .eq("client_id", clientId)
          .gte("metric_date", since.split("T")[0]);

        if (clarityPageError) console.error(`[${clientId}] clarity_daily_pages error:`, clarityPageError.message);
        const clarityPageMetrics = aggregateClarityPages((clarityPageRows ?? []) as Record<string, unknown>[]);

        // e) Clarity behavioral (site-wide totals)
        const { data: clarityBehRows, error: clarityBehError } = await supabase
          .from("clarity_daily_metrics")
          .select("rage_click_count, dead_click_count, quick_back_count, total_sessions")
          .eq("client_id", clientId)
          .gte("metric_date", since.split("T")[0]);

        if (clarityBehError) console.error(`[${clientId}] clarity_daily_metrics error:`, clarityBehError.message);

        const clarityBehavioral: ClarityBehavioral & { total_sessions: number } = (clarityBehRows ?? []).reduce(
          (acc: ClarityBehavioral & { total_sessions: number }, row: Record<string, unknown>) => ({
            rage_clicks: acc.rage_clicks + Number(row.rage_click_count ?? 0),
            dead_clicks: acc.dead_clicks + Number(row.dead_click_count ?? 0),
            quick_backs: acc.quick_backs + Number(row.quick_back_count ?? 0),
            total_sessions: acc.total_sessions + Number(row.total_sessions ?? 0),
          }),
          { rage_clicks: 0, dead_clicks: 0, quick_backs: 0, total_sessions: 0 }
        );

        // f) Page audits
        const { data: pageAuditRows, error: pageAuditError } = await supabase
          .from("page_audits")
          .select("url, title, meta_description, h1_count, h1_text, h2_count, word_count, internal_link_count, has_faq_schema, has_local_schema, has_org_schema, page_type")
          .eq("client_id", clientId);

        if (pageAuditError) console.error(`[${clientId}] page_audits error:`, pageAuditError.message);

        // g) SERP snapshots — latest snapshot date only
        const { data: serpRows, error: serpError } = await supabase
          .from("serp_snapshots")
          .select("keyword, position, url, search_volume, keyword_difficulty, serp_features, snapshot_date")
          .eq("client_id", clientId)
          .order("snapshot_date", { ascending: false });

        if (serpError) console.error(`[${clientId}] serp_snapshots error:`, serpError.message);

        // Keep only most recent snapshot date
        const latestSnapshotDate = serpRows?.[0]?.snapshot_date ?? null;
        const serpSnapshots: SerpSnapshot[] = latestSnapshotDate
          ? ((serpRows ?? []) as SerpSnapshot[]).filter((r: { snapshot_date?: string }) => r.snapshot_date === latestSnapshotDate)
          : [];

        // ── 4. Determine which data sources are present ────────────────────
        const dataSources: string[] = [];
        if ((webEventRows?.length ?? 0) > 0) dataSources.push("sos_tracker");
        if ((conversionRows?.length ?? 0) > 0) dataSources.push("conversions");
        if (cwvByUrl.size > 0) dataSources.push("cwv");
        if ((clarityPageRows?.length ?? 0) > 0) dataSources.push("clarity");
        if ((pageAuditRows?.length ?? 0) > 0) dataSources.push("page_audits");
        if (serpSnapshots.length > 0) dataSources.push("serp");

        // ── 5. Build gap signals per page ──────────────────────────────────
        const gapSignals: GapSignal[] = [];

        // Collect all unique URLs across all data sources
        const allUrls = new Set<string>([
          ...Array.from(pageMetrics.keys()),
          ...Array.from(conversionMetrics.keys()),
          ...Array.from(cwvByUrl.keys()),
          ...Array.from(clarityPageMetrics.keys()),
          ...(pageAuditRows ?? []).map((r: { url: string }) => r.url),
        ]);

        for (const url of allUrls) {
          const traffic = pageMetrics.get(url);
          const conversions = conversionMetrics.get(url);
          const cwv = cwvByUrl.get(url);
          const clarityPage = clarityPageMetrics.get(url);
          const audit = (pageAuditRows ?? []).find((r: { url: string }) => r.url === url) as PageAudit | undefined;

          // --- SEO doctrine gaps from page audit ---
          if (audit) {
            const doctrineGaps = scorePageAgainstDoctrine(audit);
            for (const gap of doctrineGaps) {
              gapSignals.push({
                page_url: url,
                category: "seo",
                subcategory: gap.subcategory,
                priority: severityToPriority(gap.severity),
                doctrine_rule: gap.rule,
                current_value: gap.current,
                description: gap.description,
              });
            }
          }

          // --- CRO: high traffic, zero conversions ---
          const sessionCount = traffic?.sessions ?? 0;
          const conversionCount = conversions?.conversions ?? 0;
          if (sessionCount > 50 && conversionCount === 0) {
            gapSignals.push({
              page_url: url,
              category: "cro",
              subcategory: "headline_cta",
              priority: "high",
              doctrine_rule: null,
              current_value: `${sessionCount} sessions, 0 conversions`,
              description: `Page has ${sessionCount} sessions over 30 days but zero conversions. Headline or CTA may be underperforming.`,
            });
          }

          // --- CRO: CWV failures ---
          if (cwv) {
            const lcpFail = cwv.lcp_ms !== null && cwv.lcp_ms > 2500;
            const clsFail = cwv.cls !== null && cwv.cls > 0.1;
            const inpFail = cwv.inp_ms !== null && cwv.inp_ms > 200;

            if (lcpFail || clsFail || inpFail) {
              const failures: string[] = [];
              if (lcpFail) failures.push(`LCP ${cwv.lcp_ms}ms`);
              if (clsFail) failures.push(`CLS ${cwv.cls}`);
              if (inpFail) failures.push(`INP ${cwv.inp_ms}ms`);

              gapSignals.push({
                page_url: url,
                category: "cro",
                subcategory: "cwv_fix",
                priority: "high",
                doctrine_rule: null,
                current_value: failures.join(", "),
                description: `Core Web Vitals failing: ${failures.join(", ")}. Fix before running CRO tests.`,
              });
            }
          }

          // --- CRO: Clarity rage click friction ---
          if (clarityPage && clarityPage.sessions > 0) {
            // Site-level rage click rate proxy: rage_clicks / clarity total sessions
            const ragePct = clarityBehavioral.total_sessions > 0
              ? clarityBehavioral.rage_clicks / clarityBehavioral.total_sessions
              : 0;

            if (ragePct > 0.1 && clarityPage.sessions > 20) {
              gapSignals.push({
                page_url: url,
                category: "cro",
                subcategory: "ux_friction",
                priority: "medium",
                doctrine_rule: null,
                current_value: `Rage click rate: ${(ragePct * 100).toFixed(1)}%`,
                description: `High site-wide rage click rate (${(ragePct * 100).toFixed(1)}%). Review Clarity session recordings for this page.`,
              });
            }
          }
        }

        // ── 6. Build top_issues tally ──────────────────────────────────────
        const topIssues: Record<string, number> = {};
        for (const signal of gapSignals) {
          topIssues[signal.subcategory] = (topIssues[signal.subcategory] ?? 0) + 1;
        }

        const pagesAnalyzed = allUrls.size;
        console.log(`Analyzing client ${clientId}: ${pagesAnalyzed} pages found, ${gapSignals.length} gap signals`);

        // ── 7. Write summary + update cycle status ─────────────────────────
        const summary: CycleSummary = {
          gap_signals: gapSignals,
          pages_analyzed: pagesAnalyzed,
          data_sources: dataSources,
          top_issues: topIssues,
        };

        const { error: updateError } = await supabase
          .from("optimization_cycles")
          .update({
            status: "completed",
            pages_analyzed: pagesAnalyzed,
            data_sources_used: dataSources,
            summary,
          })
          .eq("id", cycleId);

        if (updateError) throw new Error(`Failed to update cycle: ${updateError.message}`);

        // ── 8. Upsert gap signals as optimization_recommendations ──────────
        if (gapSignals.length > 0) {
          const recRows = gapSignals.map((signal) => ({
            client_id: clientId,
            cycle_id: cycleId,
            page_url: signal.page_url,
            category: signal.category,
            subcategory: signal.subcategory,
            priority: signal.priority,
            doctrine_rule: signal.doctrine_rule,
            current_value: signal.current_value,
            ai_reasoning: signal.description,
            status: "pending",
          }));

          const { error: recError } = await supabase
            .from("optimization_recommendations")
            .insert(recRows);

          if (recError) console.error(`[${clientId}] Failed to insert recommendations:`, recError.message);
        }

        results.processed++;
        console.log(`Completed client ${clientId}: ${pagesAnalyzed} pages, ${gapSignals.length} signals`);
      } catch (clientError: unknown) {
        const msg = clientError instanceof Error ? clientError.message : String(clientError);
        console.error(`Error processing client ${clientId}:`, msg);
        results.failed++;
        results.errors.push(`Client ${clientId}: ${msg}`);

        // Mark cycle as failed if we created one
        if (cycleId) {
          await supabase
            .from("optimization_cycles")
            .update({ status: "failed" })
            .eq("id", cycleId);
        }
      }
    }

    console.log("Optimization analysis complete:", results);

    return new Response(
      JSON.stringify({ success: true, cycleDate, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Fatal error in optimization-analyze:", error);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
