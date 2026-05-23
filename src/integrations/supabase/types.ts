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
          creado_por: string | null
          created_at: string | null
          estado_causa: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro: string
          fecha_ingreso: string | null
          id: string
          modificado_por: string | null
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
          creado_por?: string | null
          created_at?: string | null
          estado_causa?: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro: string
          fecha_ingreso?: string | null
          id?: string
          modificado_por?: string | null
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
          creado_por?: string | null
          created_at?: string | null
          estado_causa?: Database["public"]["Enums"]["estado_causa_enum"]
          expediente_nro?: string
          fecha_ingreso?: string | null
          id?: string
          modificado_por?: string | null
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
      causas_en_categorias: {
        Row: {
          agregado_en: string | null
          agregado_por: string | null
          categoria_id: string
          causa_id: string
        }
        Insert: {
          agregado_en?: string | null
          agregado_por?: string | null
          categoria_id: string
          causa_id: string
        }
        Update: {
          agregado_en?: string | null
          agregado_por?: string | null
          categoria_id?: string
          causa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "causas_en_categorias_agregado_por_fkey"
            columns: ["agregado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_en_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_personalizadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "causas_en_categorias_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          borrado_en: string | null
          borrado_por: string | null
          causa_id: string
          completado: boolean | null
          creado_por: string | null
          created_at: string | null
          descripcion: string | null
          fecha_hora: string | null
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
          causa_id: string
          completado?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_hora?: string | null
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
          causa_id?: string
          completado?: boolean | null
          creado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_hora?: string | null
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
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          codigo_acceso?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          codigo_acceso?: string | null
          created_at?: string | null
          id?: string
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
      aceptar_invitacion: { Args: { p_token: string }; Returns: string }
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
      unirse_por_codigo: { Args: { p_codigo: string }; Returns: string }
    }
    Enums: {
      estado_causa_enum: "tramite" | "recurso" | "terminada"
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
