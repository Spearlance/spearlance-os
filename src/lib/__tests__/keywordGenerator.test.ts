import { describe, it, expect } from 'vitest';

// ============================================================
// generateKeywords — inline definition (self-contained test)
// Mirrors the logic in supabase/functions/dataforseo-sync/index.ts
// ============================================================
function generateKeywords(
  serviceLocations: Array<{ service_name: string; city: string; state: string }>
): string[] {
  const keywords: string[] = [];
  for (const sl of serviceLocations) {
    const city = sl.city.toLowerCase();
    const state = sl.state.toLowerCase();
    keywords.push(`${sl.service_name.toLowerCase()} ${city} ${state}`);
    keywords.push(`${sl.service_name.toLowerCase()} company ${city} ${state}`);
    keywords.push(`${sl.service_name.toLowerCase()} services ${city} ${state}`);
  }
  return keywords;
}

// ============================================================
// Tests
// ============================================================
describe('generateKeywords', () => {
  it('generates 3 keywords per service-location combo', () => {
    const result = generateKeywords([
      { service_name: 'Web Design', city: 'Concord', state: 'NH' },
    ]);

    expect(result).toHaveLength(3);
  });

  it('all keywords are lowercase', () => {
    const result = generateKeywords([
      { service_name: 'SEO', city: 'Manchester', state: 'NH' },
    ]);

    for (const kw of result) {
      expect(kw).toBe(kw.toLowerCase());
    }
  });

  it('generates 12 keywords for 2 services x 2 cities', () => {
    const result = generateKeywords([
      { service_name: 'Web Design', city: 'Concord', state: 'NH' },
      { service_name: 'Web Design', city: 'Manchester', state: 'NH' },
      { service_name: 'SEO', city: 'Concord', state: 'NH' },
      { service_name: 'SEO', city: 'Manchester', state: 'NH' },
    ]);

    expect(result).toHaveLength(12);
  });

  it('generates correct keyword variations for a single combo', () => {
    const result = generateKeywords([
      { service_name: 'Web Design', city: 'Concord', state: 'NH' },
    ]);

    expect(result).toEqual([
      'web design concord nh',
      'web design company concord nh',
      'web design services concord nh',
    ]);
  });

  it('returns empty array for empty input', () => {
    const result = generateKeywords([]);
    expect(result).toEqual([]);
  });
});
