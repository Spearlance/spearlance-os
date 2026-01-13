-- Enable RLS on website_page_prompt_templates
ALTER TABLE website_page_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage all prompt templates
CREATE POLICY "Admins can manage prompt templates"
ON website_page_prompt_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- All authenticated users can read prompt templates (for content generation)
CREATE POLICY "Authenticated users can read prompt templates"
ON website_page_prompt_templates
FOR SELECT
USING (auth.role() = 'authenticated');