import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../../_shared/aiClient.ts';
import { redactForRole, sanitizeDataForPrompt } from '../../validation/sanitize.ts';

// Helper function: Parse form_data JSON from various formats
function parseFormData(formData: any): Record<string, any> | null {
  if (!formData) return null;
  if (typeof formData === 'object' && !Array.isArray(formData)) return formData;
  if (typeof formData === 'string') {
    try { return JSON.parse(formData); } catch { return null; }
  }
  return null;
}

// Helper function: Extract name from form data
function extractNameFromForm(data: Record<string, any> | null): string {
  if (!data) return 'Anonymous';
  const nameFields = ['NAME', 'name', 'full_name', 'Full Name', 'fullName', 'fullname'];
  for (const field of nameFields) {
    if (data[field]) return String(data[field]).trim();
  }
  const firstName = data['first_name'] || data['First Name'] || data['firstName'];
  const lastName = data['last_name'] || data['Last Name'] || data['lastName'];
  if (firstName && lastName) return `${firstName} ${lastName}`.trim();
  if (firstName) return String(firstName).trim();
  return 'Anonymous';
}

// Helper function: Extract email from form data
function extractEmailFromForm(data: Record<string, any> | null): string | null {
  if (!data) return null;
  const emailFields = ['EMAIL', 'email', 'Email', 'email_address', 'emailAddress'];
  for (const field of emailFields) {
    if (data[field]) return String(data[field]).trim();
  }
  return null;
}

// Helper function: Extract phone from form data
function extractPhoneFromForm(data: Record<string, any> | null): string | null {
  if (!data) return null;
  const phoneFields = ['PHONE', 'phone', 'Phone', 'phone_number', 'phoneNumber', 'tel'];
  for (const field of phoneFields) {
    if (data[field]) return String(data[field]).trim();
  }
  return null;
}

// Helper function: Get clean form fields (exclude system/contact fields)
function getCleanFormFields(data: Record<string, any> | null): Record<string, string> {
  if (!data) return {};
  const excludeFields = ['id', 'form_title', 'date', 'site_name', 'fields', 'NAME', 'name', 'EMAIL', 'email', 'PHONE', 'phone', 'first_name', 'last_name', 'firstName', 'lastName', 'full_name', 'fullName'];
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (excludeFields.some(f => f.toLowerCase() === key.toLowerCase())) continue;
    if (typeof value === 'object') continue;
    if (!value) continue;
    const strValue = String(value);
    clean[key] = strValue.length > 500 ? strValue.substring(0, 500) + '...' : strValue;
  }
  return clean;
}

// Helper function: Extract message/project details from form data
function extractMessageFromForm(data: Record<string, any> | null): string {
  if (!data) return '';

  // Try common message field names (case-insensitive)
  const messageFields = [
    'message', 'Message', 'MESSAGE',
    'comments', 'Comments', 'COMMENTS', 'comment', 'Comment',
    'details', 'Details', 'DETAILS',
    'project_details', 'Project Details', 'projectDetails',
    'please explain your project', 'Please explain your project', 'Please Explain Your Project',
    'explain your project', 'Explain your project',
    'description', 'Description', 'DESCRIPTION',
    'inquiry', 'Inquiry', 'INQUIRY',
    'notes', 'Notes', 'NOTES',
    'your message', 'Your Message',
    'additional information', 'Additional Information'
  ];

  for (const field of messageFields) {
    if (data[field]) {
      const msg = String(data[field]).trim();
      if (msg.length > 0) return msg;
    }
  }

  // If no direct match, check all fields for anything that looks like a message
  // (longer text fields that aren't email/phone/name)
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') continue;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('email') || lowerKey.includes('phone') || lowerKey.includes('name')) continue;
    const text = value.trim();
    if (text.length > 20) return text; // Likely a message if it's substantial text
  }

  return '';
}

// Helper function: Calculate time ago
function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;

  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get page content analysis (SEO scores, recommendations)
