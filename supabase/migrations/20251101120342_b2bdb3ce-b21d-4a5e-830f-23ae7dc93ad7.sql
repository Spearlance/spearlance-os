-- Create web analytics tables and infrastructure

-- Main events table
CREATE TABLE web_events (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  ts_ms bigint NOT NULL,
  sid text NOT NULL,
  uid text,
  type text NOT NULL CHECK (type IN ('page_view','content_view','lead_submitted','scroll_depth','engaged_time')),
  url text,
  path text,
  title text,
  referrer text,
  source text,
  medium text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  entry boolean DEFAULT false,
  content_type text,
  slug text,
  form text,
  value numeric,
  ua_family text,
  ua_device text,
  ip_hash text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_web_events_client_id ON web_events(client_id);
CREATE INDEX idx_web_events_type ON web_events(type);
CREATE INDEX idx_web_events_received_at ON web_events(received_at DESC);
CREATE INDEX idx_web_events_path ON web_events(path);
CREATE INDEX idx_web_events_sid ON web_events(sid);
CREATE INDEX idx_web_events_content ON web_events(content_type, slug) WHERE content_type IS NOT NULL;
CREATE INDEX idx_web_events_ts_ms ON web_events(ts_ms DESC);

-- Workspace keys for tracking different sites
CREATE TABLE analytics_workspace_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  workspace_key text NOT NULL UNIQUE,
  site_name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_event_at timestamptz
);

CREATE INDEX idx_analytics_workspace_client ON analytics_workspace_keys(client_id);
CREATE INDEX idx_analytics_workspace_key ON analytics_workspace_keys(workspace_key);

-- Materialized view: Page performance daily rollups
CREATE MATERIALIZED VIEW page_daily AS
SELECT
  client_id,
  date_trunc('day', to_timestamp(ts_ms/1000)) as day,
  path,
  COUNT(*) FILTER (WHERE type='page_view' AND entry) as entry_sessions,
  COUNT(*) FILTER (WHERE type='page_view') as total_pageviews,
  COUNT(DISTINCT sid) as unique_sessions,
  COUNT(DISTINCT sid) FILTER (WHERE type='lead_submitted') as leads_started,
  AVG(value) FILTER (WHERE type='engaged_time') as avg_engaged_seconds
FROM web_events
WHERE ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3;

CREATE UNIQUE INDEX idx_page_daily_unique ON page_daily(client_id, day, path);

-- Materialized view: Content performance
CREATE MATERIALIZED VIEW content_daily AS
SELECT
  client_id,
  date_trunc('day', to_timestamp(ts_ms/1000)) as day,
  content_type,
  slug,
  COUNT(*) FILTER (WHERE type='content_view') as total_views,
  COUNT(DISTINCT sid) as unique_visitors,
  COUNT(DISTINCT sid) FILTER (WHERE type='page_view' AND entry) as entry_sessions,
  COUNT(DISTINCT sid) FILTER (WHERE type='lead_submitted') as leads_same_session
FROM web_events
WHERE content_type IS NOT NULL
  AND ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX idx_content_daily_unique ON content_daily(client_id, day, content_type, slug);

-- Materialized view: Traffic sources
CREATE MATERIALIZED VIEW sources_daily AS
SELECT
  client_id,
  date_trunc('day', to_timestamp(ts_ms/1000)) as day,
  COALESCE(utm_source, source, 'direct') as source,
  COALESCE(utm_medium, medium, 'none') as medium,
  COUNT(DISTINCT sid) FILTER (WHERE type='page_view' AND entry) as sessions,
  COUNT(DISTINCT sid) FILTER (WHERE type='lead_submitted') as leads,
  COUNT(*) FILTER (WHERE type='page_view') as pageviews
FROM web_events
WHERE ts_ms > extract(epoch from now() - interval '90 days')*1000
GROUP BY 1,2,3,4;

CREATE UNIQUE INDEX idx_sources_daily_unique ON sources_daily(client_id, day, source, medium);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies for web_events
ALTER TABLE web_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for accessible clients"
  ON web_events FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Service role can insert events"
  ON web_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for analytics_workspace_keys
ALTER TABLE analytics_workspace_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace keys for accessible clients"
  ON analytics_workspace_keys FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins and FMMs can manage workspace keys"
  ON analytics_workspace_keys FOR ALL
  USING (
    has_client_access(auth.uid(), client_id) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'fmm')
    )
  );