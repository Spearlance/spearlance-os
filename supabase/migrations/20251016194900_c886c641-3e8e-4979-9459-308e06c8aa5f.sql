-- Create daily_action_plans table
CREATE TABLE daily_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- AI-generated content
  priority_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_summary TEXT,
  avatar_story TEXT,
  
  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_snapshot JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate plans per day
  UNIQUE(client_id, plan_date)
);

-- Enable RLS
ALTER TABLE daily_action_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view plans for accessible clients"
  ON daily_action_plans FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert plans for accessible clients"
  ON daily_action_plans FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

-- Index for efficient lookups
CREATE INDEX idx_daily_action_plans_client_date ON daily_action_plans(client_id, plan_date DESC);