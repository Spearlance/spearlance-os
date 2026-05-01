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
