import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('SOS Tracker v2 — Lighthouse Edge Function', () => {
  const fnPath = resolve(__dirname, '../../supabase/functions/lighthouse-audit/index.ts');

  it('lighthouse-audit edge function file exists', () => {
    expect(existsSync(fnPath)).toBe(true);
  });

  it('calls PageSpeed Insights API v5', () => {
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('pagespeedonline.googleapis.com/pagespeedonline/v5');
  });

  it('runs both mobile and desktop strategies', () => {
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain("'mobile'");
    expect(content).toContain("'desktop'");
  });

  it('stores results in lighthouse_audits table', () => {
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('lighthouse_audits');
  });

  it('supports single client and batch mode', () => {
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('client_id');
    // batch mode fetches all active clients
    expect(content).toContain("'active'");
  });

  it('uses GOOGLE_PSI_API_KEY env var', () => {
    const content = readFileSync(fnPath, 'utf-8');
    expect(content).toContain('GOOGLE_PSI_API_KEY');
  });
});

describe('SOS Tracker v2 — Lighthouse Cron', () => {
  const cronPath = resolve(__dirname, '../../supabase/migrations/20260324100001_lighthouse_cron.sql');

  it('cron migration file exists', () => {
    expect(existsSync(cronPath)).toBe(true);
  });

  it('schedules weekly on Sundays at 3 AM UTC', () => {
    const sql = readFileSync(cronPath, 'utf-8');
    expect(sql).toContain('0 3 * * 0');
  });

  it('calls lighthouse-audit function', () => {
    const sql = readFileSync(cronPath, 'utf-8');
    expect(sql).toContain('lighthouse-audit');
  });
});

describe('SOS Tracker v2 — AnalyticsSetupTab Updates', () => {
  const tabPath = resolve(__dirname, '../../src/components/settings/AnalyticsSetupTab.tsx');

  it('uses v2 async script tag', () => {
    const content = readFileSync(tabPath, 'utf-8');
    expect(content).toContain('sos-tracker');
    expect(content).toContain('async');
  });

  it('has GA4 configuration section', () => {
    const content = readFileSync(tabPath, 'utf-8');
    expect(content).toContain('ga4_configs');
    expect(content).toContain('measurement_id');
  });

  it('has Lighthouse audit button', () => {
    const content = readFileSync(tabPath, 'utf-8');
    expect(content).toContain('lighthouse-audit');
  });
});
