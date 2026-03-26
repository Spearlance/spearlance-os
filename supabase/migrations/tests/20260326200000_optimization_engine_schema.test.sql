-- Migration smoke test: 20260326200000_optimization_engine_schema
-- Verifies schema expectations after migration runs.
-- Run with: psql $DATABASE_URL -f this_file

-- 1. All 5 tables exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'optimization_cycles'
  ), 'optimization_cycles table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'optimization_recommendations'
  ), 'optimization_recommendations table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'page_audits'
  ), 'page_audits table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'serp_snapshots'
  ), 'serp_snapshots table must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'dataforseo_configs'
  ), 'dataforseo_configs table must exist';
END $$;

-- 2. Key columns exist on each table
DO $$
BEGIN
  -- optimization_cycles
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'client_id'
  ), 'optimization_cycles.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'cycle_date'
  ), 'optimization_cycles.cycle_date must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'status'
  ), 'optimization_cycles.status must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_cycles' AND column_name = 'doctrine_version'
  ), 'optimization_cycles.doctrine_version must exist';

  -- optimization_recommendations
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'client_id'
  ), 'optimization_recommendations.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'category'
  ), 'optimization_recommendations.category must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'subcategory'
  ), 'optimization_recommendations.subcategory must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'priority'
  ), 'optimization_recommendations.priority must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'status'
  ), 'optimization_recommendations.status must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'applied_at'
  ), 'optimization_recommendations.applied_at must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'optimization_recommendations' AND column_name = 'expires_at'
  ), 'optimization_recommendations.expires_at must exist';

  -- page_audits
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'client_id'
  ), 'page_audits.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'url'
  ), 'page_audits.url must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'h1_count'
  ), 'page_audits.h1_count must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'page_type'
  ), 'page_audits.page_type must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_audits' AND column_name = 'word_count'
  ), 'page_audits.word_count must exist';

  -- serp_snapshots
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'client_id'
  ), 'serp_snapshots.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'keyword'
  ), 'serp_snapshots.keyword must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'position'
  ), 'serp_snapshots.position must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serp_snapshots' AND column_name = 'snapshot_date'
  ), 'serp_snapshots.snapshot_date must exist';

  -- dataforseo_configs
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dataforseo_configs' AND column_name = 'client_id'
  ), 'dataforseo_configs.client_id must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dataforseo_configs' AND column_name = 'tracked_keywords'
  ), 'dataforseo_configs.tracked_keywords must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dataforseo_configs' AND column_name = 'location_code'
  ), 'dataforseo_configs.location_code must exist';
END $$;

-- 3. RLS is enabled on all tables
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'optimization_cycles' AND rowsecurity = true
  ), 'RLS must be enabled on optimization_cycles';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'optimization_recommendations' AND rowsecurity = true
  ), 'RLS must be enabled on optimization_recommendations';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'page_audits' AND rowsecurity = true
  ), 'RLS must be enabled on page_audits';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'serp_snapshots' AND rowsecurity = true
  ), 'RLS must be enabled on serp_snapshots';

  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'dataforseo_configs' AND rowsecurity = true
  ), 'RLS must be enabled on dataforseo_configs';
END $$;

-- 4. Key indexes exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'optimization_recommendations' AND indexname = 'idx_opt_recs_client_status'
  ), 'idx_opt_recs_client_status index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'optimization_recommendations' AND indexname = 'idx_opt_recs_monitoring'
  ), 'idx_opt_recs_monitoring index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'page_audits' AND indexname = 'idx_page_audits_client_url'
  ), 'idx_page_audits_client_url index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'page_audits' AND indexname = 'idx_page_audits_type'
  ), 'idx_page_audits_type index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'serp_snapshots' AND indexname = 'idx_serp_snapshots_client_date'
  ), 'idx_serp_snapshots_client_date index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'serp_snapshots' AND indexname = 'idx_serp_snapshots_keyword'
  ), 'idx_serp_snapshots_keyword index must exist';
END $$;

-- 5. CHECK constraints exist on optimization_recommendations
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%optimization_recommendations%'
  ), 'optimization_recommendations must have check constraints';
END $$;
