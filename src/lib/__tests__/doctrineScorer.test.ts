import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// Types (mirrors supabase/functions/_shared/doctrineScorer.ts)
// ─────────────────────────────────────────────

interface PageAudit {
  url: string;
  title: string | null;
  meta_description: string | null;
  h1_count: number;
  h1_text: string | null;
  h2_count: number;
  word_count: number;
  internal_link_count: number;
  has_faq_schema: boolean;
  has_local_schema: boolean;
  has_org_schema: boolean;
  page_type: string;
}

interface DoctrineGap {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  subcategory: string;
  current: string;
}

// ─────────────────────────────────────────────
// Implementation (self-contained for tests)
// ─────────────────────────────────────────────

const WORD_COUNT_THRESHOLDS: Record<string, { min: number; rewrite: number }> = {
  service: { min: 1500, rewrite: 1200 },
  pillar:  { min: 1500, rewrite: 1200 },
  city:    { min: 1200, rewrite: 1000 },
  blog:    { min: 1000, rewrite: 800  },
  homepage:{ min: 1000, rewrite: 800  },
  other:   { min: 1000, rewrite: 800  },
};

function scorePageAgainstDoctrine(audit: PageAudit): DoctrineGap[] {
  const gaps: DoctrineGap[] = [];

  // Section 3.1 — H1 Tag: exactly ONE H1
  if (audit.h1_count === 0) {
    gaps.push({
      rule: 'Section 3.1',
      severity: 'critical',
      description: 'Page has no H1 tag. Every page requires exactly one H1.',
      subcategory: 'h1_fix',
      current: '0 H1 tags',
    });
  } else if (audit.h1_count > 1) {
    gaps.push({
      rule: 'Section 3.1',
      severity: 'critical',
      description: `Page has ${audit.h1_count} H1 tags. Exactly one H1 is required.`,
      subcategory: 'h1_fix',
      current: `${audit.h1_count} H1 tags`,
    });
  }

  // Section 6.1 — Word Count thresholds by page type
  const thresholds = WORD_COUNT_THRESHOLDS[audit.page_type] ?? WORD_COUNT_THRESHOLDS.other;
  if (audit.word_count < thresholds.rewrite) {
    gaps.push({
      rule: 'Section 6.1',
      severity: 'high',
      description: `Word count (${audit.word_count}) is below the rewrite threshold (${thresholds.rewrite}) for ${audit.page_type} pages.`,
      subcategory: 'content_expand',
      current: `${audit.word_count} words`,
    });
  } else if (audit.word_count < thresholds.min) {
    gaps.push({
      rule: 'Section 6.1',
      severity: 'medium',
      description: `Word count (${audit.word_count}) is below the minimum (${thresholds.min}) for ${audit.page_type} pages.`,
      subcategory: 'content_expand',
      current: `${audit.word_count} words`,
    });
  }

  // Section 7.1 — Internal Links
  if (audit.internal_link_count < 3) {
    gaps.push({
      rule: 'Section 7.1',
      severity: 'high',
      description: `Only ${audit.internal_link_count} internal link(s). Minimum is 5; pages with fewer than 3 are severely under-linked.`,
      subcategory: 'internal_links',
      current: `${audit.internal_link_count} internal links`,
    });
  } else if (audit.internal_link_count < 5) {
    gaps.push({
      rule: 'Section 7.1',
      severity: 'medium',
      description: `${audit.internal_link_count} internal link(s) — below the minimum of 5.`,
      subcategory: 'internal_links',
      current: `${audit.internal_link_count} internal links`,
    });
  }

  // Section 3.4 — H2 Count
  if (audit.h2_count < 3) {
    gaps.push({
      rule: 'Section 3.4',
      severity: 'medium',
      description: `Only ${audit.h2_count} H2 heading(s). Minimum is 4, target is 6-8.`,
      subcategory: 'content_expand',
      current: `${audit.h2_count} H2 tags`,
    });
  }

  // Section 8.1 — Schema
  if (audit.page_type === 'city' && !audit.has_local_schema) {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'high',
      description: 'LocalBusiness schema is required on city pages.',
      subcategory: 'schema',
      current: 'No LocalBusiness schema',
    });
  }

  if ((audit.page_type === 'service' || audit.page_type === 'homepage') && !audit.has_org_schema) {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'high',
      description: 'Organization schema is required on service and homepage pages.',
      subcategory: 'schema',
      current: 'No Organization schema',
    });
  }

  if ((audit.page_type === 'service' || audit.page_type === 'city') && !audit.has_faq_schema) {
    gaps.push({
      rule: 'Section 8.1',
      severity: 'low',
      description: 'FAQ schema is recommended on service and city pages.',
      subcategory: 'schema',
      current: 'No FAQ schema',
    });
  }

  // Section 1.1 — Meta Title
  if (!audit.title || audit.title.length < 20) {
    gaps.push({
      rule: 'Section 1.1',
      severity: 'high',
      description: !audit.title
        ? 'Page is missing a meta title.'
        : `Meta title is too short (${audit.title.length} chars). Minimum 20 characters.`,
      subcategory: 'meta_title',
      current: audit.title ? `"${audit.title}" (${audit.title.length} chars)` : 'No title',
    });
  }

  // Section 2.1 — Meta Description
  if (!audit.meta_description || audit.meta_description.length < 50) {
    gaps.push({
      rule: 'Section 2.1',
      severity: 'high',
      description: !audit.meta_description
        ? 'Page is missing a meta description.'
        : `Meta description is too short (${audit.meta_description.length} chars). Minimum 50 characters.`,
      subcategory: 'meta_desc',
      current: audit.meta_description
        ? `"${audit.meta_description}" (${audit.meta_description.length} chars)`
        : 'No description',
    });
  }

  return gaps;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function baseAudit(overrides: Partial<PageAudit> = {}): PageAudit {
  return {
    url: 'https://example.com/web-design/concord-nh',
    title: 'Web Design Company in Concord NH | Web Designer Concord | Spearlance',
    meta_description: 'Looking for web design in Concord NH? Spearlance is a trusted web design agency in Concord specializing in custom websites, SEO, and local marketing.',
    h1_count: 1,
    h1_text: 'Web Design Company in Concord NH',
    h2_count: 6,
    word_count: 1800,
    internal_link_count: 8,
    has_faq_schema: true,
    has_local_schema: true,
    has_org_schema: true,
    page_type: 'service',
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('Doctrine Scorer — H1 Rules (Section 3.1)', () => {
  it('produces no H1 gap when exactly 1 H1 is present', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h1_count: 1 }));
    const h1Gaps = gaps.filter(g => g.rule === 'Section 3.1');
    expect(h1Gaps).toHaveLength(0);
  });

  it('flags critical gap when H1 count is 0', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h1_count: 0 }));
    const h1Gap = gaps.find(g => g.rule === 'Section 3.1');
    expect(h1Gap).toBeDefined();
    expect(h1Gap!.severity).toBe('critical');
    expect(h1Gap!.subcategory).toBe('h1_fix');
    expect(h1Gap!.current).toBe('0 H1 tags');
  });

  it('flags critical gap when H1 count is 3', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h1_count: 3 }));
    const h1Gap = gaps.find(g => g.rule === 'Section 3.1');
    expect(h1Gap).toBeDefined();
    expect(h1Gap!.severity).toBe('critical');
    expect(h1Gap!.current).toBe('3 H1 tags');
  });

  it('flags critical gap when H1 count is 2', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h1_count: 2 }));
    const h1Gap = gaps.find(g => g.rule === 'Section 3.1');
    expect(h1Gap).toBeDefined();
    expect(h1Gap!.severity).toBe('critical');
  });
});

