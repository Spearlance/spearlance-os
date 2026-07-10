import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_MODELS, aiTextResponse } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported target languages (source is always English).
const LANGUAGES: Record<string, string> = {
  tl: "Tagalog (Filipino)",
  es: "Spanish",
  ur: "Urdu",
  hi: "Hindi",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseTranslationJson(raw: string): { title?: string; excerpt?: string; content?: string } | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { article_id, lang } = await req.json().catch(() => ({}));
    if (!article_id || !lang || !LANGUAGES[lang]) {
      return json({ error: "article_id and a supported lang are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Caller-scoped client: RLS decides whether this user may read the article,
    // so translation access inherits the same audience/staff/draft boundary.
    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: article, error: artErr } = await asUser
      .from("support_articles")
      .select("id, title, excerpt, content")
      .eq("id", article_id)
      .maybeSingle();

    if (artErr) throw artErr;
    if (!article) return json({ error: "Article not found or not permitted" }, 404);

    const sourceHash = await sha256(
      `${article.title}\n${article.excerpt ?? ""}\n${article.content}`,
    );

    // Service-role client for the shared translation cache.
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: cached } = await admin
      .from("support_article_translations")
      .select("translated_title, translated_excerpt, translated_content, source_hash")
      .eq("article_id", article_id)
      .eq("lang", lang)
      .maybeSingle();

    if (cached && cached.source_hash === sourceHash) {
      return json({
        title: cached.translated_title,
        excerpt: cached.translated_excerpt ?? "",
        content: cached.translated_content,
        lang,
        cached: true,
      });
    }

    const languageName = LANGUAGES[lang];
    const system = `You are a professional translator for an internal company SOP library. Translate the given support-article fields from English to ${languageName}.

STRICT RULES:
1. NEVER translate the contents of fenced code blocks (delimited by triple backticks \`\`\`). Reproduce every code block EXACTLY as-is, including all English text, commands, flags, and paths inside it. These are copy-paste prompts and must stay byte-for-byte identical.
2. Preserve all Markdown structure, links, inline code, headings, lists, and tables.
3. Translate prose, headings, list items, and table cells naturally and professionally.
4. Do not add notes, disclaimers, or anything not present in the source.

Return ONLY a valid minified JSON object with exactly these keys: "title", "excerpt", "content" — holding the translated values. No prose, no markdown fences around the JSON.`;

    const userPayload = JSON.stringify({
      title: article.title,
      excerpt: article.excerpt ?? "",
      content: article.content,
    });

    const raw = await aiTextResponse({
      model: AI_MODELS.TEXT,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPayload },
      ],
    });

    const parsed = parseTranslationJson(raw);
    if (!parsed?.content) {
      console.error("[translate-article] parse failed:", raw.slice(0, 500));
      return json({ error: "Translation failed" }, 502);
    }

    await admin
      .from("support_article_translations")
      .upsert(
        {
          article_id,
          lang,
          translated_title: parsed.title ?? article.title,
          translated_excerpt: parsed.excerpt ?? null,
          translated_content: parsed.content,
          source_hash: sourceHash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "article_id,lang" },
      );

    return json({
      title: parsed.title ?? article.title,
      excerpt: parsed.excerpt ?? "",
      content: parsed.content,
      lang,
      cached: false,
    });
  } catch (e) {
    console.error("[translate-article] error:", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
