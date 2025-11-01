-- Create website_pages table for storing crawled page content
CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  full_content TEXT,
  meta_description TEXT,
  word_count INTEGER,
  is_indexable BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, page_path)
);

-- Create page_content_analysis table for storing AI analysis results
CREATE TABLE page_content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  brevity_score INTEGER CHECK (brevity_score >= 0 AND brevity_score <= 100),
  tone_score INTEGER CHECK (tone_score >= 0 AND tone_score <= 100),
  avatar_alignment_score INTEGER CHECK (avatar_alignment_score >= 0 AND avatar_alignment_score <= 100),
  
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations JSONB,
  
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  analyzed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(page_id, avatar_id)
);

-- Enable RLS on website_pages
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pages for accessible clients"
  ON website_pages FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can manage pages"
  ON website_pages FOR ALL
  USING (true);

-- Enable RLS on page_content_analysis
ALTER TABLE page_content_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analysis for accessible clients"
  ON page_content_analysis FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create analysis for accessible clients"
  ON page_content_analysis FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update analysis for accessible clients"
  ON page_content_analysis FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can delete analysis for accessible clients"
  ON page_content_analysis FOR DELETE
  USING (has_client_access(auth.uid(), client_id));

-- Create indexes for performance
CREATE INDEX idx_website_pages_client_path ON website_pages(client_id, page_path);
CREATE INDEX idx_website_pages_indexable ON website_pages(client_id, is_indexable);
CREATE INDEX idx_page_analysis_page ON page_content_analysis(page_id);
CREATE INDEX idx_page_analysis_client ON page_content_analysis(client_id);
CREATE INDEX idx_page_analysis_score ON page_content_analysis(overall_score DESC);