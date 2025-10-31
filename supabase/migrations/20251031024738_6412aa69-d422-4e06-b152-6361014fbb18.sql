-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the vector extension from public to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to relevant roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Update search_path for database to include extensions schema
-- This ensures existing functions can still find vector types
ALTER DATABASE postgres SET search_path TO public, extensions;