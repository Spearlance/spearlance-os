-- Add unique constraint to services table to enable upsert on (client_id, name)
ALTER TABLE public.services 
ADD CONSTRAINT services_client_id_name_key 
UNIQUE (client_id, name);