describe('Doctrine Scorer — Word Count (Section 6.1)', () => {
  it('produces no word count gap for a service page at 2000 words', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ word_count: 2000, page_type: 'service' }));
    const wcGaps = gaps.filter(g => g.rule === 'Section 6.1');
    expect(wcGaps).toHaveLength(0);
  });

  it('flags high severity for service page at 1100 words (below 1200 rewrite threshold)', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ word_count: 1100, page_type: 'service' }));
    const wcGap = gaps.find(g => g.rule === 'Section 6.1');
    expect(wcGap).toBeDefined();
    expect(wcGap!.severity).toBe('high');
    expect(wcGap!.subcategory).toBe('content_expand');
    expect(wcGap!.current).toBe('1100 words');
  });

  it('flags medium severity for service page between 1200 and 1500 words', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ word_count: 1350, page_type: 'service' }));
    const wcGap = gaps.find(g => g.rule === 'Section 6.1');
    expect(wcGap).toBeDefined();
    expect(wcGap!.severity).toBe('medium');
  });

  it('flags high severity for blog page at 700 words (below 800 rewrite threshold)', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ word_count: 700, page_type: 'blog', has_local_schema: false, has_org_schema: false })
    );
    const wcGap = gaps.find(g => g.rule === 'Section 6.1');
    expect(wcGap).toBeDefined();
    expect(wcGap!.severity).toBe('high');
    expect(wcGap!.current).toBe('700 words');
  });

  it('flags medium severity for blog page between 800 and 1000 words', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ word_count: 900, page_type: 'blog', has_local_schema: false, has_org_schema: false })
    );
    const wcGap = gaps.find(g => g.rule === 'Section 6.1');
    expect(wcGap).toBeDefined();
    expect(wcGap!.severity).toBe('medium');
  });

  it('produces no word count gap for city page at 1500 words', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ word_count: 1500, page_type: 'city' })
    );
    const wcGaps = gaps.filter(g => g.rule === 'Section 6.1');
    expect(wcGaps).toHaveLength(0);
  });

  it('flags high severity for city page at 900 words (below 1000 rewrite)', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ word_count: 900, page_type: 'city' })
    );
    const wcGap = gaps.find(g => g.rule === 'Section 6.1');
    expect(wcGap).toBeDefined();
    expect(wcGap!.severity).toBe('high');
  });
});

