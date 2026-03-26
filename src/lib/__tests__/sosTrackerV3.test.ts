import { describe, it, expect } from 'vitest';

function extractClickIds(searchString: string): Record<string, string> {
  const p = new URLSearchParams(searchString);
  const ids: Record<string, string> = {};
  for (const key of ['gclid', 'fbclid', 'msclkid', 'li_fat_id']) {
    const v = p.get(key);
    if (v) ids[key] = v;
  }
  return ids;
}

function isBotUA(ua: string): boolean {
  return /bot|crawl|spider|headless/i.test(ua);
}

function isWebdriver(nav: { webdriver?: boolean }): boolean {
  return nav.webdriver === true;
}

describe('SOS Tracker v3 — Click ID Capture', () => {
  it('extracts gclid from URL params', () => {
    const ids = extractClickIds('?gclid=abc123&utm_source=google');
    expect(ids.gclid).toBe('abc123');
    expect(ids.utm_source).toBeUndefined();
  });

  it('extracts fbclid from URL params', () => {
    const ids = extractClickIds('?fbclid=fb_click_456');
    expect(ids.fbclid).toBe('fb_click_456');
  });

  it('extracts msclkid from URL params', () => {
    const ids = extractClickIds('?msclkid=ms_789');
    expect(ids.msclkid).toBe('ms_789');
  });

  it('extracts li_fat_id from URL params', () => {
    const ids = extractClickIds('?li_fat_id=li_001');
    expect(ids.li_fat_id).toBe('li_001');
  });

  it('extracts multiple click IDs simultaneously', () => {
    const ids = extractClickIds('?gclid=g1&fbclid=f1&msclkid=m1');
    expect(ids).toEqual({ gclid: 'g1', fbclid: 'f1', msclkid: 'm1' });
  });

  it('returns empty object when no click IDs present', () => {
    const ids = extractClickIds('?utm_source=google&utm_medium=cpc');
    expect(ids).toEqual({});
  });
});

describe('SOS Tracker v3 — Bot Pre-Filter', () => {
  it('detects bot in user agent', () => {
    expect(isBotUA('Googlebot/2.1')).toBe(true);
  });

  it('detects headless browser', () => {
    expect(isBotUA('HeadlessChrome')).toBe(true);
  });

  it('passes real browser UA', () => {
    expect(isBotUA('Mozilla/5.0 Chrome/120.0')).toBe(false);
  });

  it('detects navigator.webdriver', () => {
    expect(isWebdriver({ webdriver: true })).toBe(true);
  });

  it('passes normal navigator', () => {
    expect(isWebdriver({ webdriver: false })).toBe(false);
    expect(isWebdriver({})).toBe(false);
  });
});
