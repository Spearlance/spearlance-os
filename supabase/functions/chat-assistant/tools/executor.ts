import type { ExecutorContext, FunctionCall } from './types.ts';
import { getClientInfo, assessAccountStatus } from './queries/client-info.ts';
import { getTasks, searchTasks, createGeneralTask, updateTask, createTaskFromSubmission, createEmailTask } from './queries/tasks.ts';
import { getSocialMediaPosts, getSocialPostAnalytics } from './queries/social.ts';
import { getWebsiteAnalytics, getChannelKPIs, getClarityMetrics, getSEOPerformance } from './queries/analytics.ts';
import { getPageAnalysis, getFormSubmissions, getReports, draftEmail } from './queries/content.ts';
import { getMeetings, searchMeetingNotes } from './queries/meetings.ts';
import { searchAssets, getServices, getAvatars, getMarketingTools, getMarketingChannels } from './queries/assets.ts';
import { getCommunicationLogs, getTickets } from './queries/communication.ts';
import { extractLaunchpadData, gatherGSOInputs } from './queries/launchpad.ts';
import { semanticSearch } from './queries/knowledge.ts';

// ─── Dispatch map ────────────────────────────────────────────────────────────
const TOOL_HANDLERS: Record<string, (ctx: ExecutorContext, args: any) => Promise<any>> = {
  // Client info
  get_client_info:       (ctx) => getClientInfo(ctx.supabase, ctx.clientId),
  assess_account_status: (ctx) => assessAccountStatus(ctx.supabase, ctx.clientId),

  // Form submissions & email
  get_form_submissions:       (ctx, args) => getFormSubmissions(ctx.supabase, args, ctx.clientId, ctx.userRole),
  draft_email:                (ctx, args) => draftEmail(ctx.supabase, args, ctx.clientId),
  create_email_task:          (ctx, args) => createEmailTask(ctx.supabase, args, ctx.clientId, ctx.userId),
  create_task_from_submission:(ctx, args) => createTaskFromSubmission(ctx.supabase, args, ctx.clientId, ctx.userId),

  // Tasks
  create_general_task: (ctx, args) => createGeneralTask(ctx.supabase, args, ctx.clientId, ctx.userId),
  get_tasks:           (ctx, args) => getTasks(ctx.supabase, args, ctx.clientId, ctx.userId),
  update_task:         (ctx, args) => updateTask(ctx.supabase, args, ctx.clientId, ctx.userId),
  search_tasks:        (ctx, args) => searchTasks(ctx.supabase, args, ctx.clientId, ctx.userRole),

  // Social media
  get_social_media_posts:   (ctx, args) => getSocialMediaPosts(ctx.supabase, args, ctx.clientId),
  get_social_post_analytics:(ctx, args) => getSocialPostAnalytics(ctx.supabase, args, ctx.clientId),

  // Analytics
  get_website_analytics: (ctx, args) => getWebsiteAnalytics(ctx.supabase, args, ctx.clientId),
  get_channel_kpis:      (ctx, args) => getChannelKPIs(ctx.supabase, args, ctx.clientId),
  get_clarity_metrics:   (ctx, args) => getClarityMetrics(ctx.supabase, args, ctx.clientId),
  get_seo_performance:   (ctx, args) => getSEOPerformance(ctx.supabase, args, ctx.clientId),

  // Content & pages
  get_page_analysis: (ctx, args) => getPageAnalysis(ctx.supabase, args, ctx.clientId),
  get_reports:       (ctx, args) => getReports(ctx.supabase, args, ctx.clientId),

  // Meetings
  get_meetings:        (ctx, args) => getMeetings(ctx.supabase, args, ctx.clientId),
  search_meeting_notes:(ctx, args) => searchMeetingNotes(ctx.supabase, args, ctx.clientId),

  // Assets & marketing
  get_services:          (ctx) => getServices(ctx.supabase, ctx.clientId),
  get_avatars:           (ctx) => getAvatars(ctx.supabase, ctx.clientId),
  get_marketing_tools:   (ctx) => getMarketingTools(ctx.supabase, ctx.clientId),
  get_marketing_channels:(ctx, args) => getMarketingChannels(ctx.supabase, args, ctx.clientId),
  search_assets:         (ctx, args) => searchAssets(ctx.supabase, args, ctx.clientId),

  // Communication & support
  get_tickets:           (ctx, args) => getTickets(ctx.supabase, args, ctx.clientId),
  get_communication_logs:(ctx, args) => getCommunicationLogs(ctx.supabase, args, ctx.clientId, ctx.userRole),

  // Launchpad / GSO
  gather_gso_inputs:    (ctx) => gatherGSOInputs(ctx.supabase, ctx.clientId),
  extract_launchpad_data:(ctx, args) => extractLaunchpadData(ctx.supabase, args, ctx.clientId, ctx.submissionId),

  // Knowledge / semantic search
  semantic_search: (ctx, args) => semanticSearch(ctx.supabase, args, ctx.clientId),
};

