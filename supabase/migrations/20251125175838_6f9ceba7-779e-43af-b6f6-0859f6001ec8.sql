-- Make client_id nullable in duda_conversations
ALTER TABLE duda_conversations 
ALTER COLUMN client_id DROP NOT NULL;

-- Create function to link orphaned conversations when a client's site_id is updated
CREATE OR REPLACE FUNCTION link_orphaned_conversations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_id IS NOT NULL AND (OLD.site_id IS NULL OR NEW.site_id != OLD.site_id) THEN
    UPDATE duda_conversations 
    SET client_id = NEW.id,
        updated_at = now()
    WHERE site_id = NEW.site_id 
      AND client_id IS NULL;
    
    UPDATE duda_comments 
    SET client_id = NEW.id,
        updated_at = now()
    WHERE conversation_id IN (
      SELECT id FROM duda_conversations 
      WHERE site_id = NEW.site_id AND client_id = NEW.id
    ) AND client_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on clients table
CREATE TRIGGER on_client_site_id_update
AFTER INSERT OR UPDATE OF site_id ON clients
FOR EACH ROW 
EXECUTE FUNCTION link_orphaned_conversations();