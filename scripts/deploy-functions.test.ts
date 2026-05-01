import { describe, it, expect } from 'vitest';
import { parseConfigToml, getChangedFunctions, detectSharedChanges, buildDeployList } from './deploy-functions.mjs';

describe('deploy-functions', () => {
  it('module exports all expected functions', () => {
    expect(typeof parseConfigToml).toBe('function');
    expect(typeof getChangedFunctions).toBe('function');
    expect(typeof detectSharedChanges).toBe('function');
    expect(typeof buildDeployList).toBe('function');
  });
});

describe('getChangedFunctions', () => {
  it('extracts unique function names from git diff output', () => {
    const diff = [
      'supabase/functions/admin-create-client/index.ts',
      'supabase/functions/admin-create-client/utils.ts',
      'supabase/functions/stripe-webhook/index.ts',
    ].join('\n');
    expect(getChangedFunctions(diff)).toEqual(['admin-create-client', 'stripe-webhook']);
  });

  it('ignores _shared directory entries', () => {
    const diff = [
      'supabase/functions/_shared/embeddings.ts',
      'supabase/functions/foo/index.ts',
    ].join('\n');
    expect(getChangedFunctions(diff)).toEqual(['foo']);
  });

  it('returns empty array for no function changes', () => {
    const diff = 'src/App.tsx\npackage.json';
    expect(getChangedFunctions(diff)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(getChangedFunctions('')).toEqual([]);
  });
});

describe('parseConfigToml', () => {
  it('extracts project_id from valid config.toml', () => {
    const content = 'project_id = "chikljxwgiskyjsnjelf"\n\n[functions.foo]\nverify_jwt = true';
    expect(parseConfigToml(content)).toBe('chikljxwgiskyjsnjelf');
  });

  it('throws on missing project_id', () => {
    const content = '[functions.foo]\nverify_jwt = true';
    expect(() => parseConfigToml(content)).toThrow('project_id');
  });

  it('handles project_id with single quotes', () => {
    const content = "project_id = 'abc123'";
    expect(parseConfigToml(content)).toBe('abc123');
  });
});
