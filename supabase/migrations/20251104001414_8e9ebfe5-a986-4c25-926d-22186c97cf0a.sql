-- Create blog_content_strategy table (similar to social_media_strategy)
CREATE TABLE IF NOT EXISTS blog_content_strategy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  posting_frequency TEXT NOT NULL DEFAULT 'weekly',
  content_mix JSONB NOT NULL DEFAULT '{
    "how_to": 30,
    "case_studies": 20,
    "industry_news": 15,
    "best_practices": 20,
    "company_updates": 15
  }'::jsonb,
  is_global BOOLEAN DEFAULT true,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create blog_strategy_batches table (similar to social_media_generation_batches)
CREATE TABLE IF NOT EXISTS blog_strategy_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_topics INTEGER DEFAULT 0,
  topics_with_outlines INTEGER DEFAULT 0,
  topics_with_articles INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Add columns to blog_topics table
ALTER TABLE blog_topics 
  ADD COLUMN IF NOT EXISTS strategy_batch_id UUID REFERENCES blog_strategy_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS suggested_publish_date DATE,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Add columns to blog_posts table for better tracking
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES blog_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_publish_date DATE,
  ADD COLUMN IF NOT EXISTS images_generated BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE blog_content_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_strategy_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_content_strategy
CREATE POLICY "Users can view strategy for accessible clients"
  ON blog_content_strategy FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create strategy for accessible clients"
  ON blog_content_strategy FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update strategy for accessible clients"
  ON blog_content_strategy FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete strategy for accessible clients"
  ON blog_content_strategy FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- RLS Policies for blog_strategy_batches
CREATE POLICY "Users can view batches for accessible clients"
  ON blog_strategy_batches FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create batches for accessible clients"
  ON blog_strategy_batches FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update batches for accessible clients"
  ON blog_strategy_batches FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_strategy_client ON blog_content_strategy(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_strategy_batches_client ON blog_strategy_batches(client_id, month, year);
CREATE INDEX IF NOT EXISTS idx_blog_topics_batch ON blog_topics(strategy_batch_id);
CREATE INDEX IF NOT EXISTS idx_blog_topics_publish_date ON blog_topics(suggested_publish_date);
CREATE INDEX IF NOT EXISTS idx_blog_posts_topic ON blog_posts(topic_id);