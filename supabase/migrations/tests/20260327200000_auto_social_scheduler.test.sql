-- Migration smoke test: 20260327200000_auto_social_scheduler
-- Verifies schema expectations after migration runs.
-- Run with: psql $DATABASE_URL -f this_file

-- 1. social_auto_runs table exists with all required columns
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'social_auto_runs'
  ), 'social_auto_runs table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'id'
  ), 'social_auto_runs.id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'client_id'
  ), 'social_auto_runs.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'trigger_type'
  ), 'social_auto_runs.trigger_type must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'status'
  ), 'social_auto_runs.status must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'month'
  ), 'social_auto_runs.month must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'year'
  ), 'social_auto_runs.year must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'triggered_at'
  ), 'social_auto_runs.triggered_at must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'posts_generated'
  ), 'social_auto_runs.posts_generated must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'assets_matched'
  ), 'social_auto_runs.assets_matched must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'assets_ai_generated'
  ), 'social_auto_runs.assets_ai_generated must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'completed_at'
  ), 'social_auto_runs.completed_at must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_auto_runs' AND column_name = 'error_log'
  ), 'social_auto_runs.error_log must exist';
END $$;

-- 2. New columns exist on social_media_posts
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'template_id'
  ), 'social_media_posts.template_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'template_props'
  ), 'social_media_posts.template_props must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'image_source_type'
  ), 'social_media_posts.image_source_type must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'auto_run_id'
  ), 'social_media_posts.auto_run_id must exist';
END $$;

-- 3. RLS is enabled on social_auto_runs
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'social_auto_runs' AND rowsecurity = true
  ), 'RLS must be enabled on social_auto_runs';
END $$;

-- 4. Key indexes exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'social_auto_runs' AND indexname = 'idx_social_auto_runs_client'
  ), 'idx_social_auto_runs_client index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'social_auto_runs' AND indexname = 'idx_social_auto_runs_status'
  ), 'idx_social_auto_runs_status index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'social_media_posts' AND indexname = 'idx_social_media_posts_scheduled'
  ), 'idx_social_media_posts_scheduled index must exist';
END $$;

-- 5. CHECK constraints exist on social_auto_runs
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%social_auto_runs%'
  ), 'social_auto_runs must have check constraints';
END $$;
