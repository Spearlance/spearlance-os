import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Transform editor link to white-label domain
function transformEditorLink(originalLink: string | null): string | null {
  if (!originalLink) return null;
  return originalLink.replace('my.duda.co', 'www.mywebsitemanager.co');
}

// Extract page name from editor link
// URL format: https://my.duda.co/home/site/SITEID/pages/PAGENAME#conversationId=xxx
function extractPageFromLink(editorLink: string | null): string | null {
  if (!editorLink) return null;
  
  const match = editorLink.match(/\/pages\/([^#?/]+)/);
  if (match) {
    return decodeURIComponent(match[1]).replace(/-/g, ' ');
  }
  return null;
}

// Generate title using Lovable AI
async function generateCommentTitle(commentText: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || !commentText) {
    return "Website Comment";
  }
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Create a brief 3-6 word title summarizing this website comment. No quotes, just the title.'
          },
          { role: 'user', content: commentText }
        ],
      }),
    });
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Website Comment";
  } catch (error) {
    console.error('Error generating title:', error);
    return "Website Comment";
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Received Duda comment webhook from Zapier:', JSON.stringify(payload, null, 2));

    // Handle flat payload structure from Zapier
    const {
      event_type,
      site_name,
      account_name,
      text,
      conversation_number,
      conversation_status,
      visibility,
      id: comment_id,
      editor_link,
      event_timestamp
    } = payload;

    if (!site_name) {
      console.error('Missing site_name');
      return new Response(
        JSON.stringify({ error: 'Missing site_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up client by site_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('site_id', site_name)
      .single();

    if (clientError || !client) {
      console.error('Client not found for site_id:', site_name, clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found for site_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = client.id;

    // Extract conversationId from editor_link if available
    let conversationId = null;
    if (editor_link) {
      const match = editor_link.match(/#conversationId=([^&]+)/);
      if (match) {
        conversationId = match[1];
      }
    }

    // Handle different event types
    switch (event_type) {
      case 'NEW_CONVERSATION': {
        if (!conversationId || !conversation_number || !text) {
          console.error('Missing required fields for NEW_CONVERSATION');
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate title for new conversation
        const title = await generateCommentTitle(text);
        
        // Upsert conversation
        const { data: conversation, error: convError } = await supabase
          .from('duda_conversations')
          .upsert({
            client_id: clientId,
            site_id: site_name,
            duda_conversation_uuid: conversationId,
            conversation_number: conversation_number,
            status: conversation_status || 'open',
            deleted: false,
            created_by_account: account_name,
            duda_page_uuid: extractPageFromLink(editor_link),
            title: title,
          }, { onConflict: 'duda_conversation_uuid' })
          .select()
          .single();

        if (convError) {
          console.error('Error upserting conversation:', convError);
          throw convError;
        }

        // Insert first comment
        const { error: commentError } = await supabase
          .from('duda_conversation_comments')
          .insert({
            conversation_id: conversation.id,
            duda_comment_uuid: comment_id?.toString() || `comment-${Date.now()}`,
            comment_text: text,
            author_account: account_name,
            is_internal_reply: false,
            visibility: visibility?.toLowerCase() || 'public',
            editor_link: transformEditorLink(editor_link),
          });

        if (commentError) {
          console.error('Error inserting comment:', commentError);
        }

        // Create notifications (only for admins/FMMs if internal)
        const isInternal = visibility?.toLowerCase() === 'internal';
        await createNotifications(
          supabase,
          clientId,
          conversation.id,
          'new_conversation',
          {
            conversation_number: conversation_number,
            created_by: account_name,
          },
          isInternal
        );

        break;
      }

      case 'NEW_COMMENT': {
        if (!conversationId || !text) {
          console.error('Missing required fields for NEW_COMMENT');
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find conversation by conversationId (conversation_number might not be present)
        let conversationQuery = supabase
          .from('duda_conversations')
          .select('id')
          .eq('client_id', clientId);

        // Only use .or() if both values exist, otherwise just use conversationId
        if (conversationId && conversation_number) {
          conversationQuery = conversationQuery.or(`duda_conversation_uuid.eq.${conversationId},conversation_number.eq.${conversation_number}`);
        } else if (conversationId) {
          conversationQuery = conversationQuery.eq('duda_conversation_uuid', conversationId);
        } else if (conversation_number) {
          conversationQuery = conversationQuery.eq('conversation_number', conversation_number);
        }

        const { data: conversation } = await conversationQuery.single();

        if (!conversation) {
          console.error('Conversation not found:', conversationId);
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert comment
        const { error: commentError } = await supabase
          .from('duda_conversation_comments')
          .insert({
            conversation_id: conversation.id,
            duda_comment_uuid: comment_id?.toString() || `comment-${Date.now()}`,
            comment_text: text,
            author_account: account_name,
            is_internal_reply: false,
            visibility: visibility?.toLowerCase() || 'public',
            editor_link: transformEditorLink(editor_link),
          });

        if (commentError) {
          console.error('Error inserting comment:', commentError);
          throw commentError;
        }

        // Create notifications (only for admins/FMMs if internal)
        const isInternal = visibility?.toLowerCase() === 'internal';
        await createNotifications(
          supabase,
          clientId,
          conversation.id,
          'new_comment',
          {
            author: account_name,
          },
          isInternal
        );

        break;
      }

      case 'CONVERSATION_UPDATED': {
        if (!conversationId && !conversation_number) {
          console.error('Missing conversation identifier');
          return new Response(
            JSON.stringify({ error: 'Missing conversation identifier' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: any = { updated_at: new Date().toISOString() };
        if (conversation_status) {
          updateData.status = conversation_status;
          if (conversation_status === 'resolved') {
            updateData.resolved_at = new Date().toISOString();
          }
        }

        const query = conversationId
          ? supabase.from('duda_conversations').update(updateData).eq('duda_conversation_uuid', conversationId)
          : supabase.from('duda_conversations').update(updateData).eq('conversation_number', conversation_number).eq('client_id', clientId);

        const { error: updateError } = await query;

        if (updateError) {
          console.error('Error updating conversation:', updateError);
          throw updateError;
        }

        // Create notification for status change
        if (conversation_status) {
          const { data: conversation } = await supabase
            .from('duda_conversations')
            .select('id')
            .or(conversationId ? `duda_conversation_uuid.eq.${conversationId}` : `conversation_number.eq.${conversation_number}`)
            .eq('client_id', clientId)
            .single();

          if (conversation) {
            await createNotifications(
              supabase,
              clientId,
              conversation.id,
              'status_changed',
              { status: conversation_status },
              false
            );
          }
        }

        break;
      }

      case 'COMMENT_EDITED': {
        if (!comment_id || !text) {
          console.error('Missing required fields for COMMENT_EDITED');
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: editError } = await supabase
          .from('duda_conversation_comments')
          .update({
            comment_text: text,
            updated_at: new Date().toISOString(),
          })
          .eq('duda_comment_uuid', comment_id.toString());

        if (editError) {
          console.error('Error editing comment:', editError);
          throw editError;
        }

        break;
      }

      default:
        console.log('Unhandled event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createNotifications(
  supabase: any,
  clientId: string,
  conversationId: string,
  type: string,
  metadata: any,
  isInternal: boolean = false
) {
  try {
    // Get conversation details
    const { data: conversation } = await supabase
      .from('duda_conversations')
      .select('conversation_number, duda_page_uuid')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    // Get admin and FMM users
    const { data: adminFmmUsers } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'fmm'])
      .contains('associated_client_ids', [clientId]);

    let userIds = adminFmmUsers?.map((u: any) => u.id) || [];

    // Only notify client users if the comment is NOT internal
    if (!isInternal) {
      const { data: primaryContacts } = await supabase
        .from('client_primary_contacts')
        .select('user_id')
        .eq('client_id', clientId);

      userIds = [
        ...userIds,
        ...(primaryContacts?.map((c: any) => c.user_id) || []),
      ];
    }

    if (userIds.length === 0) return;

    let title = '';
    let description = '';
    let notifType = '';

    switch (type) {
      case 'new_conversation':
        title = isInternal ? '🔒 New Internal Site Comment' : '🗨️ New Site Comment';
        description = `${isInternal ? 'Internal comment' : 'New comment'} #${conversation.conversation_number}`;
        notifType = 'site_comment_new';
        break;
      case 'new_comment':
        title = isInternal ? '🔒 Internal Reply on Site Comment' : '💬 Reply on Site Comment';
        description = `${metadata.author} replied to comment #${conversation.conversation_number}`;
        notifType = 'site_comment_reply';
        break;
      case 'status_changed':
        title = metadata.status === 'resolved' ? '✅ Site Comment Resolved' : '🔄 Site Comment Reopened';
        description = `Comment #${conversation.conversation_number} was ${metadata.status}`;
        notifType = 'site_comment_status';
        break;
    }

    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      client_id: clientId,
      type: notifType,
      title: title,
      description: description,
      action_url: `/website/comments/${conversationId}`,
      payload_json: {
        conversation_id: conversationId,
        conversation_number: conversation.conversation_number,
        is_internal: isInternal,
        ...metadata,
      },
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Error creating notifications:', error);
  }
}