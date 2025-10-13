-- Create enums for channel ownership and status
CREATE TYPE channel_ownership AS ENUM ('spearlance', 'client', 'both');
CREATE TYPE channel_status AS ENUM ('active', 'in_progress', 'paused', 'not_used');

-- Create marketing_flows table
CREATE TABLE marketing_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  title TEXT DEFAULT 'Marketing Flowchart',
  description TEXT
);

-- Enable RLS on marketing_flows
ALTER TABLE marketing_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flows
CREATE POLICY "Users can view flows for accessible clients"
  ON marketing_flows FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins and FMMs can insert flows"
  ON marketing_flows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can update flows"
  ON marketing_flows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can delete flows"
  ON marketing_flows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

-- Create marketing_flow_stages table
CREATE TABLE marketing_flow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID REFERENCES marketing_flows(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(flow_id, name)
);

-- Enable RLS on marketing_flow_stages
ALTER TABLE marketing_flow_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flow_stages
CREATE POLICY "Users can view stages for accessible flows"
  ON marketing_flow_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketing_flows
      WHERE marketing_flows.id = marketing_flow_stages.flow_id
      AND has_client_access(auth.uid(), marketing_flows.client_id)
    )
  );

CREATE POLICY "Admins and FMMs can insert stages"
  ON marketing_flow_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can update stages"
  ON marketing_flow_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can delete stages"
  ON marketing_flow_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

-- Create marketing_flow_channels table
CREATE TABLE marketing_flow_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES marketing_flow_stages(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  ownership channel_ownership NOT NULL,
  status channel_status DEFAULT 'not_used',
  progress NUMERIC DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_id, name)
);

-- Enable RLS on marketing_flow_channels
ALTER TABLE marketing_flow_channels ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flow_channels
CREATE POLICY "Users can view channels for accessible flows"
  ON marketing_flow_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketing_flow_stages
      JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
      WHERE marketing_flow_stages.id = marketing_flow_channels.stage_id
      AND has_client_access(auth.uid(), marketing_flows.client_id)
    )
  );

CREATE POLICY "Admins and FMMs can insert channels"
  ON marketing_flow_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can update channels"
  ON marketing_flow_channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can delete channels"
  ON marketing_flow_channels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

-- Create marketing_flow_channel_notes table
CREATE TABLE marketing_flow_channel_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES marketing_flow_channels(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT DEFAULT 'internal',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on marketing_flow_channel_notes
ALTER TABLE marketing_flow_channel_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flow_channel_notes
CREATE POLICY "Clients can view client-visible notes"
  ON marketing_flow_channel_notes FOR SELECT
  USING (
    visibility = 'client' AND
    EXISTS (
      SELECT 1 FROM marketing_flow_channels
      JOIN marketing_flow_stages ON marketing_flow_stages.id = marketing_flow_channels.stage_id
      JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
      WHERE marketing_flow_channels.id = marketing_flow_channel_notes.channel_id
      AND has_client_access(auth.uid(), marketing_flows.client_id)
    )
  );

CREATE POLICY "Admins and FMMs can view all notes"
  ON marketing_flow_channel_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    ) AND
    EXISTS (
      SELECT 1 FROM marketing_flow_channels
      JOIN marketing_flow_stages ON marketing_flow_stages.id = marketing_flow_channels.stage_id
      JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
      WHERE marketing_flow_channels.id = marketing_flow_channel_notes.channel_id
      AND has_client_access(auth.uid(), marketing_flows.client_id)
    )
  );

CREATE POLICY "Admins and FMMs can insert notes"
  ON marketing_flow_channel_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can update notes"
  ON marketing_flow_channel_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can delete notes"
  ON marketing_flow_channel_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

-- Create marketing_flow_task_links table
CREATE TABLE marketing_flow_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES marketing_flow_channels(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, task_id)
);

-- Enable RLS on marketing_flow_task_links
ALTER TABLE marketing_flow_task_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flow_task_links
CREATE POLICY "Users can view task links for accessible channels"
  ON marketing_flow_task_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketing_flow_channels
      JOIN marketing_flow_stages ON marketing_flow_stages.id = marketing_flow_channels.stage_id
      JOIN marketing_flows ON marketing_flows.id = marketing_flow_stages.flow_id
      WHERE marketing_flow_channels.id = marketing_flow_task_links.channel_id
      AND has_client_access(auth.uid(), marketing_flows.client_id)
    )
  );

CREATE POLICY "Admins and FMMs can insert task links"
  ON marketing_flow_task_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

CREATE POLICY "Admins and FMMs can delete task links"
  ON marketing_flow_task_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  );

-- Create marketing_flow_task_templates table
CREATE TABLE marketing_flow_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'normal',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on marketing_flow_task_templates
ALTER TABLE marketing_flow_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketing_flow_task_templates
CREATE POLICY "All authenticated users can view templates"
  ON marketing_flow_task_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert templates"
  ON marketing_flow_task_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates"
  ON marketing_flow_task_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete templates"
  ON marketing_flow_task_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add linked_channel_id to tasks table
