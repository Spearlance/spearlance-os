import { describe, it, expect } from 'vitest';
import { PRICING } from '../pricing';

describe('pricing constants', () => {
  it('exports website addon price', () => {
    expect(PRICING.WEBSITE_ADDON).toBe(750);
  });

  it('exports all tier prices', () => {
    expect(PRICING.STARTER_MONTHLY).toBe(99);
    expect(PRICING.STARTER_ANNUAL).toBe(499);
    expect(PRICING.UNLIMITED_MONTHLY).toBe(297);
    expect(PRICING.UNLIMITED_ANNUAL).toBe(2097);
  });

  it('formats prices', () => {
    expect(PRICING.format(750)).toBe('$750');
  });
});
