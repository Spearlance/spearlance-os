-- Add thumbnail support to asset_folders
ALTER TABLE public.asset_folders 
ADD COLUMN thumbnail_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

CREATE INDEX idx_asset_folders_thumbnail ON public.asset_folders(thumbnail_asset_id);