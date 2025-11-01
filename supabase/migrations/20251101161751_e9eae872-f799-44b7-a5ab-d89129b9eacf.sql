-- Function to validate page domain matches client domain
CREATE OR REPLACE FUNCTION validate_client_domain()
RETURNS TRIGGER AS $$
DECLARE
  client_domain TEXT;
  page_domain TEXT;
BEGIN
  -- Block known editor/platform domains
  IF NEW.page_path ~ '(my\.duda\.co|edit\.duda\.co|mywebsitemanager\.co|/editor/|/preview/|/edit-site/)' THEN
    RAISE EXCEPTION 'Editor and platform pages cannot be stored';
  END IF;
  
  -- Get client's website domain
  SELECT 
    regexp_replace(
      regexp_replace(website_url, '^https?://', ''),
      '^www\.', ''
    )
  INTO client_domain
  FROM clients
  WHERE id = NEW.client_id;
  
  IF client_domain IS NULL THEN
    RAISE EXCEPTION 'Client website URL not found';
  END IF;
  
  -- Extract domain from page_path if it's a full URL
  IF NEW.page_path ~ '^https?://' THEN
    page_domain := regexp_replace(
      regexp_replace(NEW.page_path, '^https?://', ''),
      '^www\.', ''
    );
    page_domain := split_part(page_domain, '/', 1);
    
    IF page_domain != client_domain THEN
      RAISE EXCEPTION 'Page domain does not match client domain';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_client_domain
  BEFORE INSERT OR UPDATE ON website_pages
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_domain();

-- Clean up existing editor/platform pages
DELETE FROM page_content_analysis
WHERE page_id IN (
  SELECT id FROM website_pages 
  WHERE page_path ~ '(my\.duda\.co|edit\.duda\.co|mywebsitemanager\.co|/editor/|/preview/|/edit-site/)'
);

DELETE FROM website_pages 
WHERE page_path ~ '(my\.duda\.co|edit\.duda\.co|mywebsitemanager\.co|/editor/|/preview/|/edit-site/)';

-- Clean up pages where domain doesn't match client domain (historical mismatches)
DELETE FROM page_content_analysis
WHERE page_id IN (
  SELECT wp.id 
  FROM website_pages wp
  JOIN clients c ON c.id = wp.client_id
  WHERE wp.page_path ~ '^https?://'
    AND split_part(
      regexp_replace(
        regexp_replace(wp.page_path, '^https?://', ''),
        '^www\.', ''
      ), '/', 1
    ) != regexp_replace(
      regexp_replace(c.website_url, '^https?://', ''),
      '^www\.', ''
    )
);

DELETE FROM website_pages wp
USING clients c
WHERE wp.client_id = c.id
  AND wp.page_path ~ '^https?://'
  AND split_part(
    regexp_replace(
      regexp_replace(wp.page_path, '^https?://', ''),
      '^www\.', ''
    ), '/', 1
  ) != regexp_replace(
    regexp_replace(c.website_url, '^https?://', ''),
    '^www\.', ''
  );