-- Add CASCADE delete to all foreign keys referencing clients table
-- This allows client deletion to automatically clean up all related records

-- Drop and recreate foreign keys with ON DELETE CASCADE

-- asset_folders
ALTER TABLE public.asset_folders 
DROP CONSTRAINT IF EXISTS asset_folders_client_id_fkey;

ALTER TABLE public.asset_folders
ADD CONSTRAINT asset_folders_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- assets
ALTER TABLE public.assets 
DROP CONSTRAINT IF EXISTS assets_client_id_fkey;

ALTER TABLE public.assets
ADD CONSTRAINT assets_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- communication_logs
ALTER TABLE public.communication_logs 
DROP CONSTRAINT IF EXISTS communication_logs_client_id_fkey;

ALTER TABLE public.communication_logs
ADD CONSTRAINT communication_logs_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- competitors
ALTER TABLE public.competitors 
DROP CONSTRAINT IF EXISTS competitors_client_id_fkey;

ALTER TABLE public.competitors
ADD CONSTRAINT competitors_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- daily_action_plans
ALTER TABLE public.daily_action_plans 
DROP CONSTRAINT IF EXISTS daily_action_plans_client_id_fkey;

ALTER TABLE public.daily_action_plans
ADD CONSTRAINT daily_action_plans_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- late_profiles
ALTER TABLE public.late_profiles 
DROP CONSTRAINT IF EXISTS late_profiles_client_id_fkey;

ALTER TABLE public.late_profiles
ADD CONSTRAINT late_profiles_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- leads
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_client_id_fkey;

ALTER TABLE public.leads
ADD CONSTRAINT leads_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- marketing_tools
ALTER TABLE public.marketing_tools 
DROP CONSTRAINT IF EXISTS marketing_tools_client_id_fkey;

ALTER TABLE public.marketing_tools
ADD CONSTRAINT marketing_tools_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- mood_boards
ALTER TABLE public.mood_boards 
DROP CONSTRAINT IF EXISTS mood_boards_client_id_fkey;

ALTER TABLE public.mood_boards
ADD CONSTRAINT mood_boards_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- quarterly_goals
ALTER TABLE public.quarterly_goals 
DROP CONSTRAINT IF EXISTS quarterly_goals_client_id_fkey;

ALTER TABLE public.quarterly_goals
ADD CONSTRAINT quarterly_goals_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- reports
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_client_id_fkey;

ALTER TABLE public.reports
ADD CONSTRAINT reports_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- services
ALTER TABLE public.services 
DROP CONSTRAINT IF EXISTS services_client_id_fkey;

ALTER TABLE public.services
ADD CONSTRAINT services_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- social_media_generation_batches
ALTER TABLE public.social_media_generation_batches 
DROP CONSTRAINT IF EXISTS social_media_generation_batches_client_id_fkey;

ALTER TABLE public.social_media_generation_batches
ADD CONSTRAINT social_media_generation_batches_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- tasks
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- tickets
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_client_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- website_form_submissions (SET NULL since it's optional)
ALTER TABLE public.website_form_submissions 
DROP CONSTRAINT IF EXISTS website_form_submissions_client_id_fkey;

ALTER TABLE public.website_form_submissions
ADD CONSTRAINT website_form_submissions_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- Additional tables that may reference clients

-- brand_guides (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_guides') THEN
        ALTER TABLE public.brand_guides DROP CONSTRAINT IF EXISTS brand_guides_client_id_fkey;
        ALTER TABLE public.brand_guides ADD CONSTRAINT brand_guides_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- social_media_posts (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_posts') THEN
        ALTER TABLE public.social_media_posts DROP CONSTRAINT IF EXISTS social_media_posts_client_id_fkey;
        ALTER TABLE public.social_media_posts ADD CONSTRAINT social_media_posts_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- marketing_flows (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_flows') THEN
        ALTER TABLE public.marketing_flows DROP CONSTRAINT IF EXISTS marketing_flows_client_id_fkey;
        ALTER TABLE public.marketing_flows ADD CONSTRAINT marketing_flows_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;