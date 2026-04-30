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
      leads_comerciales: {
        Row: {
          cargo: string | null
          ciudad: string | null
          comuna: string | null
          contacto: string | null
          created_at: string
          email: string | null
          empresa: string
          estado_verificacion: string | null
          etapa: string
          id: string
          notas: string | null
          origen: string | null
          pais: string | null
          prioridad: string
          region: string | null
          sitio_web: string | null
          telefono: string | null
          tipo_empresa: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          ciudad?: string | null
          comuna?: string | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa: string
          estado_verificacion?: string | null
          etapa?: string
          id?: string
          notas?: string | null
          origen?: string | null
          pais?: string | null
          prioridad?: string
          region?: string | null
          sitio_web?: string | null
          telefono?: string | null
          tipo_empresa?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          ciudad?: string | null
          comuna?: string | null
          contacto?: string | null
          created_at?: string
          email?: string | null
          empresa?: string
          estado_verificacion?: string | null
          etapa?: string
          id?: string
          notas?: string | null
          origen?: string | null
          pais?: string | null
          prioridad?: string
          region?: string | null
          sitio_web?: string | null
          telefono?: string | null
          tipo_empresa?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_documentos: {
        Row: {
          created_at: string
          empresa_key: string
          file_size: number | null
          id: string
          mime_type: string | null
          nombre: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          empresa_key: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nombre: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          empresa_key?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          nombre?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      portal_absences: {
        Row: {
          absence_type: Database["public"]["Enums"]["portal_absence_type"]
          business_days: number | null
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          absence_type: Database["public"]["Enums"]["portal_absence_type"]
          business_days?: number | null
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          absence_type?: Database["public"]["Enums"]["portal_absence_type"]
          business_days?: number | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_absences_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_approval_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          end_date: string
          id: string
          notified_at: string | null
          notified_to_nodo: boolean
          reason: string | null
          request_type: Database["public"]["Enums"]["portal_absence_type"]
          start_date: string
          status: Database["public"]["Enums"]["portal_approval_status"]
          submitted_at: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date: string
          id?: string
          notified_at?: string | null
          notified_to_nodo?: boolean
          reason?: string | null
          request_type: Database["public"]["Enums"]["portal_absence_type"]
          start_date: string
          status?: Database["public"]["Enums"]["portal_approval_status"]
          submitted_at?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date?: string
          id?: string
          notified_at?: string | null
          notified_to_nodo?: boolean
          reason?: string | null
          request_type?: Database["public"]["Enums"]["portal_absence_type"]
          start_date?: string
          status?: Database["public"]["Enums"]["portal_approval_status"]
          submitted_at?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_approval_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "portal_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_approval_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          gv_synced_at: string | null
          id: string
          late_minutes: number | null
          notes: string | null
          shift_end: string | null
          shift_start: string | null
          source: Database["public"]["Enums"]["portal_attendance_source"]
          updated_at: string
          worked_hours: number | null
          worker_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          gv_synced_at?: string | null
          id?: string
          late_minutes?: number | null
          notes?: string | null
          shift_end?: string | null
          shift_start?: string | null
          source?: Database["public"]["Enums"]["portal_attendance_source"]
          updated_at?: string
          worked_hours?: number | null
          worker_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          gv_synced_at?: string | null
          id?: string
          late_minutes?: number | null
          notes?: string | null
          shift_end?: string | null
          shift_start?: string | null
          source?: Database["public"]["Enums"]["portal_attendance_source"]
          updated_at?: string
          worked_hours?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_buk_sync_log: {
        Row: {
          entity: string
          error_message: string | null
          finished_at: string | null
          id: string
          portal_company_id: string | null
          records_failed: number | null
          records_inserted: number | null
          records_total: number | null
          records_updated: number | null
          started_at: string
          status: Database["public"]["Enums"]["portal_sync_status"]
        }
        Insert: {
          entity: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          portal_company_id?: string | null
          records_failed?: number | null
          records_inserted?: number | null
          records_total?: number | null
          records_updated?: number | null
          started_at?: string
          status: Database["public"]["Enums"]["portal_sync_status"]
        }
        Update: {
          entity?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          portal_company_id?: string | null
          records_failed?: number | null
          records_inserted?: number | null
          records_total?: number | null
          records_updated?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["portal_sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "portal_buk_sync_log_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_buk_sync_log_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_dashboard_metrics"
            referencedColumns: ["portal_company_id"]
          },
        ]
      }
      portal_companies: {
        Row: {
          active: boolean
          buk_area_name: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string
          rut: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          buk_area_name: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string
          rut?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          buk_area_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          rut?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portal_contracts: {
        Row: {
          buk_synced_at: string | null
          contract_type: string | null
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          position: string | null
          start_date: string | null
          updated_at: string
          weekly_hours: number | null
          worker_id: string
        }
        Insert: {
          buk_synced_at?: string | null
          contract_type?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position?: string | null
          start_date?: string | null
          updated_at?: string
          weekly_hours?: number | null
          worker_id: string
        }
        Update: {
          buk_synced_at?: string | null
          contract_type?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position?: string | null
          start_date?: string | null
          updated_at?: string
          weekly_hours?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_contracts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_incidents: {
        Row: {
          attachment_url: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          incident_type: Database["public"]["Enums"]["portal_incident_type"]
          notified_at: string | null
          notified_to_nodo: boolean
          reported_by: string | null
          severity: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          incident_type: Database["public"]["Enums"]["portal_incident_type"]
          notified_at?: string | null
          notified_to_nodo?: boolean
          reported_by?: string | null
          severity?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          incident_type?: Database["public"]["Enums"]["portal_incident_type"]
          notified_at?: string | null
          notified_to_nodo?: boolean
          reported_by?: string | null
          severity?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "portal_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_incidents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_overtime: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          type: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours: number
          id?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_overtime_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "portal_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_user_profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          last_login_at: string | null
          phone: string | null
          portal_company_id: string | null
          role: Database["public"]["Enums"]["portal_user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          last_login_at?: string | null
          phone?: string | null
          portal_company_id?: string | null
          role?: Database["public"]["Enums"]["portal_user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          phone?: string | null
          portal_company_id?: string | null
          role?: Database["public"]["Enums"]["portal_user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_user_profiles_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_user_profiles_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_dashboard_metrics"
            referencedColumns: ["portal_company_id"]
          },
        ]
      }
      portal_workers: {
        Row: {
          active: boolean
          area: string | null
          buk_employee_id: string | null
          buk_synced_at: string | null
          cost_center: string | null
          created_at: string
          division: string | null
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          phone: string | null
          photo_url: string | null
          portal_company_id: string
          position: string | null
          rut: string | null
          rut_display: string | null
          sub_area: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          area?: string | null
          buk_employee_id?: string | null
          buk_synced_at?: string | null
          cost_center?: string | null
          created_at?: string
          division?: string | null
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          phone?: string | null
          photo_url?: string | null
          portal_company_id: string
          position?: string | null
          rut?: string | null
          rut_display?: string | null
          sub_area?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string | null
          buk_employee_id?: string | null
          buk_synced_at?: string | null
          cost_center?: string | null
          created_at?: string
          division?: string | null
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          portal_company_id?: string
          position?: string | null
          rut?: string | null
          rut_display?: string | null
          sub_area?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_workers_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_workers_portal_company_id_fkey"
            columns: ["portal_company_id"]
            isOneToOne: false
            referencedRelation: "portal_dashboard_metrics"
            referencedColumns: ["portal_company_id"]
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
          cliente: string | null
          created_at: string | null
          id: string
          mensaje_entrevista: string | null
          mensaje_inicial: string | null
          nombre_vacante: string
          palabras_clave: string | null
          updated_at: string | null
          whatsapp_activo: boolean
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          id?: string
          mensaje_entrevista?: string | null
          mensaje_inicial?: string | null
          nombre_vacante: string
          palabras_clave?: string | null
          updated_at?: string | null
          whatsapp_activo?: boolean
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          id?: string
          mensaje_entrevista?: string | null
          mensaje_inicial?: string | null
          nombre_vacante?: string
          palabras_clave?: string | null
          updated_at?: string | null
          whatsapp_activo?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      portal_dashboard_metrics: {
        Row: {
          active_workers: number | null
          currently_absent: number | null
          name: string | null
          overtime_hours_this_month: number | null
          pending_approvals: number | null
          portal_company_id: string | null
        }
        Relationships: []
      }
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
      portal_current_user_company_id: { Args: never; Returns: string }
      portal_is_admin: { Args: never; Returns: boolean }
      portal_is_nodo_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      portal_absence_type:
        | "vacaciones"
        | "licencia_medica"
        | "permiso_sin_goce"
        | "permiso_con_goce"
        | "maternal"
        | "paternal"
        | "otro"
      portal_approval_status:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "cancelada"
      portal_attendance_source:
        | "buk"
        | "manual_client"
        | "manual_nodo"
        | "geovictoria"
      portal_incident_type:
        | "atraso"
        | "inasistencia"
        | "falta_grave"
        | "accidente"
        | "observacion"
        | "felicitacion"
        | "otro"
      portal_sync_status: "success" | "partial" | "failed"
      portal_user_role: "client_user" | "client_admin" | "nodo_admin"
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
      portal_absence_type: [
        "vacaciones",
        "licencia_medica",
        "permiso_sin_goce",
        "permiso_con_goce",
        "maternal",
        "paternal",
        "otro",
      ],
      portal_approval_status: [
        "pendiente",
        "aprobada",
        "rechazada",
        "cancelada",
      ],
      portal_attendance_source: [
        "buk",
        "manual_client",
        "manual_nodo",
        "geovictoria",
      ],
      portal_incident_type: [
        "atraso",
        "inasistencia",
        "falta_grave",
        "accidente",
        "observacion",
        "felicitacion",
        "otro",
      ],
      portal_sync_status: ["success", "partial", "failed"],
      portal_user_role: ["client_user", "client_admin", "nodo_admin"],
    },
  },
} as const
