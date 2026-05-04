import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const seedPath = join(process.cwd(), 'supabase', 'seed.sql');

describe('seed data file', () => {
  it('seed.sql exists', () => {
    expect(existsSync(seedPath)).toBe(true);
  });

  const seed = existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';

  it('references the test admin email used by Playwright', () => {
    expect(seed).toContain('dev@spearlance.com');
  });

  it('creates ABC Company client', () => {
    expect(seed).toContain('ABC Company');
  });

  it('creates Demo Construction Co fixture', () => {
    expect(seed).toContain('Demo Construction Co');
  });

  it('creates Sunshine Dental fixture', () => {
    expect(seed).toContain('Sunshine Dental');
  });

  it('inserts billing_plans rows', () => {
    expect(seed).toMatch(/INSERT\s+INTO\s+(public\.)?billing_plans/i);
  });

  it('seeds the user_roles table for admin', () => {
    expect(seed).toContain('user_roles');
    expect(seed).toContain('admin');
  });

  it('is idempotent — uses ON CONFLICT or DELETE-first cleanup', () => {
    const hasConflict = /ON\s+CONFLICT/i.test(seed);
    const hasCleanup = /DELETE\s+FROM/i.test(seed) || /TRUNCATE/i.test(seed);
    expect(hasConflict || hasCleanup).toBe(true);
  });

  it('seeds web_events for SOS Tracker testing', () => {
    expect(seed).toMatch(/INSERT\s+INTO\s+(public\.)?web_events/i);
  });

  it('seeds leads for lead pipeline testing', () => {
    expect(seed).toMatch(/INSERT\s+INTO\s+(public\.)?leads/i);
  });

  it('uses safe enum values for ticket priority (task_priority enum)', () => {
    if (/INSERT\s+INTO\s+(public\.)?tickets/i.test(seed)) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const matchedAny = validPriorities.some((p) => seed.includes(`'${p}'`));
      expect(matchedAny).toBe(true);
    }
  });
});
