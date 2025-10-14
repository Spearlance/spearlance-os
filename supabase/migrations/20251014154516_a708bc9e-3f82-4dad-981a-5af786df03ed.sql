-- Step 1: Create standard_marketing_stages table (global stage definitions)
CREATE TABLE standard_marketing_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  order_index INTEGER NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with the 5 standard stages
INSERT INTO standard_marketing_stages (name, order_index, description) VALUES
  ('Attract', 0, 'Generate awareness and attract potential customers'),
  ('Engage', 1, 'Build relationships and engage with prospects'),
  ('Convert', 2, 'Convert prospects into customers'),
  ('Close', 3, 'Finalize sales and close deals'),
  ('Retain and Reactivate', 4, 'Keep customers engaged and reactivate dormant ones');

-- RLS: Everyone can read standard stages (they're global)
ALTER TABLE standard_marketing_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view standard stages"
  ON standard_marketing_stages FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify global stages
CREATE POLICY "Admins can modify standard stages"
  ON standard_marketing_stages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 2: Update marketing_flow_stages to reference standard stages
ALTER TABLE marketing_flow_stages
  ADD COLUMN standard_stage_id UUID REFERENCES standard_marketing_stages(id) ON DELETE RESTRICT;

-- Migrate existing data: Match by name
UPDATE marketing_flow_stages mfs
SET standard_stage_id = sms.id
FROM standard_marketing_stages sms
WHERE mfs.name = sms.name;

-- Make the foreign key required (after migration)
ALTER TABLE marketing_flow_stages
  ALTER COLUMN standard_stage_id SET NOT NULL;

-- Step 3: Update marketing_flow_task_templates to reference standard stages
ALTER TABLE marketing_flow_task_templates
  ADD COLUMN standard_stage_id UUID REFERENCES standard_marketing_stages(id) ON DELETE CASCADE;

-- Migrate existing templates: Match by stage_name
UPDATE marketing_flow_task_templates tmpl
SET standard_stage_id = sms.id
FROM standard_marketing_stages sms
WHERE tmpl.stage_name = sms.name;

-- Delete templates with mismatched stage names (orphans)
DELETE FROM marketing_flow_task_templates
WHERE standard_stage_id IS NULL;

-- Make the foreign key required
ALTER TABLE marketing_flow_task_templates
  ALTER COLUMN standard_stage_id SET NOT NULL;

-- Drop old text columns (after confirming migration works)
ALTER TABLE marketing_flow_task_templates
  DROP COLUMN stage_name;

-- Step 4: Update initialize_marketing_flow function to use standard stages
CREATE OR REPLACE FUNCTION initialize_marketing_flow(p_client_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flow_id UUID;
  v_standard_stage RECORD;
BEGIN
  -- Check if flow already exists
  SELECT id INTO v_flow_id FROM marketing_flows WHERE client_id = p_client_id;
  
  IF v_flow_id IS NOT NULL THEN
    RETURN v_flow_id;
  END IF;
  
  -- Create new flow
  INSERT INTO marketing_flows (client_id, created_by)
  VALUES (p_client_id, p_user_id)
  RETURNING id INTO v_flow_id;
  
  -- Create stages from standard_marketing_stages table
  FOR v_standard_stage IN 
    SELECT * FROM standard_marketing_stages ORDER BY order_index
  LOOP
    INSERT INTO marketing_flow_stages (flow_id, name, order_index, standard_stage_id)
    VALUES (
      v_flow_id, 
      v_standard_stage.name, 
      v_standard_stage.order_index,
      v_standard_stage.id
    );
  END LOOP;
  
  RETURN v_flow_id;
END;
$$;