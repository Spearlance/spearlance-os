-- Add timezone to clients table
ALTER TABLE clients 
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';

-- Remove timezone from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS timezone;