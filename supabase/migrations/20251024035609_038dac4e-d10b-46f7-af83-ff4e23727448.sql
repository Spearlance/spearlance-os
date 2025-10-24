-- Create social_media_strategy table
CREATE TABLE social_media_strategy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Strategy scope
  is_global BOOLEAN DEFAULT true,
  month INTEGER NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NULL CHECK (year >= 2025),
  
  -- Posting frequency
  posting_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (posting_frequency IN ('daily', 'weekdays', 'custom')),
  selected_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Monday, 7=Sunday
  
  -- Topic distribution (percentages that sum to 100)
  topic_distribution JSONB DEFAULT '{
    "educational": 25,
    "behind_the_scenes": 25,
    "customer_stories": 20,
    "promotional": 15,
    "quick_tips": 15
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique indexes for constraints
CREATE UNIQUE INDEX unique_global_strategy_per_client 
  ON social_media_strategy(client_id) 
  WHERE is_global = true;

CREATE UNIQUE INDEX unique_month_strategy_per_client 
  ON social_media_strategy(client_id, month, year) 
  WHERE is_global = false;

-- RLS Policies
ALTER TABLE social_media_strategy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage strategy for accessible clients"
  ON social_media_strategy
  FOR ALL
  USING (has_client_access(auth.uid(), client_id));

-- Additional indexes for faster lookups
CREATE INDEX idx_strategy_client_global ON social_media_strategy(client_id) WHERE is_global = true;
CREATE INDEX idx_strategy_client_month ON social_media_strategy(client_id, month, year) WHERE is_global = false;

-- Trigger for updated_at
CREATE TRIGGER update_social_media_strategy_updated_at
  BEFORE UPDATE ON social_media_strategy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();