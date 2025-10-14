-- Sync existing marketing_flow_stages with updated standard_marketing_stages

-- First, update the order_index for existing stages to make room for Foundations
UPDATE marketing_flow_stages
SET order_index = order_index + 1
WHERE order_index >= 0;

-- Update existing stage names and order to match standard stages
UPDATE marketing_flow_stages mfs
SET 
  name = sms.name,
  order_index = sms.order_index
FROM standard_marketing_stages sms
WHERE mfs.standard_stage_id = sms.id;

-- Insert the new Foundations stage for all existing flows
INSERT INTO marketing_flow_stages (flow_id, name, order_index, standard_stage_id)
SELECT 
  mf.id as flow_id,
  'Foundations' as name,
  0 as order_index,
  '4a40dc1f-8b2e-4090-9bf0-fee02eef4633' as standard_stage_id
FROM marketing_flows mf
WHERE NOT EXISTS (
  SELECT 1 
  FROM marketing_flow_stages mfs
  WHERE mfs.flow_id = mf.id 
    AND mfs.standard_stage_id = '4a40dc1f-8b2e-4090-9bf0-fee02eef4633'
);