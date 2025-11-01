-- Create social_post_analytics table to store Late analytics data
CREATE TABLE social_post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  late_post_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Analytics metrics from Late API
  platform TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- External post data
  external_id TEXT,
  published_at TIMESTAMPTZ,
  
  -- Metadata
  raw_analytics JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(late_post_id, platform)
);

-- Create indexes for performance
CREATE INDEX idx_social_post_analytics_post_id ON social_post_analytics(post_id);
CREATE INDEX idx_social_post_analytics_client_id ON social_post_analytics(client_id);
CREATE INDEX idx_social_post_analytics_published_at ON social_post_analytics(published_at);
CREATE INDEX idx_social_post_analytics_late_post_id ON social_post_analytics(late_post_id);

-- Enable RLS
ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their accessible clients
CREATE POLICY "Users can view analytics for accessible clients"
  ON social_post_analytics FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

-- Users can insert analytics for accessible clients (for edge function)
CREATE POLICY "Users can insert analytics for accessible clients"
  ON social_post_analytics FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

-- Users can update analytics for accessible clients
CREATE POLICY "Users can update analytics for accessible clients"
  ON social_post_analytics FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_social_post_analytics_updated_at
  BEFORE UPDATE ON social_post_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();