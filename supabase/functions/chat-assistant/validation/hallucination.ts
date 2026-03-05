/**
 * Hallucination detection for chat-assistant.
 * Extracted from index.ts lines 5957–5167.
 *
 * Detects cases where the assistant claims to have performed an action
 * (task creation, email draft, etc.) without the corresponding function
 * call being present in the request.
 */

export interface HallucinationPattern {
  name: string;
  triggers: RegExp[];
  requiredFunction: string;
  errorMessage: string;
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: string;
}

const hallucinationPatterns: HallucinationPattern[] = [
  {
    name: 'Task Creation Claims',
    triggers: [
      /(?:created|made|set up|added|scheduled)\s+(?:a\s+)?(?:task|reminder|to-?do)/i,
      /task\s+(?:is\s+)?(?:created|set|ready|done)/i,
      /(?:i've|i have)\s+(?:created|set up|added)\s+(?:a\s+)?task/i,
      /done!.*task/i,
      /✅.*task/i,
      /📋.*(?:created|set|ready)/i,
    ],
    requiredFunction: 'create_general_task',
    errorMessage: 'AI claimed task creation without calling create_general_task',
  },
  {
    name: 'Email Task Claims',
    triggers: [
      /(?:created|set up)\s+(?:an?\s+)?email\s+task/i,
      /task\s+to\s+email/i,
      /email\s+task\s+(?:is\s+)?(?:created|ready|set)/i,
    ],
    requiredFunction: 'create_email_task',
    errorMessage: 'AI claimed email task creation without calling create_email_task',
  },
  {
    name: 'Task Update Claims',
    triggers: [
      /(?:updated|changed|modified)\s+(?:the\s+)?task/i,
      /task\s+(?:is\s+)?(?:updated|marked|changed)/i,
      /(?:i've|i have)\s+(?:updated|marked|changed)\s+(?:the\s+)?task/i,
    ],
    requiredFunction: 'update_task',
    errorMessage: 'AI claimed task update without calling update_task',
  },
  {
    name: 'Generic Success Without Action',
    triggers: [
      /^done!?\s*$/i,
      /^all set!?\s*$/i,
      /^completed!?\s*$/i,
      /^✅\s*$/,
    ],
    requiredFunction: 'any',
    errorMessage: 'AI claimed completion without any function call',
  },
  {
    name: 'Email Draft Claims',
    triggers: [
      /(?:drafted|created|generated)\s+(?:an?\s+)?email/i,
      /email\s+(?:is\s+)?(?:drafted|ready|generated)/i,
      /(?:i've|i have)\s+(?:drafted|written)\s+(?:an?\s+)?email/i,
      /here'?s?\s+(?:a|the)\s+(?:draft|email)/i,
    ],
    requiredFunction: 'draft_email',
    errorMessage: 'AI claimed email draft without calling draft_email',
  },
  {
    name: 'Submission Task Creation Claims',
    triggers: [
      /created\s+(?:a\s+)?task\s+for\s+(?:the\s+)?submission/i,
      /task\s+from\s+submission/i,
      /linked\s+(?:a\s+)?task\s+to/i,
    ],
    requiredFunction: 'create_task_from_submission',
    errorMessage:
      'AI claimed submission task creation without calling create_task_from_submission',
  },
];

const dataRetrievalClaims = [
  /(?:here (?:are|is)|found)\s+(?:\d+\s+)?(?:leads?|submissions?|forms?|tickets?|meetings?|posts?|tasks?)/i,
  /showing\s+(?:\d+\s+)?(?:results?|items?)/i,
  /(?:retrieved|fetched|loaded)\s+(?:\d+\s+)?(?:items?|records?)/i,
  /\d+\s+(?:leads?|submissions?|forms?|tickets?|meetings?|posts?|tasks?)\s+(?:found|this\s+week)/i,
  /total\s+of\s+\d+/i,
];

const dataRetrievalFunctions = [
  'get_form_submissions',
  'get_tickets',
  'get_meetings',
  'search_tasks',
  'get_social_media_posts',
  'get_communication_logs',
  'get_tasks',
];

/**
 * Scans the assistant message for hallucinated action claims and returns
 * a (potentially modified) message along with any warnings raised.
 *
 * Note: database logging is intentionally omitted here — callers that have
 * access to a supabaseClient should handle persistence of warnings themselves.
 */
export function detectHallucinations(
  assistantMessage: string,
  functionCallsArray: FunctionCall[],
): { warnings: string[]; modifiedMessage: string; wasModified: boolean } {
  const warnings: string[] = [];
  let message = assistantMessage;
  let wasModified = false;

  // Check each named pattern
  for (const pattern of hallucinationPatterns) {
    const messageMatchesPattern = pattern.triggers.some(trigger =>
      trigger.test(message)
    );

    if (messageMatchesPattern) {
      console.log(`[Validation] Detected pattern: ${pattern.name}`);

      const functionWasCalled =
        pattern.requiredFunction === 'any'
          ? functionCallsArray.length > 0
          : functionCallsArray.some(fc => fc.name === pattern.requiredFunction);

      if (!functionWasCalled) {
        console.error(
          `[Validation] HALLUCINATION DETECTED: ${pattern.errorMessage}`,
        );
        warnings.push(pattern.errorMessage);

        if (pattern.name === 'Task Creation Claims') {
          message = message.replace(
            /(?:✅|📋)?\s*(?:done!?|task\s+(?:is\s+)?(?:created|set|ready))[.!]?\s*/gi,
            '',
          );
          message = message.replace(
            /(?:i've|i have)\s+(?:created|set up|added)\s+(?:a\s+)?task\s+to\s+[^.!]+[.!]/gi,
            'I can help you create a task for that.',
          );
          wasModified = true;

          if (message.trim().length < 20) {
            message =
              "I understand you want to create a task. Could you provide more details about what the task should include?";
          } else {
            message +=
              "\n\nTo create this as a task, please confirm the details you'd like me to include.";
          }
        } else if (pattern.name === 'Email Task Claims') {
          message = message.replace(
            /(?:i've|i have)\s+(?:created|set up)\s+(?:an?\s+)?email\s+task[^.!]*[.!]/gi,
            '',
          );
          wasModified = true;
          message += "\n\nWould you like me to create an email task for this?";
        } else if (pattern.name === 'Task Update Claims') {
          message = message.replace(
            /(?:i've|i have)\s+(?:updated|marked|changed)\s+(?:the\s+)?task[^.!]*[.!]/gi,
            '',
          );
          wasModified = true;
          message +=
            "\n\nTo update this task, I'll need you to confirm the changes.";
        } else if (pattern.name === 'Generic Success Without Action') {
          message = "I'm ready to help! What would you like me to do?";
          wasModified = true;
        }
      } else {
        console.log(
          `[Validation] ✓ Pattern verified: ${pattern.requiredFunction} was called`,
        );
      }
    }
  }

  // Additional check: data retrieval claims without data functions
  const claimsDataRetrieval = dataRetrievalClaims.some(pattern =>
    pattern.test(message)
  );

  if (claimsDataRetrieval) {
    const dataFunctionCalled = functionCallsArray.some(fc =>
      dataRetrievalFunctions.includes(fc.name)
    );

    if (!dataFunctionCalled) {
      console.error(
        '[Validation] HALLUCINATION: Claimed data retrieval without calling data functions',
      );
      warnings.push(
        'AI claimed data retrieval without calling data functions',
      );

      message = message.replace(
        /(?:here (?:are|is)|found)\s+\d+\s+[^.!]+[.!]/gi,
        '',
      );
      message +=
        "\n\nI'll need to retrieve that data first. What specific information are you looking for?";
      wasModified = true;
    } else {
      // Log claimed count for informational purposes
      const countMatch = message.match(
        /(?:here (?:are|is)|found|showing|total of)\s+(\d+)/i,
      );
      const claimedCount = countMatch ? parseInt(countMatch[1]) : null;
      if (claimedCount !== null) {
        console.log(`[Validation] Data retrieval claimed count: ${claimedCount}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.error('[Validation] HALLUCINATIONS DETECTED:', warnings);
    console.log('[Validation] Original message modified:', wasModified);
    console.log('[Validation] Corrected message:', message);
  } else {
    console.log('[Validation] ✓ No hallucinations detected');
  }

  return { warnings, modifiedMessage: message, wasModified };
}
