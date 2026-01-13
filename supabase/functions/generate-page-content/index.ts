import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buildId, pageId, pageName, pageType, contentNotes, clientId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data for context
    const [
      { data: client },
      { data: brandVoice },
      { data: avatars },
      { data: services },
      { data: brandGuide },
    ] = await Promise.all([
      supabase.from("clients").select("name, brand_name, industry, domain").eq("id", clientId).single(),
      supabase.from("client_brand_voice").select("tone, words_to_avoid, story_summary").eq("client_id", clientId).single(),
      supabase.from("avatars").select("avatar_name, demographics, goals, pains, motivators").eq("client_id", clientId).limit(3),
      supabase.from("marketing_services").select("name, description, key_benefit").eq("client_id", clientId).limit(5),
      supabase.from("brand_guides").select("brand_personality, imagery_style").eq("client_id", clientId).single(),
    ]);

    // Build context for the AI
    const businessContext = `
Business: ${client?.brand_name || client?.name}
Industry: ${client?.industry || "Not specified"}
Website: ${client?.domain || "Not specified"}

Brand Voice:
- Tone: ${brandVoice?.tone || "Professional and friendly"}
- Words to avoid: ${brandVoice?.words_to_avoid || "None specified"}
${brandVoice?.story_summary ? `- Brand Story: ${JSON.stringify(brandVoice.story_summary)}` : ""}

Target Audiences:
${avatars?.map((a) => `- ${a.avatar_name}: ${a.demographics || ""} | Goals: ${a.goals || ""} | Pains: ${a.pains || ""}`).join("\n") || "Not defined"}

Services/Products:
${services?.map((s) => `- ${s.name}: ${s.description || ""} | Key benefit: ${s.key_benefit || ""}`).join("\n") || "Not defined"}

Brand Personality: ${brandGuide?.brand_personality ? JSON.stringify(brandGuide.brand_personality) : "Not defined"}
Imagery Style: ${brandGuide?.imagery_style || "Not defined"}
    `.trim();

    const pageTypeGuidance: Record<string, string> = {
      landing: "Focus on conversion with compelling headlines, clear value proposition, and strong CTAs.",
      content: "Provide informative, engaging content that educates the reader while building trust.",
      form: "Encourage form completion with reassuring copy and clear benefits of taking action.",
      gallery: "Describe the visual experience and what the portfolio/gallery showcases.",
      blog: "Create an engaging introduction hook and structure for a blog post.",
      contact: "Invite connection with warm, approachable language and clear next steps.",
    };

    const prompt = `
You are a professional website copywriter creating content for a ${pageType || "content"} page called "${pageName}".

${pageTypeGuidance[pageType || "content"] || ""}

BUSINESS CONTEXT:
${businessContext}

${contentNotes ? `ADDITIONAL NOTES FROM THE DESIGNER:\n${contentNotes}` : ""}

Generate website copy that:
1. Speaks directly to the target audience's needs and pain points
2. Reflects the brand's tone and personality
3. Is clear, concise, and action-oriented
4. Includes compelling calls to action

You must respond with a JSON object using this exact structure:
{
  "headline": "Main page headline (compelling and benefit-focused)",
  "subheadlines": ["3-4 supporting subheadlines that break down the value"],
  "body_sections": [
    {"title": "Section title", "content": "2-3 sentences of body copy"},
    {"title": "Another section", "content": "More body copy"}
  ],
  "cta_primary": "Primary call to action button text",
  "cta_secondary": "Secondary/softer call to action",
  "meta_title": "SEO title under 60 characters",
  "meta_description": "SEO description under 160 characters"
}
    `.trim();

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional website copywriter. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_page_content",
              description: "Generate structured website page content",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  subheadlines: { type: "array", items: { type: "string" } },
                  body_sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                    },
                  },
                  cta_primary: { type: "string" },
                  cta_secondary: { type: "string" },
                  meta_title: { type: "string" },
                  meta_description: { type: "string" },
                },
                required: ["headline", "subheadlines", "body_sections", "cta_primary", "cta_secondary", "meta_title", "meta_description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_page_content" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const generatedContent = JSON.parse(toolCall.function.arguments);

    // Save the generated content to the page
    const { error: updateError } = await supabase
      .from("website_build_pages")
      .update({ ai_generated_content: generatedContent })
      .eq("id", pageId);

    if (updateError) {
      console.error("Error saving content:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify(generatedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-page-content:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