describe('Doctrine Scorer — Internal Links (Section 7.1)', () => {
  it('produces no internal link gap at 10 links', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ internal_link_count: 10 }));
    const linkGaps = gaps.filter(g => g.rule === 'Section 7.1');
    expect(linkGaps).toHaveLength(0);
  });

  it('produces no internal link gap at exactly 5 links', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ internal_link_count: 5 }));
    const linkGaps = gaps.filter(g => g.rule === 'Section 7.1');
    expect(linkGaps).toHaveLength(0);
  });

  it('flags high severity at 2 internal links (below 3)', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ internal_link_count: 2 }));
    const linkGap = gaps.find(g => g.rule === 'Section 7.1');
    expect(linkGap).toBeDefined();
    expect(linkGap!.severity).toBe('high');
    expect(linkGap!.subcategory).toBe('internal_links');
    expect(linkGap!.current).toBe('2 internal links');
  });

  it('flags medium severity at 4 internal links (below 5, above 2)', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ internal_link_count: 4 }));
    const linkGap = gaps.find(g => g.rule === 'Section 7.1');
    expect(linkGap).toBeDefined();
    expect(linkGap!.severity).toBe('medium');
  });

  it('flags high severity at 0 internal links', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ internal_link_count: 0 }));
    const linkGap = gaps.find(g => g.rule === 'Section 7.1');
    expect(linkGap).toBeDefined();
    expect(linkGap!.severity).toBe('high');
  });
});

describe('Doctrine Scorer — H2 Count (Section 3.4)', () => {
  it('produces no H2 gap at 6 headings', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h2_count: 6 }));
    const h2Gaps = gaps.filter(g => g.rule === 'Section 3.4');
    expect(h2Gaps).toHaveLength(0);
  });

  it('produces no H2 gap at exactly 4 headings', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h2_count: 4 }));
    const h2Gaps = gaps.filter(g => g.rule === 'Section 3.4');
    expect(h2Gaps).toHaveLength(0);
  });

  it('flags medium severity at 2 H2 tags (below 3)', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h2_count: 2 }));
    const h2Gap = gaps.find(g => g.rule === 'Section 3.4');
    expect(h2Gap).toBeDefined();
    expect(h2Gap!.severity).toBe('medium');
    expect(h2Gap!.current).toBe('2 H2 tags');
  });

  it('flags medium severity at 0 H2 tags', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ h2_count: 0 }));
    const h2Gap = gaps.find(g => g.rule === 'Section 3.4');
    expect(h2Gap).toBeDefined();
    expect(h2Gap!.severity).toBe('medium');
  });
});

