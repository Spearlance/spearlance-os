-- Remove redundant columns from services table
ALTER TABLE public.services 
DROP COLUMN IF EXISTS target_audience,
DROP COLUMN IF EXISTS ideal_client_profile,
DROP COLUMN IF EXISTS pricing_model,
DROP COLUMN IF EXISTS price_range,
DROP COLUMN IF EXISTS service_areas,
DROP COLUMN IF EXISTS common_objections;

-- Add new columns to avatars table
ALTER TABLE public.avatars 
ADD COLUMN IF NOT EXISTS service_areas text[],
ADD COLUMN IF NOT EXISTS pricing_model text,
ADD COLUMN IF NOT EXISTS price_range text;