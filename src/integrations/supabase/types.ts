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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          current_balance: number
          deleted_at: string | null
          id: string
          include_in_net_worth: boolean
          initial_balance: number
          name: string
          track_balance: boolean
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          include_in_net_worth?: boolean
          initial_balance?: number
          name: string
          track_balance?: boolean
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          include_in_net_worth?: boolean
          initial_balance?: number
          name?: string
          track_balance?: boolean
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          categorization_enabled: boolean
          created_at: string
          daily_token_limit: number
          id: string
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categorization_enabled?: boolean
          created_at?: string
          daily_token_limit?: number
          id?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categorization_enabled?: boolean
          created_at?: string
          daily_token_limit?: number
          id?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          agent_name: string
          created_at: string
          date: string
          id: string
          request_count: number
          tokens_used: number
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          date?: string
          id?: string
          request_count?: number
          tokens_used?: number
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          date?: string
          id?: string
          request_count?: number
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_deposits: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          daily_rate: number | null
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          user_id: string
          working_days: number
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          daily_rate?: number | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          user_id: string
          working_days?: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          daily_rate?: number | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          user_id?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "benefit_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string
          due_date: string
          id: string
          paid_at: string | null
          paid_transaction_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recurrence_group_id: string | null
          status: Database["public"]["Enums"]["bill_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description: string
          due_date: string
          id?: string
          paid_at?: string | null
          paid_transaction_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_group_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          paid_transaction_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recurrence_group_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_paid_transaction_id_fkey"
            columns: ["paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          billing_day: number
          created_at: string
          credit_limit: number
          deleted_at: string | null
          due_day: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_day: number
          created_at?: string
          credit_limit: number
          deleted_at?: string | null
          due_day: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_day?: number
          created_at?: string
          credit_limit?: number
          deleted_at?: string | null
          due_day?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          deleted_at: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_groups: {
        Row: {
          created_at: string
          id: string
          total_amount: number
          total_installments: number
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_amount: number
          total_installments: number
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_amount?: number
          total_installments?: number
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_groups_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          group_id: string
          id: string
          installment_number: number
          invoice_id: string | null
          status: Database["public"]["Enums"]["installment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          group_id: string
          id?: string
          installment_number: number
          invoice_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          group_id?: string
          id?: string
          installment_number?: number
          invoice_id?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "installments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "installment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          card_id: string
          closing_date: string
          created_at: string
          cycle_end_date: string
          cycle_start_date: string
          deleted_at: string | null
          due_date: string
          id: string
          paid_at: string | null
          paid_from_account_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          closing_date: string
          created_at?: string
          cycle_end_date: string
          cycle_start_date: string
          deleted_at?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          paid_from_account_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          closing_date?: string
          created_at?: string
          cycle_end_date?: string
          cycle_start_date?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          paid_from_account_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_paid_from_account_id_fkey"
            columns: ["paid_from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      piggy_bank: {
        Row: {
          balance: number
          created_at: string
          deleted_at: string | null
          goal_amount: number | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          deleted_at?: string | null
          goal_amount?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          deleted_at?: string | null
          goal_amount?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piggy_bank_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          data_points: Json | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_points?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_points?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachments: string[]
          card_id: string | null
          category_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          description: string | null
          event_id: string | null
          id: string
          invoice_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          tags: string[]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachments?: string[]
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          tags?: string[]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachments?: string[]
          card_id?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          tags?: string[]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_invoice_cycle: {
        Args: {
          p_closing_day: number
          p_due_day: number
          p_transaction_date: string
        }
        Returns: {
          closing_date: string
          cycle_end_date: string
          cycle_start_date: string
          due_date: string
        }[]
      }
      close_due_invoices: { Args: never; Returns: number }
      create_initial_invoice: {
        Args: {
          p_card_id: string
          p_create_previous_closed?: boolean
          p_initial_invoice_month: string
          p_user_id: string
        }
        Returns: {
          current_invoice_id: string
          previous_invoice_id: string
        }[]
      }
      find_or_create_invoice: {
        Args: {
          p_card_id: string
          p_transaction_date: string
          p_user_id: string
        }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: string }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "cash"
        | "benefit_card"
        | "investment"
      audit_action: "create" | "update" | "delete" | "restore"
      bill_status: "pending" | "paid" | "overdue"
      goal_status: "active" | "completed" | "cancelled"
      installment_status: "pending" | "paid" | "reconciled"
      invoice_status: "open" | "closed" | "paid" | "overdue"
      payment_method:
        | "cash"
        | "debit"
        | "transfer"
        | "boleto"
        | "credit_card"
        | "voucher"
        | "split"
      transaction_type: "expense" | "income"
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
      account_type: [
        "checking",
        "savings",
        "cash",
        "benefit_card",
        "investment",
      ],
      audit_action: ["create", "update", "delete", "restore"],
      bill_status: ["pending", "paid", "overdue"],
      goal_status: ["active", "completed", "cancelled"],
      installment_status: ["pending", "paid", "reconciled"],
      invoice_status: ["open", "closed", "paid", "overdue"],
      payment_method: [
        "cash",
        "debit",
        "transfer",
        "boleto",
        "credit_card",
        "voucher",
        "split",
      ],
      transaction_type: ["expense", "income"],
    },
  },
} as const
