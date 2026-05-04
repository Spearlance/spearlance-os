import { describe, it, expect } from 'vitest';
import { parseConfigToml, getChangedFunctions, detectSharedChanges, buildDeployList, parseArgs, getProjectRef } from './deploy-functions.mjs';

describe('deploy-functions', () => {
  it('module exports all expected functions', () => {
    expect(typeof parseConfigToml).toBe('function');
    expect(typeof getChangedFunctions).toBe('function');
    expect(typeof detectSharedChanges).toBe('function');
    expect(typeof buildDeployList).toBe('function');
    expect(typeof parseArgs).toBe('function');
    expect(typeof getProjectRef).toBe('function');
  });
});

describe('parseArgs --env flag', () => {
  it('extracts --env value when given', () => {
    const flags = parseArgs(['node', 'deploy-functions.mjs', '--env', 'dev']);
    expect(flags.env).toBe('dev');
  });

  it('extracts --env=value form', () => {
    const flags = parseArgs(['node', 'deploy-functions.mjs', '--env=prod']);
    expect(flags.env).toBe('prod');
  });

  it('defaults env to "dev" when --env is not provided', () => {
    const flags = parseArgs(['node', 'deploy-functions.mjs', '--status']);
    expect(flags.env).toBe('dev');
  });

  it('still parses other flags alongside --env', () => {
    const flags = parseArgs(['node', 'deploy-functions.mjs', '--env', 'prod', '--all', '--yes']);
    expect(flags.env).toBe('prod');
    expect(flags.all).toBe(true);
    expect(flags.yes).toBe(true);
  });
});

describe('getProjectRef', () => {
  it('returns dev ref for env="dev"', () => {
    expect(getProjectRef('dev')).toBe('locxfzyhfugetawadghu');
  });

  it('returns prod ref for env="prod"', () => {
    expect(getProjectRef('prod')).toBe('chikljxwgiskyjsnjelf');
  });

  it('throws on unknown env value', () => {
    expect(() => getProjectRef('staging')).toThrow(/staging/);
  });

  it('throws on empty env value', () => {
    expect(() => getProjectRef('')).toThrow();
  });
});

describe('detectSharedChanges', () => {
  it('returns true when _shared files are in diff', () => {
    const diff = [
      'supabase/functions/_shared/embeddings.ts',
      'supabase/functions/foo/index.ts',
    ].join('\n');
    expect(detectSharedChanges(diff)).toBe(true);
  });

  it('returns false when no _shared files in diff', () => {
    const diff = 'supabase/functions/foo/index.ts\nsupabase/functions/bar/index.ts';
    expect(detectSharedChanges(diff)).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(detectSharedChanges('')).toBe(false);
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

describe('buildDeployList', () => {
  it('returns missing functions (in repo, not deployed)', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a'],
      changedFunctions: [],
      sharedChanged: false,
    });
    expect(result.toDeploy).toEqual(['b', 'c']);
    expect(result.orphaned).toEqual([]);
  });

  it('includes changed functions even if already deployed', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b'],
      remoteFunctions: ['a', 'b'],
      changedFunctions: ['a'],
      sharedChanged: false,
    });
    expect(result.toDeploy).toEqual(['a']);
  });

  it('returns all repo functions when sharedChanged is true', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a', 'b', 'c'],
      changedFunctions: [],
      sharedChanged: true,
    });
    expect(result.toDeploy).toEqual(['a', 'b', 'c']);
    expect(result.sharedWarning).toBe(true);
  });

  it('flags orphaned functions (deployed but not in repo)', () => {
    const result = buildDeployList({
      repoFunctions: ['a'],
      remoteFunctions: ['a', 'gone'],
      changedFunctions: [],
      sharedChanged: false,
    });
    expect(result.orphaned).toEqual(['gone']);
  });

  it('deduplicates missing + changed', () => {
    const result = buildDeployList({
      repoFunctions: ['a', 'b', 'c'],
      remoteFunctions: ['a'],
      changedFunctions: ['b'],
      sharedChanged: false,
    });
    expect(result.toDeploy).toEqual(['b', 'c']);
  });
});
