-- Backfill clarity_daily_metrics by parsing raw_response JSON
UPDATE clarity_daily_metrics
SET
  total_sessions = COALESCE(
    (SELECT (elem->'information'->0->>'totalSessionCount')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'Traffic'
     LIMIT 1), 0),
  distinct_users = COALESCE(
    (SELECT (elem->'information'->0->>'distinctUserCount')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'Traffic'
     LIMIT 1), 0),
  pages_per_session = COALESCE(
    (SELECT (elem->'information'->0->>'pagesPerSessionPercentage')::numeric
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'Traffic'
     LIMIT 1), 0),
  scroll_depth = COALESCE(
    (SELECT (elem->'information'->0->>'averageScrollDepth')::numeric
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'ScrollDepth'
     LIMIT 1), 0),
  engagement_time_seconds = COALESCE(
    (SELECT (elem->'information'->0->>'activeTime')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'EngagementTime'
     LIMIT 1), 0),
  rage_click_count = COALESCE(
    (SELECT (elem->'information'->0->>'subTotal')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'RageClickCount'
     LIMIT 1), 0),
  dead_click_count = COALESCE(
    (SELECT (elem->'information'->0->>'subTotal')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'DeadClickCount'
     LIMIT 1), 0),
  quick_back_count = COALESCE(
    (SELECT (elem->'information'->0->>'subTotal')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'QuickbackClick'
     LIMIT 1), 0),
  javascript_error_count = COALESCE(
    (SELECT (elem->'information'->0->>'subTotal')::integer
     FROM jsonb_array_elements(raw_response) AS elem
     WHERE elem->>'metricName' = 'ScriptErrorCount'
     LIMIT 1), 0)
WHERE raw_response IS NOT NULL 
  AND jsonb_typeof(raw_response) = 'array'
  AND total_sessions = 0;