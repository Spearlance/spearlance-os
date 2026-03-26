import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// Types (mirrors supabase/functions/optimization-recommend logic)
// ─────────────────────────────────────────────

interface GapSignal {
  rule: string;
  severity: string;
  description: string;
  subcategory: string;
  current: string;
  pageUrl: string;
  pageType: string;
  metrics?: Record<string, any>;
}

// ─────────────────────────────────────────────
// Implementation (self-contained for tests)
// ─────────────────────────────────────────────

const SEO_DOCTRINE_REFERENCE = `
## SEO Doctrine Reference (Key Sections)

**Section 1.1 — Meta Title Structure**
Template: [Primary Keyword + City] | [Variation 2 + City] | [Variation 3 + City] | [Brand Name]
- City MUST be embedded inside the keyword phrase, not appended separately
- Brand name always appears last
- Maximum 3-5 keyword variations before brand

**Section 2.1 — Meta Description**
- Open with primary keyword phrase (including city)
- Repeat city naturally at least once more
- Include 2-4 keyword variations
- Include one credibility trigger
- End with a call to action

**Section 3.1 — H1 Tag**
- Exactly ONE H1 per page
- Must contain the exact primary keyword phrase (including city for local pages)

**Section 6.1 — Content Thresholds**
- Service page: min 1,500 words, rewrite trigger below 1,200
- City page: min 1,200 words, rewrite trigger below 1,000
- Blog post: min 1,000 words, rewrite trigger below 800

**Section 7.1 — Internal Link Density**
- Minimum 5 internal links per page, target 10+
- First occurrence of keyword matching an existing page should be linked

**Section 8.1 — Schema**
- Schema is mandatory, never optional
- LocalBusiness schema required on city pages
- Organization schema required on service/homepage pages
- FAQ schema recommended on service and city pages
`.trim();

