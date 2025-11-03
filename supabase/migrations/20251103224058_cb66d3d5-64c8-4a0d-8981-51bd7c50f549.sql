-- Create blog_posts table
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  content TEXT,
  excerpt TEXT,
  
  -- SEO
  focus_keyword TEXT,
  seo_score NUMERIC(3,1),
  readability_score NUMERIC(3,1),
  
  -- Targeting
  avatar_id UUID REFERENCES avatars(id),
  topic_category TEXT,
  target_keywords TEXT[],
  
  -- Images
  featured_image_url TEXT,
  featured_image_alt TEXT,
  body_images JSONB,
  
  -- Status & Publishing
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  duda_page_id TEXT,
  duda_publish_url TEXT,
  
  -- AI Generation
  ai_model TEXT DEFAULT 'claude-sonnet-4-5',
  generation_prompt TEXT,
  generation_metadata JSONB,
  
  -- Tracking
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_blog_posts_client_id ON blog_posts(client_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_scheduled_for ON blog_posts(scheduled_for);
CREATE UNIQUE INDEX idx_blog_posts_client_slug ON blog_posts(client_id, slug);

-- Create blog_post_revisions table
CREATE TABLE blog_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  meta_description TEXT,
  featured_image_url TEXT,
  revision_number INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_blog_post_revisions_post_id ON blog_post_revisions(blog_post_id);

-- Create blog_topics table
CREATE TABLE blog_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  topic_title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[],
  avatar_id UUID REFERENCES avatars(id),
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'idea',
  blog_post_id UUID REFERENCES blog_posts(id),
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_topics_client_id ON blog_topics(client_id);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
CREATE POLICY "Users can view blog posts for their clients"
  ON blog_posts FOR SELECT
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert blog posts for their clients"
  ON blog_posts FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update blog posts for their clients"
  ON blog_posts FOR UPDATE
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete blog posts for their clients"
  ON blog_posts FOR DELETE
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for blog_post_revisions
CREATE POLICY "Users can view revisions for their blog posts"
  ON blog_post_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE id = blog_post_revisions.blog_post_id
      AND (
        client_id IN (
          SELECT unnest(associated_client_ids) 
          FROM profiles 
          WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can insert revisions for their blog posts"
  ON blog_post_revisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE id = blog_post_revisions.blog_post_id
      AND (
        client_id IN (
          SELECT unnest(associated_client_ids) 
          FROM profiles 
          WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- RLS Policies for blog_topics
CREATE POLICY "Users can view blog topics for their clients"
  ON blog_topics FOR SELECT
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert blog topics for their clients"
  ON blog_topics FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update blog topics for their clients"
  ON blog_topics FOR UPDATE
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete blog topics for their clients"
  ON blog_topics FOR DELETE
  USING (
    client_id IN (
      SELECT unnest(associated_client_ids) 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_updated_at();