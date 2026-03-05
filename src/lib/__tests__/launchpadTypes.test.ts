/**
 * Type-level validation tests for LaunchPad types.
 * Ensures the type contracts don't drift from expected shapes.
 */
import { describe, it, expect } from 'vitest';
import type {
  LaunchPadStage,
  DiscoveryData,
  MarketingData,
  ResponsesJson,
  CompletedAt,
  LaunchPadSubmission,
} from '../launchpadTypes';

describe('launchpadTypes runtime contracts', () => {
  it('LaunchPadStage values are valid strings', () => {
    const stages: LaunchPadStage[] = ['discovery', 'marketing', 'avatar', 'complete'];
    expect(stages).toHaveLength(4);
    stages.forEach(s => expect(typeof s).toBe('string'));
  });

  it('DiscoveryData shape is constructable', () => {
    const discovery: DiscoveryData = {
      company: {
        legal_name: 'Acme Inc',
        brand_name: 'Acme',
        website_url: 'https://acme.com',
        industry: 'SaaS',
      },
      contacts: {
        primary_name: 'John',
        primary_email: 'john@acme.com',
      },
      model: {
        services: ['Web Development'],
      },
      goals: {
        quarter_goals: ['Increase revenue'],
      },
      state: {},
      competition: {},
      voice: {
        tone: 'professional',
      },
    };
    expect(discovery.company.brand_name).toBe('Acme');
    expect(discovery.model.services).toContain('Web Development');
  });

  it('MarketingData supports social_strategy with topic_distribution', () => {
    const marketing: MarketingData = {
      services_completed: true,
      social_strategy: {
        posting_frequency: 'weekdays',
        selected_days: [1, 2, 3, 4, 5],
        topic_distribution: {
          educational: 30,
          behind_the_scenes: 20,
          customer_stories: 20,
          promotional: 20,
          quick_tips: 10,
        },
      },
    };
    expect(marketing.services_completed).toBe(true);
    const total = Object.values(marketing.social_strategy!.topic_distribution)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('ResponsesJson supports partial completion', () => {
    const partial: ResponsesJson = {
      discovery: {
        company: { legal_name: '', brand_name: '', website_url: '', industry: '' },
        contacts: { primary_name: '', primary_email: '' },
        model: { services: [] },
        goals: { quarter_goals: [] },
        state: {},
        competition: {},
        voice: { tone: '' },
      },
    };
    expect(partial.marketing).toBeUndefined();
    expect(partial.assets).toBeUndefined();
  });

  it('CompletedAt tracks each stage independently', () => {
    const completedAt: CompletedAt = {
      discovery: '2024-01-01T00:00:00Z',
      marketing: '2024-01-02T00:00:00Z',
    };
    expect(completedAt.discovery).toBeDefined();
    expect(completedAt.avatar).toBeUndefined();
    expect(completedAt.complete).toBeUndefined();
  });

  it('LaunchPadSubmission has required fields', () => {
    const submission: LaunchPadSubmission = {
      id: 'sub-1',
      client_id: 'client-1',
      stage: 'discovery',
      responses_json: {},
      completed_at: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(submission.id).toBe('sub-1');
    expect(submission.stage).toBe('discovery');
    expect(submission.insights_summary).toBeUndefined();
  });
});
