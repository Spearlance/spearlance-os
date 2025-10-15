-- Step 1: Extend clients table with profile fields
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS brand_name text,
ADD COLUMN IF NOT EXISTS hq_city text,
ADD COLUMN IF NOT EXISTS service_areas text[],
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS primary_contact_name text,
ADD COLUMN IF NOT EXISTS primary_contact_email text,
ADD COLUMN IF NOT EXISTS decision_makers text[];

-- Step 2: Create client_business_model table
CREATE TABLE IF NOT EXISTS public.client_business_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  aov numeric,
  ltv numeric,
  sales_process text,
  annual_revenue_goal numeric,
  current_state_working text,
  current_state_not_working text,
  current_state_constraints text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on client_business_model
ALTER TABLE public.client_business_model ENABLE ROW LEVEL SECURITY;

-- Create policies for client_business_model
CREATE POLICY "Users can view business model for accessible clients"
  ON public.client_business_model FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update business model for accessible clients"
  ON public.client_business_model FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert business model for accessible clients"
  ON public.client_business_model FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at on client_business_model
CREATE TRIGGER update_client_business_model_updated_at
  BEFORE UPDATE ON public.client_business_model
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Create client_brand_voice table
CREATE TABLE IF NOT EXISTS public.client_brand_voice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  tone text,
  words_to_avoid text,
  story_recording_url text,
  story_recording_asset_id text,
  story_transcript text,
  story_summary jsonb,
  story_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on client_brand_voice
ALTER TABLE public.client_brand_voice ENABLE ROW LEVEL SECURITY;

-- Create policies for client_brand_voice
CREATE POLICY "Users can view brand voice for accessible clients"
  ON public.client_brand_voice FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update brand voice for accessible clients"
  ON public.client_brand_voice FOR UPDATE
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can insert brand voice for accessible clients"
  ON public.client_brand_voice FOR INSERT
  WITH CHECK (has_client_access(auth.uid(), client_id));

-- Trigger for updated_at on client_brand_voice
CREATE TRIGGER update_client_brand_voice_updated_at
  BEFORE UPDATE ON public.client_brand_voice
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Migrate existing data from launchpad_submissions to new tables
-- Migrate company data to clients table
UPDATE public.clients c
SET 
  legal_name = COALESCE(c.legal_name, ls.responses_json->'discovery'->'company'->>'legal_name'),
  brand_name = COALESCE(c.brand_name, ls.responses_json->'discovery'->'company'->>'brand_name'),
  website_url = COALESCE(c.website_url, ls.responses_json->'discovery'->'company'->>'website_url'),
  hq_city = COALESCE(c.hq_city, ls.responses_json->'discovery'->'company'->>'hq_city'),
  industry = COALESCE(c.industry, ls.responses_json->'discovery'->'company'->>'industry'),
  primary_contact_name = COALESCE(c.primary_contact_name, ls.responses_json->'discovery'->'contacts'->>'primary_name'),
  primary_contact_email = COALESCE(c.primary_contact_email, ls.responses_json->'discovery'->'contacts'->>'primary_email')
FROM public.launchpad_submissions ls
WHERE ls.client_id = c.id 
  AND ls.responses_json->'discovery' IS NOT NULL;

-- Migrate business model data
INSERT INTO public.client_business_model (
  client_id, aov, ltv, sales_process, annual_revenue_goal,
  current_state_working, current_state_not_working, current_state_constraints
)
SELECT 
  ls.client_id,
  (ls.responses_json->'discovery'->'model'->>'aov')::numeric,
  (ls.responses_json->'discovery'->'model'->>'ltv')::numeric,
  ls.responses_json->'discovery'->'model'->>'sales_process',
  (ls.responses_json->'discovery'->'goals'->>'annual_revenue_goal')::numeric,
  ls.responses_json->'discovery'->'state'->>'working',
  ls.responses_json->'discovery'->'state'->>'not_working',
  ls.responses_json->'discovery'->'state'->>'constraints'
FROM public.launchpad_submissions ls
WHERE ls.responses_json->'discovery' IS NOT NULL
ON CONFLICT (client_id) DO UPDATE SET
  aov = EXCLUDED.aov,
  ltv = EXCLUDED.ltv,
  sales_process = EXCLUDED.sales_process,
  annual_revenue_goal = EXCLUDED.annual_revenue_goal,
  current_state_working = EXCLUDED.current_state_working,
  current_state_not_working = EXCLUDED.current_state_not_working,
  current_state_constraints = EXCLUDED.current_state_constraints;

-- Migrate brand voice data
INSERT INTO public.client_brand_voice (
  client_id, tone, words_to_avoid, 
  story_recording_url, story_recording_asset_id, 
  story_transcript, story_summary, story_completed
)
SELECT 
  ls.client_id,
  ls.responses_json->'discovery'->'voice'->>'tone',
  ls.responses_json->'discovery'->'voice'->>'words_to_avoid',
  ls.responses_json->'discovery'->'story'->>'recording_url',
  ls.responses_json->'discovery'->'story'->>'recording_asset_id',
  ls.responses_json->'discovery'->'story'->>'transcript',
  ls.responses_json->'discovery'->'story'->'summary',
  COALESCE((ls.responses_json->'discovery'->'story'->>'completed')::boolean, false)
FROM public.launchpad_submissions ls
WHERE ls.responses_json->'discovery' IS NOT NULL
ON CONFLICT (client_id) DO UPDATE SET
  tone = EXCLUDED.tone,
  words_to_avoid = EXCLUDED.words_to_avoid,
  story_recording_url = EXCLUDED.story_recording_url,
  story_recording_asset_id = EXCLUDED.story_recording_asset_id,
  story_transcript = EXCLUDED.story_transcript,
  story_summary = EXCLUDED.story_summary,
  story_completed = EXCLUDED.story_completed;