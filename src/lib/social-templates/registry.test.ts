import { describe, it, expect } from 'vitest';
import { getAllTemplates, getTemplate, getTemplateForCategory } from './registry';

describe('social template registry', () => {
  it('returns all 5 templates', () => {
    const templates = getAllTemplates();
    expect(templates).toHaveLength(5);
  });

  it('returns a template by id', () => {
    const template = getTemplate('quote-card');
    expect(template).toBeDefined();
    expect(template!.id).toBe('quote-card');
    expect(template!.category).toBe('educational');
    expect(template!.textSlots).toEqual(['quote_text', 'attribution']);
  });

  it('returns undefined for unknown template', () => {
    const template = getTemplate('does-not-exist');
    expect(template).toBeUndefined();
  });

  it('maps each strategy category to a template', () => {
    const categories = [
      'educational',
      'quick_tips',
      'promotional',
      'customer_stories',
      'behind_the_scenes',
    ];
    for (const category of categories) {
      const template = getTemplateForCategory(category);
      expect(template).toBeDefined();
      expect(template!.category).toBe(category);
    }
  });

  it('every template has required fields', () => {
    const templates = getAllTemplates();
    for (const template of templates) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.textSlots.length).toBeGreaterThan(0);
      expect(template.format).toContain('1080x1080');
    }
  });
});
