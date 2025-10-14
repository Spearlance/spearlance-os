export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      asset_folders: {
        Row: {
          client_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_versions: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          notes: string | null
          upload_blob: string | null
          version_number: number
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          upload_blob?: string | null
          version_number: number
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          upload_blob?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          current_version_id: string | null
          file_url: string | null
          folder_id: string | null
          id: string
          preview_url: string | null
          storage_type: Database["public"]["Enums"]["storage_type"]
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["asset_type"] | null
          upload_blob: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          preview_url?: string | null
          storage_type: Database["public"]["Enums"]["storage_type"]
          tags?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["asset_type"] | null
          upload_blob?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          preview_url?: string | null
          storage_type?: Database["public"]["Enums"]["storage_type"]
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["asset_type"] | null
          upload_blob?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "asset_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_evidence: {
        Row: {
          avatar_id: string
          created_at: string | null
          evidence_type: string
          excerpt_text: string | null
          id: string
          source_url: string | null
          uploaded_file: string | null
        }
        Insert: {
          avatar_id: string
          created_at?: string | null
          evidence_type: string
          excerpt_text?: string | null
          id?: string
          source_url?: string | null
          uploaded_file?: string | null
        }
        Update: {
          avatar_id?: string
          created_at?: string | null
          evidence_type?: string
          excerpt_text?: string | null
          id?: string
          source_url?: string | null
          uploaded_file?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_evidence_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          ad_hooks: string[] | null
          ai_summary: string | null
          ai_summary_generated_at: string | null
          avatar_name: string
          channels: string[] | null
          client_id: string
          demographics: string | null
          firmographics: string | null
          generated_image_url: string | null
          generated_image_urls: string[] | null
          goals: string | null
          id: string
          keywords: string[] | null
          motivators: string | null
          objections: string | null
          pains: string | null
          price_range: string | null
          pricing_model: string | null
          primary_image_url: string | null
          service_areas: string[] | null
          tone_voice: string | null
          updated_at: string | null
        }
        Insert: {
          ad_hooks?: string[] | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          avatar_name: string
          channels?: string[] | null
          client_id: string
          demographics?: string | null
          firmographics?: string | null
          generated_image_url?: string | null
          generated_image_urls?: string[] | null
          goals?: string | null
          id?: string
          keywords?: string[] | null
          motivators?: string | null
          objections?: string | null
          pains?: string | null
          price_range?: string | null
          pricing_model?: string | null
          primary_image_url?: string | null
          service_areas?: string[] | null
          tone_voice?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_hooks?: string[] | null
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          avatar_name?: string
          channels?: string[] | null
          client_id?: string
          demographics?: string | null
          firmographics?: string | null
          generated_image_url?: string | null
          generated_image_urls?: string[] | null
          goals?: string | null
          id?: string
          keywords?: string[] | null
          motivators?: string | null
          objections?: string | null
          pains?: string | null
          price_range?: string | null
          pricing_model?: string | null
          primary_image_url?: string | null
          service_areas?: string[] | null
          tone_voice?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatars_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string | null
          features: string[] | null
          id: string
          is_portal_only: boolean | null
          name: string
          price_monthly: number
        }
        Insert: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          is_portal_only?: boolean | null
          name: string
          price_monthly: number
        }
        Update: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          is_portal_only?: boolean | null
          name?: string
          price_monthly?: number
        }
        Relationships: []
      }
      cal_webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      chat_audit_logs: {
        Row: {
          client_id: string
          created_at: string
          error: string | null
          function_name: string
          id: string
          parameters: Json | null
          result_count: number | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          error?: string | null
          function_name: string
          id?: string
          parameters?: Json | null
          result_count?: number | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          error?: string | null
          function_name?: string
          id?: string
          parameters?: Json | null
          result_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          archived_at: string | null
          auto_delete_at: string
          client_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          auto_delete_at?: string
          client_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          auto_delete_at?: string
          client_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rate_limits: {
        Row: {
          created_at: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start: string
        }
        Update: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          billing_plan_id: string | null
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          booking_permissions: string | null
          canva_folder_url: string | null
          created_at: string | null
          domain: string | null
          drive_folder_url: string | null
          front_tag: string
          id: string
          logo_url: string | null
          name: string
          oviond_url: string | null
          primary_contact_user_id: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          billing_plan_id?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          booking_permissions?: string | null
          canva_folder_url?: string | null
          created_at?: string | null
          domain?: string | null
          drive_folder_url?: string | null
          front_tag: string
          id?: string
          logo_url?: string | null
          name: string
          oviond_url?: string | null
          primary_contact_user_id?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          billing_plan_id?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          booking_permissions?: string | null
          canva_folder_url?: string | null
          created_at?: string | null
          domain?: string | null
          drive_folder_url?: string | null
          front_tag?: string
          id?: string
          logo_url?: string | null
          name?: string
          oviond_url?: string | null
          primary_contact_user_id?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_contact_fkey"
            columns: ["primary_contact_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          attachments: Json | null
          call_duration_minutes: number | null
          call_recording_url: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          front_conversation_id: string | null
          front_conversation_url: string | null
          id: string
          internal_notes: string | null
          last_message_at: string | null
          message_thread: Json
          participants: Json
          search_vector: unknown | null
          source: string
          subject_line: string
          tags: string[] | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          attachments?: Json | null
          call_duration_minutes?: number | null
          call_recording_url?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          front_conversation_id?: string | null
          front_conversation_url?: string | null
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          message_thread?: Json
          participants?: Json
          search_vector?: unknown | null
          source?: string
          subject_line: string
          tags?: string[] | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          attachments?: Json | null
          call_duration_minutes?: number | null
          call_recording_url?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          front_conversation_id?: string | null
          front_conversation_url?: string | null
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          message_thread?: Json
          participants?: Json
          search_vector?: unknown | null
          source?: string
          subject_line?: string
          tags?: string[] | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      front_webhook_logs: {
        Row: {
          client_id: string | null
          communication_log_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          client_id?: string | null
          communication_log_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          client_id?: string | null
          communication_log_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "front_webhook_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_webhook_logs_communication_log_id_fkey"
            columns: ["communication_log_id"]
            isOneToOne: false
            referencedRelation: "communication_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      launchpad_submissions: {
        Row: {
          avatar_image_url: string | null
          brand_colors: Json | null
          client_id: string
          completed_at: Json | null
          created_at: string | null
          id: string
          ideal_client_story: string | null
          insights_summary: string | null
          responses_json: Json | null
          stage: Database["public"]["Enums"]["launchpad_stage"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_image_url?: string | null
          brand_colors?: Json | null
          client_id: string
          completed_at?: Json | null
          created_at?: string | null
          id?: string
          ideal_client_story?: string | null
          insights_summary?: string | null
          responses_json?: Json | null
          stage?: Database["public"]["Enums"]["launchpad_stage"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_image_url?: string | null
          brand_colors?: Json | null
          client_id?: string
          completed_at?: Json | null
          created_at?: string | null
          id?: string
          ideal_client_story?: string | null
          insights_summary?: string | null
          responses_json?: Json | null
          stage?: Database["public"]["Enums"]["launchpad_stage"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launchpad_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flow_channel_notes: {
        Row: {
          body: string
          channel_id: string
          created_at: string | null
          created_by: string | null
          id: string
          visibility: string | null
        }
        Insert: {
          body: string
          channel_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          visibility?: string | null
        }
        Update: {
          body?: string
          channel_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flow_channel_notes_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_flow_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_channel_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flow_channels: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          ownership: Database["public"]["Enums"]["channel_ownership"]
          progress: number | null
          stage_id: string
          status: Database["public"]["Enums"]["channel_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          ownership: Database["public"]["Enums"]["channel_ownership"]
          progress?: number | null
          stage_id: string
          status?: Database["public"]["Enums"]["channel_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          ownership?: Database["public"]["Enums"]["channel_ownership"]
          progress?: number | null
          stage_id?: string
          status?: Database["public"]["Enums"]["channel_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flow_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_channels_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "marketing_flow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flow_stages: {
        Row: {
          created_at: string | null
          description: string | null
          flow_id: string
          id: string
          name: string
          order_index: number
          standard_stage_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flow_id: string
          id?: string
          name: string
          order_index: number
          standard_stage_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flow_id?: string
          id?: string
          name?: string
          order_index?: number
          standard_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flow_stages_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "marketing_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_stages_standard_stage_id_fkey"
            columns: ["standard_stage_id"]
            isOneToOne: false
            referencedRelation: "standard_marketing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flow_task_links: {
        Row: {
          channel_id: string
          created_at: string | null
          created_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flow_task_links_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_flow_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_task_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flow_task_templates: {
        Row: {
          channel_name: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          standard_stage_id: string
          title: string
        }
        Insert: {
          channel_name: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          standard_stage_id: string
          title: string
        }
        Update: {
          channel_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          standard_stage_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flow_task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flow_task_templates_standard_stage_id_fkey"
            columns: ["standard_stage_id"]
            isOneToOne: false
            referencedRelation: "standard_marketing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_flows: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ideas: {
        Row: {
          client_id: string
          content: Json
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          offer_type: string | null
          parent_idea_id: string | null
          source_conversation_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          client_id: string
          content: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          offer_type?: string | null
          parent_idea_id?: string | null
          source_conversation_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          client_id?: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          offer_type?: string | null
          parent_idea_id?: string | null
          source_conversation_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ideas_parent_idea_id_fkey"
            columns: ["parent_idea_id"]
            isOneToOne: false
            referencedRelation: "marketing_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ideas_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_tasks: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendees: string | null
          cal_attendee_emails: string[] | null
          cal_booking_id: string | null
          cal_event_id: string | null
          cal_event_type_id: string | null
          cal_organizer_email: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          date_time: string
          decisions: string[] | null
          id: string
          join_url: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          next_steps: string[] | null
          recording_url: string | null
          source_system: string | null
          status: string | null
          summary: string
          tags: string[] | null
          timezone: string | null
          transcript_text: string | null
        }
        Insert: {
          attendees?: string | null
          cal_attendee_emails?: string[] | null
          cal_booking_id?: string | null
          cal_event_id?: string | null
          cal_event_type_id?: string | null
          cal_organizer_email?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          date_time: string
          decisions?: string[] | null
          id?: string
          join_url?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          next_steps?: string[] | null
          recording_url?: string | null
          source_system?: string | null
          status?: string | null
          summary: string
          tags?: string[] | null
          timezone?: string | null
          transcript_text?: string | null
        }
        Update: {
          attendees?: string | null
          cal_attendee_emails?: string[] | null
          cal_booking_id?: string | null
          cal_event_id?: string | null
          cal_event_type_id?: string | null
          cal_organizer_email?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          date_time?: string
          decisions?: string[] | null
          id?: string
          join_url?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          next_steps?: string[] | null
          recording_url?: string | null
          source_system?: string | null
          status?: string | null
          summary?: string
          tags?: string[] | null
          timezone?: string | null
          transcript_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload_json: Json | null
          read_flag: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload_json?: Json | null
          read_flag?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload_json?: Json | null
          read_flag?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          associated_client_ids: string[] | null
          cal_access_token: string | null
          cal_availability_view_only: boolean | null
          cal_booking_enabled: boolean | null
          cal_connected: boolean | null
          cal_event_type_id: string | null
          cal_managed_user_id: string | null
          cal_refresh_token: string | null
          cal_token_expires_at: string | null
          cal_username: string | null
          created_at: string | null
          email: string
          ical_feed_token: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          associated_client_ids?: string[] | null
          cal_access_token?: string | null
          cal_availability_view_only?: boolean | null
          cal_booking_enabled?: boolean | null
          cal_connected?: boolean | null
          cal_event_type_id?: string | null
          cal_managed_user_id?: string | null
          cal_refresh_token?: string | null
          cal_token_expires_at?: string | null
          cal_username?: string | null
          created_at?: string | null
          email: string
          ical_feed_token?: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          associated_client_ids?: string[] | null
          cal_access_token?: string | null
          cal_availability_view_only?: boolean | null
          cal_booking_enabled?: boolean | null
          cal_connected?: boolean | null
          cal_event_type_id?: string | null
          cal_managed_user_id?: string | null
          cal_refresh_token?: string | null
          cal_token_expires_at?: string | null
          cal_username?: string | null
          created_at?: string | null
          email?: string
          ical_feed_token?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          client_id: string
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          name: string
          oviond_url: string
          owner_user_id: string | null
          pinned: boolean | null
          status: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          name: string
          oviond_url: string
          owner_user_id?: string | null
          pinned?: boolean | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          name?: string
          oviond_url?: string
          owner_user_id?: string | null
          pinned?: boolean | null
          status?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          differentiators: string | null
          id: string
          key_benefits: string[] | null
          name: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          differentiators?: string | null
          id?: string
          key_benefits?: string[] | null
          name: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          differentiators?: string | null
          id?: string
          key_benefits?: string[] | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_marketing_stages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          activity_log: string | null
          assignee_user_id: string | null
          client_id: string
          created_at: string | null
          creator_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          linked_channel_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids: string[] | null
          related_meeting_ids: string[] | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          activity_log?: string | null
          assignee_user_id?: string | null
          client_id: string
          created_at?: string | null
          creator_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_channel_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids?: string[] | null
          related_meeting_ids?: string[] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          activity_log?: string | null
          assignee_user_id?: string | null
          client_id?: string
          created_at?: string | null
          creator_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_channel_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids?: string[] | null
          related_meeting_ids?: string[] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_channel_id_fkey"
            columns: ["linked_channel_id"]
            isOneToOne: false
            referencedRelation: "marketing_flow_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          author_user_id: string
          body_richtext: string
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          author_user_id: string
          body_richtext: string
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          author_user_id?: string
          body_richtext?: string
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"] | null
          client_id: string
          created_at: string | null
          id: string
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids: string[] | null
          related_task_ids: string[] | null
          requester_user_id: string
          status: Database["public"]["Enums"]["ticket_status"] | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"] | null
          client_id: string
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids?: string[] | null
          related_task_ids?: string[] | null
          requester_user_id: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"] | null
          client_id?: string
          created_at?: string | null
          id?: string
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_asset_ids?: string[] | null
          related_task_ids?: string[] | null
          requester_user_id?: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_marketing_flow: {
        Args: { p_client_id: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "fmm" | "client"
      asset_type: "image" | "video" | "copy" | "doc" | "link" | "other"
      billing_status: "good" | "delinquent" | "cancelled"
      channel_ownership: "spearlance" | "client" | "both"
      channel_status: "active" | "in_progress" | "paused" | "not_used"
      client_status: "active" | "paused" | "archived"
      communication_type: "email" | "text" | "call"
      launchpad_stage:
        | "discovery"
        | "marketing"
        | "access"
        | "assets"
        | "avatar"
        | "complete"
      storage_type: "upload" | "url"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "to_do" | "in_progress" | "done"
      ticket_category: "website" | "ads" | "seo" | "billing" | "other"
      ticket_status: "open" | "in_progress" | "waiting_on_client" | "resolved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "fmm", "client"],
      asset_type: ["image", "video", "copy", "doc", "link", "other"],
      billing_status: ["good", "delinquent", "cancelled"],
      channel_ownership: ["spearlance", "client", "both"],
      channel_status: ["active", "in_progress", "paused", "not_used"],
      client_status: ["active", "paused", "archived"],
      communication_type: ["email", "text", "call"],
      launchpad_stage: [
        "discovery",
        "marketing",
        "access",
        "assets",
        "avatar",
        "complete",
      ],
      storage_type: ["upload", "url"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["to_do", "in_progress", "done"],
      ticket_category: ["website", "ads", "seo", "billing", "other"],
      ticket_status: ["open", "in_progress", "waiting_on_client", "resolved"],
    },
  },
} as const
