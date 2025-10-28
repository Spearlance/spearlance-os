-- Add team invite tracking columns to late_profiles table
ALTER TABLE late_profiles
ADD COLUMN team_invite_token TEXT,
ADD COLUMN team_invite_url TEXT,
ADD COLUMN team_invite_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN team_invite_created_at TIMESTAMP WITH TIME ZONE;