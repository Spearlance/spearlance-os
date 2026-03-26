-- Service-based keyword tracking for optimization engine

CREATE TABLE IF NOT EXISTS client_service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_slug text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  location_code integer,
  has_page boolean DEFAULT false,
  page_url text,
  is_expansion_target boolean DEFAULT false,
  priority text DEFAULT 'secondary' CHECK (priority IN ('primary', 'secondary')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  discovered_by text DEFAULT 'manual' CHECK (discovered_by IN ('manual', 'auto', 'ai')),
  UNIQUE(client_id, service_slug, city, state)
);

CREATE INDEX idx_csl_client_active ON client_service_locations (client_id, active);
CREATE INDEX idx_csl_client_service ON client_service_locations (client_id, service_slug);

-- RLS
ALTER TABLE client_service_locations ENABLE ROW LEVEL SECURITY;

-- Same SELECT pattern as other optimization tables
CREATE POLICY "Users can view client_service_locations for their clients"
  ON client_service_locations FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

-- Users can manage service locations for their clients
CREATE POLICY "Users can manage client_service_locations for their clients"
  ON client_service_locations FOR ALL
  USING (client_id IN (
    SELECT id FROM clients WHERE id IN (
      SELECT unnest(associated_client_ids) FROM profiles WHERE id = auth.uid()
    )
    UNION
    SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'fmm')
    )
  ));

-- Service role can manage all
CREATE POLICY "Service role can manage client_service_locations"
  ON client_service_locations FOR ALL
  USING (true) WITH CHECK (true);
