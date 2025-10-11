-- Add calendar connection and booking preference settings to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cal_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cal_booking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cal_availability_view_only BOOLEAN DEFAULT false;

-- Add client-level booking preferences (optional enhancement)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS booking_permissions TEXT DEFAULT 'self_book' 
CHECK (booking_permissions IN ('self_book', 'view_only', 'disabled'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.cal_connected IS 'Whether FMM has connected their Google Calendar via Cal.com';
COMMENT ON COLUMN profiles.cal_booking_enabled IS 'Whether FMM allows clients to self-book appointments';
COMMENT ON COLUMN profiles.cal_availability_view_only IS 'Whether clients can only view schedule without booking';
COMMENT ON COLUMN clients.booking_permissions IS 'Client-specific booking permissions: self_book, view_only, or disabled';