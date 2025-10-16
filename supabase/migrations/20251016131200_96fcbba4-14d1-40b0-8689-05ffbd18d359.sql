-- Create "Social Media" folders for all clients with social media posts
INSERT INTO asset_folders (client_id, name, color, created_by)
SELECT DISTINCT 
  sm.client_id,
  'Social Media' AS name,
  '#8B5CF6' AS color,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) AS created_by
FROM social_media_posts sm
WHERE NOT EXISTS (
  SELECT 1 
  FROM asset_folders af 
  WHERE af.client_id = sm.client_id 
  AND af.name = 'Social Media'
);