export async function getPageAnalysis(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('page_content_analysis')
    .select(`
      id, page_id, overall_score, clarity_score, tone_score, brevity_score,
      avatar_alignment_score, strengths, weaknesses, recommendations,
      analyzed_at, analyzed_by,
      website_pages!inner(client_id, page_path, page_title, last_crawled_at),
      profiles(name)
    `, { count: 'exact' })
    .eq('website_pages.client_id', clientId);

  // Filter out editor/platform domains
  query = query.not('website_pages.page_path', 'like', '%my.duda.co%')
    .not('website_pages.page_path', 'like', '%edit.duda.co%')
    .not('website_pages.page_path', 'like', '%mywebsitemanager.co%')
    .not('website_pages.page_path', 'like', '%/editor/%')
    .not('website_pages.page_path', 'like', '%/preview/%');

  // Apply filters
  if (params.page_id) query = query.eq('page_id', params.page_id);
  if (params.min_score !== undefined) query = query.gte('overall_score', params.min_score);
  if (params.max_score !== undefined) query = query.lte('overall_score', params.max_score);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  // Sort by score ascending (lowest scores = highest priority)
  query = query.order('overall_score', { ascending: true }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  const processedAnalysis = (data || []).map((item: any) => ({
    page_path: item.website_pages?.page_path,
    page_title: item.website_pages?.page_title,
    last_crawled_at: item.website_pages?.last_crawled_at,
    analysis: {
      overall_score: item.overall_score,
      clarity_score: item.clarity_score,
      tone_score: item.tone_score,
      brevity_score: item.brevity_score,
      avatar_alignment_score: item.avatar_alignment_score,
      strengths: item.strengths || [],
      weaknesses: item.weaknesses || [],
      recommendations: item.recommendations || []
    },
    analyzed_at: item.analyzed_at,
    analyzed_by_name: item.profiles?.name || 'System'
  }));

  return {
    items: sanitizeDataForPrompt(processedAnalysis),
    result_count: processedAnalysis.length,
    total_count: count || 0,
    next_offset: processedAnalysis.length >= limit ? offset + limit : null
  };
}

// Get website form submissions (leads/inquiries)
export async function getFormSubmissions(supabase: any, params: any, clientId: string, userRole: string) {
  // Get client's site_id first
  const { data: client } = await supabase
    .from('clients')
    .select('site_id')
    .eq('id', clientId)
    .maybeSingle();

  if (!client?.site_id) {
    return { items: [], result_count: 0, total_count: 0, message: 'No website configured for this client' };
  }

  let query = supabase
    .from('website_form_submissions')
    .select('id, form_name, submitted_at, status, page_url, form_data, submission_source', { count: 'exact' })
    .eq('site_id', client.site_id);

  // Apply filters
  if (params.status) query = query.eq('status', params.status);
  if (params.date_from) query = query.gte('submitted_at', params.date_from);
  if (params.date_to) query = query.lte('submitted_at', params.date_to);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('submitted_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  // Parse and structure data
  const processedSubmissions = (data || []).map((sub: any) => {
    const formData = parseFormData(sub.form_data);

    return {
      id: sub.id,
      form_name: sub.form_name,
      submitted_at: sub.submitted_at,
      time_ago: formatTimeAgo(sub.submitted_at),
      status: sub.status,
      page_url: sub.page_url,
      source: sub.submission_source,
      contact: {
        name: extractNameFromForm(formData),
        email: extractEmailFromForm(formData),
        phone: extractPhoneFromForm(formData)
      },
      form_fields: getCleanFormFields(formData)
    };
  });

  // Apply role-based redaction
  const redactedData = redactForRole(processedSubmissions, userRole);

  return {
    items: sanitizeDataForPrompt(redactedData),
    result_count: processedSubmissions.length,
    total_count: count || 0,
    next_offset: processedSubmissions.length >= limit ? offset + limit : null
  };
}

export async function getReports(supabase: any, params: any, clientId: string) {
  let query = supabase
    .from('reports')
    .select('id, name, status, tags, summary, oviond_url, date_range_start, date_range_end, owner:profiles!owner_user_id(name), updated_at', { count: 'exact' })
    .eq('client_id', clientId);

  if (params.status) query = query.eq('status', params.status);
  if (params.tags && params.tags.length > 0) {
    query = query.contains('tags', params.tags);
  }
  if (params.date_from) query = query.gte('date_range_start', params.date_from);
  if (params.date_to) query = query.lte('date_range_end', params.date_to);

  const limit = Math.min(params.limit || 20, 50);
  const offset = params.offset || 0;

  query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    items: sanitizeDataForPrompt(data || []),
    result_count: data?.length || 0,
    total_count: count || 0,
    next_offset: (data?.length || 0) >= limit ? offset + limit : null
  };
}

// Draft a personalized follow-up email for a form submission
export async function draftEmail(supabase: any, params: any, clientId: string) {
  try {
    const { submission_id, tone = 'friendly', key_points = [] } = params;

    // Fetch the submission data
    const { data: submission, error: subError } = await supabase
      .from('website_form_submissions')
      .select('*')
      .eq('id', submission_id)
      .eq('client_id', clientId)
      .single();

    if (subError || !submission) {
      if (params._flagged_submission_id) {
        throw new Error('Submission not found: The submission_id provided does not exist or is not from your recent results. Call get_form_submissions first to retrieve valid submission IDs, then use the ID from those results.');
      }
      throw new Error('Form submission not found');
    }

    // Fetch client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, website_url')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    // Parse form data using helper functions
    const formData = parseFormData(submission.form_data);
    const recipientName = extractNameFromForm(formData) || submission.contact_name || 'there';
    const recipientEmail = extractEmailFromForm(formData) || submission.contact_email;
    const recipientPhone = extractPhoneFromForm(formData);
    const message = extractMessageFromForm(formData);

    // Check data availability (but don't block - work with what we have)
    const hasEmail = !!recipientEmail;
    const hasDetailedMessage = message && message.trim().length >= 10;

    // Build prompt for AI that adapts to available data
    const contactInfo = recipientPhone ? `- Phone: ${recipientPhone}\n` : '';
    const keyPointsText = key_points.length > 0
      ? `\n\nMake sure to address these key points:\n${key_points.map((p: string) => `- ${p}`).join('\n')}`
      : '';

    const prompt = `You are writing a follow-up email for ${client.name}.

LEAD INFORMATION:
- Name: ${recipientName}
${recipientEmail ? `- Email: ${recipientEmail}` : '- Email: [TO BE PROVIDED]'}
${contactInfo}- Submitted: ${new Date(submission.submitted_at).toLocaleDateString()}
${hasDetailedMessage ? `- Their message: "${message}"` : '- Form submission received with minimal details'}

TONE: ${tone}

${hasDetailedMessage
  ? `Write a personalized response referencing their specific inquiry.`
  : `Write a friendly email asking them to share more details about their project needs.`}

REQUIREMENTS:
- Keep it under 250 words
- Be warm and professional
${hasDetailedMessage ? '- Reference their specific inquiry' : '- Ask about their project needs and goals'}
- Suggest next steps (call, consultation, meeting)
- Include a clear call-to-action${keyPointsText}

Generate ONLY a JSON response with this structure:
{
  "subject": "email subject line",
  "body": "email body text"
}

Do not include any markdown formatting, greetings like "Here's the email:", or extra text. Just the JSON.`;

    // Call AI
    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';

    // Parse JSON response
    let emailDraft;
    try {
      emailDraft = JSON.parse(content);
    } catch {
      // Fallback if AI doesn't return proper JSON
      emailDraft = {
        subject: `Re: Your inquiry - ${client.name}`,
        body: content
      };
    }

    // Always return success with whatever we drafted
    return {
      success: true,
      submission_id,
      recipient_name: recipientName,
      recipient_email: recipientEmail || '[EMAIL NEEDED]',
      subject: emailDraft.subject,
      body: emailDraft.body,
      tone,
      has_email: hasEmail,
      has_details: hasDetailedMessage
    };

  } catch (error: any) {
    console.error('Draft email error:', error);
    return {
      success: false,
      error: 'generation_failed',
      message: error.message || 'Failed to generate email draft',
      submission_id: params.submission_id
    };
  }
}
