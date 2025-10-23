-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Create profile-avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true);

-- RLS policies for profile-avatars bucket
CREATE POLICY "Users can view all profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload their own profile avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);