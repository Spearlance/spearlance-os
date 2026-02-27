import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, pageType, pageName, promptTemplate, customInstructions, outputFormat } = await req.json();

    console.log("Received request:", { clientId, pageType, pageName, hasTemplate: !!promptTemplate });

    // Validate required fields
    if (!clientId) {
      console.error("Missing clientId");
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client marketing profile data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, brand_name, industry, website_url")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
    }

    // Fetch avatars for audience context
    const { data: avatars } = await supabase
      .from("avatars")
      .select("avatar_name, demographics, goals, pains, motivators")
      .eq("client_id", clientId)
      .limit(3);

    // Fetch brand voice
    const { data: brandVoice } = await supabase
      .from("client_brand_voice")
      .select("tone, words_to_avoid, story_summary")
      .eq("client_id", clientId)
      .single();

    // Fetch brand guide
    const { data: brandGuide } = await supabase
      .from("brand_guides")
      .select("brand_personality, imagery_style")
      .eq("client_id", clientId)
      .single();

    // Build the context
    const clientContext = `
BUSINESS CONTEXT:
- Business Name: ${client?.brand_name || client?.name || "Unknown"}
- Industry: ${client?.industry || "General"}
- Website: ${client?.website_url || "N/A"}

BRAND VOICE:
- Tone: ${brandVoice?.tone || "Professional and friendly"}
- Words to avoid: ${brandVoice?.words_to_avoid || "None specified"}
${brandVoice?.story_summary ? `- Brand Story: ${JSON.stringify(brandVoice.story_summary)}` : ""}

TARGET AUDIENCE:
${avatars?.map((a) => `- ${a.avatar_name}: ${a.demographics || ""} | Goals: ${a.goals || ""} | Pain Points: ${a.pains || ""}`).join("\n") || "Not defined"}

BRAND PERSONALITY: ${brandGuide?.brand_personality ? JSON.stringify(brandGuide.brand_personality) : "Not defined"}
`;

    // Use provided template or create a default one
    const template = promptTemplate || `Generate professional, conversion-focused website content for a ${pageType || "general"} page.

Focus on:
- Clear value proposition
- Benefit-focused headlines
- Compelling calls to action
- Proper content hierarchy with H1, H2, H3 headings`;

    const systemPrompt = `You are a professional website copywriter specializing in conversion-focused content.

${clientContext}

${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}\n` : ""}

OUTPUT FORMAT: Generate content as clean HTML with proper heading hierarchy:
- Use <h1> for the main headline (only one)
- Use <h2> for section headings
- Use <h3> for subsection headings
- Use <p> for paragraphs
- Use <ul> and <li> for lists
- Make the content ready to paste into a website builder

Keep the content concise, compelling, and action-oriented.`;

    console.log("Calling AI...");

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${template}\n\nPage Name: ${pageName || pageType || "Website Page"}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    const generatedContent = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content: generatedContent }), {
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