function buildRecommendationPrompt(
  gaps: GapSignal[],
  clientName: string,
  historicalOutcomes: Array<{ subcategory: string; status: string; proposed_value: string }>
): string {
  // Group gaps by page URL
  const gapsByPage = new Map<string, GapSignal[]>();
  for (const gap of gaps) {
    if (!gapsByPage.has(gap.pageUrl)) {
      gapsByPage.set(gap.pageUrl, []);
    }
    gapsByPage.get(gap.pageUrl)!.push(gap);
  }

  let prompt = `CLIENT: ${clientName}\n\n`;

  prompt += `${SEO_DOCTRINE_REFERENCE}\n\n`;

  if (gaps.length === 0) {
    prompt += `## Gap Signals\nNo gap signals detected in this cycle.\n\n`;
  } else {
    prompt += `## Gap Signals by Page\n\n`;
    for (const [pageUrl, pageGaps] of gapsByPage.entries()) {
      prompt += `### Page: ${pageUrl}\n`;
      for (const gap of pageGaps) {
        prompt += `- [${gap.severity.toUpperCase()}] ${gap.rule} — ${gap.description}\n`;
        prompt += `  Current: ${gap.current}\n`;
        prompt += `  Type: ${gap.pageType} | Subcategory: ${gap.subcategory}\n`;
        if (gap.metrics && Object.keys(gap.metrics).length > 0) {
          prompt += `  Metrics: ${JSON.stringify(gap.metrics)}\n`;
        }
      }
      prompt += '\n';
    }
  }

  if (historicalOutcomes.length > 0) {
    prompt += `## Historical Outcomes (Learning Loop)\n`;
    prompt += `The following recommendations have been applied previously. Weight toward succeeded patterns, away from regressed/reverted.\n\n`;
    const succeeded = historicalOutcomes.filter(o => o.status === 'succeeded');
    const regressed = historicalOutcomes.filter(o => o.status === 'regressed' || o.status === 'reverted');

    if (succeeded.length > 0) {
      prompt += `### What Worked (Succeeded):\n`;
      for (const outcome of succeeded) {
        prompt += `- [${outcome.subcategory}] ${outcome.proposed_value}\n`;
      }
      prompt += '\n';
    }

    if (regressed.length > 0) {
      prompt += `### What Didn't Work (Regressed/Reverted):\n`;
      for (const outcome of regressed) {
        prompt += `- [${outcome.subcategory}] ${outcome.proposed_value}\n`;
      }
      prompt += '\n';
    }
  }

  return prompt;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeGap(overrides: Partial<GapSignal> = {}): GapSignal {
  return {
    rule: 'Section 1.1',
    severity: 'high',
    description: 'Meta title missing city in keyword phrase',
    subcategory: 'meta_title',
    current: '"Web Design | Spearlance" (no city)',
    pageUrl: 'https://example.com/web-design/concord-nh',
    pageType: 'service',
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('buildRecommendationPrompt — grouping', () => {
  it('groups gaps by page URL in output', () => {
    const gaps: GapSignal[] = [
      makeGap({ pageUrl: 'https://example.com/page-a', description: 'Gap A1' }),
      makeGap({ pageUrl: 'https://example.com/page-b', description: 'Gap B1' }),
      makeGap({ pageUrl: 'https://example.com/page-a', description: 'Gap A2', subcategory: 'meta_desc' }),
    ];
    const prompt = buildRecommendationPrompt(gaps, 'ACME Corp', []);
    // page-a section appears once and contains both A1 and A2
    const pageAIndex = prompt.indexOf('https://example.com/page-a');
    const pageBIndex = prompt.indexOf('https://example.com/page-b');
    expect(pageAIndex).toBeGreaterThan(-1);
    expect(pageBIndex).toBeGreaterThan(-1);
    // Both gaps for page-a appear after the page-a heading
    const afterPageA = prompt.slice(pageAIndex);
    expect(afterPageA).toContain('Gap A1');
    expect(afterPageA).toContain('Gap A2');
  });

  it('handles multiple pages as separate sections', () => {
    const gaps: GapSignal[] = [
      makeGap({ pageUrl: 'https://example.com/page-a' }),
      makeGap({ pageUrl: 'https://example.com/page-b' }),
      makeGap({ pageUrl: 'https://example.com/page-c' }),
    ];
    const prompt = buildRecommendationPrompt(gaps, 'Client', []);
    expect(prompt).toContain('page-a');
    expect(prompt).toContain('page-b');
    expect(prompt).toContain('page-c');
  });
});

describe('buildRecommendationPrompt — severity formatting', () => {
  it('includes severity level in uppercase brackets', () => {
    const gaps: GapSignal[] = [
      makeGap({ severity: 'critical' }),
      makeGap({ severity: 'high', subcategory: 'meta_desc', pageUrl: 'https://example.com/page-b' }),
      makeGap({ severity: 'medium', subcategory: 'content_expand', pageUrl: 'https://example.com/page-c' }),
      makeGap({ severity: 'low', subcategory: 'schema', pageUrl: 'https://example.com/page-d' }),
    ];
    const prompt = buildRecommendationPrompt(gaps, 'Client', []);
    expect(prompt).toContain('[CRITICAL]');
    expect(prompt).toContain('[HIGH]');
    expect(prompt).toContain('[MEDIUM]');
    expect(prompt).toContain('[LOW]');
  });

  it('severity is uppercased even when gap has lowercase severity', () => {
    const gaps: GapSignal[] = [makeGap({ severity: 'critical' })];
    const prompt = buildRecommendationPrompt(gaps, 'Client', []);
    expect(prompt).toContain('[CRITICAL]');
    expect(prompt).not.toContain('[critical]');
  });
});

describe('buildRecommendationPrompt — historical outcomes', () => {
  it('includes historical outcomes section when provided', () => {
    const outcomes = [
      { subcategory: 'meta_title', status: 'succeeded', proposed_value: 'Web Design Concord NH | Spearlance' },
      { subcategory: 'meta_desc', status: 'regressed', proposed_value: 'Old description that hurt rankings' },
    ];
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', outcomes);
    expect(prompt).toContain('Historical Outcomes');
    expect(prompt).toContain('Learning Loop');
    expect(prompt).toContain('Web Design Concord NH | Spearlance');
    expect(prompt).toContain('Old description that hurt rankings');
  });

  it('separates succeeded from regressed/reverted outcomes', () => {
    const outcomes = [
      { subcategory: 'meta_title', status: 'succeeded', proposed_value: 'Good title' },
      { subcategory: 'meta_desc', status: 'regressed', proposed_value: 'Bad desc' },
      { subcategory: 'h1_fix', status: 'reverted', proposed_value: 'Reverted h1' },
    ];
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', outcomes);
    expect(prompt).toContain('What Worked');
    expect(prompt).toContain('What Didn\'t Work');
    expect(prompt).toContain('Good title');
    expect(prompt).toContain('Bad desc');
    expect(prompt).toContain('Reverted h1');
  });

  it('omits historical section when no outcomes provided', () => {
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', []);
    expect(prompt).not.toContain('Historical Outcomes');
    expect(prompt).not.toContain('Learning Loop');
    expect(prompt).not.toContain('What Worked');
  });
});

describe('buildRecommendationPrompt — client name', () => {
  it('includes client name in the prompt', () => {
    const prompt = buildRecommendationPrompt([makeGap()], 'Spearlance Media', []);
    expect(prompt).toContain('Spearlance Media');
  });

  it('includes different client names correctly', () => {
    const prompt1 = buildRecommendationPrompt([makeGap()], 'Acme Construction LLC', []);
    const prompt2 = buildRecommendationPrompt([makeGap()], 'Progressive Pediatric', []);
    expect(prompt1).toContain('Acme Construction LLC');
    expect(prompt2).toContain('Progressive Pediatric');
  });
});

describe('buildRecommendationPrompt — empty gaps', () => {
  it('handles empty gaps array without throwing', () => {
    expect(() => buildRecommendationPrompt([], 'Client', [])).not.toThrow();
  });

  it('returns a string when gaps array is empty', () => {
    const prompt = buildRecommendationPrompt([], 'Client', []);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes client name even with empty gaps', () => {
    const prompt = buildRecommendationPrompt([], 'ACME Corp', []);
    expect(prompt).toContain('ACME Corp');
  });

  it('indicates no gap signals when gaps array is empty', () => {
    const prompt = buildRecommendationPrompt([], 'Client', []);
    expect(prompt).toContain('No gap signals');
  });
});

describe('buildRecommendationPrompt — doctrine reference', () => {
  it('includes Section 1.1 meta title doctrine', () => {
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', []);
    expect(prompt).toContain('Section 1.1');
    expect(prompt).toContain('Meta Title');
  });

  it('includes Section 7.1 internal link doctrine', () => {
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', []);
    expect(prompt).toContain('Section 7.1');
    expect(prompt).toContain('Internal Link');
  });

  it('instructs city must be embedded in keyword phrase', () => {
    const prompt = buildRecommendationPrompt([makeGap()], 'Client', []);
    expect(prompt).toContain('City MUST be embedded');
  });
});
