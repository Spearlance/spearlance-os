-- Add last_front_sync_at column to clients table
ALTER TABLE clients ADD COLUMN last_front_sync_at TIMESTAMPTZ;