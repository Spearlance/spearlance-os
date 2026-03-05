import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders } from '../config.ts';

function getExpertiseGuidelines(level: string | null): string {
  switch(level) {
    case 'beginner':
      return `- Use simple language and avoid jargon
- Explain marketing concepts from basics
- Provide step-by-step guidance
- Use analogies and examples when helpful`;
    case 'advanced':
      return `- Use industry terminology freely
- Focus on strategy and optimization
- Assume knowledge of fundamentals
- Provide data-driven insights`;
    default: // intermediate or null
      return `- Balance technical terms with explanations when needed
- Build on existing knowledge
- Provide context for recommendations`;
  }
}

function getCommunicationGuidelines(style: string | null): string {
  switch(style) {
    case 'concise':
      return `- Keep responses brief and actionable
- Use bullet points
- Get straight to the point
- Focus on what to do next`;
    case 'detailed':
      return `- Provide comprehensive explanations
- Include background context
- Explain the "why" behind recommendations
- Give thorough analysis`;
    default: // balanced or null
      return `- Mix context with action items
- Provide enough detail without overwhelming
- Balance explanation with practicality`;
  }
}

export interface AuthResult {
  user: any;
  profile: any;
  userRole: string;
  userContext: string;
  supabaseClient: any;
}

export async function authenticate(req: Request, client_id: string): Promise<AuthResult | Response> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Verify user has access to this client
  const { data: accessCheck } = await supabaseClient.rpc('has_client_access', {
    _user_id: user.id,
    _client_id: client_id
  });

  if (!accessCheck) {
    return new Response(JSON.stringify({ error: 'Access denied to this client' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get user profile with professional details
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('name, role, job_title, department, bio, expertise_level, preferred_communication_style, focus_areas')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'client';

  // Build user context string for personalization
  const userContext = profile ? `
User Profile:
- Name: ${profile.name || 'User'}
- Role: ${profile.role}${profile.job_title ? ` (${profile.job_title})` : ''}
${profile.department ? `- Department: ${profile.department}` : ''}
${profile.bio ? `- About: ${profile.bio}` : ''}
- Expertise Level: ${profile.expertise_level || 'intermediate'}
- Communication Preference: ${profile.preferred_communication_style || 'balanced'}
${profile.focus_areas && profile.focus_areas.length > 0 ? `- Focus Areas: ${profile.focus_areas.join(', ')}` : ''}

Personalization Guidelines:
${getExpertiseGuidelines(profile.expertise_level)}

${getCommunicationGuidelines(profile.preferred_communication_style)}

${profile.focus_areas && profile.focus_areas.length > 0 ? `- When suggesting tasks, tools, or recommendations, prioritize items related to: ${profile.focus_areas.join(', ')}` : ''}
` : '';

  return { user, profile, userRole, userContext, supabaseClient };
}
