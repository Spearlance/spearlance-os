// Type definitions for Launchpad responses_json structure

export type LaunchPadStage = 'discovery' | 'marketing' | 'avatar' | 'complete';

export interface DiscoveryData {
  company: {
    legal_name: string;
    brand_name: string;
    website_url: string;
    hq_city?: string;
    service_areas?: string[];
    industry: string;
    timezone?: string;
  };
  contacts: {
    primary_name: string;
    primary_email: string;
    decision_makers?: string[];
  };
  model: {
    services: string[];
    aov?: number | null;
    ltv?: number | null;
    sales_process?: string;
  };
  goals: {
    quarter_goals: string[];
    annual_revenue_goal?: number | null;
  };
  state: {
    working?: string;
    not_working?: string;
    constraints?: string;
  };
  competition: {
    competitors?: string[];
  };
  voice: {
    tone: string;
    words_to_avoid?: string;
  };
  story?: {
    recording_url?: string;
    recording_asset_id?: string;
    completed: boolean;
    transcript?: string;
    summary?: string | Record<string, unknown>;
  };
}

export interface AssetsData {
  ids: string[];
}

export interface MarketingData {
  services_completed: boolean;
  social_strategy?: {
    posting_frequency: 'daily' | 'weekdays' | 'custom';
    selected_days: number[];
    topic_distribution: {
      educational: number;
      behind_the_scenes: number;
      customer_stories: number;
      promotional: number;
      quick_tips: number;
    };
  };
}

export interface ResponsesJson {
  discovery?: DiscoveryData;
  marketing?: MarketingData;
  assets?: AssetsData;
}

export interface CompletedAt {
  discovery?: string;
  marketing?: string;
  assets?: string;
  avatar?: string;
  complete?: string;
}

export interface LaunchPadSubmission {
  id: string;
  client_id: string;
  stage: LaunchPadStage;
  responses_json: ResponsesJson;
  insights_summary?: string;
  avatar_image_url?: string;
  ideal_client_story?: string;
  completed_at: CompletedAt;
  onboarding_mode?: 'form' | 'chat';
  onboarding_conversation_id?: string;
  discovery_completeness?: number;
  marketing_completeness?: number;
  avatar_completeness?: number;
  created_at: string;
  updated_at: string;
}

const STAGE_ORDER: LaunchPadStage[] = ['discovery', 'marketing', 'avatar', 'complete'];

/** Discovery counts as done once the company has a name: the same test the Profile page uses. */
export function isDiscoveryComplete(responses: ResponsesJson | null | undefined): boolean {
  const company = responses?.discovery?.company;
  return Boolean(company?.brand_name?.trim() || company?.legal_name?.trim());
}

export function isMarketingComplete(responses: ResponsesJson | null | undefined): boolean {
  return responses?.marketing?.services_completed === true;
}

/**
 * Returns the first unfinished stage that blocks moving to `target`, or null if the move is allowed.
 * Moving backwards is always allowed.
 */
export function getBlockingStage(
  target: LaunchPadStage,
  responses: ResponsesJson | null | undefined,
): LaunchPadStage | null {
  const targetIndex = STAGE_ORDER.indexOf(target);
  if (targetIndex > STAGE_ORDER.indexOf('discovery') && !isDiscoveryComplete(responses)) return 'discovery';
  if (targetIndex > STAGE_ORDER.indexOf('marketing') && !isMarketingComplete(responses)) return 'marketing';
  return null;
}

/**
 * completed_at must be an object keyed by stage. Older rows hold an ISO string, or that string
 * spread into numeric character keys ("0": "2", "1": "0", ...). Keep only the real stage keys.
 */
export function normalizeCompletedAt(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key, v]) => !/^\d+$/.test(key) && typeof v === 'string',
    ),
  ) as Record<string, string>;
}
