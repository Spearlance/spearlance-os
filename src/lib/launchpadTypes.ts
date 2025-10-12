// Type definitions for Launch Pad responses_json structure

export type LaunchPadStage = 'discovery' | 'access' | 'assets' | 'avatar' | 'complete';

export interface DiscoveryData {
  company: {
    legal_name: string;
    brand_name: string;
    website_url: string;
    hq_city?: string;
    service_areas?: string[];
    industry: string;
  };
  contacts: {
    primary_name: string;
    primary_email: string;
    decision_makers?: string[];
  };
  model: {
    core_offers: string;
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
}

export interface AccessData {
  ads: {
    google_ads_id?: string;
    meta_bm_url?: string;
  };
  analytics: {
    ga_property_id?: string;
    gsc_property_url?: string;
  };
  web: {
    platform: string;
    admin_url?: string;
  };
  crm: {
    name?: string;
    url?: string;
  };
  storage: {
    drive_folder_url?: string;
    canva_folder_url?: string;
  };
  consent: {
    ack_shared_access: boolean;
  };
}

export interface AssetsData {
  ids: string[];
}

export interface ResponsesJson {
  discovery?: DiscoveryData;
  access?: AccessData;
  assets?: AssetsData;
}

export interface CompletedAt {
  discovery?: string;
  access?: string;
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
  created_at: string;
  updated_at: string;
}
