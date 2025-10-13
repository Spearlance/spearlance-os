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
          avatar_name: string
          channels: string[] | null
          client_id: string
          demographics: string | null
          firmographics: string | null
          generated_image_url: string | null
          goals: string | null
          id: string
          keywords: string[] | null
          motivators: string | null
          objections: string | null
          pains: string | null
          price_range: string | null
          pricing_model: string | null
          service_areas: string[] | null
          tone_voice: string | null
          updated_at: string | null
        }
        Insert: {
          ad_hooks?: string[] | null
          ai_summary?: string | null
          avatar_name: string
          channels?: string[] | null
          client_id: string
          demographics?: string | null
          firmographics?: string | null
          generated_image_url?: string | null
          goals?: string | null
          id?: string
          keywords?: string[] | null
          motivators?: string | null
          objections?: string | null
          pains?: string | null
          price_range?: string | null
          pricing_model?: string | null
          service_areas?: string[] | null
          tone_voice?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_hooks?: string[] | null
          ai_summary?: string | null
          avatar_name?: string
          channels?: string[] | null
          client_id?: string
          demographics?: string | null
          firmographics?: string | null
          generated_image_url?: string | null
          goals?: string | null
          id?: string
          keywords?: string[] | null
          motivators?: string | null
          objections?: string | null
          pains?: string | null
          price_range?: string | null
          pricing_model?: string | null
          service_areas?: string[] | null
          tone_voice?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatars_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
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
      clients: {
        Row: {
          billing_plan_id: string | null
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          booking_permissions: string | null
          canva_folder_url: string | null
          created_at: string | null
          domain: string | null
          drive_folder_url: string | null
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
          next_steps: string[] | null
          recording_url: string | null
          source_system: string | null
          status: string | null
          summary: string
          tags: string[] | null
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
          next_steps?: string[] | null
          recording_url?: string | null
          source_system?: string | null
          status?: string | null
          summary: string
          tags?: string[] | null
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
          next_steps?: string[] | null
          recording_url?: string | null
          source_system?: string | null
          status?: string | null
          summary?: string
          tags?: string[] | null
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
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "fmm" | "client"
      asset_type: "image" | "video" | "copy" | "doc" | "link" | "other"
      billing_status: "good" | "delinquent" | "cancelled"
      client_status: "active" | "paused" | "archived"
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
      client_status: ["active", "paused", "archived"],
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
