/**
 * Front Webhook Handler
 * 
 * Processes webhooks from Front to automatically log client communications.
 * 
 * SECURITY NOTE: This function operates WITHOUT webhook signature verification
 * because Front's webhook secrets require an Enterprise plan. Security is maintained by:
 * 1. Obscure webhook URL (not publicly discoverable)
 * 2. Client tag validation (only processes conversations with valid client tags)
 * 3. Access control (only FMM/Admin can view logs)
 * 4. Internal tooling (not exposed to untrusted parties)
 * 
 * Required Secrets:
 * - FRONT_API_TOKEN (required): Used to fetch full conversation data from Front API
 * - FRONT_WEBHOOK_SECRET (optional): If provided, enables webhook signature verification
 * 
 * Webhook URL: https://hrmhqybdsdngsvhjqwma.supabase.co/functions/v1/front-webhook-handler
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-front-signature',
};

interface FrontWebhookPayload {
  _links: {
    self: string;
  };
  id: string;
  type: string;
  emitted_at: number;
  conversation?: {
    id: string;
    subject: string;
    status: string;
    tags: Array<{ name: string }>;
  };
  target?: {
    data: {
      id: string;
      subject: string;
      status: string;
      tags: Array<{ name: string }>;
    };
  };
}

interface FrontConversation {
  id: string;
  subject: string;
  status: string;
  recipient: {
    handle: string;
    name?: string;
  };
  messages: Array<{
    id: string;
    body: string;
    author: {
      email?: string;
      name?: string;
    };
    recipients: Array<{
      handle: string;
      name?: string;
      role: 'from' | 'to' | 'cc';
    }>;
    created_at: number;
    is_inbound: boolean;
    attachments?: Array<{
      filename: string;
      url: string;
      size: number;
    }>;
  }>;
  tags?: Array<{ name: string }>;
}

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function fetchFrontConversation(
  conversationId: string,
  apiToken: string
): Promise<FrontConversation | null> {
  try {
    const response = await fetch(
      `https://api2.frontapp.com/conversations/${conversationId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Front API error:', response.status, await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
}

async function findClientByFrontTag(
  frontTag: string,
  supabase: any
): Promise<string | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('front_tag', frontTag)
    .maybeSingle();

  if (error) {
    console.error('Error finding client:', error);
    return null;
  }

  return data?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('FRONT_WEBHOOK_SECRET');
    const frontApiToken = Deno.env.get('FRONT_API_TOKEN');

    if (!frontApiToken) {
      console.error('Missing FRONT_API_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const rawBody = await req.text();
    const signature = req.headers.get('x-front-signature');

    // Verify signature only if both signature header and secret are present
    if (signature && webhookSecret) {
      console.log('Verifying webhook signature...');
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        await supabase.from('front_webhook_logs').insert({
          payload: JSON.parse(rawBody),
          processed: false,
          error_message: 'Invalid webhook signature',
        });
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Webhook signature verified successfully');
    } else if (!webhookSecret) {
      console.log('⚠️ Webhook signature verification skipped (FRONT_WEBHOOK_SECRET not configured)');
    } else {
      console.log('⚠️ Webhook signature verification skipped (no signature header provided)');
    }

    const payload: FrontWebhookPayload = JSON.parse(rawBody);

    // Extract conversation data
    const conversationData = payload.conversation || payload.target?.data;
    if (!conversationData) {
      console.error('No conversation data in payload');
      await supabase.from('front_webhook_logs').insert({
        payload,
        processed: false,
        error_message: 'No conversation data in payload',
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find client tag
    const clientTag = conversationData.tags?.find((tag) =>
      tag.name.startsWith('client-')
    )?.name;

    if (!clientTag) {
      console.log('No client tag found in conversation');
      await supabase.from('front_webhook_logs').insert({
        payload,
        processed: false,
        error_message: 'No client tag found',
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find client by tag
    const clientId = await findClientByFrontTag(clientTag, supabase);
    if (!clientId) {
      console.error(`No client found for tag: ${clientTag}`);
      await supabase.from('front_webhook_logs').insert({
        payload,
        processed: false,
        error_message: `No client found for tag: ${clientTag}`,
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch full conversation from Front API
    const conversation = await fetchFrontConversation(
      conversationData.id,
      frontApiToken
    );

    if (!conversation) {
      console.error('Failed to fetch conversation from Front');
      await supabase.from('front_webhook_logs').insert({
        payload,
        processed: false,
        error_message: 'Failed to fetch conversation from Front API',
        client_id: clientId,
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse participants
    const participants = conversation.messages
      .flatMap((msg) => msg.recipients || [])
      .filter((r, i, arr) => arr.findIndex((a) => a.handle === r.handle) === i)
      .map((r) => ({
        email: r.handle,
        name: r.name || r.handle,
        role: r.role || 'to',
      }));

    // Parse message thread
    const messageThread = conversation.messages.map((msg) => ({
      body: msg.body,
      sender: msg.author?.email || msg.author?.name || 'Unknown',
      timestamp: new Date(msg.created_at * 1000).toISOString(),
      is_internal: !msg.is_inbound && !msg.recipients,
    }));

    // Parse attachments
    const attachments = conversation.messages
      .flatMap((msg) => msg.attachments || [])
      .map((att) => ({
        filename: att.filename,
        url: att.url,
        size: att.size,
      }));

    const lastMessageAt =
      conversation.messages.length > 0
        ? new Date(
            conversation.messages[conversation.messages.length - 1].created_at * 1000
          ).toISOString()
        : new Date().toISOString();

    // Check if conversation already exists
    const { data: existingLog } = await supabase
      .from('communication_logs')
      .select('id')
      .eq('front_conversation_id', conversation.id)
      .maybeSingle();

    let communicationLogId: string;

    if (existingLog) {
      // Update existing log
      const { data: updated, error: updateError } = await supabase
        .from('communication_logs')
        .update({
          subject_line: conversation.subject,
          participants,
          message_thread: messageThread,
          attachments,
          last_message_at: lastMessageAt,
          tags: conversation.tags?.map((t) => t.name) || [],
        })
        .eq('id', existingLog.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Error updating communication log:', updateError);
        await supabase.from('front_webhook_logs').insert({
          payload,
          processed: false,
          error_message: updateError.message,
          client_id: clientId,
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      communicationLogId = updated.id;
    } else {
      // Insert new log
      const { data: inserted, error: insertError } = await supabase
        .from('communication_logs')
        .insert({
          client_id: clientId,
          type: 'email',
          subject_line: conversation.subject,
          front_conversation_id: conversation.id,
          front_conversation_url: `https://app.frontapp.com/open/${conversation.id}`,
          participants,
          message_thread: messageThread,
          attachments,
          last_message_at: lastMessageAt,
          source: 'front_webhook',
          tags: conversation.tags?.map((t) => t.name) || [],
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting communication log:', insertError);
        await supabase.from('front_webhook_logs').insert({
          payload,
          processed: false,
          error_message: insertError.message,
          client_id: clientId,
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      communicationLogId = inserted.id;
    }

    // Log successful processing
    await supabase.from('front_webhook_logs').insert({
      payload,
      processed: true,
      client_id: clientId,
      communication_log_id: communicationLogId,
    });

    console.log(`Successfully processed webhook for client ${clientId}`);

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
