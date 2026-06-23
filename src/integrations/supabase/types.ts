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
      categorias_personalizadas: {
        Row: {
          color: string | null
          creado_por: string | null
          created_at: string | null
          id: string
          nombre_categoria: string
          vocalia_id: string
        }
        Insert: {
          color?: string | null
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre_categoria: string
          vocalia_id: string
        }
        Update: {
          color?: string | null
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre_categoria?: string
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_personalizadas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_personalizadas_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      causas: {
        Row: {
          actor_civil: string | null
          borrado_en: string | null
          borrado_por: string | null
          campos_personalizados: Json | null
          caratula: string | null
          causa_conexa_id: string | null
          causa_conexa_texto: string | null
          color_destacado: string | null
          creado_por: string | null
          created_at: string | null
          despachante: string | null
          estado_causa: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro: string
          fecha_ingreso: string | null
          id: string
          link_externo: string | null
          modificado_por: string | null
          numero_interno: string | null
          otros_intervinientes: string | null
          querella: string | null
          tipo_proceso: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          tipo_recurso: Database["public"]["Enums"]["tipo_recurso_enum"] | null
          updated_at: string | null
          vocalia_id: string
        }
        Insert: {
          actor_civil?: string | null
          borrado_en?: string | null
          borrado_por?: string | null
          campos_personalizados?: Json | null
          caratula?: string | null
          causa_conexa_id?: string | null
          causa_conexa_texto?: string | null
          color_destacado?: string | null
          creado_por?: string | null
          created_at?: string | null
          despachante?: string | null
          estado_causa?: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro: string
          fecha_ingreso?: string | null
          id?: string
          link_externo?: string | null
          modificado_por?: string | null
          numero_interno?: string | null
          otros_intervinientes?: string | null
          querella?: string | null
          tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          tipo_recurso?: Database["public"]["Enums"]["tipo_recurso_enum"] | null
          updated_at?: string | null
          vocalia_id: string
        }
        Update: {
          actor_civil?: string | null
          borrado_en?: string | null
          borrado_por?: string | null
          campos_personalizados?: Json | null
          caratula?: string | null
          causa_conexa_id?: string | null
          causa_conexa_texto?: string | null
          color_destacado?: string | null
          creado_por?: string | null
          created_at?: string | null
          despachante?: string | null
          estado_causa?: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro?: string
          fecha_ingreso?: string | null
          id?: string
          link_externo?: string | null
          modificado_por?: string | null
          numero_interno?: string | null
          otros_intervinientes?: string | null
          querella?: string | null
          tipo_proceso?: Database["public"]["Enums"]["tipo_proceso_enum"] | null
          tipo_recurso?: Database["public"]["Enums"]["tipo_recurso_enum"] | null
          updated_at?: string | null
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "causas_borrado_por_fkey"
            columns: ["borrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_causa_conexa_id_fkey"
            columns: ["causa_conexa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          borrado_en: string | null
          borrado_por: string | null
          categoria_personalizada_id: string | null
          causa_id: string
          completado: boolean | null
          creado_por: string | null
          created_at: string | null
          descripcion: string | null
          fecha_hora: string | null
          fecha_hora_fin: string | null
          google_event_id: string | null
          id: string
          modificado_por: string | null
          sujeto_id: string | null
          tipo_evento: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          borrado_en?: string | null
          borrado_por?: string | null
          categoria_personalizada_id?: string | null
          causa_id: string
          completado?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_hora?: string | null
          fecha_hora_fin?: string | null
          google_event_id?: string | null
          id?: string
          modificado_por?: string | null
          sujeto_id?: string | null
          tipo_evento?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          borrado_en?: string | null
          borrado_por?: string | null
          categoria_personalizada_id?: string | null
          causa_id?: string
          completado?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_hora?: string | null
          fecha_hora_fin?: string | null
          google_event_id?: string | null
          id?: string
          modificado_por?: string | null
          sujeto_id?: string | null
          tipo_evento?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_borrado_por_fkey"
            columns: ["borrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_categoria_personalizada_id_fkey"
            columns: ["categoria_personalizada_id"]
            isOneToOne: false
            referencedRelation: "categorias_personalizadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_sujeto_id_fkey"
            columns: ["sujeto_id"]
            isOneToOne: false
            referencedRelation: "sujetos"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_sync: {
        Row: {
          access_token: string
          activo: boolean
          created_at: string
          google_calendar_id: string
          id: string
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          vocalia_id: string
        }
        Insert: {
          access_token: string
          activo?: boolean
          created_at?: string
          google_calendar_id: string
          id?: string
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          vocalia_id: string
        }
        Update: {
          access_token?: string
          activo?: boolean
          created_at?: string
          google_calendar_id?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      invitaciones: {
        Row: {
          created_at: string | null
          email_invitado: string
          expira_en: string | null
          id: string
          invitado_por: string | null
          rol_a_asignar: Database["public"]["Enums"]["rol_miembro_enum"] | null
          token: string
          tribunal_id: string
          usado: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_invitado: string
          expira_en?: string | null
          id?: string
          invitado_por?: string | null
          rol_a_asignar?: Database["public"]["Enums"]["rol_miembro_enum"] | null
          token?: string
          tribunal_id: string
          usado?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_invitado?: string
          expira_en?: string | null
          id?: string
          invitado_por?: string | null
          rol_a_asignar?: Database["public"]["Enums"]["rol_miembro_enum"] | null
          token?: string
          tribunal_id?: string
          usado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invitaciones_invitado_por_fkey"
            columns: ["invitado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitaciones_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunales"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_personalizadas: {
        Row: {
          creado_por: string | null
          created_at: string
          id: string
          nombre: string
          vocalia_id: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          id?: string
          nombre: string
          vocalia_id: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          id?: string
          nombre?: string
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_personalizadas_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_personalizadas_causas: {
        Row: {
          added_at: string
          agregado_por: string | null
          causa_id: string
          lista_id: string
        }
        Insert: {
          added_at?: string
          agregado_por?: string | null
          causa_id: string
          lista_id: string
        }
        Update: {
          added_at?: string
          agregado_por?: string | null
          causa_id?: string
          lista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_personalizadas_causas_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listas_personalizadas_causas_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_personalizadas"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros_tribunal: {
        Row: {
          created_at: string | null
          id: string
          rol: Database["public"]["Enums"]["rol_miembro_enum"] | null
          tribunal_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rol?: Database["public"]["Enums"]["rol_miembro_enum"] | null
          tribunal_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rol?: Database["public"]["Enums"]["rol_miembro_enum"] | null
          tribunal_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_tribunal_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_tribunal_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      migracion_pendientes: {
        Row: {
          archivo_origen: string | null
          created_at: string
          datos_crudos: string
          id: string
          razon: string | null
          sujeto_propuesto: Json | null
          vocalia_id: string
        }
        Insert: {
          archivo_origen?: string | null
          created_at?: string
          datos_crudos: string
          id?: string
          razon?: string | null
          sujeto_propuesto?: Json | null
          vocalia_id: string
        }
        Update: {
          archivo_origen?: string | null
          created_at?: string
          datos_crudos?: string
          id?: string
          razon?: string | null
          sujeto_propuesto?: Json | null
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migracion_pendientes_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      migraciones_jobs: {
        Row: {
          archivo_meta: Json
          archivo_nombre: string
          created_at: string
          error_mensaje: string | null
          estado: string
          filas_rojas: Json
          id: string
          lotes_fallidos: number
          lotes_pendientes: Json
          lotes_procesados: number
          resultados: Json
          total_lotes: number
          updated_at: string
          usuario_id: string
          vocalia_id: string
        }
        Insert: {
          archivo_meta?: Json
          archivo_nombre: string
          created_at?: string
          error_mensaje?: string | null
          estado?: string
          filas_rojas?: Json
          id?: string
          lotes_fallidos?: number
          lotes_pendientes?: Json
          lotes_procesados?: number
          resultados?: Json
          total_lotes?: number
          updated_at?: string
          usuario_id: string
          vocalia_id: string
        }
        Update: {
          archivo_meta?: Json
          archivo_nombre?: string
          created_at?: string
          error_mensaje?: string | null
          estado?: string
          filas_rojas?: Json
          id?: string
          lotes_fallidos?: number
          lotes_pendientes?: Json
          lotes_procesados?: number
          resultados?: Json
          total_lotes?: number
          updated_at?: string
          usuario_id?: string
          vocalia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "migraciones_jobs_vocalia_id_fkey"
            columns: ["vocalia_id"]
            isOneToOne: false
            referencedRelation: "vocalias"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nombre_completo: string | null
          rol_global: Database["public"]["Enums"]["rol_global_enum"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nombre_completo?: string | null
          rol_global?: Database["public"]["Enums"]["rol_global_enum"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nombre_completo?: string | null
          rol_global?: Database["public"]["Enums"]["rol_global_enum"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prescripciones: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          sujeto_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
          sujeto_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          sujeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescripciones_sujeto_id_fkey"
            columns: ["sujeto_id"]
            isOneToOne: false
            referencedRelation: "sujetos"
            referencedColumns: ["id"]
          },
        ]
      }
      push_alertas_enviadas: {
        Row: {
          enviada_en: string
          fecha_objetivo: string
          id: string
          recurso_id: string
          tipo: string
          ventana: string
        }
        Insert: {
          enviada_en?: string
          fecha_objetivo: string
          id?: string
          recurso_id: string
          tipo: string
          ventana: string
        }
        Update: {
          enviada_en?: string
          fecha_objetivo?: string
          id?: string
          recurso_id?: string
          tipo?: string
          ventana?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          activo: boolean
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sujetos: {
        Row: {
          borrado_en: string | null
          borrado_por: string | null
          causa_id: string
          creado_por: string | null
          created_at: string | null
          defensor: string | null
          delito: string | null
          fecha_detencion: string | null
          id: string
          lugar_alojamiento: string | null
          modificado_por: string | null
          nombre_completo: string
          observaciones: string | null
          prescripcion_fecha: string | null
          situacion_libertad: Database["public"]["Enums"]["situacion_libertad_enum"]
          updated_at: string | null
          vencimiento_pena: string | null
          vencimiento_pp: string | null
          vencimiento_sjp: string | null
        }
        Insert: {
          borrado_en?: string | null
          borrado_por?: string | null
          causa_id: string
          creado_por?: string | null
          created_at?: string | null
          defensor?: string | null
          delito?: string | null
          fecha_detencion?: string | null
          id?: string
          lugar_alojamiento?: string | null
          modificado_por?: string | null
          nombre_completo: string
          observaciones?: string | null
          prescripcion_fecha?: string | null
          situacion_libertad?: Database["public"]["Enums"]["situacion_libertad_enum"]
          updated_at?: string | null
          vencimiento_pena?: string | null
          vencimiento_pp?: string | null
          vencimiento_sjp?: string | null
        }
        Update: {
          borrado_en?: string | null
          borrado_por?: string | null
          causa_id?: string
          creado_por?: string | null
          created_at?: string | null
          defensor?: string | null
          delito?: string | null
          fecha_detencion?: string | null
          id?: string
          lugar_alojamiento?: string | null
          modificado_por?: string | null
          nombre_completo?: string
          observaciones?: string | null
          prescripcion_fecha?: string | null
          situacion_libertad?: Database["public"]["Enums"]["situacion_libertad_enum"]
          updated_at?: string | null
          vencimiento_pena?: string | null
          vencimiento_pp?: string | null
          vencimiento_sjp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sujetos_borrado_por_fkey"
            columns: ["borrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sujetos_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sujetos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sujetos_modificado_por_fkey"
            columns: ["modificado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tribunales: {
        Row: {
          codigo_acceso: string | null
          created_at: string | null
          eliminado_en: string | null
          eliminado_por: string | null
          id: string
          modo: Database["public"]["Enums"]["modo_tribunal_enum"]
          nombre: string
          updated_at: string | null
        }
        Insert: {
          codigo_acceso?: string | null
          created_at?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["modo_tribunal_enum"]
          nombre: string
          updated_at?: string | null
        }
        Update: {
          codigo_acceso?: string | null
          created_at?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["modo_tribunal_enum"]
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vocalias: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          tribunal_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          tribunal_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          tribunal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vocalias_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandonar_tribunal_archivar: {
        Args: { p_tribunal_id: string }
        Returns: undefined
      }
      abandonar_tribunal_eliminar_todo: {
        Args: { p_tribunal_id: string }
        Returns: undefined
      }
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
      crear_categoria_con_eventos: {
        Args: { p_nombre: string; p_vocalia_id: string }
        Returns: string
      }
      crear_lista_personalizada: {
        Args: { p_nombre: string; p_vocalia_id: string }
        Returns: string
      }
      crear_tribunal: { Args: { p_nombre: string }; Returns: string }
      cuenta_admins_tribunal: {
        Args: { p_tribunal_id: string }
        Returns: number
      }
      es_admin_tribunal: { Args: { p_tribunal_id: string }; Returns: boolean }
      es_miembro_de_vocalia: {
        Args: { p_vocalia_id: string }
        Returns: boolean
      }
      es_miembro_tribunal: { Args: { p_tribunal_id: string }; Returns: boolean }
      es_superadmin: { Args: never; Returns: boolean }
      restaurar_tribunal: {
        Args: { p_tribunal_id: string }
        Returns: undefined
      }
      unirse_por_codigo: { Args: { p_codigo: string }; Returns: string }
    }
    Enums: {
      estado_causa_enum: "tramite" | "recurso" | "terminada"
      modo_tribunal_enum: "lista_unica" | "vocalias_separadas"
      rol_global_enum: "superadmin" | "usuario"
      rol_miembro_enum: "admin" | "miembro"
      situacion_libertad_enum:
        | "libre"
        | "detenido"
        | "rebelde"
        | "probation"
        | "condenado"
      tipo_proceso_enum: "unipersonal" | "colegiado"
      tipo_recurso_enum: "casacion" | "rex" | "queja_corte"
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
      estado_causa_enum: ["tramite", "recurso", "terminada"],
      modo_tribunal_enum: ["lista_unica", "vocalias_separadas"],
      rol_global_enum: ["superadmin", "usuario"],
      rol_miembro_enum: ["admin", "miembro"],
      situacion_libertad_enum: [
        "libre",
        "detenido",
        "rebelde",
        "probation",
        "condenado",
      ],
      tipo_proceso_enum: ["unipersonal", "colegiado"],
      tipo_recurso_enum: ["casacion", "rex", "queja_corte"],
    },
  },
} as const
