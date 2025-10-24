/**
 * Front Sync Conversations
 * 
 * Manually syncs conversations from Front API based on client tags.
 * This provides an alternative to webhooks for users without Front Enterprise plan.
 * 
 * Required Secrets:
 * - FRONT_API_TOKEN: Used to fetch conversations and details from Front API
 * 
 * Request Body:
 * - client_id (optional): Sync only this client's conversations. If omitted, syncs all clients.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FrontConversation {
  id: string;
  subject: string;
  status: string;
  tags?: Array<{ name: string }>;
  recipient?: {
    handle: string;
    name?: string;
  };
  _links?: {
    related?: {
      messages?: string;
    };
  };
}

interface FrontMessage {
  id: string;
  type: string;
  is_inbound: boolean;
  author?: {
    email?: string;
    name?: string;
  };
  from?: {
    handle: string;
    name?: string;
  };
  recipients?: Array<{ handle: string; name?: string }>;
  subject?: string;
  body?: string;
  text?: string;
  created_at?: number;
  attachments?: Array<{
    filename: string;
    url: string;
    content_type: string;
    size: number;
  }>;
}

async function fetchFrontConversation(conversationId: string, apiToken: string): Promise<FrontConversation | null> {
  try {
    const response = await fetch(`https://api2.frontapp.com/conversations/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch conversation ${conversationId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return null;
  }
}

async function fetchConversationMessages(conversationId: string, apiToken: string): Promise<FrontMessage[]> {
  try {
    const response = await fetch(`https://api2.frontapp.com/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch messages for ${conversationId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const messages = data._results || [];
    
    // Debug: Log first message structure to understand Front API response
    if (messages.length > 0) {
      console.log(`Sample message structure for ${conversationId}:`, JSON.stringify(messages[0], null, 2));
    }
    
    return messages;
  } catch (error) {
    console.error(`Error fetching messages for ${conversationId}:`, error);
    return [];
  }
}

async function getTagId(tagName: string, apiToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api2.frontapp.com/tags', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch tags: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tags = data._results || [];
    const tag = tags.find((t: any) => t.name === tagName);
    
    if (!tag) {
      console.error(`Tag "${tagName}" not found in Front`);
      return null;
    }

    return tag.id;
  } catch (error) {
    console.error(`Error fetching tag ID for ${tagName}:`, error);
    return null;
  }
}

async function fetchConversationsByTag(
  tag: string, 
  apiToken: string,
  updatedAfter?: string | null
): Promise<FrontConversation[]> {
  try {
    // First, get the tag ID from the tag name
    const tagId = await getTagId(tag, apiToken);
    
    if (!tagId) {
      console.error(`Could not find tag ID for "${tag}"`);
      return [];
    }

    const allConversations: FrontConversation[] = [];
    let baseUrl = `https://api2.frontapp.com/tags/${tagId}/conversations?limit=100`;
    
    // Add date filter if provided
    if (updatedAfter) {
      const timestamp = Math.floor(new Date(updatedAfter).getTime() / 1000);
      baseUrl += `&q[updated_after]=${timestamp}`;
    }

    let nextPageUrl: string | null = baseUrl;

    while (nextPageUrl) {
      const response: Response = await fetch(nextPageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Front API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const conversations = data._results || [];
      allConversations.push(...conversations);

      console.log(`Fetched ${conversations.length} conversations (total: ${allConversations.length})`);

      // Check for next page
      nextPageUrl = data._links?.next || null;
    }

    console.log(`Total conversations fetched for tag "${tag}": ${allConversations.length}`);
    return allConversations;
  } catch (error) {
    console.error(`Error fetching conversations for tag ${tag}:`, error);
    return [];
  }
}

function extractParticipants(messages: FrontMessage[]): any[] {
  const participantsMap = new Map();

  for (const message of messages) {
    if (message.author?.email) {
      participantsMap.set(message.author.email, {
        email: message.author.email,
        name: message.author.name || message.author.email,
        role: 'author',
      });
    }

    if (message.recipients) {
      for (const recipient of message.recipients) {
        participantsMap.set(recipient.handle, {
          email: recipient.handle,
          name: recipient.name || recipient.handle,
          role: 'recipient',
        });
      }
    }
  }

  return Array.from(participantsMap.values());
}

function extractMessageThread(messages: FrontMessage[], participants: any[]): any[] {
  // Identify company domain(s) from participants
  const companyDomains = ['spearlance.com'];
  
  return messages.map(msg => {
    let senderName = 'Unknown Sender';
    
    if (msg.is_inbound) {
      // Inbound message - sent by external contact
      const externalContact = participants.find(p => 
        p.email && !companyDomains.some(domain => p.email.includes(domain))
      );
      senderName = externalContact?.name || 'External Contact';
    } else {
      // Outbound message - sent by team member
      const teamMember = participants.find(p => 
        p.email && companyDomains.some(domain => p.email.includes(domain))
      );
      senderName = teamMember?.name || 'Team Member';
    }
    
    return {
      id: msg.id,
      type: msg.type,
      sender: senderName,
      body: msg.text || msg.body || '',
      timestamp: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
      is_internal: false,
    };
  });
}

function extractAttachments(messages: FrontMessage[]): any[] {
  const attachments: any[] = [];
  
  for (const message of messages) {
    if (message.attachments) {
      for (const attachment of message.attachments) {
        attachments.push({
          filename: attachment.filename,
          url: attachment.url,
          content_type: attachment.content_type,
          size: attachment.size,
        });
      }
    }
  }

  return attachments;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const frontApiToken = Deno.env.get('FRONT_API_TOKEN');

    if (!frontApiToken) {
      console.error('Missing FRONT_API_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Configuration error: Missing FRONT_API_TOKEN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const { client_id } = await req.json().catch(() => ({}));

    // Get clients to sync
    let clientsQuery = supabase
      .from('clients')
      .select('id, name, front_tag, last_front_sync_at')
      .not('front_tag', 'is', null);

    if (client_id) {
      clientsQuery = clientsQuery.eq('id', client_id);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, created: 0, updated: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing conversations for ${clients.length} client(s)`);

    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    for (const client of clients) {
      if (!client.front_tag) {
        console.log(`Skipping client ${client.name} - no front_tag set`);
        continue;
      }

      console.log(`Fetching conversations for client ${client.name} (tag: ${client.front_tag})`);
      console.log(`Last sync at: ${client.last_front_sync_at || 'Never'}`);
      
      const conversations = await fetchConversationsByTag(
        client.front_tag, 
        frontApiToken,
        client.last_front_sync_at
      );
      
      console.log(`Found ${conversations.length} conversation(s) for ${client.name}`);

      for (const conversation of conversations) {
        try {
          const messages = await fetchConversationMessages(conversation.id, frontApiToken);
          
          if (messages.length === 0) {
            console.log(`No messages found for conversation ${conversation.id}, skipping`);
            continue;
          }

          const participants = extractParticipants(messages);
          const messageThread = extractMessageThread(messages, participants);
          const attachments = extractAttachments(messages);
          const tags = conversation.tags?.map(t => t.name) || [];

          const lastMessage = messages[messages.length - 1];
          const lastMessageAt = lastMessage?.created_at 
            ? new Date(lastMessage.created_at * 1000).toISOString()
            : new Date().toISOString();

          // Check if log already exists
          const { data: existingLog } = await supabase
            .from('communication_logs')
            .select('id')
            .eq('front_conversation_id', conversation.id)
            .maybeSingle();

          if (existingLog) {
            // Update existing log
            const { error: updateError } = await supabase
              .from('communication_logs')
              .update({
                subject_line: conversation.subject || 'No Subject',
                participants,
                message_thread: messageThread,
                attachments,
                tags,
                last_message_at: lastMessageAt,
                front_conversation_url: `https://app.frontapp.com/open/${conversation.id}`,
              })
              .eq('id', existingLog.id);

            if (updateError) {
              console.error(`Error updating log for conversation ${conversation.id}:`, updateError);
              errors.push(`Failed to update conversation ${conversation.id}`);
            } else {
              totalUpdated++;
              console.log(`Updated log for conversation ${conversation.id}`);
            }
          } else {
            // Create new log
            const { error: insertError } = await supabase
              .from('communication_logs')
              .insert({
                client_id: client.id,
                type: 'email',
                source: 'front_webhook',
                subject_line: conversation.subject || 'No Subject',
                participants,
                message_thread: messageThread,
                attachments,
                tags,
                last_message_at: lastMessageAt,
                front_conversation_id: conversation.id,
                front_conversation_url: `https://app.frontapp.com/open/${conversation.id}`,
              });

            if (insertError) {
              console.error(`Error creating log for conversation ${conversation.id}:`, insertError);
              errors.push(`Failed to create log for conversation ${conversation.id}`);
            } else {
              totalCreated++;
              console.log(`Created log for conversation ${conversation.id}`);
            }
          }
        } catch (convError) {
          console.error(`Error processing conversation ${conversation.id}:`, convError);
          errors.push(`Error processing conversation ${conversation.id}`);
        }
      }
      
      // Update last sync timestamp for this client after processing all conversations
      const { error: syncUpdateError } = await supabase
        .from('clients')
        .update({ last_front_sync_at: new Date().toISOString() })
        .eq('id', client.id);
      
      if (syncUpdateError) {
        console.error(`Error updating last_front_sync_at for client ${client.name}:`, syncUpdateError);
      } else {
        console.log(`Updated last_front_sync_at for client ${client.name}`);
      }
    }

    const result = {
      synced: totalCreated + totalUpdated,
      created: totalCreated,
      updated: totalUpdated,
      errors,
    };

    console.log('Sync complete:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in front-sync-conversations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
