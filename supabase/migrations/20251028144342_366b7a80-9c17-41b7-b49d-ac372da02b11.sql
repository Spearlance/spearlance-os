-- Create function to automatically link orphaned form submissions when a client is created
CREATE OR REPLACE FUNCTION link_orphaned_submissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all submissions with matching site_id but null client_id
  UPDATE website_form_submissions
  SET 
    client_id = NEW.id,
    updated_at = now()
  WHERE 
    site_id = NEW.site_id 
    AND client_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that runs when a new client is created or site_id is updated
CREATE TRIGGER link_submissions_on_client_create
  AFTER INSERT OR UPDATE OF site_id ON clients
  FOR EACH ROW
  WHEN (NEW.site_id IS NOT NULL)
  EXECUTE FUNCTION link_orphaned_submissions();