import { describe, it, expect } from 'vitest';

/**
 * Validates AI model identifiers used by edge functions via OpenRouter.
 * OpenRouter model IDs use dots (e.g. anthropic/claude-sonnet-4.6),
 * NOT hyphens in version numbers (anthropic/claude-sonnet-4-6 is invalid).
 *
 * These constants are duplicated from supabase/functions/_shared/aiClient.ts
 * because edge functions run in Deno and can't be imported into Vitest directly.
 * If a model ID changes in aiClient.ts, update here too.
 */

const AI_MODELS = {
  TEXT: 'anthropic/claude-sonnet-4.6',
  IMAGE: 'google/gemini-2.5-flash-image-preview',
} as const;

describe('AI model identifiers', () => {
  it('TEXT model uses valid OpenRouter format (provider/model-version with dots)', () => {
    expect(AI_MODELS.TEXT).toMatch(/^[a-z]+\/[a-z]+-[a-z]+-\d+\.\d+$/);
    expect(AI_MODELS.TEXT).toBe('anthropic/claude-sonnet-4.6');
  });

  it('IMAGE model uses valid OpenRouter format', () => {
    expect(AI_MODELS.IMAGE).toMatch(/^[a-z]+\//);
    expect(AI_MODELS.IMAGE).toBe('google/gemini-2.5-flash-image-preview');
  });

  it('TEXT model version does NOT use hyphens instead of dots', () => {
    // This was the original bug: anthropic/claude-sonnet-4-5 (hyphens) instead of dots
    const versionPart = AI_MODELS.TEXT.split('/')[1];
    // Version number segment should contain a dot, not be all-hyphens
    expect(versionPart).toMatch(/\d+\.\d+/);
  });
});
