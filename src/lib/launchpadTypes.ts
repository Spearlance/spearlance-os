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
    summary?: any;
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
