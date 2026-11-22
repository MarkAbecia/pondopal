export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          limit_centavos: number
          month: string
          space_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          limit_centavos: number
          month: string
          space_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          limit_centavos?: number
          month?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          space_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          space_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          space_id?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          amount_centavos: number
          cell_index: number
          challenge_id: string
          created_at: string
          id: string
          saved_at: string
          space_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          amount_centavos: number
          cell_index: number
          challenge_id: string
          created_at?: string
          id?: string
          saved_at?: string
          space_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_centavos?: number
          cell_index?: number
          challenge_id?: string
          created_at?: string
          id?: string
          saved_at?: string
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_space_id_fkey"
            columns: ["challenge_id", "space_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id", "space_id"]
          },
        ]
      }
      challenge_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          rules: NonNullable<Json>
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          rules?: NonNullable<Json>
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          rules?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          base_centavos: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          settings: NonNullable<Json>
          space_id: string
          start_date: string
          status: Database["public"]["Enums"]["lifecycle_status"]
          template_key: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          base_centavos?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          settings?: NonNullable<Json>
          space_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["lifecycle_status"]
          template_key: string
          updated_at?: string
        }
        Update: {
          base_centavos?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          settings?: NonNullable<Json>
          space_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["lifecycle_status"]
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "challenge_templates"
            referencedColumns: ["key"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount_centavos: number
          contributed_at: string
          created_at: string
          goal_id: string
          id: string
          space_id: string
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          amount_centavos: number
          contributed_at?: string
          created_at?: string
          goal_id: string
          id?: string
          space_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_centavos?: number
          contributed_at?: string
          created_at?: string
          goal_id?: string
          id?: string
          space_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_space_id_fkey"
            columns: ["goal_id", "space_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "space_id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string
          id: string
          name: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          space_id: string
          target_centavos: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline: string
          id?: string
          name: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          space_id: string
          target_centavos: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string
          id?: string
          name?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          space_id?: string
          target_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          max_uses: number | null
          role: Database["public"]["Enums"]["space_role"]
          space_id: string
          updated_at: string
          used_count: number
        }
        ComputedFields: never
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: NonNullable<Json>
          read_at: string | null
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: NonNullable<Json>
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: NonNullable<Json>
          read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paluwagan: {
        Row: {
          contribution_centavos: number
          created_at: string
          created_by: string | null
          frequency: Database["public"]["Enums"]["pay_frequency"]
          id: string
          name: string
          space_id: string
          start_date: string
          status: Database["public"]["Enums"]["lifecycle_status"]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          contribution_centavos: number
          created_at?: string
          created_by?: string | null
          frequency: Database["public"]["Enums"]["pay_frequency"]
          id?: string
          name: string
          space_id: string
          start_date: string
          status?: Database["public"]["Enums"]["lifecycle_status"]
          updated_at?: string
        }
        Update: {
          contribution_centavos?: number
          created_at?: string
          created_by?: string | null
          frequency?: Database["public"]["Enums"]["pay_frequency"]
          id?: string
          name?: string
          space_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["lifecycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paluwagan_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      paluwagan_members: {
        Row: {
          created_at: string
          id: string
          paluwagan_id: string
          payout_order: number
          space_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          paluwagan_id: string
          payout_order: number
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paluwagan_id?: string
          payout_order?: number
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paluwagan_members_paluwagan_id_space_id_fkey"
            columns: ["paluwagan_id", "space_id"]
            isOneToOne: false
            referencedRelation: "paluwagan"
            referencedColumns: ["id", "space_id"]
          },
        ]
      }
      paluwagan_rounds: {
        Row: {
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          paluwagan_id: string
          round_number: number
          space_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          paluwagan_id: string
          round_number: number
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          paluwagan_id?: string
          round_number?: number
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paluwagan_rounds_paluwagan_id_space_id_fkey"
            columns: ["paluwagan_id", "space_id"]
            isOneToOne: false
            referencedRelation: "paluwagan"
            referencedColumns: ["id", "space_id"]
          },
        ]
      }
      payment_sources: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          name: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          expo_push_token: string | null
          id: string
          locale: string
          timezone: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          expo_push_token?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          expo_push_token?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          amount_centavos: number
          category_id: string | null
          created_at: string
          due_day: number
          frequency: Database["public"]["Enums"]["bill_frequency"]
          id: string
          name: string
          next_due_at: string
          space_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          amount_centavos: number
          category_id?: string | null
          created_at?: string
          due_day: number
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          name: string
          next_due_at: string
          space_id: string
          updated_at?: string
        }
        Update: {
          amount_centavos?: number
          category_id?: string | null
          created_at?: string
          due_day?: number
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          name?: string
          next_due_at?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_bills_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_centavos: number
          created_at: string
          from_user: string | null
          id: string
          settled_at: string
          space_id: string
          to_user: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          amount_centavos: number
          created_at?: string
          from_user?: string | null
          id?: string
          settled_at?: string
          space_id: string
          to_user?: string | null
          updated_at?: string
        }
        Update: {
          amount_centavos?: number
          created_at?: string
          from_user?: string | null
          id?: string
          settled_at?: string
          space_id?: string
          to_user?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          role: Database["public"]["Enums"]["space_role"]
          space_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["space_role"]
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          type: Database["public"]["Enums"]["space_type"]
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["space_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["space_type"]
          updated_at?: string
        }
        Relationships: []
      }
      transaction_splits: {
        Row: {
          created_at: string
          id: string
          share_centavos: number
          space_id: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          share_centavos: number
          space_id: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_centavos?: number
          space_id?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_transaction_id_space_id_fkey"
            columns: ["transaction_id", "space_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id", "space_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_centavos: number
          category_id: string | null
          created_at: string
          id: string
          note: string | null
          occurred_at: string
          payment_source_id: string | null
          receipt_path: string | null
          shared_from_transaction_id: string | null
          space_id: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          amount_centavos: number
          category_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          payment_source_id?: string | null
          receipt_path?: string | null
          shared_from_transaction_id?: string | null
          space_id: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_centavos?: number
          category_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          occurred_at?: string
          payment_source_id?: string | null
          receipt_path?: string | null
          shared_from_transaction_id?: string | null
          space_id?: string
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_source_id_fkey"
            columns: ["payment_source_id"]
            isOneToOne: false
            referencedRelation: "payment_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_shared_from_transaction_id_fkey"
            columns: ["shared_from_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_code: string }; Returns: string }
      add_default_payment_sources: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      can_manage_space: { Args: { p_space_id: string }; Returns: boolean }
      can_write_as: {
        Args: { p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      is_space_member: { Args: { p_space_id: string }; Returns: boolean }
      leave_space: { Args: { p_space_id: string }; Returns: undefined }
      shares_space_with: { Args: { p_user_id: string }; Returns: boolean }
      space_id_from_path: { Args: { p_name: string }; Returns: string }
      space_role: {
        Args: { p_space_id: string }
        Returns: Database["public"]["Enums"]["space_role"]
      }
    }
    Enums: {
      bill_frequency: "weekly" | "monthly" | "quarterly" | "yearly"
      lifecycle_status: "active" | "completed" | "cancelled"
      pay_frequency: "daily" | "weekly" | "semi_monthly" | "monthly"
      payment_kind: "cash" | "gcash" | "maya" | "bank" | "credit_card" | "other"
      space_role: "owner" | "admin" | "member" | "viewer"
      space_type: "personal" | "partner" | "family" | "group"
      txn_type: "income" | "expense"
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
    Enums: {
      bill_frequency: ["weekly", "monthly", "quarterly", "yearly"],
      lifecycle_status: ["active", "completed", "cancelled"],
      pay_frequency: ["daily", "weekly", "semi_monthly", "monthly"],
      payment_kind: ["cash", "gcash", "maya", "bank", "credit_card", "other"],
      space_role: ["owner", "admin", "member", "viewer"],
      space_type: ["personal", "partner", "family", "group"],
      txn_type: ["income", "expense"],
    },
  },
} as const
