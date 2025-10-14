-- Temporarily move all stages to high order_index values to avoid conflicts
UPDATE standard_marketing_stages 
SET order_index = order_index + 100;

-- Insert new Foundations stage at position 0
INSERT INTO standard_marketing_stages (name, description, order_index)
VALUES (
  'Foundations',
  'Establish the systems, tracking, and offer clarity that make every other stage work.',
  0
);

-- Update Attract → Create Demand and set final order_index
UPDATE standard_marketing_stages
SET 
  name = 'Create Demand',
  description = 'Reach new audiences and generate interest from people who didn''t know they needed you yet.',
  order_index = 1
WHERE name = 'Attract';

-- Update Engage → Capture Demand and set final order_index
UPDATE standard_marketing_stages
SET 
  name = 'Capture Demand',
  description = 'Convert active searchers into leads by showing up where intent already exists.',
  order_index = 2
WHERE name = 'Engage';

-- Update Convert description and set final order_index
UPDATE standard_marketing_stages
SET 
  description = 'Turn collected leads into qualified opportunities through nurturing and automation.',
  order_index = 3
WHERE name = 'Convert';

-- Update Close description and set final order_index
UPDATE standard_marketing_stages
SET 
  description = 'Transform opportunities into paying clients with a streamlined sales and onboarding process.',
  order_index = 4
WHERE name = 'Close';

-- Update Retain and Reactivate → Retain & Reactivate and set final order_index
UPDATE standard_marketing_stages
SET 
  name = 'Retain & Reactivate',
  description = 'Keep clients engaged, build loyalty, and bring back past customers for repeat business.',
  order_index = 5
WHERE name = 'Retain and Reactivate';