-- Create marketing_ideas table
CREATE TABLE marketing_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Core fields
  title TEXT NOT NULL,
  offer_type TEXT DEFAULT 'gso',
  status TEXT DEFAULT 'draft',
  
  -- GSO Content (stored as structured JSON)
  content JSONB NOT NULL,
  
  -- Metadata
  tags TEXT[],
  notes TEXT,
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  parent_idea_id UUID REFERENCES marketing_ideas(id)
);

-- RLS Policies
ALTER TABLE marketing_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ideas for accessible clients"
  ON marketing_ideas FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create ideas for accessible clients"
  ON marketing_ideas FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update ideas for accessible clients"
  ON marketing_ideas FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete ideas for accessible clients"
  ON marketing_ideas FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Index for performance
CREATE INDEX idx_marketing_ideas_client_id ON marketing_ideas(client_id);
CREATE INDEX idx_marketing_ideas_status ON marketing_ideas(status);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_ideas_updated_at
  BEFORE UPDATE ON marketing_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();