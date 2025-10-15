-- Create quarterly_goals table for tracking goals over time
CREATE TABLE quarterly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL,
  goal_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'achieved', 'failed', 'carried_over')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(client_id, quarter, year, goal_text)
);

-- Index for efficient querying by client and time period
CREATE INDEX idx_quarterly_goals_client_period 
  ON quarterly_goals(client_id, year DESC, quarter DESC);

-- Enable Row Level Security
ALTER TABLE quarterly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view goals for accessible clients"
  ON quarterly_goals FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert goals for accessible clients"
  ON quarterly_goals FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update goals for accessible clients"
  ON quarterly_goals FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete goals for accessible clients"
  ON quarterly_goals FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at timestamp
CREATE TRIGGER update_quarterly_goals_updated_at
  BEFORE UPDATE ON quarterly_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();