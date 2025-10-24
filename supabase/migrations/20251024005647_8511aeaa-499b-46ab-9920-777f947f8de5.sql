-- Create late_profiles table
CREATE TABLE late_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  late_profile_id TEXT NOT NULL UNIQUE,
  late_profile_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create late_social_accounts table
CREATE TABLE late_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  late_profile_id UUID NOT NULL REFERENCES late_profiles(id) ON DELETE CASCADE,
  late_account_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'threads', 'tiktok', 'youtube', 'pinterest', 'reddit', 'bluesky')),
  username TEXT,
  display_name TEXT,
  profile_picture_url TEXT,
  is_active BOOLEAN DEFAULT true,
  token_expires_at TIMESTAMPTZ,
  platform_specific_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create late_connection_invites table
CREATE TABLE late_connection_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  late_profile_id UUID NOT NULL REFERENCES late_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  late_invite_id TEXT NOT NULL,
  invite_token TEXT NOT NULL,
  invite_url TEXT NOT NULL,
  inviter_user_id UUID REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update social_media_posts table with Late fields
ALTER TABLE social_media_posts 
  ADD COLUMN late_post_id TEXT,
  ADD COLUMN late_status TEXT CHECK (late_status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  ADD COLUMN late_error_message TEXT,
  ADD COLUMN late_published_urls JSONB,
  ADD COLUMN synced_to_late_at TIMESTAMPTZ;

-- Enable RLS on late_profiles
ALTER TABLE late_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view late profiles for accessible clients"
ON late_profiles FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can create late profiles for accessible clients"
ON late_profiles FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Users can update late profiles for accessible clients"
ON late_profiles FOR UPDATE
USING (has_client_access(auth.uid(), client_id));

-- Enable RLS on late_social_accounts
ALTER TABLE late_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view late accounts for accessible profiles"
ON late_social_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM late_profiles
    WHERE late_profiles.id = late_social_accounts.late_profile_id
    AND has_client_access(auth.uid(), late_profiles.client_id)
  )
);

CREATE POLICY "Users can manage late accounts for accessible profiles"
ON late_social_accounts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM late_profiles
    WHERE late_profiles.id = late_social_accounts.late_profile_id
    AND has_client_access(auth.uid(), late_profiles.client_id)
  )
);

-- Enable RLS on late_connection_invites
ALTER TABLE late_connection_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view late invites for accessible profiles"
ON late_connection_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM late_profiles
    WHERE late_profiles.id = late_connection_invites.late_profile_id
    AND has_client_access(auth.uid(), late_profiles.client_id)
  )
);

CREATE POLICY "Users can create late invites for accessible profiles"
ON late_connection_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM late_profiles
    WHERE late_profiles.id = late_connection_invites.late_profile_id
    AND has_client_access(auth.uid(), late_profiles.client_id)
  )
);

-- Create trigger for updated_at on late_profiles
CREATE TRIGGER update_late_profiles_updated_at
  BEFORE UPDATE ON late_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on late_social_accounts
CREATE TRIGGER update_late_social_accounts_updated_at
  BEFORE UPDATE ON late_social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();