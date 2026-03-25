-- Auto-Blog System Schema
-- Adds: blog_auto_runs table, quality columns on blog_posts, auto-mode settings on clients

-- ============================================================
-- 1. blog_auto_runs table
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_auto_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  topics_generated int NOT NULL DEFAULT 0,
  articles_generated int NOT NULL DEFAULT 0,
  articles_passed_gate int NOT NULL DEFAULT 0,
  articles_flagged int NOT NULL DEFAULT 0,
  research_summary jsonb,
  completed_at timestamptz,
  error_log text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_auto_runs_client_id ON blog_auto_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_auto_runs_status ON blog_auto_runs(status);

ALTER TABLE blog_auto_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blog auto runs"
  ON blog_auto_runs FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients
    )
  );

-- ============================================================
-- 2. Quality + traceability columns on blog_posts
-- ============================================================

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS auto_run_id uuid REFERENCES blog_auto_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quality_scores jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_blog_posts_auto_run_id ON blog_posts(auto_run_id);

-- ============================================================
-- 3. Auto-blog mode and schedule settings on clients
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auto_blog_mode text NOT NULL DEFAULT 'off'
    CHECK (auto_blog_mode IN ('off', 'queue', 'auto_publish')),
  ADD COLUMN IF NOT EXISTS auto_blog_schedule text;