ALTER TABLE tasks 
ADD COLUMN linked_channel_id UUID REFERENCES marketing_flow_channels(id) ON DELETE SET NULL;

-- Create function to update channel progress
CREATE OR REPLACE FUNCTION update_channel_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_id UUID;
  v_total_tasks INTEGER;
  v_done_tasks INTEGER;
  v_progress NUMERIC;
BEGIN
  v_channel_id := NEW.linked_channel_id;
  
  IF v_channel_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO v_total_tasks
  FROM marketing_flow_task_links
  WHERE channel_id = v_channel_id;
  
  SELECT COUNT(*) INTO v_done_tasks
  FROM tasks t
  INNER JOIN marketing_flow_task_links l ON t.id = l.task_id
  WHERE l.channel_id = v_channel_id AND t.status = 'done';
  
  IF v_total_tasks = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((100.0 * v_done_tasks / v_total_tasks)::NUMERIC, 0);
  END IF;
  
  UPDATE marketing_flow_channels
  SET progress = v_progress, updated_at = now()
  WHERE id = v_channel_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for progress updates
CREATE TRIGGER trigger_update_channel_progress
AFTER UPDATE OF status ON tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.linked_channel_id IS NOT NULL)
EXECUTE FUNCTION update_channel_progress();

-- Create function to initialize marketing flow
CREATE OR REPLACE FUNCTION initialize_marketing_flow(p_client_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_flow_id UUID;
  v_stage_names TEXT[] := ARRAY['Attract', 'Engage', 'Convert', 'Close', 'Retain and Reactivate'];
  v_stage_name TEXT;
  v_idx INTEGER := 0;
BEGIN
  SELECT id INTO v_flow_id FROM marketing_flows WHERE client_id = p_client_id;
  
  IF v_flow_id IS NOT NULL THEN
    RETURN v_flow_id;
  END IF;
  
  INSERT INTO marketing_flows (client_id, created_by)
  VALUES (p_client_id, p_user_id)
  RETURNING id INTO v_flow_id;
  
  FOREACH v_stage_name IN ARRAY v_stage_names LOOP
    INSERT INTO marketing_flow_stages (flow_id, name, order_index)
    VALUES (v_flow_id, v_stage_name, v_idx);
    v_idx := v_idx + 1;
  END LOOP;
  
  RETURN v_flow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed task templates
INSERT INTO marketing_flow_task_templates (channel_name, stage_name, title, description, priority) VALUES
('Google Ads', 'Attract', 'Launch campaign', 'Set up initial Google Ads campaign with targeting and budget', 'high'),
('Google Ads', 'Attract', 'Weekly performance check', 'Review campaign metrics and optimize bids weekly', 'normal'),
('SEO', 'Attract', 'Optimize homepage meta title', 'Update meta title and description for SEO best practices', 'high'),
('SEO', 'Attract', 'Publish monthly blog', 'Create and publish SEO-optimized blog content monthly', 'normal'),
('Facebook Ads', 'Attract', 'Setup pixel', 'Install Facebook pixel for conversion tracking', 'high'),
('Facebook Ads', 'Attract', 'Launch awareness campaign', 'Create and launch brand awareness ad campaign', 'normal'),
('Website', 'Engage', 'Add lead magnet', 'Create and integrate downloadable lead magnet offer', 'high'),
('Website', 'Engage', 'Add case study', 'Publish detailed case study page with results', 'normal'),
('Email Opt-in', 'Engage', 'Connect CRM form', 'Integrate email opt-in form with CRM system', 'high'),
('Email Opt-in', 'Engage', 'Setup double opt-in', 'Configure double opt-in email confirmation flow', 'normal'),
('CRM', 'Convert', 'Create pipeline stages', 'Set up sales pipeline with proper stages and automation', 'high'),
('CRM', 'Convert', 'Assign lead sources', 'Configure lead source tracking and attribution', 'normal'),
('Call Tracking', 'Convert', 'Setup dynamic insertion', 'Implement dynamic phone number insertion for tracking', 'high'),
('Call Tracking', 'Convert', 'Weekly review', 'Review call metrics and recordings weekly', 'low'),
('Email Follow-Up', 'Close', 'Create proposal email', 'Design professional proposal email template', 'high'),
('Email Follow-Up', 'Close', 'Build win-back sequence', 'Create automated email sequence for lost opportunities', 'normal'),
('Calendar Booking', 'Close', 'Integrate with CRM', 'Connect calendar booking system to CRM', 'high'),
('Calendar Booking', 'Close', 'Confirm follow-up automation', 'Set up automatic confirmation and reminder emails', 'normal'),
('Reviews', 'Retain and Reactivate', 'Send review request automation', 'Automate review request emails to satisfied customers', 'high'),
('Newsletter', 'Retain and Reactivate', 'Create monthly send template', 'Design newsletter template and schedule', 'normal'),
('Reactivation Campaign', 'Retain and Reactivate', 'Identify inactive clients', 'Create segment for inactive customer list', 'normal'),
('Reactivation Campaign', 'Retain and Reactivate', 'Launch SMS or Email sequence', 'Send reactivation campaign to win back customers', 'high');