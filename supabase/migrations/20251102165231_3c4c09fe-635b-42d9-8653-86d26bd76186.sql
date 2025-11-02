-- Drop existing foreign key constraints with NO ACTION
ALTER TABLE public.services
DROP CONSTRAINT IF EXISTS services_created_by_fkey;

ALTER TABLE public.marketing_ideas
DROP CONSTRAINT IF EXISTS marketing_ideas_created_by_fkey;

ALTER TABLE public.support_articles
DROP CONSTRAINT IF EXISTS support_articles_created_by_fkey;

ALTER TABLE public.client_primary_contacts
DROP CONSTRAINT IF EXISTS client_primary_contacts_created_by_fkey;

-- Recreate foreign key constraints with ON DELETE SET NULL
ALTER TABLE public.services
ADD CONSTRAINT services_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_ideas
ADD CONSTRAINT marketing_ideas_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.support_articles
ADD CONSTRAINT support_articles_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.client_primary_contacts
ADD CONSTRAINT client_primary_contacts_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;