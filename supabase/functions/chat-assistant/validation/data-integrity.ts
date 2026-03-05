/**
 * Post-execution data-integrity validation for chat-assistant.
 * Extracted from index.ts lines 6418–6700.
 *
 * Validates that function execution results are consistent with the claims
 * made in the assistant message and corrects the message when they are not.
 */

import type { FunctionCall } from './hallucination.ts';

export type { FunctionCall };

export interface FunctionResult {
  called: boolean;
  succeeded: boolean;
  error: string | null;
  data?: any;
}

const POST_EXECUTION_PATTERNS = [
  {
    name: 'Task Creation Claims',
    triggers: [
      /✅\s*done[!]?/i,
      /task\s+(is\s+)?(created|set|ready)/i,
      /i've\s+(created|set up|added)\s+(?:a\s+)?task/i,
      /'[^']+'\s+is\s+on\s+your\s+task\s+list/i,
    ],
    requiredFunction: 'create_general_task',
    errorMessage:
      'AI claimed task creation without calling create_general_task or function failed',
  },
  {
    name: 'Email Task Claims',
    triggers: [
      /email\s+task\s+(created|ready)/i,
      /i've\s+(created|set up)\s+an?\s+email\s+task/i,
    ],
    requiredFunction: 'create_email_task',
    errorMessage:
      'AI claimed email task creation without calling create_email_task or function failed',
  },
  {
    name: 'Task Update Claims',
    triggers: [
      /task\s+(?:has\s+been\s+)?updated/i,
      /i've\s+updated\s+the\s+task/i,
    ],
    requiredFunction: 'update_task',
    errorMessage:
      'AI claimed task update without calling update_task or function failed',
  },
  {
    name: 'Email Draft Claims',
    triggers: [
      /here'?s?\s+(?:a|the)\s+(?:draft|email)/i,
      /email\s+(?:draft\s+)?(?:is\s+)?ready/i,
      /(?:subject|to):\s*[^\n]+/i, // Email formatting detected
    ],
    requiredFunction: 'draft_email',
    errorMessage:
      'AI claimed email draft without calling draft_email or function failed',
  },
  {
    name: 'Submission Task Claims',
    triggers: [
      /task.*submission\s+(?:is\s+)?created/i,
      /created.*task.*submission/i,
    ],
    requiredFunction: 'create_task_from_submission',
    errorMessage:
      'AI claimed submission task creation without calling create_task_from_submission or function failed',
  },
  {
    name: 'Task Update Claims (emoji)',
    triggers: [
      /(?:✅|✓|done!).*(?:assigned|updated|changed).*task/i,
      /task.*(?:assigned|updated|changed)/i,
    ],
    requiredFunction: 'update_task',
    errorMessage:
      'AI claimed task update without calling update_task or function failed',
  },
];

const DATA_FUNCTIONS = [
  'get_form_submissions',
  'get_tickets',
  'get_meetings',
  'get_tasks',
  'search_tasks',
  'get_social_media_posts',
  'get_communication_logs',
];

const SUBMISSION_FUNCTIONS = [
  'draft_email',
  'create_email_task',
  'create_task_from_submission',
];

/**
 * Validates post-execution state:
 *   1. Checks update_task / submission function failures and patches message
 *   2. Re-checks hallucination patterns against actual function results
 *   3. Validates data retrieval success and count accuracy
 *
 * Returns warnings and a (potentially modified) message.
 * Database logging is intentionally omitted — callers handle persistence.
 */
