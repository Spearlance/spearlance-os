-- Create social_media_posts table
CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Post metadata
  topic_category TEXT NOT NULL,
  caption_text TEXT NOT NULL,
  caption_tone TEXT,
  hashtags TEXT[],
  
  -- Image data
  image_url TEXT,
  image_source TEXT,
  brand_asset_id UUID REFERENCES assets(id),
  nano_banana_prompt TEXT,
  
  -- Scheduling
  platform TEXT[],
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Brand assets used
  brand_colors_used JSONB,
  fonts_used JSONB,
  logo_used BOOLEAN DEFAULT false,
  mood_board_reference UUID REFERENCES mood_boards(id),
  
  -- AI generation data
  ai_post_ideas JSONB,
  ai_caption_options JSONB,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  posted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_social_posts_client ON social_media_posts(client_id);
CREATE INDEX idx_social_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_media_posts(scheduled_date);

-- Enable Row Level Security
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view posts for accessible clients"
  ON social_media_posts FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create posts for accessible clients"
  ON social_media_posts FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update posts for accessible clients"
  ON social_media_posts FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete posts for accessible clients"
  ON social_media_posts FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();