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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          context: string | null
          created_at: string
          domain: string | null
          hubspot_api_key: string | null
          icp_profile: Json | null
          id: string
          linkedin_company_url: string | null
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          salesforce_client_id: string | null
          salesforce_client_secret: string | null
          salesforce_instance_url: string | null
          stripe_customer_id: string | null
          website: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          domain?: string | null
          hubspot_api_key?: string | null
          icp_profile?: Json | null
          id?: string
          linkedin_company_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          salesforce_client_id?: string | null
          salesforce_client_secret?: string | null
          salesforce_instance_url?: string | null
          stripe_customer_id?: string | null
          website?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          domain?: string | null
          hubspot_api_key?: string | null
          icp_profile?: Json | null
          id?: string
          linkedin_company_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          salesforce_client_id?: string | null
          salesforce_client_secret?: string | null
          salesforce_instance_url?: string | null
          stripe_customer_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          enriched_at: string | null
          id: string
          linkedin_url: string
          location: string | null
          name: string | null
          past_companies: Json
          schools: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          enriched_at?: string | null
          id?: string
          linkedin_url: string
          location?: string | null
          name?: string | null
          past_companies?: Json
          schools?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          enriched_at?: string | null
          id?: string
          linkedin_url?: string
          location?: string | null
          name?: string | null
          past_companies?: Json
          schools?: Json
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_cache: {
        Row: {
          enriched_data: Json
          last_refreshed: string
          linkedin_url: string
          request_count: number
        }
        Insert: {
          enriched_data: Json
          last_refreshed?: string
          linkedin_url: string
          request_count?: number
        }
        Update: {
          enriched_data?: Json
          last_refreshed?: string
          linkedin_url?: string
          request_count?: number
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted: boolean
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
        }
        Insert: {
          accepted?: boolean
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          accepted?: boolean
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_connections: {
        Row: {
          company_id: string
          connected_on: string | null
          employee_id: string
          full_name: string | null
          id: string
          linkedin_url: string | null
          uploaded_at: string
        }
        Insert: {
          company_id: string
          connected_on?: string | null
          employee_id: string
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          uploaded_at?: string
        }
        Update: {
          company_id?: string
          connected_on?: string | null
          employee_id?: string
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_connections_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_usage: {
        Row: {
          company_id: string
          month: string
          searches_used: number
        }
        Insert: {
          company_id: string
          month: string
          searches_used?: number
        }
        Update: {
          company_id?: string
          month?: string
          searches_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_unlocks: {
        Row: {
          company_id: string
          linkedin_url: string
          unlocked_at: string
        }
        Insert: {
          company_id: string
          linkedin_url: string
          unlocked_at?: string
        }
        Update: {
          company_id?: string
          linkedin_url?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_unlocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_company_id: { Args: never; Returns: string }
      increment_usage: {
        Args: { p_company_id: string; p_month: string }
        Returns: number
      }
    }
    Enums: {
      plan_tier: "free" | "pro"
      user_role: "admin" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      plan_tier: ["free", "pro"],
      user_role: ["admin", "member"],
    },
  },
} as const
