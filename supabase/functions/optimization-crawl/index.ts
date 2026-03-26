import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scorePageAgainstDoctrine, type PageAudit } from "../_shared/doctrineScorer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─────────────────────────────────────────────
// HTML parsing helpers (regex-based, no DOM)
// ─────────────────────────────────────────────

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function extractMetaDescription(html: string): string | null {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i);
  return m ? m[1].trim() : null;
}

function countH1s(html: string): number {
  return (html.match(/<h1[^>]*>/gi) ?? []).length;
}

function extractFirstH1Text(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function countH2s(html: string): number {
  return (html.match(/<h2[^>]*>/gi) ?? []).length;
}

function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function countInternalLinks(html: string, domain: string): number {
  // Relative links
  const relLinks = (html.match(/<a[^>]+href=["'](?!https?:\/\/|mailto:|tel:|#)([^"']+)["']/gi) ?? []).length;
  // Absolute links on the same domain
  const domainEscaped = domain.replace(/\./g, '\\.');
  const absDomainLinks = (html.match(new RegExp(`<a[^>]+href=["']https?://(www\\.)?${domainEscaped}[^"']*["']`, 'gi')) ?? []).length;
  return relLinks + absDomainLinks;
}

function detectSchemaTypes(html: string): {
  has_faq_schema: boolean;
  has_local_schema: boolean;
  has_org_schema: boolean;
  has_breadcrumb_schema: boolean;
} {
  // Look in JSON-LD blocks and inline @type attributes
  const jsonLdBlocks = (html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []).join(' ');
  const fullText = jsonLdBlocks + html;
  return {
    has_faq_schema: /FAQPage/i.test(fullText),
    has_local_schema: /LocalBusiness/i.test(fullText),
    has_org_schema: /\bOrganization\b/i.test(fullText),
    has_breadcrumb_schema: /BreadcrumbList/i.test(fullText),
  };
}

// ─────────────────────────────────────────────
// Service-location discovery
// ─────────────────────────────────────────────

interface DiscoveredServiceLocation {
  service_slug: string;
  service_name: string; // derived from slug: "web-design" → "Web Design"
  city: string;         // "Concord"
  state: string;        // "NH"
}

/**
 * Parse a URL path into a service + location combo.
 * Pattern: /{service-slug}/{city-state}
 * e.g. /web-design/concord-nh → { service_slug: "web-design", service_name: "Web Design", city: "Concord", state: "NH" }
 * Returns null if the path doesn't match the pattern.
 */
function parseServiceLocationFromUrl(path: string): DiscoveredServiceLocation | null {
  const cleaned = path.replace(/^\/|\/$/g, ''); // trim leading/trailing slashes
  if (!cleaned) return null;

  const parts = cleaned.split('/');
  if (parts.length !== 2) return null;

  const serviceSlug = parts[0];
  const cityState = parts[1];

  // City-state pattern: {city}-{state_abbrev} where state is exactly 2 chars
  const stateMatch = cityState.match(/^(.+)-([a-z]{2})$/i);
  if (!stateMatch) return null;

  const citySlug = stateMatch[1];
  const state = stateMatch[2].toUpperCase();

  // Convert slugs to title-cased names
  const toTitleCase = (slug: string) =>
    slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const service_name = toTitleCase(serviceSlug);
  const city = toTitleCase(citySlug);

  return { service_slug: serviceSlug, service_name, city, state };
}

/**
 * Detect page type from URL path.
 * Priority: homepage → blog → city (state pattern) → service → other
 */
function detectPageType(urlPath: string): 'service' | 'city' | 'blog' | 'pillar' | 'homepage' | 'other' {
  const path = urlPath.toLowerCase().replace(/\/$/, '') || '/';

  if (path === '' || path === '/') return 'homepage';

  const segments = path.split('/').filter(Boolean);

  if (segments.some(s => s === 'blog' || s === 'articles' || s === 'news' || s === 'posts')) {
    return 'blog';
  }

  // City pattern: last segment looks like "city-st" or "city-state" (e.g. concord-nh, tampa-fl)
  const lastSeg = segments[segments.length - 1];
  const cityPattern = /^[a-z-]+-[a-z]{2}$/;
  if (cityPattern.test(lastSeg) && segments.length > 1) {
    return 'city';
  }

  // Pillar: single top-level segment with no city child (e.g. /web-design/)
  if (segments.length === 1) {
    return 'pillar';
  }

  // Service: multi-segment, non-blog, non-city
  return 'service';
}

// ─────────────────────────────────────────────
// Edge function
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { client_id } = body as { client_id?: string };

    console.log('optimization-crawl: starting', { client_id: client_id ?? 'all' });

    // Fetch target clients
    let clientsQuery = supabase
      .from('clients')
      .select('id, website_url')
      .not('analytics_workspace_key', 'is', null)
      .not('website_url', 'is', null);

    if (client_id) {
      clientsQuery = clientsQuery.eq('id', client_id);
    }

    const { data: clients, error: clientsError } = await clientsQuery;
    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible clients found', pages_crawled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`optimization-crawl: found ${clients.length} client(s)`);

    let totalCrawled = 0;
    let totalErrors = 0;
    const clientSummaries: Record<string, { crawled: number; errors: number }> = {};

    for (const client of clients) {
      let baseUrl = (client.website_url as string).trim();
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }

      let domain: string;
      try {
        domain = new URL(baseUrl).hostname.replace(/^www\./, '');
      } catch {
        console.warn(`optimization-crawl: invalid website_url for client ${client.id}:`, baseUrl);
        continue;
      }

      // Get known pages from website_pages table
      const { data: pages, error: pagesError } = await supabase
        .from('website_pages')
        .select('page_path')
        .eq('client_id', client.id)
        .eq('is_indexable', true)
        .not('page_path', 'is', null);

      if (pagesError) {
        console.error(`optimization-crawl: pages fetch error for ${client.id}:`, pagesError);
        continue;
      }

      const pagePaths: string[] = pages?.map((p: { page_path: string }) => p.page_path) ?? ['/'];

      console.log(`optimization-crawl: client ${client.id} — ${pagePaths.length} page(s) to crawl`);

      let crawled = 0;
      let errors = 0;

      for (const pagePath of pagePaths) {
        let fullUrl: string;
        try {
          const cleanPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
          fullUrl = new URL(cleanPath, baseUrl).toString();
        } catch {
          console.warn(`optimization-crawl: bad path "${pagePath}" for client ${client.id}`);
          errors++;
          continue;
        }

        // Fetch page HTML
        let html: string;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const resp = await fetch(fullUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'SpearlanceBot/1.0 (SEO Audit)' },
          });
          clearTimeout(timeout);
          if (!resp.ok) {
            console.warn(`optimization-crawl: HTTP ${resp.status} for ${fullUrl}`);
            errors++;
            continue;
          }
          html = await resp.text();
        } catch (fetchErr) {
          console.warn(`optimization-crawl: fetch failed for ${fullUrl}:`, fetchErr);
          errors++;
          continue;
        }

        // Parse page
        const title = extractTitle(html);
        const meta_description = extractMetaDescription(html);
        const h1_count = countH1s(html);
        const h1_text = extractFirstH1Text(html);
        const h2_count = countH2s(html);
        const word_count = countWords(html);
        const internal_link_count = countInternalLinks(html, domain);
        const schema = detectSchemaTypes(html);
        const page_type = detectPageType(pagePath);

        // Build raw_html_hash (simple length+checksum, avoids crypto in all runtimes)
        const raw_html_hash = String(html.length) + '-' + String(
          html.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
        );

        const auditRow = {
          client_id: client.id,
          url: fullUrl,
          title,
          meta_description,
          h1_count,
          h1_text,
          h2_count,
          internal_link_count,
          word_count,
          has_faq_schema: schema.has_faq_schema,
          has_local_schema: schema.has_local_schema,
          has_org_schema: schema.has_org_schema,
          has_breadcrumb_schema: schema.has_breadcrumb_schema,
          page_type,
          crawled_at: new Date().toISOString(),
          raw_html_hash,
        };

        const { error: upsertError } = await supabase
          .from('page_audits')
          .upsert(auditRow, { onConflict: 'client_id,url' });

        if (upsertError) {
          console.error(`optimization-crawl: upsert error for ${fullUrl}:`, upsertError);
          errors++;
          continue;
        }

        // Score against doctrine and emit recommendations
        const pageAuditForScoring: PageAudit = {
          url: fullUrl,
          title,
          meta_description,
          h1_count,
          h1_text,
          h2_count,
          word_count,
          internal_link_count,
          has_faq_schema: schema.has_faq_schema,
          has_local_schema: schema.has_local_schema,
          has_org_schema: schema.has_org_schema,
          page_type,
        };

        const gaps = scorePageAgainstDoctrine(pageAuditForScoring);

        if (gaps.length > 0) {
          const recs = gaps.map(gap => ({
            client_id: client.id,
            page_url: fullUrl,
            category: 'seo',
            subcategory: gap.subcategory,
            priority: gap.severity === 'critical' ? 'critical'
              : gap.severity === 'high' ? 'high'
              : gap.severity === 'medium' ? 'medium'
              : 'low',
            doctrine_rule: gap.rule,
            current_value: gap.current,
            ai_reasoning: gap.description,
            status: 'pending',
          }));

          const { error: recError } = await supabase
            .from('optimization_recommendations')
            .upsert(recs, { onConflict: 'client_id,page_url,subcategory,doctrine_rule' });

          if (recError) {
            console.warn(`optimization-crawl: rec upsert warning for ${fullUrl}:`, recError);
          }
        }

        crawled++;
      }

      // Auto-discover service-location combos from crawled pages
      const { data: auditedPages } = await supabase
        .from('page_audits')
        .select('url')
        .eq('client_id', client.id);

      const discoveredCombos: Array<DiscoveredServiceLocation & { page_url: string }> = [];

      for (const auditedPage of auditedPages ?? []) {
        let pathname: string;
        try {
          pathname = new URL(auditedPage.url as string).pathname;
        } catch {
          continue;
        }
        const parsed = parseServiceLocationFromUrl(pathname);
        if (parsed) {
          discoveredCombos.push({ ...parsed, page_url: auditedPage.url as string });
        }
      }

      if (discoveredCombos.length > 0) {
        for (const combo of discoveredCombos) {
          await supabase
            .from('client_service_locations')
            .upsert({
              client_id: client.id,
              service_slug: combo.service_slug,
              service_name: combo.service_name,
              city: combo.city,
              state: combo.state,
              has_page: true,
              page_url: combo.page_url,
              discovered_by: 'auto',
              active: true,
            }, { onConflict: 'client_id,service_slug,city,state' });
        }
        console.log(`optimization-crawl: auto-discovered ${discoveredCombos.length} service-location combo(s) for client ${client.id}`);
      }

      totalCrawled += crawled;
      totalErrors += errors;
      clientSummaries[client.id] = { crawled, errors };

      console.log(`optimization-crawl: client ${client.id} done — ${crawled} crawled, ${errors} errors`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pages_crawled: totalCrawled,
        errors: totalErrors,
        clients: clientSummaries,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('optimization-crawl: fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
