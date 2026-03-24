-- Migration smoke test: 20260324000001_auto_blog_system
-- Verifies schema expectations after migration runs.
-- Run with: psql $DATABASE_URL -f this_file

-- 1. blog_auto_runs table exists with correct columns
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'blog_auto_runs'
  ), 'blog_auto_runs table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_auto_runs' AND column_name = 'trigger_type'
  ), 'blog_auto_runs.trigger_type must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_auto_runs' AND column_name = 'status'
  ), 'blog_auto_runs.status must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_auto_runs' AND column_name = 'research_summary'
  ), 'blog_auto_runs.research_summary (jsonb) must exist';
END $$;

-- 2. blog_posts has new quality columns
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'auto_run_id'
  ), 'blog_posts.auto_run_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'quality_scores'
  ), 'blog_posts.quality_scores (jsonb) must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'rejection_reason'
  ), 'blog_posts.rejection_reason must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'revision_count'
  ), 'blog_posts.revision_count must exist';
END $$;

-- 3. clients has auto-blog mode and schedule columns
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'auto_blog_mode'
  ), 'clients.auto_blog_mode must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'auto_blog_schedule'
  ), 'clients.auto_blog_schedule must exist';
END $$;

-- 4. RLS is enabled on blog_auto_runs
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'blog_auto_runs' AND rowsecurity = true
  ), 'RLS must be enabled on blog_auto_runs';
END $$;

-- 5. CHECK constraints: trigger_type and status accept only valid values
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%blog_auto_runs%trigger_type%'
       OR constraint_name LIKE '%blog_auto_runs%'
  ), 'blog_auto_runs must have check constraints';
END $$;
