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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          submission_id: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string
          id?: string
          submission_id?: string | null
          user_id?: string
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          submission_id?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      app_items: {
        Row: {
          collection: string
          college_id: string | null
          data: Json
          dept_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          collection: string
          college_id?: string | null
          data?: Json
          dept_id?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          collection?: string
          college_id?: string | null
          data?: Json
          dept_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          data: Json
          event_workflow_enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          event_workflow_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          event_workflow_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          college_id: string
          created_at: string
          event_id: string
          event_num: string
          event_title: string
          id: string
          message: string
          read_by: string[]
          status: string
        }
        Insert: {
          college_id: string
          created_at?: string
          event_id: string
          event_num?: string
          event_title?: string
          id?: string
          message?: string
          read_by?: string[]
          status?: string
        }
        Update: {
          college_id?: string
          created_at?: string
          event_id?: string
          event_num?: string
          event_title?: string
          id?: string
          message?: string
          read_by?: string[]
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          college_id: string | null
          created_at: string
          dept_id: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          dept_id?: string | null
          email?: string
          id: string
          name?: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          dept_id?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_workflow_enabled: { Args: never; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      in_my_scope: {
        Args: { _college: string; _dept: string }
        Returns: boolean
      }
      is_global: { Args: never; Returns: boolean }
      list_public_event_photos: {
        Args: never
        Returns: {
          college: string
          department: string
          event_date: string
          event_type: string
          id: string
          photo_ids: string[]
          title: string
          venue: string
        }[]
      }
      list_public_event_resources: {
        Args: never
        Returns: {
          college: string
          department: string
          end_date: string
          event_date: string
          event_time: string
          event_type: string
          id: string
          mode: string
          status: string
          title: string
          venue: string
        }[]
      }
      my_college: { Args: never; Returns: string }
      my_dept: { Args: never; Returns: string }
      set_event_workflow_enabled: {
        Args: { _enabled: boolean }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
