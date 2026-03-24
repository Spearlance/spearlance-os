import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SOS Tracker v2 — Migration', () => {
  const migrationPath = resolve(__dirname, '../../supabase/migrations/20260324100000_analytics_v2_tables.sql');

  it('migration file exists', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql.length).toBeGreaterThan(0);
  });

  it('creates cwv_metrics table with required columns', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('create table if not exists cwv_metrics');
    expect(sql).toContain('lcp_ms int');
    expect(sql).toContain('cls float');
    expect(sql).toContain('inp_ms int');
    expect(sql).toContain('fcp_ms int');
    expect(sql).toContain('ttfb_ms int');
    expect(sql).toContain("device text check (device in ('desktop', 'mobile', 'tablet'))");
  });

  it('creates ga4_configs table with required columns', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('create table if not exists ga4_configs');
    expect(sql).toContain('measurement_id text not null');
    expect(sql).toContain('api_secret text not null');
    expect(sql).toContain('is_active boolean');
    expect(sql).toContain('unique (client_id)');
  });

  it('creates lighthouse_audits table with required columns', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('create table if not exists lighthouse_audits');
    expect(sql).toContain("strategy text not null check (strategy in ('mobile', 'desktop'))");
    expect(sql).toContain('performance_score int');
    expect(sql).toContain('si_ms int');
    expect(sql).toContain('tbt_ms int');
    expect(sql).toContain('audit_data jsonb');
  });

  it('alters web_events with engagement columns', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('alter table web_events add column if not exists scroll_depth int');
    expect(sql).toContain('alter table web_events add column if not exists engaged_seconds int');
  });

  it('enables RLS on all new tables', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('alter table cwv_metrics enable row level security');
    expect(sql).toContain('alter table ga4_configs enable row level security');
    expect(sql).toContain('alter table lighthouse_audits enable row level security');
  });

  it('creates RLS policies for all tables', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('create policy "Users can view cwv_metrics for their clients"');
    expect(sql).toContain('create policy "Users can view ga4_configs for their clients"');
    expect(sql).toContain('create policy "Admins can manage ga4_configs"');
    expect(sql).toContain('create policy "Users can view lighthouse_audits for their clients"');
  });
});

describe('SOS Tracker v2 — Tracker Script', () => {
  it('sos-tracker edge function file exists', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/sos-tracker/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('tracker JS uses sendBeacon for flushing', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/sos-tracker/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('sendBeacon');
  });

  it('tracker JS collects CWV via PerformanceObserver', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/sos-tracker/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('PerformanceObserver');
    expect(content).toContain('largest-contentful-paint');
    expect(content).toContain('layout-shift');
  });

  it('tracker uses 30-min session timeout', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/sos-tracker/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    // 30 min = 1800000ms = 18e5
    expect(content).toContain('18e5');
  });

  it('tracker replaces collector URL and key placeholders', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/sos-tracker/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('%%COLLECTOR_URL%%');
    expect(content).toContain('%%KEY%%');
    expect(content).toContain('.replace');
  });
});

describe('SOS Tracker v2 — Collector Rewrite', () => {
  it('analytics-collector handles batched v2 format', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/analytics-collector/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    // v2 batched format uses `k` key and `v` array
    expect(content).toContain("'k'");
    expect(content).toContain("'v'");
  });

  it('analytics-collector stores CWV in cwv_metrics', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/analytics-collector/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('cwv_metrics');
  });

  it('analytics-collector fans out to GA4 Measurement Protocol', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/analytics-collector/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('google-analytics.com/mp/collect');
    expect(content).toContain('ga4_configs');
  });

  it('analytics-collector maintains backwards compatibility with v1', () => {
    const fnPath = resolve(__dirname, '../../supabase/functions/analytics-collector/index.ts');
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('workspaceKey');
  });
});
