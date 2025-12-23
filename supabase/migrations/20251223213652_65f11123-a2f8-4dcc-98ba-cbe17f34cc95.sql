-- First, clean up duplicate entries - keep the ones with actual data
DELETE FROM channel_weekly_kpis 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY channel_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start_date 
             ORDER BY 
               CASE WHEN kpi_data::text != '{}' AND kpi_data IS NOT NULL THEN 0 ELSE 1 END,
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST
           ) as rn
    FROM channel_weekly_kpis
  ) dupes
  WHERE rn > 1
);

-- Now create the unique index that handles NULL campaign_id correctly
CREATE UNIQUE INDEX IF NOT EXISTS channel_weekly_kpis_channel_campaign_week_unique_nullsafe 
ON channel_weekly_kpis (channel_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start_date);