-- Add timezone column to profiles table for user timezone preference
ALTER TABLE profiles 
ADD COLUMN timezone TEXT DEFAULT 'UTC';