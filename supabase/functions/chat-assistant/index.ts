import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from './config.ts';
import { authenticate } from './middleware/auth.ts';
import { checkRateLimit } from './middleware/rate-limit.ts';
import { logToolCall } from './middleware/logging.ts';
import { detectHallucinations } from './validation/hallucination.ts';
import { validatePostExecution, type FunctionResult } from './validation/data-integrity.ts';
import { consumeStream } from './streaming/consumer.ts';
import { createSSEResponse, passthroughStream } from './streaming/producer.ts';
import { getToolsForMode } from './tools/registry.ts';
import { validateArgs, executeTool } from './tools/executor.ts';
import type { ExecutorContext } from './tools/types.ts';
import { buildSystemPrompt, type SystemPromptContext } from './prompts/system.ts';
import { buildClientSnapshot } from './prompts/snapshot.ts';
import { fetchConversationHistory } from './tools/queries/history.ts';
import { AI_CHAT_URL, AI_MODELS, aiHeaders } from '../_shared/aiClient.ts';

// ─── Serve ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  const requestStartTime = Date.now();
  console.log(`[${new Date().toISOString()}] Chat request received`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parse request body ──────────────────────────────────────────────────
    const {
      messages,
      client_id,
      conversation_id,
      offer_mode = false,
      launchpad_mode = false,
      submission_id = null,
      current_stage = null,
    } = await req.json();

    console.log('[Request Debug]:', {
      client_id,
      conversation_id,
      offer_mode,
      launchpad_mode,
      submission_id,
      current_stage,
      message_count: messages.length,
      last_message: messages[messages.length - 1]?.content?.substring(0, 100),
    });

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Auth + profile ──────────────────────────────────────────────────────
    const authResult = await authenticate(req, client_id);
    if (authResult instanceof Response) return authResult;

    const { user, profile, userRole, userContext, supabaseClient } = authResult;

    // ── Rate limit ──────────────────────────────────────────────────────────
    const withinLimit = await checkRateLimit(supabaseClient, user.id);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch existing launchpad data if applicable ─────────────────────────
    let existingLaunchpadData = null;
    if (launchpad_mode && submission_id) {
      const { data: submissionData } = await supabaseClient
        .from('launchpad_submissions')
        .select('responses_json, discovery_completeness, marketing_completeness, avatar_completeness')
        .eq('id', submission_id)
        .maybeSingle();
      existingLaunchpadData = submissionData;
    }

    // ── Build system prompt ─────────────────────────────────────────────────
    const mode: 'default' | 'offer' | 'launchpad' =
      launchpad_mode ? 'launchpad' : offer_mode ? 'offer' : 'default';

    const promptCtx: SystemPromptContext = {
      clientId: client_id,
      userId: user.id,
      userRole,
      userContext,
      submissionId: submission_id,
      currentStage: current_stage,
      existingLaunchpadData,
    };

    const systemPrompt = buildSystemPrompt(mode, promptCtx);

    // ── Select tools for this mode ──────────────────────────────────────────
    const tools = getToolsForMode(mode);

    // ── Historical context ──────────────────────────────────────────────────
    const historicalContext = conversation_id
      ? await fetchConversationHistory(supabaseClient, client_id, conversation_id, 50000)
      : [];

    const clientSnapshot = await buildClientSnapshot(supabaseClient, client_id);

    const contextualMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: clientSnapshot },
    ];

    if (historicalContext.length > 0) {
      contextualMessages.push({
        role: 'system',
        content: `HISTORICAL CONVERSATIONS FOR REFERENCE:

The following are past conversations with this client. Use them to provide context-aware responses and remember previous discussions about pricing, strategies, decisions, and preferences.

IMPORTANT: Prioritize information in this order:
1. Current conversation messages
2. Structured data from tool functions (get_client_info, search_tasks, etc.)
3. Historical conversations (below)

${historicalContext.join('\n\n')}

--- END OF HISTORICAL CONTEXT ---`,
      });
    }

    contextualMessages.push(...messages);

    // ── First AI call (streaming) ───────────────────────────────────────────
    console.log(`[${new Date().toISOString()}] Starting AI request for client ${client_id}`);
    const apiStartTime = Date.now();

    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODELS.TEXT,
        messages: contextualMessages,
        tools,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const apiDuration = Date.now() - apiStartTime;
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] AI API error after ${apiDuration}ms:`, response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI provider error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[${new Date().toISOString()}] AI response received, starting streaming (${Date.now() - apiStartTime}ms)`);

    // ── Consume stream → text + tool calls ──────────────────────────────────
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from AI');

    const { assistantMessage: rawAssistant, functionCalls: functionCallsArray } =
      await consumeStream(reader);

    let assistantMessage = rawAssistant;

    // Handle empty response
    if (!assistantMessage || assistantMessage.trim().length === 0) {
      console.warn('[Empty Response] AI returned no content, launchpad_mode:', launchpad_mode);
      if (launchpad_mode) {
        assistantMessage = "I apologize, but I didn't generate a proper response. Could you please try again?";
      }
    }

    console.log('[Assistant Message] Final length:', assistantMessage?.length || 0);
    console.log('[Assistant Message] Preview:', assistantMessage?.substring(0, 200));
    console.log('Collected function calls:', functionCallsArray.length);

    if (launchpad_mode && functionCallsArray.length === 0) {
      console.warn('[LaunchPad] WARNING: No function calls detected in LaunchPad mode.');
    }
    if (functionCallsArray.length > 0) {
      console.log('[Function Calls]:', functionCallsArray.map(fc => fc.name).join(', '));
    }

    // ── Pre-execution hallucination detection ───────────────────────────────
    console.log('[Validation] Starting hallucination detection...');
    const hallucinationResult = detectHallucinations(assistantMessage, functionCallsArray);

    if (hallucinationResult.wasModified) {
      assistantMessage = hallucinationResult.modifiedMessage;

      // Log hallucinations to database
      try {
        await supabaseClient.from('chat_tool_calls').insert({
          user_id: user.id,
          client_id,
          tool_name: 'HALLUCINATION_DETECTED',
          tool_args: {
            warnings: hallucinationResult.warnings,
            original_message: rawAssistant.substring(0, 500),
          },
          result_count: hallucinationResult.warnings.length,
        });
      } catch (logError) {
        console.error('[Validation] Failed to log hallucinations:', logError);
      }
    }

    // ── Tool execution ──────────────────────────────────────────────────────
    const functionResults: Record<string, FunctionResult> = {};

    if (functionCallsArray.length > 0) {
      const toolMessages: Array<{ role: string; tool_call_id: string; content: string }> = [];

      const executorCtx: ExecutorContext = {
        supabase: supabaseClient,
        clientId: client_id,
        userId: user.id,
        userRole,
        submissionId: submission_id,
      };

      for (const fc of functionCallsArray) {
        console.log(`[Function Execution] ${fc.name}`);
        console.log(`[Function Args] ${fc.arguments}`);

        let result: any;
        let error: string | null = null;

        try {
          const args = JSON.parse(fc.arguments);

          // Pre-execution validation
          const validationError = validateArgs(fc.name, args, client_id, toolMessages);
          if (validationError) {
            console.log(`[Validation] Skipping ${fc.name}: ${validationError}`);
            continue;
          }

          // Execute the tool
          result = await executeTool(fc.name, executorCtx, args);

          console.log(`Function ${fc.name} result:`, result);

          // Track execution status
          const hasError = result?.error != null;
          functionResults[fc.name] = {
            called: true,
            succeeded: !hasError,
            error: hasError ? (result.error || 'Unknown error') : null,
            data: hasError ? null : result,
          };

          console.log(`[Function Tracking] ${fc.name} - Success: ${!hasError}`);

          await logToolCall(
            supabaseClient, user.id, client_id, fc.name,
            args, (result as any).result_count || 0, null,
          );
        } catch (err: any) {
          console.error(`Function ${fc.name} error:`, err);
          error = err.message;
          result = { error: err.message };

          functionResults[fc.name] = {
            called: true,
            succeeded: false,
            error: err.message,
            data: null,
          };

          await logToolCall(
            supabaseClient, user.id, client_id, fc.name,
            {}, 0, error,
          );
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: fc.id,
          content: JSON.stringify(result),
        });
      }

      // ── Post-execution validation ───────────────────────────────────────
      const postExec = validatePostExecution(
        assistantMessage, functionResults, functionCallsArray, toolMessages,
      );

      if (postExec.warnings.length > 0) {
        assistantMessage = postExec.modifiedMessage;

        try {
          await supabaseClient.from('chat_tool_calls').insert({
            user_id: user.id,
            client_id,
            tool_name: 'FUNCTION_FAILURE_DETECTED',
            tool_args: { warnings: postExec.warnings, function_results: functionResults },
            result_count: postExec.warnings.length,
          });
        } catch (logError) {
          console.error('[Post-Execution Validation] Failed to log failures:', logError);
        }
      }

      // ── Second AI call with tool results ────────────────────────────────
      const messagesWithResults = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: clientSnapshot },
        ...messages,
        {
          role: 'assistant',
          content: assistantMessage || null,
          tool_calls: functionCallsArray.map(fc => ({
            id: fc.id,
            type: 'function',
            function: { name: fc.name, arguments: fc.arguments },
          })),
        },
        ...toolMessages,
      ];

      console.log('Making second API call with function results');

      const finalResponse = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({
          model: AI_MODELS.TEXT,
          messages: messagesWithResults,
          stream: true,
          max_tokens: 4096,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error('Final response error:', finalResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: `AI provider error (final): ${finalResponse.status}`, details: errorText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // LaunchPad mode → consume stream and return JSON
      if (launchpad_mode) {
        const finalReader = finalResponse.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (finalReader) {
          while (true) {
            const { done, value } = await finalReader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  fullResponse += json.choices?.[0]?.delta?.content || '';
                } catch { /* incomplete chunk */ }
              }
            }
          }
        }

        let completeness = null;
        const extractCall = functionCallsArray.find(fc => fc.name === 'extract_launchpad_data');
        if (extractCall) {
          try {
            const args = JSON.parse(extractCall.arguments);
            completeness = args.completeness;
          } catch { /* ignore */ }
        }

        console.log('[LaunchPad Response]:', { responseLength: fullResponse.length, completeness });

        return new Response(JSON.stringify({ response: fullResponse, completeness }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Normal mode → passthrough SSE stream
      return passthroughStream(finalResponse.body!, corsHeaders);

    } else {
      // ── No function calls ─────────────────────────────────────────────────
      console.log('[No Functions] Detected 0 function calls');
      console.log('[No Functions] launchpad_mode:', launchpad_mode, 'type:', typeof launchpad_mode);
      console.log('[No Functions] assistantMessage length:', assistantMessage?.length || 0);

      if (launchpad_mode) {
        console.warn('[LaunchPad] WARNING: No function calls detected in LaunchPad mode.');
      }

      // LaunchPad mode → JSON response
      if (launchpad_mode === true) {
        const responseData = { response: assistantMessage || '', completeness: null };
        console.log('[LaunchPad Response] Response object:', JSON.stringify(responseData));

        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Normal mode → wrap in synthetic SSE
      return createSSEResponse(assistantMessage, corsHeaders);
    }

  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`[${new Date().toISOString()}] Chat assistant error after ${totalDuration}ms:`, error);

    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred', details: error.toString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
