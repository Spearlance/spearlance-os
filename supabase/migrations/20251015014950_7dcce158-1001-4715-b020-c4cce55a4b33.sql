-- Add affiliate_url column to marketing_tools table
ALTER TABLE marketing_tools 
ADD COLUMN IF NOT EXISTS affiliate_url TEXT;

COMMENT ON COLUMN marketing_tools.affiliate_url IS 'Optional affiliate/signup link to show alongside the tool, even after added to client tools';