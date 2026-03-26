import { describe, it, expect } from 'vitest';

// Test the pure logic functions. Same code goes into the Deno edge function.
const BOT_UA_PATTERNS = /bot|crawl|spider|headless|phantom|puppeteer|playwright|selenium|wget|curl|python-requests|go-http|java\/|libwww|slurp|mediapartners|adsbot|facebookexternalhit|bingpreview|googleother|bytespider|yandex|baidu|sogou|duckduckbot|applebot/i;

function isKnownBotUA(ua: string): boolean {
  return BOT_UA_PATTERNS.test(ua);
}

function isHighVelocity(eventsInWindow: number, windowSeconds: number): boolean {
  if (windowSeconds <= 0) return false;
  const eventsPerMinute = (eventsInWindow / windowSeconds) * 60;
  return eventsPerMinute > 100;
}

function isSessionTooFast(pageViewsInSession: number, sessionDurationSeconds: number): boolean {
  if (sessionDurationSeconds <= 0) return pageViewsInSession > 1;
  return pageViewsInSession > 20 && sessionDurationSeconds < 60;
}

function hasMinimalEngagement(scrollDepth: number, engagedSeconds: number): boolean {
  return scrollDepth > 0 || engagedSeconds > 5;
}

describe('Bot Detection', () => {
  describe('isKnownBotUA', () => {
    it('detects Googlebot', () => {
      expect(isKnownBotUA('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    });

    it('detects Bingbot', () => {
      expect(isKnownBotUA('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    });

    it('detects headless Chrome', () => {
      expect(isKnownBotUA('Mozilla/5.0 HeadlessChrome/90.0')).toBe(true);
    });

    it('detects Puppeteer', () => {
      expect(isKnownBotUA('Mozilla/5.0 Puppeteer')).toBe(true);
    });

    it('detects Python requests', () => {
      expect(isKnownBotUA('python-requests/2.28.0')).toBe(true);
    });

    it('passes real Chrome UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    });

    it('passes real Safari UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')).toBe(false);
    });

    it('passes real mobile Chrome UA', () => {
      expect(isKnownBotUA('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')).toBe(false);
    });
  });

  describe('isHighVelocity', () => {
    it('flags >100 events/min', () => {
      expect(isHighVelocity(200, 60)).toBe(true);
    });

    it('passes normal traffic', () => {
      expect(isHighVelocity(5, 60)).toBe(false);
    });

    it('handles zero window', () => {
      expect(isHighVelocity(5, 0)).toBe(false);
    });
  });

  describe('isSessionTooFast', () => {
    it('flags 25 pageviews in 30 seconds', () => {
      expect(isSessionTooFast(25, 30)).toBe(true);
    });

    it('passes 5 pageviews in 300 seconds', () => {
      expect(isSessionTooFast(5, 300)).toBe(false);
    });
  });

  describe('hasMinimalEngagement', () => {
    it('returns true when user scrolled', () => {
      expect(hasMinimalEngagement(25, 0)).toBe(true);
    });

    it('returns true when user engaged >5s', () => {
      expect(hasMinimalEngagement(0, 10)).toBe(true);
    });

    it('returns false when zero engagement', () => {
      expect(hasMinimalEngagement(0, 0)).toBe(false);
    });
  });
});
