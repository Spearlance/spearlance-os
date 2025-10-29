-- Clean up stale Late profile records
-- This removes all existing late_profiles entries to allow fresh connections
DELETE FROM late_profiles;