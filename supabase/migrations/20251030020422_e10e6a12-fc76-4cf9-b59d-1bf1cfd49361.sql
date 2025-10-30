-- Add subscription management columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS stripe_plan_name TEXT,
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS access_locked BOOLEAN DEFAULT FALSE;

-- Add index for grace period checks
CREATE INDEX IF NOT EXISTS idx_clients_grace_period 
ON clients(access_locked, grace_period_end) 
WHERE grace_period_end IS NOT NULL;