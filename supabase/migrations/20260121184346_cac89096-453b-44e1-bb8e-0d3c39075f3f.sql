-- Create junction table to link assets to website build pages
CREATE TABLE public.website_page_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.website_build_pages(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(page_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.website_page_assets ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage page assets
CREATE POLICY "Users can view page assets" 
  ON public.website_page_assets 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert page assets" 
  ON public.website_page_assets 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can delete page assets" 
  ON public.website_page_assets 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Add index for faster lookups
CREATE INDEX idx_website_page_assets_page_id ON public.website_page_assets(page_id);
CREATE INDEX idx_website_page_assets_asset_id ON public.website_page_assets(asset_id);