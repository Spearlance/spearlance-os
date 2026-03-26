import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { aiToolCallResponse, AI_MODELS } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface GapSignal {
  page_url: string;
  category: "seo" | "cro" | "content" | "alert";
  subcategory: string;
  priority: "critical" | "high" | "medium" | "low";
  doctrine_rule: string | null;
  current_value: string | null;
  description: string;
}

interface HistoricalOutcome {
  subcategory: string;
  status: string;
  proposed_value: string;
}

interface AiRecommendation {
  page_url: string;
  category: "seo" | "cro" | "content";
  subcategory: string;
  priority: "critical" | "high" | "medium" | "low";
  doctrine_rule?: string;
  current_value: string;
  proposed_value: string;
  reasoning: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEO_DOCTRINE_REFERENCE = `
## SEO Doctrine Reference (Key Sections)

**Section 1.1 — Meta Title Structure**
Template: [Primary Keyword + City] | [Variation 2 + City] | [Variation 3 + City] | [Brand Name]
- City MUST be embedded inside the keyword phrase, not appended separately
- Brand name always appears last
- Maximum 3-5 keyword variations before brand
- Total length: no hard limit, but first 60 characters must contain primary keyword + city

**Section 2.1 — Meta Description**
- Open with primary keyword phrase (including city)
- Repeat city naturally at least once more
- Include 2-4 keyword variations
- Include one credibility trigger (years in business, number of clients, certifications, results)
- End with a call to action
- Must read naturally — not a keyword dump

**Section 3.1 — H1 Tag**
- Exactly ONE H1 per page. No exceptions.
- H1 must contain the exact primary keyword phrase (including city for local pages)

**Section 3.4 — H2/H3 Hierarchy**
- Minimum 4 H2 headings per page, target 6-8
- Include keyword variations in H2s where natural
- Include city in at least 2 body H2s for local pages

**Section 6.1 — Content Thresholds**
- Service page: min 1,500 words, rewrite trigger below 1,200
- City page: min 1,200 words, rewrite trigger below 1,000
- Blog post: min 1,000 words, rewrite trigger below 800
- Publishing cadence: minimum 3 posts per week

**Section 7.1 — Internal Link Density**
- Minimum 5 internal links per page, target 10+
- Every mention of a keyword matching an existing service/city page should be linked (first occurrence)
- Anchor text: 30-40% exact match, 30-40% partial match, 20-30% branded/natural

**Section 8.1 — Schema**
- Schema is mandatory, never optional
- LocalBusiness schema required on all city pages
- Organization schema required on service and homepage pages
- FAQ schema recommended on service and city pages (minimum 3 items, target 5-7)
`.trim();

const SYSTEM_PROMPT = `You are the Spearlance SEO Optimization Engine. You generate specific, actionable recommendations following the Spearlance SEO Doctrine.

CRITICAL RULES:
- Every meta title must embed the city inside the keyword phrase (Section 1.1)
- Every recommendation must include a SPECIFIC draft — not "improve the title" but the actual new title text
- Never change a page's primary intent (Section 13.1)
- For title rewrites: use 3-5 keyword variations with city embedded, brand name last
- For meta descriptions: open with primary keyword + city, include credibility trigger, end with CTA
- For internal links: specify exact anchor text and target URL
- For content expansion: specify which sections to add and approximate word count
- For schema: provide the specific schema type needed and key fields

LEARNING FROM HISTORY:
When historical outcomes are provided, weight your recommendations toward patterns that succeeded and away from patterns that regressed or were reverted.

OUTPUT QUALITY:
Be extremely specific. Every proposed_value must be ready to copy-paste — no placeholders, no "[insert X here]", no generic advice.`;

// ── Prompt Builder ─────────────────────────────────────────────────────────────

function buildRecommendationPrompt(
  gaps: GapSignal[],
  clientName: string,
  industry: string | null,
  websiteUrl: string | null,
  historicalOutcomes: HistoricalOutcome[]
): string {
  // Group gaps by page URL
  const gapsByPage = new Map<string, GapSignal[]>();
  for (const gap of gaps) {
    const url = gap.page_url || "unknown";
    if (!gapsByPage.has(url)) gapsByPage.set(url, []);
    gapsByPage.get(url)!.push(gap);
  }

  let prompt = `CLIENT: ${clientName}\n`;
  if (industry) prompt += `INDUSTRY: ${industry}\n`;
  if (websiteUrl) prompt += `WEBSITE: ${websiteUrl}\n`;
  prompt += "\n";

  prompt += `${SEO_DOCTRINE_REFERENCE}\n\n`;

  if (gaps.length === 0) {
    prompt += `## Gap Signals\nNo gap signals detected in this cycle.\n\n`;
  } else {
    prompt += `## Gap Signals by Page\n\n`;
    for (const [pageUrl, pageGaps] of gapsByPage.entries()) {
      prompt += `### Page: ${pageUrl}\n`;
      for (const gap of pageGaps) {
        prompt += `- [${gap.priority.toUpperCase()}] ${gap.doctrine_rule ?? gap.category} — ${gap.description}\n`;
        if (gap.current_value) prompt += `  Current: ${gap.current_value}\n`;
        prompt += `  Subcategory: ${gap.subcategory}\n`;
      }
      prompt += "\n";
    }
  }

  if (historicalOutcomes.length > 0) {
    prompt += `## Historical Outcomes (Learning Loop)\n`;
    prompt += `The following recommendations have been applied previously. Weight toward succeeded patterns, away from regressed/reverted.\n\n`;

    const succeeded = historicalOutcomes.filter(o => o.status === "succeeded");
    const regressed = historicalOutcomes.filter(o => o.status === "regressed" || o.status === "reverted");

    if (succeeded.length > 0) {
      prompt += `### What Worked (Succeeded):\n`;
      for (const outcome of succeeded) {
        prompt += `- [${outcome.subcategory}] ${outcome.proposed_value}\n`;
      }
      prompt += "\n";
    }

    if (regressed.length > 0) {
      prompt += `### What Didn't Work (Regressed/Reverted):\n`;
      for (const outcome of regressed) {
        prompt += `- [${outcome.subcategory}] ${outcome.proposed_value}\n`;
      }
      prompt += "\n";
    }
  }

  return prompt;
}

// ── Tool Definition ────────────────────────────────────────────────────────────

const tools = [{
  type: "function",
  function: {
    name: "create_recommendations",
    description: "Create specific optimization recommendations with draft content",
    parameters: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page_url: { type: "string" },
              category: { type: "string", enum: ["seo", "cro", "content"] },
              subcategory: {
                type: "string",
                enum: [
                  "meta_title", "meta_desc", "h1_fix", "internal_links", "new_page",
                  "content_expand", "schema", "city_expansion", "headline_cta",
                  "ux_friction", "cwv_fix", "blog_topic"
                ]
              },
              priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
              doctrine_rule: { type: "string", description: "Reference to doctrine section, e.g. Section 1.1" },
              current_value: { type: "string", description: "What exists now" },
              proposed_value: { type: "string", description: "Specific draft replacement — actual title text, actual description text, specific links to add, etc." },
              reasoning: { type: "string", description: "Why this change and expected impact" },
            },
            required: ["page_url", "category", "subcategory", "priority", "current_value", "proposed_value", "reasoning"]
          }
        }
      },
      required: ["recommendations"]
    }
  }
}];

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { client_id, cycle_id: inputCycleId } = body as {
      client_id?: string;
      cycle_id?: string;
    };

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Resolve cycle ───────────────────────────────────────────────────────

    let cycleId = inputCycleId;

    if (!cycleId) {
      const { data: latestCycle, error: cycleError } = await supabase
        .from("optimization_cycles")
        .select("id, summary, status")
        .eq("client_id", client_id)
        .eq("status", "completed")
        .order("cycle_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycleError) {
        console.error("Cycle fetch error:", cycleError);
        throw new Error("Failed to fetch optimization cycle");
      }

      if (!latestCycle) {
        return new Response(
          JSON.stringify({ error: "No completed optimization cycle found for this client" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cycleId = latestCycle.id;
    }

    // ── 2. Fetch cycle summary (gap_signals) ───────────────────────────────────

    const { data: cycle, error: fetchCycleError } = await supabase
      .from("optimization_cycles")
      .select("id, summary, status, client_id")
      .eq("id", cycleId)
      .single();

    if (fetchCycleError || !cycle) {
      return new Response(
        JSON.stringify({ error: "Cycle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gaps: GapSignal[] = (cycle.summary as any)?.gap_signals ?? [];
    console.log(`Cycle ${cycleId}: ${gaps.length} gap signals`);

    // ── 3. Fetch historical outcomes (last 90 days) ────────────────────────────

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: historicalRecs } = await supabase
      .from("optimization_recommendations")
      .select("subcategory, status, proposed_value")
      .eq("client_id", client_id)
      .in("status", ["succeeded", "regressed", "reverted"])
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    const historicalOutcomes: HistoricalOutcome[] = (historicalRecs ?? []).map(r => ({
      subcategory: r.subcategory,
      status: r.status,
      proposed_value: r.proposed_value ?? "",
    }));

    console.log(`Historical outcomes: ${historicalOutcomes.length}`);

    // ── 4. Fetch client info ───────────────────────────────────────────────────

    const { data: client } = await supabase
      .from("clients")
      .select("name, brand_name, industry, website_url")
      .eq("id", client_id)
      .single();

    const clientName = client?.brand_name || client?.name || "Unknown Client";
    const industry = client?.industry ?? null;
    const websiteUrl = client?.website_url ?? null;

    // ── 4.5. Expansion target recommendations (no AI needed) ──────────────────

    const { data: expansionTargets, error: expansionError } = await supabase
      .from("client_service_locations")
      .select("service_slug, service_name, city, state, priority")
      .eq("client_id", client_id)
      .eq("is_expansion_target", true)
      .eq("has_page", false)
      .eq("active", true);

    if (expansionError) {
      console.warn("Expansion target fetch warning:", expansionError);
    }

    const targets = expansionTargets ?? [];
    console.log(`Expansion targets: ${targets.length}`);

    let expansionInsertCount = 0;

    for (const target of targets) {
      const pageUrl = `/${target.service_slug}/${target.city.toLowerCase().replace(/\s+/g, "-")}-${target.state.toLowerCase()}`;

      const { data: existing } = await supabase
        .from("optimization_recommendations")
        .select("id")
        .eq("client_id", client_id)
        .eq("page_url", pageUrl)
        .eq("subcategory", "new_page")
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (!existing) {
        const { error: expansionInsertError } = await supabase
          .from("optimization_recommendations")
          .insert({
            client_id,
            cycle_id: cycleId,
            page_url: pageUrl,
            category: "seo",
            subcategory: "new_page",
            priority: target.priority === "primary" ? "high" : "medium",
            doctrine_rule: "Section 5.1",
            current_value: "No page exists",
            proposed_value: `Create ${target.service_name} page for ${target.city}, ${target.state} at ${pageUrl}`,
            ai_reasoning: `Expansion target: ${target.service_name} in ${target.city}, ${target.state}. Per Doctrine Section 5.1, create a dedicated page for each service + city combination. Required elements: primary keyword with city in H1, city in meta title (embedded in phrase), 2-3 nearby landmarks, local market characteristics, 3+ locally relevant FAQs with schema, minimum 1,200 words.`,
            baseline_metrics: {},
            status: "pending",
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (expansionInsertError) {
          console.error(`Expansion insert error for ${pageUrl}:`, expansionInsertError);
        } else {
          expansionInsertCount++;
        }
      }
    }

    console.log(`Inserted ${expansionInsertCount} expansion target recommendations`);

    // ── 5. Build prompt ────────────────────────────────────────────────────────

    const userPrompt = buildRecommendationPrompt(
      gaps,
      clientName,
      industry,
      websiteUrl,
      historicalOutcomes
    );

    // ── 6. Call AI with tool calling ───────────────────────────────────────────

    console.log("Calling AI recommendation engine...");

    const toolCall = await aiToolCallResponse({
      model: AI_MODELS.TEXT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "create_recommendations" } },
    });

    if (!toolCall) {
      throw new Error("AI returned no tool call");
    }

    const aiResult = JSON.parse(toolCall.arguments) as { recommendations: AiRecommendation[] };
    const aiRecs = aiResult.recommendations ?? [];

    console.log(`AI generated ${aiRecs.length} recommendations`);

    // ── 7. Snapshot baseline metrics for each page URL ─────────────────────────

    const pageUrls = [...new Set(aiRecs.map(r => r.page_url).filter(Boolean))];

    // Fetch latest SOS data per page
    const sosData = new Map<string, Record<string, unknown>>();
    if (pageUrls.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: webEvents } = await supabase
        .from("web_events")
        .select("url, sid, engaged_seconds, scroll_depth")
        .eq("client_id", client_id)
        .eq("is_bot", false)
        .in("url", pageUrls)
        .gte("received_at", thirtyDaysAgo.toISOString());

      if (webEvents && webEvents.length > 0) {
        // Aggregate by URL
        const aggByUrl = new Map<string, { sessions: Set<string>; totalEngaged: number; totalScroll: number; count: number }>();
        for (const ev of webEvents) {
          const url = ev.url as string;
          if (!aggByUrl.has(url)) aggByUrl.set(url, { sessions: new Set(), totalEngaged: 0, totalScroll: 0, count: 0 });
          const agg = aggByUrl.get(url)!;
          agg.sessions.add(ev.sid as string);
          agg.totalEngaged += Number(ev.engaged_seconds ?? 0);
          agg.totalScroll += Number(ev.scroll_depth ?? 0);
          agg.count++;
        }
        for (const [url, agg] of aggByUrl) {
          sosData.set(url, {
            sessions: agg.sessions.size,
            avg_engaged_seconds: agg.count > 0 ? agg.totalEngaged / agg.count : 0,
            avg_scroll_depth: agg.count > 0 ? agg.totalScroll / agg.count : 0,
          });
        }
      }

      // Fetch conversion events per page
      const { data: convEvents } = await supabase
        .from("conversion_events")
        .select("page_url, event_type")
        .eq("client_id", client_id)
        .eq("is_bot", false)
        .in("page_url", pageUrls)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (convEvents && convEvents.length > 0) {
        for (const ev of convEvents) {
          const url = ev.page_url as string;
          const existing = sosData.get(url) ?? {};
          const conversions = ((existing.conversions as number) ?? 0) + 1;
          sosData.set(url, { ...existing, conversions });
        }
      }
    }

    // Fetch latest CWV per page
    const cwvData = new Map<string, Record<string, unknown>>();
    if (pageUrls.length > 0) {
      const { data: cwvRows } = await supabase
        .from("cwv_metrics")
        .select("url, lcp_ms, cls, inp_ms, fcp_ms, ttfb_ms, device, measured_at")
        .eq("client_id", client_id)
        .in("url", pageUrls)
        .order("measured_at", { ascending: false });

      if (cwvRows && cwvRows.length > 0) {
        // Keep only the latest per URL
        for (const row of cwvRows) {
          const url = row.url as string;
          if (!cwvData.has(url)) {
            cwvData.set(url, {
              lcp_ms: row.lcp_ms,
              cls: row.cls,
              inp_ms: row.inp_ms,
              fcp_ms: row.fcp_ms,
              ttfb_ms: row.ttfb_ms,
              device: row.device,
              measured_at: row.measured_at,
            });
          }
        }
      }
    }

    // ── 8. Insert recommendations ──────────────────────────────────────────────

    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const recInserts = aiRecs.map(rec => {
      const baselineSos = sosData.get(rec.page_url) ?? {};
      const baselineCwv = cwvData.get(rec.page_url) ?? {};
      const baselineMetrics = Object.keys(baselineSos).length > 0 || Object.keys(baselineCwv).length > 0
        ? { sos: baselineSos, cwv: baselineCwv, captured_at: now }
        : {};

      return {
        client_id,
        cycle_id: cycleId,
        page_url: rec.page_url,
        category: rec.category,
        subcategory: rec.subcategory,
        priority: rec.priority,
        doctrine_rule: rec.doctrine_rule ?? null,
        current_value: rec.current_value,
        proposed_value: rec.proposed_value,
        ai_reasoning: rec.reasoning,
        baseline_metrics: baselineMetrics,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      };
    });

    if (recInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("optimization_recommendations")
        .insert(recInserts);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    // ── 9. Update cycle with recommendations_generated count ──────────────────

    const totalRecsGenerated = recInserts.length + expansionInsertCount;

    const { error: updateError } = await supabase
      .from("optimization_cycles")
      .update({ recommendations_generated: totalRecsGenerated })
      .eq("id", cycleId);

    if (updateError) {
      console.warn("Cycle update warning:", updateError);
      // Non-fatal — recommendations are already inserted
    }

    console.log(`Inserted ${recInserts.length} AI recommendations + ${expansionInsertCount} expansion target recommendations for cycle ${cycleId}`);

    // ── 10. Return summary ─────────────────────────────────────────────────────

    const byPriority = recInserts.reduce<Record<string, number>>((acc, r) => {
      acc[r.priority] = (acc[r.priority] ?? 0) + 1;
      return acc;
    }, {});

    const bySubcategory = recInserts.reduce<Record<string, number>>((acc, r) => {
      acc[r.subcategory] = (acc[r.subcategory] ?? 0) + 1;
      return acc;
    }, {});

    if (expansionInsertCount > 0) {
      byPriority["high"] = (byPriority["high"] ?? 0) + targets.filter(t => t.priority === "primary").length;
      byPriority["medium"] = (byPriority["medium"] ?? 0) + targets.filter(t => t.priority !== "primary").length;
      bySubcategory["new_page"] = (bySubcategory["new_page"] ?? 0) + expansionInsertCount;
    }

    return new Response(
      JSON.stringify({
        success: true,
        cycle_id: cycleId,
        client_id,
        recommendations_generated: totalRecsGenerated,
        ai_recommendations: recInserts.length,
        expansion_target_recommendations: expansionInsertCount,
        expansion_targets_evaluated: targets.length,
        gap_signals_processed: gaps.length,
        historical_outcomes_used: historicalOutcomes.length,
        by_priority: byPriority,
        by_subcategory: bySubcategory,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("optimization-recommend error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate recommendations";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
