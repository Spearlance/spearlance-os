-- Create marketing_tools table for client-specific tools
CREATE TABLE marketing_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  credentials_notes TEXT,
  cost_per_month NUMERIC(10,2),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, name)
);

-- Enable RLS for marketing_tools
ALTER TABLE marketing_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tools for accessible clients"
  ON marketing_tools FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create tools for accessible clients"
  ON marketing_tools FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update tools for accessible clients"
  ON marketing_tools FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete tools for accessible clients"
  ON marketing_tools FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_marketing_tools_updated_at
  BEFORE UPDATE ON marketing_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_marketing_tools_client_id ON marketing_tools(client_id);
CREATE INDEX idx_marketing_tools_category ON marketing_tools(category);

-- Create recommended_tools table for admin-managed global recommendations
CREATE TABLE recommended_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,
  description TEXT NOT NULL,
  why_we_recommend TEXT,
  pricing_model TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for recommended_tools
ALTER TABLE recommended_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active recommended tools"
  ON recommended_tools FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage recommended tools"
  ON recommended_tools FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_recommended_tools_updated_at
  BEFORE UPDATE ON recommended_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_recommended_tools_category ON recommended_tools(category);
CREATE INDEX idx_recommended_tools_active ON recommended_tools(is_active);