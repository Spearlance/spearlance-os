-- Remove the unique constraint that limits one avatar per client
ALTER TABLE avatars DROP CONSTRAINT IF EXISTS avatars_client_id_key;