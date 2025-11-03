-- Drop existing materialized views
DROP MATERIALIZED VIEW IF EXISTS page_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS content_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS sources_daily CASCADE;

-- Recreate page_daily with timezone support
CREATE MATERIALIZED VIEW page_daily AS
SELECT
  w.client_id,
  date_trunc('day', (to_timestamp(w.ts_ms/1000) AT TIME ZONE c.timezone)) as day,
  w.path,
  COUNT(*) FILTER (WHERE w.type='page_view' AND w.entry) as entry_sessions,
  COUNT(*) FILTER (WHERE w.type='page_view') as total_pageviews,
  COUNT(DISTINCT w.sid) as unique_sessions,
  COUNT(DISTINCT w.sid) FILTER (WHERE w.type='lead_submitted') as leads_started,
  AVG(w.value) FILTER (WHERE w.type='engaged_time') as avg_engaged_seconds
FROM web_events w
JOIN clients c ON c.id = w.client_id
WHERE w.ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3;

CREATE UNIQUE INDEX idx_page_daily_unique ON page_daily(client_id, day, path);

-- Recreate content_daily with timezone support
CREATE MATERIALIZED VIEW content_daily AS
SELECT
  w.client_id,
  date_trunc('day', (to_timestamp(w.ts_ms/1000) AT TIME ZONE c.timezone)) as day,
  w.content_type,
  w.slug,
  COUNT(*) FILTER (WHERE w.type='content_view') as total_views,
  COUNT(DISTINCT w.sid) as unique_visitors,
  COUNT(DISTINCT w.sid) FILTER (WHERE w.type='page_view' AND w.entry) as entry_sessions,
  COUNT(DISTINCT w.sid) FILTER (WHERE w.type='lead_submitted') as leads_same_session
FROM web_events w
JOIN clients c ON c.id = w.client_id
WHERE w.content_type IS NOT NULL
  AND w.ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX idx_content_daily_unique ON content_daily(client_id, day, content_type, slug);

-- Recreate sources_daily with timezone support
CREATE MATERIALIZED VIEW sources_daily AS
SELECT
  w.client_id,
  date_trunc('day', (to_timestamp(w.ts_ms/1000) AT TIME ZONE c.timezone)) as day,
  COALESCE(w.utm_source, w.source, 'direct') as source,
  COALESCE(w.utm_medium, w.medium, 'none') as medium,
  COUNT(DISTINCT w.sid) FILTER (WHERE w.type='page_view' AND w.entry) as sessions,
  COUNT(DISTINCT w.sid) FILTER (WHERE w.type='lead_submitted') as leads,
  COUNT(*) FILTER (WHERE w.type='page_view') as pageviews
FROM web_events w
JOIN clients c ON c.id = w.client_id
WHERE w.ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX idx_sources_daily_unique ON sources_daily(client_id, day, source, medium);

-- Add comments to document timezone handling
COMMENT ON MATERIALIZED VIEW page_daily IS 'Daily page performance metrics, days calculated in client timezone';
COMMENT ON MATERIALIZED VIEW content_daily IS 'Daily content performance metrics, days calculated in client timezone';
COMMENT ON MATERIALIZED VIEW sources_daily IS 'Daily traffic source metrics, days calculated in client timezone';