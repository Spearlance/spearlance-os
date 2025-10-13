-- Fix Issue #1: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix Issue #2: Create policy for users to view only their own sensitive data
CREATE POLICY "Users can view own sensitive profile data"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Fix Issue #2: Admins can view all profile data
CREATE POLICY "Admins can view all profile data"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix Issue #3: Add RLS policies to user_roles table
-- Policy 1: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy 3: Admins can insert roles for any user
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy 4: Admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy 5: Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Grant necessary permissions for has_role function to work
GRANT SELECT ON public.user_roles TO authenticated;