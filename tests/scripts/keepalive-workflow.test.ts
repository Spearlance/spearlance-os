import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const workflowPath = join(process.cwd(), '.github', 'workflows', 'dev-keepalive.yml');

describe('dev keepalive workflow', () => {
  it('workflow file exists', () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  const content = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf-8') : '';
  const workflow = content ? parse(content) : null;

  it('has a name', () => {
    expect(workflow?.name).toBeDefined();
  });

  it('runs on a cron schedule', () => {
    expect(workflow?.on?.schedule).toBeDefined();
    expect(Array.isArray(workflow.on.schedule)).toBe(true);
    expect(workflow.on.schedule[0].cron).toBeDefined();
  });

  it('cron runs every 3 days', () => {
    expect(workflow?.on?.schedule?.[0]?.cron).toBe('0 12 */3 * *');
  });

  it('supports manual dispatch (workflow_dispatch)', () => {
    expect(workflow?.on?.workflow_dispatch).toBeDefined();
  });

  it('has a keepalive job', () => {
    expect(workflow?.jobs?.keepalive).toBeDefined();
  });

  it('keepalive job runs on ubuntu-latest', () => {
    expect(workflow?.jobs?.keepalive?.['runs-on']).toBe('ubuntu-latest');
  });

  it('references DEV_SUPABASE_URL secret', () => {
    expect(content).toContain('DEV_SUPABASE_URL');
    expect(content).toContain('secrets.DEV_SUPABASE_URL');
  });

  it('references DEV_SUPABASE_ANON_KEY secret', () => {
    expect(content).toContain('DEV_SUPABASE_ANON_KEY');
    expect(content).toContain('secrets.DEV_SUPABASE_ANON_KEY');
  });

  it('uses curl to ping Supabase', () => {
    expect(content).toMatch(/curl/);
  });
});
