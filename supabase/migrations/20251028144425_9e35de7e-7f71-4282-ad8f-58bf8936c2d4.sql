-- Fix search_path format for link_orphaned_submissions function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';