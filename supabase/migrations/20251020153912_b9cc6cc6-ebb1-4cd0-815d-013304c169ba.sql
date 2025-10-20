-- 1. Remove the $2999/mo Marketing Pro plan (no clients assigned)
DELETE FROM billing_plans 
WHERE id = '88238b27-73e4-4ae7-940d-54f5e430b0b4';

-- 2. Add the new $297/mo Self-Service Pro plan
INSERT INTO billing_plans (name, price_monthly, features, is_portal_only)
VALUES (
  'Self-Service Pro',
  297,
  ARRAY[
    'Full LaunchPad Access',
    'Task Management',
    'Asset Library',
    'Avatar Builder',
    'Marketing Flowchart & Ideas',
    'Unlimited Team Members',
    'Reports & Analytics',
    '90-Day Free Trial'
  ],
  true
);

-- 3. Add max_team_members column to billing_plans table
ALTER TABLE billing_plans 
ADD COLUMN max_team_members INTEGER DEFAULT NULL;

-- 4. Set team member limits for each plan
-- $99/mo plan: 1 team member
UPDATE billing_plans 
SET max_team_members = 1 
WHERE price_monthly = 99;

-- $297/mo plan: unlimited (NULL = no limit)
UPDATE billing_plans 
SET max_team_members = NULL 
WHERE price_monthly = 297;