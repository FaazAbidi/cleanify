export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      Categories: {
        Row: {
          created_at: string
          description: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      CategoryMethods: {
        Row: {
          category_id: number
          created_at: string
          id: number
          method_id: number
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: number
          method_id: number
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: number
          method_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "CategoryMethods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "Categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CategoryMethods_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "Methods"
            referencedColumns: ["id"]
          },
        ]
      }
      Files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: number
          modified_at: string | null
          path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: number
          modified_at?: string | null
          path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: number
          modified_at?: string | null
          path?: string
        }
        Relationships: []
      }
      Methods: {
        Row: {
          created_at: string
          description: string
          id: number
          is_enabled: boolean
          keyword: string | null
          label: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          is_enabled?: boolean
          keyword?: string | null
          label?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          is_enabled?: boolean
          keyword?: string | null
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      TaskMethods: {
        Row: {
          config: Json | null
          created_at: string
          data_types: Json | null
          id: number
          method_id: number | null
          name: string
          pre_analysis: Json | null
          prev_version: number | null
          processed_file: number | null
          status: Database["public"]["Enums"]["status"]
          task_id: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          data_types?: Json | null
          id?: number
          method_id?: number | null
          name: string
          pre_analysis?: Json | null
          prev_version?: number | null
          processed_file?: number | null
          status: Database["public"]["Enums"]["status"]
          task_id?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          data_types?: Json | null
          id?: number
          method_id?: number | null
          name?: string
          pre_analysis?: Json | null
          prev_version?: number | null
          processed_file?: number | null
          status?: Database["public"]["Enums"]["status"]
          task_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "TaskMethods_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "Methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TaskMethods_prev_version_fkey"
            columns: ["prev_version"]
            isOneToOne: false
            referencedRelation: "TaskMethods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TaskMethods_processed_file_fkey"
            columns: ["processed_file"]
            isOneToOne: false
            referencedRelation: "Files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TaskMethods_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      Tasks: {
        Row: {
          category: number | null
          created_at: string
          id: number
          modified_at: string
          name: string
          processed_data: number | null
          raw_data: number
          status: Database["public"]["Enums"]["status"]
          user_id: string
        }
        Insert: {
          category?: number | null
          created_at?: string
          id?: number
          modified_at?: string
          name: string
          processed_data?: number | null
          raw_data: number
          status: Database["public"]["Enums"]["status"]
          user_id?: string
        }
        Update: {
          category?: number | null
          created_at?: string
          id?: number
          modified_at?: string
          name?: string
          processed_data?: number | null
          raw_data?: number
          status?: Database["public"]["Enums"]["status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Tasks_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "Categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Tasks_processed_data_fkey"
            columns: ["processed_data"]
            isOneToOne: false
            referencedRelation: "Files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Tasks_raw_data_fkey"
            columns: ["raw_data"]
            isOneToOne: false
            referencedRelation: "Files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Tasks_user_id_fkey"
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
      get_enum_values: {
        Args: { enum_name: string }
        Returns: {
          value: string
        }[]
      }
    }
    Enums: {
      category: "cat_1" | "cat_2" | "cat_3"
      method: "method_1" | "method_2" | "method_3"
      status: "RUNNING" | "RAW" | "PROCESSED" | "FAILED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category: ["cat_1", "cat_2", "cat_3"],
      method: ["method_1", "method_2", "method_3"],
      status: ["RUNNING", "RAW", "PROCESSED", "FAILED"],
    },
  },
} as const
