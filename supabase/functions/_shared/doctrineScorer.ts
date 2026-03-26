// Spearlance SEO Doctrine Scorer — v2
// Checks page audit data against the SEO Doctrine rules defined in
// .claude/rules/seo-doctrine.md and returns actionable gaps.

export interface PageAudit {
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

export interface DoctrineGap {
  rule: string;        // e.g. "Section 3.1"
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  subcategory: string; // matches optimization_recommendations.subcategory
  current: string;
}

const WORD_COUNT_THRESHOLDS: Record<string, { min: number; rewrite: number }> = {
  service:  { min: 1500, rewrite: 1200 },
  pillar:   { min: 1500, rewrite: 1200 },
  city:     { min: 1200, rewrite: 1000 },
  blog:     { min: 1000, rewrite: 800  },
  homepage: { min: 1000, rewrite: 800  },
  other:    { min: 1000, rewrite: 800  },
};

export function scorePageAgainstDoctrine(audit: PageAudit): DoctrineGap[] {
  const gaps: DoctrineGap[] = [];

  // Section 3.1 — H1 Tag: exactly ONE H1 per page
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

  // Section 6.1 — Word Count by page type
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

  // Section 7.1 — Internal Links: minimum 5, target 10+
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

  // Section 3.4 — H2 Count: minimum 4, target 6-8
  if (audit.h2_count < 3) {
    gaps.push({
      rule: 'Section 3.4',
      severity: 'medium',
      description: `Only ${audit.h2_count} H2 heading(s). Minimum is 4, target is 6-8.`,
      subcategory: 'content_expand',
      current: `${audit.h2_count} H2 tags`,
    });
  }

  // Section 8.1 — Schema requirements
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

  // Section 1.1 — Meta Title: required, minimum 20 chars
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

  // Section 2.1 — Meta Description: required, minimum 50 chars
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
