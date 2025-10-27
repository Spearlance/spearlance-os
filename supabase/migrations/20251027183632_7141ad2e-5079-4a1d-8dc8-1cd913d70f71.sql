-- Add website management columns to clients table
ALTER TABLE clients 
ADD COLUMN site_id text,
ADD COLUMN website_unlocked boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN clients.site_id IS 'MyWebsiteManager site ID for the client';
COMMENT ON COLUMN clients.website_unlocked IS 'Controls access to website features - unlock after payment (Starter) or when ready (Unlimited)';