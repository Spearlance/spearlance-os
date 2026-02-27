// supabase/functions/_shared/aiClient.ts

// OpenRouter gateway configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model constants
export const AI_MODELS = {
  /** Claude Sonnet 4.5 — all text generation tasks */
  TEXT: 'anthropic/claude-sonnet-4-5',
  /** Gemini 2.5 Flash Image Preview — image generation only */
  IMAGE: 'google/gemini-2.5-flash-image-preview',
} as const;

/** Build standard headers for OpenRouter API calls */
export function aiHeaders(): Record<string, string> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://os.spearlance.com',
    'X-Title': 'SpearlanceOS',
  };
}

/** Chat completions endpoint URL */
export const AI_CHAT_URL = `${OPENROUTER_BASE_URL}/chat/completions`;

/** Standard chat completion request */
export async function aiChatCompletion(body: {
  model?: string;
  messages: Array<{ role: string; content: any }>;
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
  modalities?: string[];
  [key: string]: any;
}): Promise<Response> {
  const response = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({
      model: body.model || AI_MODELS.TEXT,
      ...body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  return response;
}

/** Extract text content from a non-streaming chat completion response */
export async function aiTextResponse(body: {
  messages: Array<{ role: string; content: any }>;
  tools?: any[];
  tool_choice?: any;
  [key: string]: any;
}): Promise<string> {
  const response = await aiChatCompletion(body);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Extract tool call from a non-streaming chat completion response */
export async function aiToolCallResponse(body: {
  messages: Array<{ role: string; content: any }>;
  tools: any[];
  tool_choice?: any;
  [key: string]: any;
}): Promise<{ id: string; name: string; arguments: string } | null> {
  const response = await aiChatCompletion(body);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  return toolCall ? {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: toolCall.function.arguments,
  } : null;
}
