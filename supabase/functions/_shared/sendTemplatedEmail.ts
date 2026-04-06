import { Resend } from "https://esm.sh/resend@2.0.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

interface SendTemplatedEmailParams {
  to: string | string[];
  templateKey: string;
  variables: Record<string, string>;
  from?: string;
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

export async function sendTemplatedEmail(
  supabaseAdmin: SupabaseClient,
  { to, templateKey, variables, from }: SendTemplatedEmailParams,
) {
  const { data: template, error: templateError } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .single();

  if (templateError || !template) {
    console.error('Template fetch error:', templateError);
    throw new Error(`Template not found: ${templateKey}`);
  }

  let subject = template.subject;
  let htmlBody = template.html_body;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    htmlBody = htmlBody.replace(regex, value);
  });

  const emailResponse = await resend.emails.send({
    from: from || 'Garrett Handley from Spearlance <garrett@em.os.spearlance.com>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html: htmlBody,
  });

  console.log('Email sent successfully:', {
    templateKey,
    to,
    emailId: emailResponse.data?.id,
  });

  return emailResponse;
}
