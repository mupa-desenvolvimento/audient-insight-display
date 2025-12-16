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
      channels: {
        Row: {
          created_at: string
          description: string | null
          fallback_playlist_id: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          priority: number
          source: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          priority?: number
          source?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          priority?: number
          source?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_fallback_playlist_id_fkey"
            columns: ["fallback_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          name: string
          state_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_group_channels: {
        Row: {
          channel_id: string
          created_at: string
          group_id: string
          id: string
          position: number
        }
        Insert: {
          channel_id: string
          created_at?: string
          group_id: string
          id?: string
          position?: number
        }
        Update: {
          channel_id?: string
          created_at?: string
          group_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_group_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_group_channels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_group_members: {
        Row: {
          created_at: string
          device_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_group_members_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          screen_type: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          screen_type?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          screen_type?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          camera_enabled: boolean
          created_at: string
          current_playlist_id: string | null
          device_code: string
          display_profile_id: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          metadata: Json | null
          name: string
          resolution: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          camera_enabled?: boolean
          created_at?: string
          current_playlist_id?: string | null
          device_code: string
          display_profile_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          metadata?: Json | null
          name: string
          resolution?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          camera_enabled?: boolean
          created_at?: string
          current_playlist_id?: string | null
          device_code?: string
          display_profile_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          metadata?: Json | null
          name?: string
          resolution?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_current_playlist_id_fkey"
            columns: ["current_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_display_profile_id_fkey"
            columns: ["display_profile_id"]
            isOneToOne: false
            referencedRelation: "display_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      display_profiles: {
        Row: {
          created_at: string
          default_layout: string | null
          has_touch: boolean
          id: string
          idle_behavior: string | null
          metadata: Json | null
          name: string
          offline_behavior: string | null
          orientation: string
          permitted_channels: string[] | null
          resolution: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_layout?: string | null
          has_touch?: boolean
          id?: string
          idle_behavior?: string | null
          metadata?: Json | null
          name: string
          offline_behavior?: string | null
          orientation?: string
          permitted_channels?: string[] | null
          resolution?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_layout?: string | null
          has_touch?: boolean
          id?: string
          idle_behavior?: string | null
          metadata?: Json | null
          name?: string
          offline_behavior?: string | null
          orientation?: string
          permitted_channels?: string[] | null
          resolution?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_rows: number | null
          errors: Json | null
          file_name: string | null
          id: string
          status: string
          success_rows: number | null
          total_rows: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          status?: string
          success_rows?: number | null
          total_rows?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          status?: string
          success_rows?: number | null
          total_rows?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      media_items: {
        Row: {
          created_at: string
          duration: number | null
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          resolution: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          resolution?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          resolution?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string
          duration_override: number | null
          id: string
          media_id: string
          playlist_id: string
          position: number
        }
        Insert: {
          created_at?: string
          duration_override?: number | null
          id?: string
          media_id: string
          playlist_id: string
          position?: number
        }
        Update: {
          created_at?: string
          duration_override?: number | null
          id?: string
          media_id?: string
          playlist_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          channel_id: string | null
          created_at: string
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          end_time: string | null
          fallback_media_id: string | null
          id: string
          is_active: boolean
          name: string
          priority: number | null
          schedule: Json | null
          start_date: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          fallback_media_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          schedule?: Json | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          fallback_media_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          schedule?: Json | null
          start_date?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_fallback_media_id_fkey"
            columns: ["fallback_media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string | null
          country_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          region_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          region_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          bairro: string | null
          cep: string | null
          city_id: string
          cnpj: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          regional_responsavel: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bairro?: string | null
          cep?: string | null
          city_id: string
          cnpj?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          regional_responsavel?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bairro?: string | null
          cep?: string | null
          city_id?: string
          cnpj?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          regional_responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_admin_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_admin_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_migration_at: string | null
          max_devices: number | null
          max_stores: number | null
          max_users: number | null
          metadata: Json | null
          migration_version: number | null
          name: string
          schema_name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_migration_at?: string | null
          max_devices?: number | null
          max_stores?: number | null
          max_users?: number | null
          metadata?: Json | null
          migration_version?: number | null
          name: string
          schema_name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_migration_at?: string | null
          max_devices?: number | null
          max_stores?: number | null
          max_users?: number | null
          metadata?: Json | null
          migration_version?: number | null
          name?: string
          schema_name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tenant_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_tenant_admin: boolean | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_tenant_admin?: boolean | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_tenant_admin?: boolean | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { check_user_id?: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { check_tenant_id: string; check_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin_global"
        | "admin_regional"
        | "admin_loja"
        | "operador_conteudo"
        | "tecnico"
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
      app_role: [
        "admin_global",
        "admin_regional",
        "admin_loja",
        "operador_conteudo",
        "tecnico",
      ],
    },
  },
} as const
