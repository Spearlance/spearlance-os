-- Create competitors table for competitive intelligence
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  strengths TEXT,
  weaknesses TEXT,
  why_we_are_better TEXT,
  pricing_strategy TEXT,
  target_market TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, name)
);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view competitors for accessible clients"
  ON competitors FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create competitors for accessible clients"
  ON competitors FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update competitors for accessible clients"
  ON competitors FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete competitors for accessible clients"
  ON competitors FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Add trigger for updated_at
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_competitors_client_id ON competitors(client_id);