export function validatePostExecution(
  assistantMessage: string,
  functionResults: Record<string, FunctionResult>,
  functionCallsArray: FunctionCall[],
  toolMessages: any[],
): { warnings: string[]; modifiedMessage: string } {
  console.log(
    '[Post-Execution Validation] Checking function execution results...',
  );

  const warnings: string[] = [];
  let message = assistantMessage;

  // ------------------------------------------------------------------
  // 1. update_task failure: task not found
  // ------------------------------------------------------------------
  if (
    functionResults['update_task']?.called &&
    !functionResults['update_task']?.succeeded
  ) {
    const errorMsg = functionResults['update_task']?.error || '';

    if (errorMsg.includes('Task not found')) {
      console.error('[Validation] update_task failed - task not found');

      message = message.replace(
        /(?:✅|✓|Done!).*(?:assigned|updated|changed).*task/gi,
        '',
      );
      message +=
        `\n\n⚠️ I wasn't able to update that task because I couldn't find it in the system. ` +
        `When you refer to "that task" or "the task", I need to have just created it or retrieved it. ` +
        `Would you like me to show your recent tasks first so I can update the correct one?`;
    }
  }

  // ------------------------------------------------------------------
  // 2. Submission-related function failures: submission not found
  // ------------------------------------------------------------------
  for (const funcName of SUBMISSION_FUNCTIONS) {
    if (
      functionResults[funcName]?.called &&
      !functionResults[funcName]?.succeeded
    ) {
      const errorMsg = functionResults[funcName]?.error || '';

      if (errorMsg.includes('Submission not found')) {
        console.error(`[Validation] ${funcName} failed - submission not found`);

        message = message.replace(
          /(?:✅|✓|Done!|Here's).*(?:email|draft|task).*(?:for|to|about).*(?:submission|lead)/gi,
          '',
        );
        message = message.replace(
          /Subject:.*\n.*To:.*\n/gs,
          '',
        );

        message +=
          `\n\n⚠️ I wasn't able to process that submission because I couldn't find it in the system. ` +
          `When you refer to "that lead" or "that submission", I need to have just retrieved it. ` +
          `Would you like me to show your recent form submissions first?`;
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. Pattern-based re-check against actual function results
  // ------------------------------------------------------------------
  for (const pattern of POST_EXECUTION_PATTERNS) {
    const messageMatchesPattern = pattern.triggers.some(trigger =>
      trigger.test(message)
    );

    if (messageMatchesPattern) {
      const functionSucceeded =
        functionResults[pattern.requiredFunction]?.succeeded === true;
      const functionError =
        functionResults[pattern.requiredFunction]?.error;

      if (!functionSucceeded && functionError) {
        console.error(
          `[Post-Execution Validation] FUNCTION FAILURE: ${pattern.name} - ${functionError}`,
        );
        warnings.push(`${pattern.requiredFunction} failed: ${functionError}`);

        // Remove false success claims
        message = message.replace(
          /(?:✅|📋)?\s*(?:done!?|task\s+(?:is\s+)?(?:created|set|ready|updated))[.!]?\s*/gi,
          '',
        );
        message = message.replace(
          /(?:i've|i have)\s+(?:created|set up|added|updated)[^.!]+[.!]/gi,
          '',
        );
        message = message.replace(
          /'[^']+'\s+is\s+on\s+your\s+task\s+list[.!]?/gi,
          '',
        );

        if (!message.includes('encountered an issue')) {
          message += `\n\n⚠️ I encountered an issue: ${functionError}`;

          if (pattern.requiredFunction === 'draft_email') {
            if (functionError.includes('submission not found')) {
              message +=
                '\n\nI need a valid form submission ID to draft an email. Try asking me to "show recent leads" first.';
            } else if (functionError.includes('no email')) {
              message +=
                "\n\nThis submission doesn't have an email address on file.";
            }
          } else if (pattern.requiredFunction === 'create_general_task') {
            if (
              functionError.toLowerCase().includes('invalid input value') ||
              functionError.toLowerCase().includes('enum')
            ) {
              message +=
                '\n\nValid priorities are: low, normal, high, urgent. Let me know which you prefer.';
            }
          } else if (DATA_FUNCTIONS.includes(pattern.requiredFunction)) {
            message +=
              '\n\nTry refining your search criteria or check if you have permission to access this data.';
          } else if (
            functionError.toLowerCase().includes('invalid input value') ||
            functionError.toLowerCase().includes('enum')
          ) {
            message +=
              '\n\nIt looks like there was an issue with the value provided. Let me help you with the correct options.';
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.error('[Post-Execution Validation] FAILURES DETECTED:', warnings);
  } else {
    console.log('[Post-Execution Validation] ✓ All functions succeeded');
  }

  // ------------------------------------------------------------------
  // 4. Data retrieval success + count accuracy
  // ------------------------------------------------------------------
  const dataFunctionCalled = functionCallsArray.some(fc =>
    DATA_FUNCTIONS.includes(fc.name)
  );

  if (dataFunctionCalled) {
    const failedDataFunctions = DATA_FUNCTIONS.filter(fname =>
      functionResults[fname]?.called && !functionResults[fname]?.succeeded
    );

    if (failedDataFunctions.length > 0) {
      console.error(
        '[Data Validation] Data retrieval failed:',
        failedDataFunctions,
      );

      message = message.replace(
        /(?:here (?:are|is)|found)\s+\d+\s+[^.!]+[.!]/gi,
        '',
      );
      message = message.replace(/📨.*?(?=\n\n|$)/gs, '');
      message = message.replace(/🆕.*?(?=\n\n|$)/gs, '');

      const errorMsg =
        functionResults[failedDataFunctions[0]]?.error || 'Unknown error';
      if (!message.includes("couldn't retrieve")) {
        message += `\n\n⚠️ I couldn't retrieve that data: ${errorMsg}`;
      }
    } else {
      // Count accuracy check
      const claimedCountMatch = message.match(
        /(?:found|showing|here (?:are|is))\s+(\d+)/i,
      );

      if (claimedCountMatch) {
        const claimedCount = parseInt(claimedCountMatch[1]);

        for (const fname of DATA_FUNCTIONS) {
          if (functionResults[fname]?.succeeded) {
            try {
              const resultData = functionResults[fname]?.data;

              if (resultData) {
                const actualCount =
                  resultData.items?.length ||
                  resultData.submissions?.length ||
                  resultData.tickets?.length ||
                  resultData.tasks?.length ||
                  resultData.meetings?.length ||
                  resultData.posts?.length ||
                  resultData.logs?.length ||
                  0;

                if (actualCount === 0 && claimedCount > 0) {
                  console.error(
                    `[Data Validation] Count mismatch: Claimed ${claimedCount}, found 0`,
                  );
                  message = message.replace(
                    /(?:here (?:are|is)|found)\s+\d+\s+[^.!]+[.!]/gi,
                    `I searched but didn't find any matching items.`,
                  );
                  message = message.replace(/📨.*?(?=\n\n|$)/gs, '');
                  message = message.replace(/🆕.*?(?=\n\n|$)/gs, '');
                } else if (Math.abs(actualCount - claimedCount) > 2) {
                  // Allow small differences for "showing top X" scenarios
                  console.warn(
                    `[Data Validation] Significant count mismatch: Claimed ${claimedCount}, actual ${actualCount}`,
                  );
                } else {
                  console.log(
                    `[Data Validation] ✓ Count verified: ${actualCount} items`,
                  );
                }
              }
            } catch (e) {
              console.error('[Data Validation] Error checking count:', e);
            }
            break;
          }
        }
      }
    }
  }

  return { warnings, modifiedMessage: message };
}
