-- Add Cal.com token columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cal_access_token text,
ADD COLUMN IF NOT EXISTS cal_refresh_token text,
ADD COLUMN IF NOT EXISTS cal_token_expires_at timestamp with time zone;