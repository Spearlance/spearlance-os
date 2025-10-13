-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fix existing data inconsistency
UPDATE profiles 
SET role = 'fmm' 
WHERE id = '78f39ca4-2cf3-4727-a7a9-871264959ebd';