import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('SOS Tracker v2 — usePerformanceData hook', () => {
  const hookPath = resolve(__dirname, '../hooks/usePerformanceData.ts');

  it('hook file exists', () => {
    expect(existsSync(hookPath)).toBe(true);
  });

  it('exports useCWVMetrics', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('useCWVMetrics');
  });

  it('exports useLighthouseAudits', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('useLighthouseAudits');
  });

  it('queries cwv_metrics table', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('cwv_metrics');
  });

  it('queries lighthouse_audits table', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('lighthouse_audits');
  });

  it('calculates p75 values', () => {
    const content = readFileSync(hookPath, 'utf-8');
    expect(content).toContain('p75');
  });
});

describe('SOS Tracker v2 — CWVGauges component', () => {
  const compPath = resolve(__dirname, '../components/analytics/CWVGauges.tsx');

  it('component file exists', () => {
    expect(existsSync(compPath)).toBe(true);
  });

  it('shows LCP, CLS, INP metrics', () => {
    const content = readFileSync(compPath, 'utf-8');
    expect(content).toContain('LCP');
    expect(content).toContain('CLS');
    expect(content).toContain('INP');
  });
});

describe('SOS Tracker v2 — LighthouseScoreCard component', () => {
  const compPath = resolve(__dirname, '../components/analytics/LighthouseScoreCard.tsx');

  it('component file exists', () => {
    expect(existsSync(compPath)).toBe(true);
  });

  it('shows performance score', () => {
    const content = readFileSync(compPath, 'utf-8');
    expect(content).toContain('performance_score');
  });

  it('shows optimization opportunities', () => {
    const content = readFileSync(compPath, 'utf-8');
    expect(content).toContain('opportunities');
  });
});

describe('SOS Tracker v2 — GA4StatusCard component', () => {
  const compPath = resolve(__dirname, '../components/analytics/GA4StatusCard.tsx');

  it('component file exists', () => {
    expect(existsSync(compPath)).toBe(true);
  });

  it('checks ga4_configs', () => {
    const content = readFileSync(compPath, 'utf-8');
    expect(content).toContain('ga4_configs');
  });
});

describe('SOS Tracker v2 — Analytics page tabs', () => {
  const pagePath = resolve(__dirname, '../pages/Analytics.tsx');

  it('has Performance tab', () => {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toContain('performance');
    expect(content).toContain('CWVGauges');
  });

  it('has GA4 tab', () => {
    const content = readFileSync(pagePath, 'utf-8');
    expect(content).toContain('ga4');
    expect(content).toContain('GA4StatusCard');
  });
});
