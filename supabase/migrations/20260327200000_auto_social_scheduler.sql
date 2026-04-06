-- ============================================================
-- Auto Social Scheduler — social_auto_runs + social_media_posts extensions
-- ============================================================

-- social_auto_runs — tracks automated social post generation runs
CREATE TABLE IF NOT EXISTS social_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  posts_generated int NOT NULL DEFAULT 0,
  assets_matched int NOT NULL DEFAULT 0,
  assets_ai_generated int NOT NULL DEFAULT 0,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL CHECK (year >= 2024),
  completed_at timestamptz,
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_social_auto_runs_client ON social_auto_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_social_auto_runs_status ON social_auto_runs(status);

ALTER TABLE social_auto_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social_auto_runs for their clients"
  ON social_auto_runs FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

CREATE POLICY "Service role can manage social_auto_runs"
  ON social_auto_runs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Extend social_media_posts with template + automation columns
-- ============================================================

ALTER TABLE social_media_posts
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS template_props jsonb,
  ADD COLUMN IF NOT EXISTS image_source_type text CHECK (image_source_type IN ('upload', 'asset_match', 'ai_generated')),
  ADD COLUMN IF NOT EXISTS auto_run_id uuid REFERENCES social_auto_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled
  ON social_media_posts(scheduled_date, status)
  WHERE status = 'scheduled';