describe('Doctrine Scorer — Schema (Section 8.1)', () => {
  it('flags missing LocalBusiness schema on city page', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'city', has_local_schema: false })
    );
    const schemaGap = gaps.find(g => g.rule === 'Section 8.1' && g.subcategory === 'schema' && g.description.includes('LocalBusiness'));
    expect(schemaGap).toBeDefined();
    expect(schemaGap!.severity).toBe('high');
    expect(schemaGap!.current).toBe('No LocalBusiness schema');
  });

  it('does not flag LocalBusiness on city page when present', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'city', has_local_schema: true })
    );
    const localGap = gaps.find(g => g.description.includes('LocalBusiness'));
    expect(localGap).toBeUndefined();
  });

  it('flags missing Organization schema on service page', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'service', has_org_schema: false })
    );
    const orgGap = gaps.find(g => g.description.includes('Organization'));
    expect(orgGap).toBeDefined();
    expect(orgGap!.severity).toBe('high');
  });

  it('flags missing Organization schema on homepage', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'homepage', has_org_schema: false, has_local_schema: false })
    );
    const orgGap = gaps.find(g => g.description.includes('Organization'));
    expect(orgGap).toBeDefined();
    expect(orgGap!.severity).toBe('high');
  });

  it('flags missing FAQ schema on city page with low severity', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'city', has_faq_schema: false })
    );
    const faqGap = gaps.find(g => g.description.includes('FAQ'));
    expect(faqGap).toBeDefined();
    expect(faqGap!.severity).toBe('low');
  });

  it('does not flag FAQ schema on blog pages', () => {
    const gaps = scorePageAgainstDoctrine(
      baseAudit({ page_type: 'blog', has_faq_schema: false, has_local_schema: false, has_org_schema: false })
    );
    const faqGap = gaps.find(g => g.description.includes('FAQ'));
    expect(faqGap).toBeUndefined();
  });
});

describe('Doctrine Scorer — Meta Tags (Section 1.1, 2.1)', () => {
  it('produces no meta gaps when title and description are present and long enough', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit());
    const metaGaps = gaps.filter(g => g.rule === 'Section 1.1' || g.rule === 'Section 2.1');
    expect(metaGaps).toHaveLength(0);
  });

  it('flags missing meta title with high severity', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ title: null }));
    const titleGap = gaps.find(g => g.rule === 'Section 1.1');
    expect(titleGap).toBeDefined();
    expect(titleGap!.severity).toBe('high');
    expect(titleGap!.subcategory).toBe('meta_title');
    expect(titleGap!.current).toBe('No title');
  });

  it('flags short meta title (< 20 chars) with high severity', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ title: 'Web Design' }));
    const titleGap = gaps.find(g => g.rule === 'Section 1.1');
    expect(titleGap).toBeDefined();
    expect(titleGap!.severity).toBe('high');
    expect(titleGap!.current).toContain('Web Design');
  });

  it('flags missing meta description with high severity', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ meta_description: null }));
    const descGap = gaps.find(g => g.rule === 'Section 2.1');
    expect(descGap).toBeDefined();
    expect(descGap!.severity).toBe('high');
    expect(descGap!.subcategory).toBe('meta_desc');
    expect(descGap!.current).toBe('No description');
  });

  it('flags short meta description (< 50 chars) with high severity', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit({ meta_description: 'Short desc' }));
    const descGap = gaps.find(g => g.rule === 'Section 2.1');
    expect(descGap).toBeDefined();
    expect(descGap!.severity).toBe('high');
    expect(descGap!.current).toContain('Short desc');
  });

  it('returns empty array for a fully compliant page', () => {
    const gaps = scorePageAgainstDoctrine(baseAudit());
    expect(gaps).toHaveLength(0);
  });

  it('returns multiple gaps for a completely bare page', () => {
    const bare: PageAudit = {
      url: 'https://example.com/services',
      title: null,
      meta_description: null,
      h1_count: 0,
      h1_text: null,
      h2_count: 0,
      word_count: 0,
      internal_link_count: 0,
      has_faq_schema: false,
      has_local_schema: false,
      has_org_schema: false,
      page_type: 'service',
    };
    const gaps = scorePageAgainstDoctrine(bare);
    // H1, word count, internal links, H2, org schema, FAQ schema, title, description
    expect(gaps.length).toBeGreaterThanOrEqual(6);
    const severities = gaps.map(g => g.severity);
    expect(severities).toContain('critical');
    expect(severities).toContain('high');
  });
});
