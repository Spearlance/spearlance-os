import { describe, it, expect } from 'vitest';

// ============================================================
// parseSerpResult — inline definition (self-contained test)
// ============================================================
function stripWww(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^www\./, '');
  }
}

function parseSerpResult(
  task: any,
  clientUrl: string
): {
  position: number | null;
  url: string | null;
  serpFeatures: string[];
  competitorUrls: Array<{ position: number; url: string; domain: string }>;
} {
  const clientDomain = stripWww(clientUrl);
  const result = task?.result?.[0];

  if (!result) {
    return { position: null, url: null, serpFeatures: [], competitorUrls: [] };
  }

  const items: any[] = result.items || [];
  const serpFeatures: string[] = [];

  // Collect SERP feature types from non-organic items
  for (const item of items) {
    if (item.type && item.type !== 'organic') {
      if (!serpFeatures.includes(item.type)) {
        serpFeatures.push(item.type);
      }
    }
  }

  // Find organic results
  const organicItems = items.filter((i: any) => i.type === 'organic');

  let position: number | null = null;
  let matchedUrl: string | null = null;

  for (const item of organicItems) {
    const itemDomain = stripWww(item.url || '');
    if (itemDomain === clientDomain) {
      position = item.rank_absolute ?? item.position ?? null;
      matchedUrl = item.url || null;
      break;
    }
  }

  // Top 10 competitor URLs (organic, excluding client)
  const competitorUrls = organicItems
    .filter((i: any) => stripWww(i.url || '') !== clientDomain)
    .slice(0, 10)
    .map((i: any) => ({
      position: i.rank_absolute ?? i.position ?? 0,
      url: i.url || '',
      domain: stripWww(i.url || ''),
    }));

  return { position, url: matchedUrl, serpFeatures, competitorUrls };
}

// ============================================================
// Test data helpers
// ============================================================
function makeSerpTask(organicResults: Array<{ url: string; rank_absolute: number }>, extraItems: any[] = []) {
  return {
    result: [
      {
        items: [
          ...extraItems,
          ...organicResults.map((r) => ({
            type: 'organic',
            url: r.url,
            rank_absolute: r.rank_absolute,
          })),
        ],
      },
    ],
  };
}

// ============================================================
// Tests
// ============================================================
describe('DataforSEO — parseSerpResult', () => {
  describe('client position detection', () => {
    it('finds client position in organic results (exact domain match)', () => {
      const task = makeSerpTask([
        { url: 'https://competitor.com/page', rank_absolute: 1 },
        { url: 'https://spearlance.com/web-design', rank_absolute: 2 },
        { url: 'https://another.com/', rank_absolute: 3 },
      ]);

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.position).toBe(2);
      expect(result.url).toBe('https://spearlance.com/web-design');
    });

    it('matches client domain with www. prefix stripped', () => {
      const task = makeSerpTask([
        { url: 'https://www.spearlance.com/seo', rank_absolute: 5 },
      ]);

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.position).toBe(5);
      expect(result.url).toBe('https://www.spearlance.com/seo');
    });

    it('returns null position when client not in SERP', () => {
      const task = makeSerpTask([
        { url: 'https://competitor1.com/', rank_absolute: 1 },
        { url: 'https://competitor2.com/', rank_absolute: 2 },
      ]);

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.position).toBeNull();
      expect(result.url).toBeNull();
    });
  });

  describe('SERP feature extraction', () => {
    it('extracts featured_snippet feature', () => {
      const task = makeSerpTask(
        [{ url: 'https://competitor.com/', rank_absolute: 1 }],
        [{ type: 'featured_snippet', url: 'https://competitor.com/' }]
      );

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.serpFeatures).toContain('featured_snippet');
    });

    it('extracts multiple SERP features', () => {
      const task = makeSerpTask(
        [{ url: 'https://competitor.com/', rank_absolute: 1 }],
        [
          { type: 'featured_snippet', url: 'https://competitor.com/' },
          { type: 'people_also_ask', items: [] },
          { type: 'local_pack', items: [] },
        ]
      );

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.serpFeatures).toContain('featured_snippet');
      expect(result.serpFeatures).toContain('people_also_ask');
      expect(result.serpFeatures).toContain('local_pack');
    });

    it('deduplicates SERP feature types', () => {
      const task = makeSerpTask(
        [{ url: 'https://competitor.com/', rank_absolute: 1 }],
        [
          { type: 'people_also_ask' },
          { type: 'people_also_ask' },
        ]
      );

      const result = parseSerpResult(task, 'https://spearlance.com');

      const paaCount = result.serpFeatures.filter((f) => f === 'people_also_ask').length;
      expect(paaCount).toBe(1);
    });
  });

  describe('competitor URL extraction', () => {
    it('extracts top 10 competitor URLs (excludes client)', () => {
      const organicResults = Array.from({ length: 12 }, (_, i) => ({
        url: `https://competitor${i + 1}.com/`,
        rank_absolute: i + 1,
      }));
      // Insert client at position 7
      organicResults[6] = { url: 'https://spearlance.com/', rank_absolute: 7 };

      const task = makeSerpTask(organicResults);
      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.competitorUrls).toHaveLength(10);
      expect(result.competitorUrls.every((c) => c.domain !== 'spearlance.com')).toBe(true);
    });

    it('includes position, url, and domain in each competitor entry', () => {
      const task = makeSerpTask([
        { url: 'https://competitor.com/page', rank_absolute: 1 },
      ]);

      const result = parseSerpResult(task, 'https://spearlance.com');

      expect(result.competitorUrls[0]).toMatchObject({
        position: 1,
        url: 'https://competitor.com/page',
        domain: 'competitor.com',
      });
    });
  });

  describe('empty / missing data', () => {
    it('returns empty arrays when no results', () => {
      const result = parseSerpResult({ result: [{ items: [] }] }, 'https://spearlance.com');

      expect(result.position).toBeNull();
      expect(result.url).toBeNull();
      expect(result.serpFeatures).toEqual([]);
      expect(result.competitorUrls).toEqual([]);
    });

    it('returns empty arrays when task result is null', () => {
      const result = parseSerpResult({ result: null }, 'https://spearlance.com');

      expect(result.serpFeatures).toEqual([]);
      expect(result.competitorUrls).toEqual([]);
    });

    it('returns empty arrays when task is undefined', () => {
      const result = parseSerpResult(undefined, 'https://spearlance.com');

      expect(result.position).toBeNull();
      expect(result.serpFeatures).toEqual([]);
      expect(result.competitorUrls).toEqual([]);
    });
  });
});