// ─── Validation ──────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pre-execution validation. Mutates args in place (removes bad assignee_id,
 * adds _flagged_* hints). Returns null to proceed or an error string to skip.
 */
export function validateArgs(
  name: string,
  args: any,
  clientId: string,
  toolMessages: Array<{ role: string; content: string }>
): string | null {
  // assignee_id must never be the client_id
  if (
    (name === 'create_general_task' ||
     name === 'create_task_from_submission' ||
     name === 'create_email_task') &&
    args.assignee_id === clientId
  ) {
    console.error(`[Validation] AI incorrectly used client_id as assignee_id in ${name}`);
    console.log('[Validation] Removing assignee_id to default to current user');
    delete args.assignee_id;
  }

  // update_task requires a valid UUID task_id
  if (name === 'update_task') {
    if (!args.task_id) {
      console.error('[Validation] update_task called without task_id');
      return 'missing_task_id';
    }
    if (!UUID_REGEX.test(args.task_id)) {
      console.error('[Validation] Invalid task_id format:', args.task_id);
      return 'invalid_task_id_format';
    }
    // Warn (but don't block) if task_id wasn't in recent results
    const recentTaskIds = toolMessages
      .filter(m => m.role === 'tool')
      .flatMap(m => {
        try {
          const r = JSON.parse(m.content);
          return r.task_id ? [r.task_id] : (r.items?.map((t: any) => t.id) ?? []);
        } catch { return []; }
      });
    if (recentTaskIds.length > 0 && !recentTaskIds.includes(args.task_id)) {
      console.warn(`[Validation] AI using task_id ${args.task_id} not found in recent results`);
      args._flagged_task_id = true;
    }
  }

  // draft_email / create_email_task / create_task_from_submission require a valid UUID submission_id
  if (
    name === 'draft_email' ||
    name === 'create_email_task' ||
    name === 'create_task_from_submission'
  ) {
    if (!args.submission_id) {
      console.error(`[Validation] ${name} called without submission_id`);
      return 'missing_submission_id';
    }
    if (!UUID_REGEX.test(args.submission_id)) {
      console.error(`[Validation] Invalid submission_id format in ${name}:`, args.submission_id);
      return 'invalid_submission_id_format';
    }
    // Warn (but don't block) if submission_id wasn't in recent results
    const recentSubmissionIds = toolMessages
      .filter(m => m.role === 'tool')
      .flatMap(m => {
        try {
          const r = JSON.parse(m.content);
          return r.submissions?.map((s: any) => s.id) ?? [];
        } catch { return []; }
      });
    if (recentSubmissionIds.length > 0 && !recentSubmissionIds.includes(args.submission_id)) {
      console.warn(`[Validation] AI using submission_id ${args.submission_id} not found in recent results`);
      args._flagged_submission_id = true;
    }
  }

  return null; // proceed
}

// ─── Public executor ─────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  ctx: ExecutorContext,
  args: any
): Promise<any> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { error: `Unknown function: ${name}` };
  return handler(ctx, args);
}
