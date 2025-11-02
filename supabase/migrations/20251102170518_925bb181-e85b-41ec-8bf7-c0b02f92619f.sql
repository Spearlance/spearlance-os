-- Drop existing foreign key from user_roles to auth.users
ALTER TABLE public.user_roles
DROP CONSTRAINT user_roles_user_id_fkey;

-- Add new foreign key from user_roles to profiles with CASCADE delete
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;