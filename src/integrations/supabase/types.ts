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
  public: {
    Tables: {
      clientes: {
        Row: {
          contacto: string | null
          created_at: string
          email: string | null
          estado: string
          id: string
          industria: string | null
          nombre: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          industria?: string | null
          nombre: string
        }
        Update: {
          contacto?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          industria?: string | null
          nombre?: string
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          created_at: string | null
          id: string
          mensaje: string
          postulante_id: string | null
          rol: string
          telefono: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mensaje: string
          postulante_id?: string | null
          rol: string
          telefono: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mensaje?: string
          postulante_id?: string | null
          rol?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversaciones_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "postulantes"
            referencedColumns: ["id"]
          },
        ]
      }
      postulantes: {
        Row: {
          comuna: string | null
          created_at: string | null
          cv_url: string | null
          email: string | null
          estado_pipeline: string | null
          experiencia: string | null
          fecha_postulacion: string | null
          fuente: string | null
          habilidades: string[] | null
          id: string
          match_score: number | null
          mensaje_postulante: string | null
          nombre: string
          notas: string | null
          pretension_renta: string | null
          profesion: string | null
          respuesta_agente: string | null
          telefono: string | null
          vacante_origen: string | null
        }
        Insert: {
          comuna?: string | null
          created_at?: string | null
          cv_url?: string | null
          email?: string | null
          estado_pipeline?: string | null
          experiencia?: string | null
          fecha_postulacion?: string | null
          fuente?: string | null
          habilidades?: string[] | null
          id?: string
          match_score?: number | null
          mensaje_postulante?: string | null
          nombre: string
          notas?: string | null
          pretension_renta?: string | null
          profesion?: string | null
          respuesta_agente?: string | null
          telefono?: string | null
          vacante_origen?: string | null
        }
        Update: {
          comuna?: string | null
          created_at?: string | null
          cv_url?: string | null
          email?: string | null
          estado_pipeline?: string | null
          experiencia?: string | null
          fecha_postulacion?: string | null
          fuente?: string | null
          habilidades?: string[] | null
          id?: string
          match_score?: number | null
          mensaje_postulante?: string | null
          nombre?: string
          notas?: string | null
          pretension_renta?: string | null
          profesion?: string | null
          respuesta_agente?: string | null
          telefono?: string | null
          vacante_origen?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      vacantes: {
        Row: {
          cargo: string
          cliente_id: string
          created_at: string
          estado: string | null
          id: string
          renta: string | null
          responsable_id: string | null
          tipo: string | null
          ubicacion: string | null
        }
        Insert: {
          cargo: string
          cliente_id: string
          created_at?: string
          estado?: string | null
          id?: string
          renta?: string | null
          responsable_id?: string | null
          tipo?: string | null
          ubicacion?: string | null
        }
        Update: {
          cargo?: string
          cliente_id?: string
          created_at?: string
          estado?: string | null
          id?: string
          renta?: string | null
          responsable_id?: string | null
          tipo?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_postulante_nombre: { Args: { n: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
