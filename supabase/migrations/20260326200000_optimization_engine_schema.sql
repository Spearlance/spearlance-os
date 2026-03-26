-- ============================================================
-- Optimization Engine — cycles, recommendations, page_audits,
-- serp_snapshots, dataforseo_configs
-- ============================================================

-- optimization_cycles — tracks weekly analysis runs
CREATE TABLE IF NOT EXISTS optimization_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_date date NOT NULL,
  pages_analyzed integer DEFAULT 0,
  recommendations_generated integer DEFAULT 0,
  data_sources_used text[] DEFAULT '{}',
  doctrine_version text DEFAULT 'v2',
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, cycle_date)
);

ALTER TABLE optimization_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optimization_cycles for their clients"
  ON optimization_cycles FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage optimization_cycles"
  ON optimization_cycles FOR ALL
  USING (true)
  WITH CHECK (true);

-- optimization_recommendations — core recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES optimization_cycles(id) ON DELETE SET NULL,
  page_url text,
  category text NOT NULL CHECK (category IN ('seo', 'cro', 'content', 'alert')),
  subcategory text NOT NULL CHECK (subcategory IN (
    'meta_title', 'meta_desc', 'h1_fix', 'internal_links', 'new_page',
    'content_expand', 'schema', 'city_expansion', 'headline_cta',
    'ux_friction', 'cwv_fix', 'blog_topic'
  )),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  doctrine_rule text,
  current_value text,
  proposed_value text,
  ai_reasoning text,
  baseline_metrics jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'applied', 'monitoring',
    'succeeded', 'regressed', 'reverted'
  )),
  applied_at timestamptz,
  applied_by uuid REFERENCES profiles(id),
  check_7d_at timestamptz,
  check_14d_at timestamptz,
  check_21d_at timestamptz,
  outcome_metrics jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_opt_recs_client_status ON optimization_recommendations (client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opt_recs_monitoring ON optimization_recommendations (status, check_7d_at) WHERE status IN ('applied', 'monitoring');

ALTER TABLE optimization_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optimization_recommendations for their clients"
  ON optimization_recommendations FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Users can update optimization_recommendations for their clients"
  ON optimization_recommendations FOR UPDATE
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage optimization_recommendations"
  ON optimization_recommendations FOR ALL
  USING (true)
  WITH CHECK (true);

-- page_audits — crawled page data for doctrine compliance
CREATE TABLE IF NOT EXISTS page_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  meta_description text,
  h1_count integer DEFAULT 0,
  h1_text text,
  h2_count integer DEFAULT 0,
  h2_texts text[] DEFAULT '{}',
  internal_link_count integer DEFAULT 0,
  external_link_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  has_faq_schema boolean DEFAULT false,
  has_local_schema boolean DEFAULT false,
  has_org_schema boolean DEFAULT false,
  has_breadcrumb_schema boolean DEFAULT false,
  page_type text DEFAULT 'other' CHECK (page_type IN ('service', 'city', 'blog', 'pillar', 'homepage', 'other')),
  crawled_at timestamptz DEFAULT now(),
  raw_html_hash text,
  UNIQUE(client_id, url)
);

CREATE INDEX IF NOT EXISTS idx_page_audits_client_url ON page_audits (client_id, url);
CREATE INDEX IF NOT EXISTS idx_page_audits_type ON page_audits (client_id, page_type);

ALTER TABLE page_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view page_audits for their clients"
  ON page_audits FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage page_audits"
  ON page_audits FOR ALL
  USING (true)
  WITH CHECK (true);

-- serp_snapshots — DataforSEO SERP data
CREATE TABLE IF NOT EXISTS serp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  location text DEFAULT 'United States',
  search_engine text DEFAULT 'google',
  position integer,
  url text,
  serp_features text[] DEFAULT '{}',
  competitor_urls jsonb DEFAULT '[]'::jsonb,
  search_volume integer,
  keyword_difficulty numeric,
  cpc numeric,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(client_id, keyword, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_client_date ON serp_snapshots (client_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_serp_snapshots_keyword ON serp_snapshots (client_id, keyword);

ALTER TABLE serp_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serp_snapshots for their clients"
  ON serp_snapshots FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage serp_snapshots"
  ON serp_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);

-- dataforseo_configs — per-client DataforSEO settings
CREATE TABLE IF NOT EXISTS dataforseo_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  tracked_keywords text[] DEFAULT '{}',
  location_code integer DEFAULT 2840,
  language_code text DEFAULT 'en',
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dataforseo_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dataforseo_configs for their clients"
  ON dataforseo_configs FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage dataforseo_configs"
  ON dataforseo_configs FOR ALL
  USING (true)
  WITH CHECK (true);
