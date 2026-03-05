import type { ToolDefinition } from './types.ts';

export const QUERY_TOOLS: ToolDefinition[] = [
  // ─── Client Info ───────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_client_info",
      description: "Get basic information about the current client including name, status, and activity counts",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "assess_account_status",
      description: "Get comprehensive account status including LaunchPad completion, setup progress, and readiness metrics for the current client",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },

  // ─── Form Submissions & Email ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_form_submissions",
      description: "Get website form submissions, leads, inquiries, and contact form data for the current client. USE THIS TOOL when users ask about: 'form submissions', 'leads', 'inquiries', 'contact requests', 'website forms', 'recent submissions', 'new leads', 'form fills', or anything related to people contacting through the website. Returns contact details, form content, submission times, and status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["unread", "read", "responded", "archived"],
            description: "Filter by submission status"
          },
          date_from: {
            type: "string",
            description: "Start date for filtering (ISO 8601 format). Defaults to 30 days ago if not provided."
          },
          date_to: {
            type: "string",
            description: "End date for filtering (ISO 8601 format). Defaults to now if not provided."
          },
          limit: {
            type: "number",
            description: "Maximum number of submissions to return (default: 50)"
          },
          offset: {
            type: "number",
            description: "Number of submissions to skip for pagination (default: 0)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "draft_email",
      description: "Generate a personalized follow-up email for a form submission/lead. This function is RESILIENT and works with partial data - it will draft something useful even if the email address is missing or project details are minimal. ALWAYS call this function when users want to draft emails. The response includes 'has_email' and 'has_details' flags - handle limitations naturally by presenting the draft and offering next steps. Use when users ask to 'create an email', 'draft a response', 'write to [name]', or 'follow up with [lead]'.",
      parameters: {
        type: "object",
        properties: {
          submission_id: {
            type: "string",
            description: "The ID of the form submission to respond to. CRITICAL: Only use submission_id values you have JUST retrieved from get_form_submissions. NEVER generate or guess submission IDs. If user says 'that lead' or 'that submission', extract the ID from your most recent get_form_submissions result. If you don't have it, call get_form_submissions first."
          },
          tone: {
            type: "string",
            enum: ["professional", "friendly", "urgent", "casual"],
            description: "Tone of the email (default: friendly)",
            default: "friendly"
          },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Optional: Specific points to address in the email (e.g., 'mention our recent kitchen remodel project', 'offer free consultation')"
          }
        },
        required: ["submission_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_email_task",
      description: "Create a task reminder to send a drafted email. Use this when users want to save an email draft as a to-do item. The task includes the complete email (subject, body, recipient) so the user has everything ready when they go to send it. Automatically assigns to the current user. ONLY use this when user explicitly asks to create a task for the email.",
      parameters: {
        type: "object",
        properties: {
          submission_id: {
            type: "string",
            description: "The form submission this email is responding to. CRITICAL: Must be a valid submission_id from a recent get_form_submissions call. Do not generate or guess IDs."
          },
          email_subject: {
            type: "string",
            description: "The subject line of the drafted email"
          },
          email_body: {
            type: "string",
            description: "The complete body text of the email"
          },
          recipient_email: {
            type: "string",
            description: "Email address to send to"
          },
          recipient_name: {
            type: "string",
            description: "Name of the recipient"
          },
          due_date: {
            type: "string",
            format: "date",
            description: "Optional: When to send the email (defaults to today)"
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Task priority (default: normal)",
            default: "normal"
          }
        },
        required: ["submission_id", "email_subject", "email_body", "recipient_email", "recipient_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task_from_submission",
      description: "Create a task directly linked to an existing form submission record in the database. ONLY use this tool when you have retrieved an actual submission_id from get_form_submissions. Do NOT use this for general task creation requests, even if the user mentions leads or form submissions - use create_general_task instead.",
      parameters: {
        type: "object",
        properties: {
          submission_id: {
            type: "string",
            description: "The form submission to create a task for. CRITICAL: Must be a valid submission_id from a recent get_form_submissions call. If user references 'that submission' or 'that lead', extract from your most recent get_form_submissions result. If unknown, call get_form_submissions first."
          },
          title: {
            type: "string",
            description: "Optional: Custom task title (auto-generated if not provided)"
          },
          due_date: {
            type: "string",
            format: "date",
            description: "Optional: When the task should be completed (defaults to 2 business days)"
          },
          assignee_id: {
            type: "string",
            description: "Optional: User to assign the task to (defaults to current user)"
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Task priority (default: normal)",
            default: "normal"
          },
          notes: {
            type: "string",
            description: "Optional: Additional context or instructions for the task"
          }
        },
        required: ["submission_id"]
      }
    }
  },

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_general_task",
      description: "CREATE TASKS INSTANTLY - This is your GO-TO tool for ALL task creation requests. Use this IMMEDIATELY when users say 'create a task', 'remind me', 'add to my list', 'I need to', etc. DO NOT search for submissions or people first - just create the task with whatever details they provide! You can include names, context, and specifics in the title and description fields. Examples: 'Create a task to follow up with John', 'Remind me to call that lead', 'Add a task to review Q4 budget', 'I need to contact Sarah about the proposal'. Default to tomorrow for due_date if not specified.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The task title/name. Be clear and actionable (e.g., 'Review Q4 marketing budget' not just 'Budget')"
          },
          description: {
            type: "string",
            description: "Optional: Detailed description, notes, or instructions for the task"
          },
          due_date: {
            type: "string",
            format: "date",
            description: "Optional: When the task should be completed (YYYY-MM-DD format). Defaults to tomorrow if not provided."
          },
          assignee_id: {
            type: "string",
            description: "Optional: User ID (from profiles table) to assign the task to. IMPORTANT: Only provide this if you have explicitly retrieved a user_id using get_team_members or similar function. NEVER use client_id here. If user says 'remind me' or 'for me', OMIT this field entirely to default to current user."
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Task priority level (default: normal)",
            default: "normal"
          },
          status: {
            type: "string",
            enum: ["to_do", "in_progress", "done"],
            description: "Initial task status (default: to_do)",
            default: "to_do"
          }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Search and retrieve tasks for the current client. Use this when users ask about their tasks, task status, assignments, or need to find specific tasks. Examples: 'What tasks do I have?', 'Show high priority tasks', 'Find tasks assigned to John', 'What's overdue?', 'Search for budget tasks'. Returns detailed task information including assignees, due dates, status, and priority.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["to_do", "in_progress", "done"],
            description: "Filter by task status"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filter by task priority"
          },
          assignee_id: {
            type: "string",
            description: "Filter by assigned user ID (use with get_team_members to find user IDs)"
          },
          assigned_to_me: {
            type: "boolean",
            description: "Show only tasks assigned to the current user (shortcut filter)"
          },
          keyword: {
            type: "string",
            description: "Search for keyword in task title or description"
          },
          due_date_from: {
            type: "string",
            format: "date",
            description: "Filter tasks due on or after this date (YYYY-MM-DD)"
          },
          due_date_to: {
            type: "string",
            format: "date",
            description: "Filter tasks due on or before this date (YYYY-MM-DD)"
          },
          overdue: {
            type: "boolean",
            description: "Show only overdue tasks (past due date and not done)"
          },
          limit: {
            type: "number",
            description: "Maximum number of tasks to return (default: 20, max: 50)"
          },
          offset: {
            type: "number",
            description: "Number of tasks to skip for pagination (default: 0)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task's details. Use this when users want to modify a task they've already created or found. Examples: 'Change the due date of task X to next Friday', 'Mark the budget task as done', 'Assign the website task to Sarah', 'Change priority to high'. You must first use get_tasks to find the task_id before updating.",
      parameters: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "The UUID of the task to update (get this from get_tasks first)"
          },
          title: {
            type: "string",
            description: "Optional: New task title"
          },
          description: {
            type: "string",
            description: "Optional: New task description or notes"
          },
          due_date: {
            type: "string",
            format: "date",
            description: "Optional: New due date (YYYY-MM-DD format)"
          },
          assignee_id: {
            type: "string",
            description: "Optional: New assignee user ID (get from get_team_members)"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Optional: New priority level"
          },
          status: {
            type: "string",
            enum: ["to_do", "in_progress", "done"],
            description: "Optional: New task status (use 'done' to mark complete)"
          }
        },
        required: ["task_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description: "Search and filter tasks for the current client",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["to_do", "in_progress", "done"], description: "Filter by task status" },
          priority: { type: "string", enum: ["low", "normal", "high"], description: "Filter by priority" },
          due_date_from: { type: "string", format: "date", description: "Filter tasks due on or after this date" },
          due_date_to: { type: "string", format: "date", description: "Filter tasks due on or before this date" },
          assignee_user_id: { type: "string", format: "uuid", description: "Filter by assignee user ID" },
          limit: { type: "number", description: "Number of results to return (max 50)", default: 20 },
          offset: { type: "number", description: "Offset for pagination", default: 0 }
        }
      }
    }
  },

  // ─── Social Media ───────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_social_media_posts",
      description: "Get social media posts from the content calendar. Use this to review posting schedule, content topics, and identify gaps or errors. Returns post details, status, platforms, scheduling info, and error flags.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "scheduled", "posted", "published", "failed"],
            description: "Filter by post status"
          },
          platform: {
            type: "string",
            enum: ["facebook", "instagram", "linkedin", "twitter"],
            description: "Filter by specific platform"
          },
          topic_category: {
            type: "string",
            description: "Filter by topic category"
          },
          date_from: {
            type: "string",
            format: "date",
            description: "Filter posts from this date (ISO format YYYY-MM-DD)"
          },
          date_to: {
            type: "string",
            format: "date",
            description: "Filter posts to this date (ISO format YYYY-MM-DD)"
          },
          limit: {
            type: "number",
            description: "Number of results (max 50)",
            default: 20
          },
          offset: {
            type: "number",
            description: "Offset for pagination",
            default: 0
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_social_post_analytics",
      description: "Get performance analytics for published social media posts. Use this to identify top-performing content, analyze engagement trends, and compare platform performance. Returns impressions, reach, engagement rates, likes, comments, shares, and post context.",
      parameters: {
        type: "object",
        properties: {
          post_id: {
            type: "string",
            description: "Get analytics for specific post (optional)"
          },
          platform: {
            type: "string",
            enum: ["facebook", "instagram", "linkedin", "twitter"],
            description: "Filter by platform"
          },
          date_from: {
            type: "string",
            format: "date",
            description: "Filter posts from this date (ISO format YYYY-MM-DD)"
          },
          date_to: {
            type: "string",
            format: "date",
            description: "Filter posts to this date (ISO format YYYY-MM-DD)"
          },
          sort_by: {
            type: "string",
            enum: ["published_at", "impressions", "engagement", "reach", "likes"],
            description: "Sort results by metric (default: published_at)",
            default: "published_at"
          },
          limit: {
            type: "number",
            description: "Number of results (max 50)",
            default: 20
          },
          offset: {
            type: "number",
            description: "Offset for pagination",
            default: 0
          }
        }
      }
    }
  },

  // ─── Analytics ──────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_website_analytics",
      description: "Get website traffic, visitor, and conversion analytics. Use this for overall site performance, page popularity, traffic sources, and content effectiveness. Supports different metric types: overview (summary), pages (top pages), sources (traffic sources), content (content performance).",
      parameters: {
        type: "object",
        properties: {
          metric_type: {
            type: "string",
            enum: ["overview", "pages", "sources", "content"],
            description: "Type of analytics to retrieve",
            default: "overview"
          },
          date_from: {
            type: "string",
            format: "date",
            description: "Start date for analytics (ISO format YYYY-MM-DD). Defaults to 30 days ago."
          },
          date_to: {
            type: "string",
            format: "date",
            description: "End date for analytics (ISO format YYYY-MM-DD). Defaults to today."
          },
          limit: {
            type: "number",
            description: "Number of results for pages/sources/content (max 50)",
            default: 20
          },
          offset: {
            type: "number",
            description: "Offset for pagination",
            default: 0
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_channel_kpis",
      description: "Get weekly marketing channel KPI data with trend analysis. Use this to analyze channel performance, identify declining metrics, and spot opportunities. Returns KPI data for channels like Google Ads, Facebook Ads, Email, etc. with week-over-week trends and alerts for significant changes. Perfect for performance reviews, reporting, and identifying issues.",
      parameters: {
        type: "object",
        properties: {
          channel_id: {
            type: "string",
            description: "Filter to a specific channel ID (optional - omit to get all channels)"
          },
          weeks: {
            type: "number",
            description: "Number of weeks of data to retrieve (default: 4, max: 12)",
            default: 4
          },
          date_from: {
            type: "string",
            format: "date",
            description: "Start date for filtering (ISO format YYYY-MM-DD)"
          },
          date_to: {
            type: "string",
            format: "date",
            description: "End date for filtering (ISO format YYYY-MM-DD)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_clarity_metrics",
      description: "Get Microsoft Clarity website analytics data including sessions, users, engagement, and behavioral metrics. Use this to understand website performance, identify UX issues (rage clicks, dead clicks, quick backs), and track visitor trends. Alerts on problematic user behaviors that may indicate website issues.",
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            format: "date",
            description: "Start date (ISO format YYYY-MM-DD). Defaults to 30 days ago."
          },
          date_to: {
            type: "string",
            format: "date",
            description: "End date (ISO format YYYY-MM-DD). Defaults to today."
          },
          metric_type: {
            type: "string",
            enum: ["overview", "behavioral", "timeline"],
            description: "Type of metrics to retrieve. 'overview' for summary stats, 'behavioral' for UX issues, 'timeline' for daily data.",
            default: "overview"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_seo_performance",
      description: "Get SEO performance data including visibility scores, keyword rankings, and position trends. Use this to review search engine visibility, identify keywords gaining or losing position, and spot SEO issues. Compares to previous report for trend analysis and alerts on significant ranking changes.",
      parameters: {
        type: "object",
        properties: {
          include_keywords: {
            type: "boolean",
            description: "Include individual keyword rankings (default: true)",
            default: true
          },
          limit: {
            type: "number",
            description: "Number of keywords to return (default: 20, max: 50)",
            default: 20
          },
          sort_by: {
            type: "string",
            enum: ["position", "position_change", "keyword"],
            description: "How to sort keywords. 'position' for best rankings first, 'position_change' for biggest movers first.",
            default: "position"
          }
        }
      }
    }
  },

  // ─── Content & Pages ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_page_analysis",
      description: "Get SEO and content quality analysis for website pages. Use this to identify pages needing optimization, review content scores, and get specific improvement recommendations. Returns overall scores, clarity/tone/brevity breakdowns, avatar alignment, strengths, weaknesses, and actionable recommendations.",
      parameters: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "Get analysis for specific page (optional)"
          },
          min_score: {
            type: "number",
            description: "Filter pages with score >= this value (0-100)",
            minimum: 0,
            maximum: 100
          },
          max_score: {
            type: "number",
            description: "Filter pages with score <= this value (0-100)",
            minimum: 0,
            maximum: 100
          },
          limit: {
            type: "number",
            description: "Number of results (max 50)",
            default: 20
          },
          offset: {
            type: "number",
            description: "Offset for pagination",
            default: 0
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_reports",
      description: "Get reports for the current client",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Active", "Archived"], description: "Filter by report status" },
          tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
          date_from: { type: "string", format: "date", description: "Filter reports from this date" },
          date_to: { type: "string", format: "date", description: "Filter reports to this date" },
          limit: { type: "number", description: "Number of results (max 50)", default: 20 },
          offset: { type: "number", description: "Offset for pagination", default: 0 }
        }
      }
    }
  },

  // ─── Meetings ───────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_meetings",
      description: "Retrieve meetings for the current client with optional filters",
      parameters: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "ISO date string for start date filter" },
          date_to: { type: "string", description: "ISO date string for end date filter" },
          status: { type: "string", enum: ["scheduled", "completed", "cancelled"], description: "Filter by meeting status" },
          limit: { type: "number", description: "Max results to return (default 50)" },
          offset: { type: "number", description: "Offset for pagination" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_meeting_notes",
      description: "Search across meeting summaries, decisions, and next steps for specific content",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query string" },
          limit: { type: "number", description: "Max results (default 20)" }
        },
        required: ["query"]
      }
    }
  },

  // ─── Assets & Marketing ─────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_services",
      description: "Get all services for the current client",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_avatars",
      description: "Get customer avatars (buyer personas) for the current client",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_marketing_tools",
      description: "Get marketing tools being used by the current client",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_marketing_channels",
      description: "Get marketing flow channels for the current client",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Filter by stage name (Attract, Engage, Convert, Close, Retain and Reactivate)" },
          ownership: { type: "string", enum: ["agency", "client"], description: "Filter by ownership" },
          limit: { type: "number", description: "Number of results (max 50)", default: 50 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_assets",
      description: "Search the asset library for the current client",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for asset titles or tags" },
          limit: { type: "number", description: "Number of results (max 50)", default: 20 },
          offset: { type: "number", description: "Offset for pagination", default: 0 }
        }
      }
    }
  },

  // ─── Communication & Support ─────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_tickets",
      description: "Get support tickets for the current client",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"], description: "Filter by ticket status" },
          limit: { type: "number", description: "Number of results (max 50)", default: 20 },
          offset: { type: "number", description: "Offset for pagination", default: 0 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_communication_logs",
      description: "Search email conversations, calls, and communication logs for the current client. Returns conversation subjects, participants, timestamps, AND the actual message content from recent exchanges. Use this when users reference specific conversations, emails, or discussions. The message preview includes the last few messages in the thread.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for subject line, internal notes, or message content" },
          status: { type: "string", enum: ["active", "archived"], description: "Filter by conversation status" },
          tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
          date_from: { type: "string", format: "date-time", description: "Filter conversations from this date (ISO 8601)" },
          date_to: { type: "string", format: "date-time", description: "Filter conversations to this date (ISO 8601)" },
          limit: { type: "number", description: "Number of results (max 50)", default: 20 },
          offset: { type: "number", description: "Offset for pagination", default: 0 }
        }
      }
    }
  },

  // ─── GSO / Offer ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "gather_gso_inputs",
      description: "Pull all client data needed to build a Complete Offer (avatars, services, proof, assets, economics, existing marketing ideas). Call this when user requests to build an offer, campaign, or pricing strategy. Returns avatars, services, channels, reports, client info, and past marketing ideas including Complete Offers.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
];

export const LAUNCHPAD_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "extract_launchpad_data",
      description: "Extract and save structured Launchpad onboarding data from user's natural language responses. Call this after every 2-3 meaningful user messages to persist data progressively.",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            enum: ["discovery", "marketing", "avatar"],
            description: "Current onboarding stage"
          },
          data: {
            type: "object",
            description: "Extracted structured data matching the stage schema (company info, services, goals, etc.)"
          },
          completeness: {
            type: "number",
            description: "Percentage complete for this stage (0-100)",
            minimum: 0,
            maximum: 100
          }
        },
        required: ["stage", "data", "completeness"]
      }
    }
  },
];

export function getToolsForMode(mode: 'default' | 'offer' | 'launchpad'): ToolDefinition[] {
  if (mode === 'launchpad') return [...QUERY_TOOLS, ...LAUNCHPAD_TOOLS];
  return QUERY_TOOLS;
}

// Compile-time duplicate detection
const allNames = [...QUERY_TOOLS, ...LAUNCHPAD_TOOLS].map(t => t.function.name);
const dupes = allNames.filter((n, i) => allNames.indexOf(n) !== i);
if (dupes.length > 0) throw new Error(`DUPLICATE TOOL NAMES DETECTED: ${dupes.join(', ')}`);
