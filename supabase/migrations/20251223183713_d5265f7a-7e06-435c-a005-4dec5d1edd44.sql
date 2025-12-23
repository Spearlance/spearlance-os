-- Drop the overly permissive policy that allows any authenticated user to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new policy that only allows users to view profiles of people who share their client access
-- This prevents unauthorized access to email addresses and sensitive profile data
CREATE POLICY "Users can view profiles of shared client members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Users can see profiles that share at least one client with them
  EXISTS (
    SELECT 1 
    FROM unnest(profiles.associated_client_ids) AS target_client_id
    WHERE has_client_access(auth.uid(), target_client_id)
  )
);