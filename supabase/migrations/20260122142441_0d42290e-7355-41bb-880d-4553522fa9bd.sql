-- Add asset sharing columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asset_share_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asset_share_password_hash TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asset_share_token TEXT UNIQUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asset_share_expires_at TIMESTAMPTZ;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_clients_asset_share_token ON public.clients(asset_share_token) WHERE asset_share_token IS NOT NULL;