-- Migration smoke test: 20260326300000_client_service_locations
-- Verifies schema expectations after migration runs.
-- Run with: psql $DATABASE_URL -f this_file

-- 1. Table exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'client_service_locations'
  ), 'client_service_locations table must exist';
END $$;

-- 2. Key columns exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'service_name'
  ), 'client_service_locations.service_name must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'service_slug'
  ), 'client_service_locations.service_slug must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'city'
  ), 'client_service_locations.city must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'state'
  ), 'client_service_locations.state must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'has_page'
  ), 'client_service_locations.has_page must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'is_expansion_target'
  ), 'client_service_locations.is_expansion_target must exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_service_locations' AND column_name = 'discovered_by'
  ), 'client_service_locations.discovered_by must exist';
END $$;

-- 3. RLS is enabled
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'client_service_locations' AND rowsecurity = true
  ), 'RLS must be enabled on client_service_locations';
END $$;

-- 4. Indexes exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_service_locations' AND indexname = 'idx_csl_client_active'
  ), 'idx_csl_client_active index must exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'client_service_locations' AND indexname = 'idx_csl_client_service'
  ), 'idx_csl_client_service index must exist';
END $$;
