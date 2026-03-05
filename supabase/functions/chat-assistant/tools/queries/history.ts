// Fetch conversation history for cross-conversation memory
export async function fetchConversationHistory(
  supabase: any,
  clientId: string,
  currentConversationId: string,
  maxTokens: number = 50000
) {
  try {
    // Fetch recent non-archived conversations for this client
    const { data: conversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('client_id', clientId)
      .is('archived_at', null)
      .neq('id', currentConversationId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    const conversationIds = conversations.map((c: any) => c.id);

    // Fetch messages from these conversations
    const { data: historicalMessages, error: msgError } = await supabase
      .from('chat_messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching historical messages:', msgError);
      return [];
    }

    // Group messages by conversation
    const messagesByConversation = new Map();
    for (const msg of historicalMessages || []) {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, []);
      }
      messagesByConversation.get(msg.conversation_id).push(msg);
    }

    // Build summarized context (rough token estimation: 1 token ≈ 4 chars)
    const historicalContext: string[] = [];
    let estimatedTokens = 0;

    for (const conv of conversations) {
      const convMessages = messagesByConversation.get(conv.id) || [];
      if (convMessages.length === 0) continue;

      const convDate = new Date(conv.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Format: "Past conversation (Jan 15, 2025):\nUser: ...\nAssistant: ...\n"
      let convSummary = `\n--- Past Conversation: "${conv.title}" (${convDate}) ---\n`;

      for (const msg of convMessages) {
        const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
        convSummary += `${roleLabel}: ${msg.content}\n`;
      }

      const estimatedConvTokens = convSummary.length / 4;

      // Stop if we're approaching token limit
      if (estimatedTokens + estimatedConvTokens > maxTokens) {
        break;
      }

      historicalContext.push(convSummary);
      estimatedTokens += estimatedConvTokens;
    }

    console.log(`[Conversation History] Loaded ${historicalContext.length} past conversations (~${Math.round(estimatedTokens)} tokens)`);

    return historicalContext;
  } catch (error) {
    console.error('Error in fetchConversationHistory:', error);
    return [];
  }
}
