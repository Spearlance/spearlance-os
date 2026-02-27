import { describe, it, expect } from 'vitest';
import { UPLOAD_LIMITS } from '../upload-limits';

describe('upload limits', () => {
  it('exports size limits in bytes', () => {
    expect(UPLOAD_LIMITS.LOGO).toBe(5 * 1024 * 1024);
    expect(UPLOAD_LIMITS.GENERAL).toBe(10 * 1024 * 1024);
    expect(UPLOAD_LIMITS.VIDEO).toBe(25 * 1024 * 1024);
    expect(UPLOAD_LIMITS.ASSET).toBe(50 * 1024 * 1024);
  });

  it('formats sizes for display', () => {
    expect(UPLOAD_LIMITS.formatMB(UPLOAD_LIMITS.LOGO)).toBe('5MB');
  });
});
