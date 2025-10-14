-- Phase 1: Database Foundation & Schema Changes

-- 1.1 Extend clients table with self-service account columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'managed' 
  CHECK (account_type IN ('managed', 'self_service'));

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS trial_start_date timestamptz;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing' 
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused'));

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS company_name text;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clients_trial_end 
  ON clients(trial_end_date) 
  WHERE account_type = 'self_service';

CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer 
  ON clients(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_clients_account_type 
  ON clients(account_type);

-- 1.2 Create subscription_pricing table
CREATE TABLE IF NOT EXISTS subscription_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_plan_id uuid REFERENCES billing_plans(id) ON DELETE CASCADE,
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  price_amount numeric NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  currency text DEFAULT 'usd',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription_pricing
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active pricing
CREATE POLICY "Anyone can view active pricing"
ON subscription_pricing FOR SELECT
TO authenticated
USING (is_active = true);

-- Insert Self-Service billing plan
INSERT INTO billing_plans (name, price_monthly, features, is_portal_only)
VALUES (
  'Self-Service Starter',
  99.00,
  ARRAY[
    'Full LaunchPad Access',
    'Task Management',
    'Asset Library',
    'Avatar Builder',
    'Marketing Flowchart & Ideas',
    'Team Collaboration',
    'Reports & Analytics',
    '90-Day Free Trial'
  ],
  true
)
ON CONFLICT DO NOTHING;

-- Insert the two price points with actual Stripe Price IDs
INSERT INTO subscription_pricing (billing_plan_id, interval, price_amount, stripe_price_id)
VALUES 
  (
    (SELECT id FROM billing_plans WHERE name = 'Self-Service Starter' LIMIT 1), 
    'month', 
    99.00, 
    'price_1AbCdEfGhIjKlMnO'
  ),
  (
    (SELECT id FROM billing_plans WHERE name = 'Self-Service Starter' LIMIT 1), 
    'year', 
    499.00, 
    'price_1XyZaBcDeFgHiJkL'
  )
ON CONFLICT (stripe_price_id) DO NOTHING;

-- 1.3 Create client_team_invitations table
CREATE TABLE IF NOT EXISTS client_team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES profiles(id) NOT NULL,
  role app_role DEFAULT 'client',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON client_team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_client ON client_team_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON client_team_invitations(status);

ALTER TABLE client_team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their clients"
ON client_team_invitations FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create invitations for their clients"
ON client_team_invitations FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update invitations for their clients"
ON client_team_invitations FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- 1.4 Create client_activity_metrics table
CREATE TABLE IF NOT EXISTS client_activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  metric_date date NOT NULL,
  
  -- LaunchPad engagement
  launchpad_completion_percentage numeric DEFAULT 0,
  launchpad_stages_completed integer DEFAULT 0,
  
  -- Marketing activity
  marketing_channels_created integer DEFAULT 0,
  marketing_ideas_created integer DEFAULT 0,
  flowchart_views integer DEFAULT 0,
  
  -- Task activity
  tasks_created integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  
  -- Asset usage
  assets_uploaded integer DEFAULT 0,
  folders_created integer DEFAULT 0,
  
  -- Avatar engagement
  avatars_created integer DEFAULT 0,
  avatar_evidence_added integer DEFAULT 0,
  
  -- Team collaboration
  team_members_count integer DEFAULT 0,
  meetings_logged integer DEFAULT 0,
  
  -- Overall engagement score (0-100)
  engagement_score numeric DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(client_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_activity_metrics_client ON client_activity_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_metrics_date ON client_activity_metrics(metric_date);

ALTER TABLE client_activity_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all metrics"
ON client_activity_metrics FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 1.5 Set up pg_cron for trial expiration checks
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily check at 10 AM UTC
SELECT cron.schedule(
  'check-trial-expirations-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://hrmhqybdsdngsvhjqwma.supabase.co/functions/v1/check-trial-expirations',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybWhxeWJkc2RuZ3N2aGpxd21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTk2NjcsImV4cCI6MjA3NTY5NTY2N30.STwk-iXJ1_UqNUOYTXZrsMb-TN3pRraXcJNlBcOld1s"}'::jsonb
  ) as request_id;
  $$
);