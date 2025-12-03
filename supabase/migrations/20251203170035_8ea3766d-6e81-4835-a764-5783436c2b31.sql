-- Add new columns to marketing_flow_task_templates
ALTER TABLE marketing_flow_task_templates
ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'one_off',
ADD COLUMN IF NOT EXISTS cadence TEXT,
ADD COLUMN IF NOT EXISTS owner_role TEXT,
ADD COLUMN IF NOT EXISTS client_dependency BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_dependency_notes TEXT,
ADD COLUMN IF NOT EXISTS sla_target TEXT,
ADD COLUMN IF NOT EXISTS impact TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS links_required TEXT;

-- Add check constraints
ALTER TABLE marketing_flow_task_templates
ADD CONSTRAINT task_type_check CHECK (task_type IN ('onboarding', 'recurring', 'one_off')),
ADD CONSTRAINT cadence_check CHECK (cadence IS NULL OR cadence IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
ADD CONSTRAINT owner_role_check CHECK (owner_role IS NULL OR owner_role IN ('csm', 'seo_specialist', 'ads_specialist', 'web_pm', 'content_writer', 'designer', 'dev')),
ADD CONSTRAINT sla_target_check CHECK (sla_target IS NULL OR sla_target IN ('24h', '48h', '5d', 'next_meeting')),
ADD CONSTRAINT impact_check CHECK (impact IS NULL OR impact IN ('high', 'medium', 'low'));

-- Make standard_stage_id nullable (no longer required)
ALTER TABLE marketing_flow_task_templates
ALTER COLUMN standard_stage_id DROP NOT NULL;

-- Delete all existing templates to start fresh with 5 playbooks
DELETE FROM marketing_flow_task_templates;