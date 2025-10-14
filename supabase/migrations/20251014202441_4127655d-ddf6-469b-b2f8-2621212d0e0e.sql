-- Add billing_method column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS billing_method text DEFAULT 'stripe' 
CHECK (billing_method IN ('stripe', 'direct', 'free'));

-- Create index for efficient queries on billing_method
CREATE INDEX IF NOT EXISTS idx_clients_billing_method 
ON clients(billing_method);

-- Update existing managed clients to 'direct' by default
UPDATE clients 
SET billing_method = 'direct' 
WHERE account_type = 'managed';

-- Add comment for documentation
COMMENT ON COLUMN clients.billing_method IS 'Payment method: stripe (paid via platform), direct (paid off-platform), free (complimentary access)';