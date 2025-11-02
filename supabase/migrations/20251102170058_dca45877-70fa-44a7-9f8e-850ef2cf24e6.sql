-- Drop and recreate ALL foreign key constraints to profiles with SET NULL

-- Meetings
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_created_by_fkey;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_last_edited_by_fkey;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_last_edited_by_fkey 
  FOREIGN KEY (last_edited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_user_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_user_id_fkey 
  FOREIGN KEY (assignee_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_creator_user_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_creator_user_id_fkey 
  FOREIGN KEY (creator_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Tickets
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_owner_user_id_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_requester_user_id_fkey;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_requester_user_id_fkey 
  FOREIGN KEY (requester_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Reports
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_owner_user_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Clients
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_primary_contact_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_primary_contact_fkey 
  FOREIGN KEY (primary_contact_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Assets
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE public.assets ADD CONSTRAINT assets_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.asset_folders DROP CONSTRAINT IF EXISTS asset_folders_created_by_fkey;
ALTER TABLE public.asset_folders ADD CONSTRAINT asset_folders_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.asset_versions DROP CONSTRAINT IF EXISTS asset_versions_created_by_fkey;
ALTER TABLE public.asset_versions ADD CONSTRAINT asset_versions_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Communication & Competitors
ALTER TABLE public.communication_logs DROP CONSTRAINT IF EXISTS communication_logs_created_by_fkey;
ALTER TABLE public.communication_logs ADD CONSTRAINT communication_logs_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.competitors DROP CONSTRAINT IF EXISTS competitors_created_by_fkey;
ALTER TABLE public.competitors ADD CONSTRAINT competitors_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Marketing Flow
ALTER TABLE public.marketing_flows DROP CONSTRAINT IF EXISTS marketing_flows_created_by_fkey;
ALTER TABLE public.marketing_flows ADD CONSTRAINT marketing_flows_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_flow_channels DROP CONSTRAINT IF EXISTS marketing_flow_channels_created_by_fkey;
ALTER TABLE public.marketing_flow_channels ADD CONSTRAINT marketing_flow_channels_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_flow_channels DROP CONSTRAINT IF EXISTS marketing_flow_channels_assigned_to_fkey;
ALTER TABLE public.marketing_flow_channels ADD CONSTRAINT marketing_flow_channels_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_flow_channel_notes DROP CONSTRAINT IF EXISTS marketing_flow_channel_notes_created_by_fkey;
ALTER TABLE public.marketing_flow_channel_notes ADD CONSTRAINT marketing_flow_channel_notes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_flow_task_links DROP CONSTRAINT IF EXISTS marketing_flow_task_links_created_by_fkey;
ALTER TABLE public.marketing_flow_task_links ADD CONSTRAINT marketing_flow_task_links_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_flow_task_templates DROP CONSTRAINT IF EXISTS marketing_flow_task_templates_created_by_fkey;
ALTER TABLE public.marketing_flow_task_templates ADD CONSTRAINT marketing_flow_task_templates_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_tools DROP CONSTRAINT IF EXISTS marketing_tools_created_by_fkey;
ALTER TABLE public.marketing_tools ADD CONSTRAINT marketing_tools_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Goals & Recommendations
ALTER TABLE public.quarterly_goals DROP CONSTRAINT IF EXISTS quarterly_goals_created_by_fkey;
ALTER TABLE public.quarterly_goals ADD CONSTRAINT quarterly_goals_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.recommended_tools DROP CONSTRAINT IF EXISTS recommended_tools_created_by_fkey;
ALTER TABLE public.recommended_tools ADD CONSTRAINT recommended_tools_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Social Media
ALTER TABLE public.social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_created_by_fkey;
ALTER TABLE public.social_media_posts ADD CONSTRAINT social_media_posts_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.social_post_comments DROP CONSTRAINT IF EXISTS social_post_comments_user_id_fkey;
ALTER TABLE public.social_post_comments ADD CONSTRAINT social_post_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Page Analysis
ALTER TABLE public.page_content_analysis DROP CONSTRAINT IF EXISTS page_content_analysis_analyzed_by_fkey;
ALTER TABLE public.page_content_analysis ADD CONSTRAINT page_content_analysis_analyzed_by_fkey 
  FOREIGN KEY (analyzed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Ticket Messages & Task Comments
ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_author_user_id_fkey;
ALTER TABLE public.ticket_messages ADD CONSTRAINT ticket_messages_author_user_id_fkey 
  FOREIGN KEY (author_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.task_comments DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Special Cases
ALTER TABLE public.bug_reports DROP CONSTRAINT IF EXISTS bug_reports_denied_by_fkey;
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_denied_by_fkey 
  FOREIGN KEY (denied_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.client_team_invitations DROP CONSTRAINT IF EXISTS client_team_invitations_invited_by_fkey;
ALTER TABLE public.client_team_invitations ADD CONSTRAINT client_team_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.late_connection_invites DROP CONSTRAINT IF EXISTS late_connection_invites_inviter_user_id_fkey;
ALTER TABLE public.late_connection_invites ADD CONSTRAINT late_connection_invites_inviter_user_id_fkey 
  FOREIGN KEY (inviter_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.website_form_submissions DROP CONSTRAINT IF EXISTS website_form_submissions_assigned_to_fkey;
ALTER TABLE public.website_form_submissions ADD CONSTRAINT website_form_submissions_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;