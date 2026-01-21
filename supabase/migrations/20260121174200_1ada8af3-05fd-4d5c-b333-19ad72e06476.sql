-- Drop the existing constraint
ALTER TABLE public.website_build_pages 
DROP CONSTRAINT IF EXISTS website_build_pages_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE public.website_build_pages 
ADD CONSTRAINT website_build_pages_status_check 
CHECK ((status = ANY (ARRAY[
  'not_started'::text,
  'in_progress'::text,
  'content_ready'::text,
  'designed'::text,
  'built'::text,
  'in_review'::text,
  'reviewed'::text,
  'approved'::text
])));