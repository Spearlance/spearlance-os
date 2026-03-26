/**
 * Bot detection utilities for analytics-collector.
 * Runs server-side on every incoming event.
 */

const BOT_UA_PATTERNS = /bot|crawl|spider|headless|phantom|puppeteer|playwright|selenium|wget|curl|python-requests|go-http|java\/|libwww|slurp|mediapartners|adsbot|facebookexternalhit|bingpreview|googleother|bytespider|yandex|baidu|sogou|duckduckbot|applebot/i;

export function isKnownBotUA(ua: string): boolean {
  return BOT_UA_PATTERNS.test(ua);
}

export function isHighVelocity(eventsInWindow: number, windowSeconds: number): boolean {
  if (windowSeconds <= 0) return false;
  const eventsPerMinute = (eventsInWindow / windowSeconds) * 60;
  return eventsPerMinute > 100;
}

export function isSessionTooFast(pageViewsInSession: number, sessionDurationSeconds: number): boolean {
  if (sessionDurationSeconds <= 0) return pageViewsInSession > 1;
  return pageViewsInSession > 20 && sessionDurationSeconds < 60;
}

export function hasMinimalEngagement(scrollDepth: number, engagedSeconds: number): boolean {
  return scrollDepth > 0 || engagedSeconds > 5;
}

export interface BotCheckResult {
  isBot: boolean;
  reason: string | null;
  canForwardConversions: boolean;
}

export function checkBot(params: {
  ua: string;
  scrollDepth: number;
  engagedSeconds: number;
}): BotCheckResult {
  if (isKnownBotUA(params.ua)) {
    return { isBot: true, reason: 'known_bot_ua', canForwardConversions: false };
  }

  const engaged = hasMinimalEngagement(params.scrollDepth, params.engagedSeconds);
  return {
    isBot: false,
    reason: null,
    canForwardConversions: engaged,
  };
}
