CREATE OR REPLACE FUNCTION public.link_orphaned_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.site_id IS NOT NULL AND (OLD.site_id IS NULL OR NEW.site_id != OLD.site_id) THEN
    -- Link orphaned conversations to this client
    UPDATE duda_conversations 
    SET client_id = NEW.id,
        updated_at = now()
    WHERE site_id = NEW.site_id 
      AND client_id IS NULL;
    
    -- Link orphaned comments to this client (using correct table name)
    UPDATE duda_conversation_comments
    SET updated_at = now()
    WHERE conversation_id IN (
      SELECT id FROM duda_conversations 
      WHERE site_id = NEW.site_id AND client_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;