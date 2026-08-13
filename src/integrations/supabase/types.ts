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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      beneficiaries: {
        Row: {
          birth_date: string
          cpf: string
          created_at: string
          id: string
          name: string
          policy_id: string
          title: Database["public"]["Enums"]["beneficiary_title"]
          title_custom: string | null
          updated_at: string
        }
        Insert: {
          birth_date: string
          cpf?: string
          created_at?: string
          id?: string
          name: string
          policy_id: string
          title: Database["public"]["Enums"]["beneficiary_title"]
          title_custom?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string
          cpf?: string
          created_at?: string
          id?: string
          name?: string
          policy_id?: string
          title?: Database["public"]["Enums"]["beneficiary_title"]
          title_custom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assignee_id: string
          birth_date: string | null
          created_at: string
          document: string
          email: string
          id: string
          name: string
          phone: string
          status_override: Database["public"]["Enums"]["client_status"] | null
          updated_at: string
        }
        Insert: {
          assignee_id: string
          birth_date?: string | null
          created_at?: string
          document?: string
          email?: string
          id?: string
          name: string
          phone?: string
          status_override?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          birth_date?: string | null
          created_at?: string
          document?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          status_override?: Database["public"]["Enums"]["client_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_configs: {
        Row: {
          adiantamento_max_installments: number | null
          agenciamento: number[]
          comissao_liquida: boolean
          created_at: string
          default_scheme: Database["public"]["Enums"]["commission_scheme"]
          id: string
          insurer: Database["public"]["Enums"]["insurer"]
          parcelado_min_installments: number | null
          pct_max: number
          pct_min: number
          product: Database["public"]["Enums"]["commission_product"]
          recorrencia_pct: number
          taxa_imposto: number
          updated_at: string
          vitalicio_start_installment: number | null
        }
        Insert: {
          adiantamento_max_installments?: number | null
          agenciamento?: number[]
          comissao_liquida?: boolean
          created_at?: string
          default_scheme: Database["public"]["Enums"]["commission_scheme"]
          id?: string
          insurer: Database["public"]["Enums"]["insurer"]
          parcelado_min_installments?: number | null
          pct_max?: number
          pct_min?: number
          product: Database["public"]["Enums"]["commission_product"]
          recorrencia_pct?: number
          taxa_imposto?: number
          updated_at?: string
          vitalicio_start_installment?: number | null
        }
        Update: {
          adiantamento_max_installments?: number | null
          agenciamento?: number[]
          comissao_liquida?: boolean
          created_at?: string
          default_scheme?: Database["public"]["Enums"]["commission_scheme"]
          id?: string
          insurer?: Database["public"]["Enums"]["insurer"]
          parcelado_min_installments?: number | null
          pct_max?: number
          pct_min?: number
          product?: Database["public"]["Enums"]["commission_product"]
          recorrencia_pct?: number
          taxa_imposto?: number
          updated_at?: string
          vitalicio_start_installment?: number | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          due_date: string
          id: string
          installment_index: number | null
          installment_total: number | null
          insurer: Database["public"]["Enums"]["insurer"]
          kind: Database["public"]["Enums"]["commission_kind"] | null
          paid_at: string | null
          policy_id: string
          policy_number: string
          refund_reason: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_name: string
          created_at?: string
          due_date: string
          id?: string
          installment_index?: number | null
          installment_total?: number | null
          insurer: Database["public"]["Enums"]["insurer"]
          kind?: Database["public"]["Enums"]["commission_kind"] | null
          paid_at?: string | null
          policy_id: string
          policy_number: string
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_index?: number | null
          installment_total?: number | null
          insurer?: Database["public"]["Enums"]["insurer"]
          kind?: Database["public"]["Enums"]["commission_kind"] | null
          paid_at?: string | null
          policy_id?: string
          policy_number?: string
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_files: {
        Row: {
          client_id: string
          folder_id: string
          id: string
          mime: string
          name: string
          policy_id: string | null
          size_kb: number
          storage_path: string | null
          uploaded_at: string
        }
        Insert: {
          client_id: string
          folder_id: string
          id?: string
          mime?: string
          name: string
          policy_id?: string | null
          size_kb?: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Update: {
          client_id?: string
          folder_id?: string
          id?: string
          mime?: string
          name?: string
          policy_id?: string | null
          size_kb?: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "doc_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_files_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_folders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_client_root: boolean
          name: string
          parent_id: string | null
          policy_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_client_root?: boolean
          name: string
          parent_id?: string | null
          policy_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_client_root?: boolean
          name?: string
          parent_id?: string | null
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "doc_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_folders_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_id: string
          id: string
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description: string
          expense_id: string
          id?: string
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          dre_kind: Database["public"]["Enums"]["dre_category_kind"]
          due_day: number | null
          id: string
          notes: string | null
          recurrence: Database["public"]["Enums"]["expense_recurrence"]
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description: string
          dre_kind?: Database["public"]["Enums"]["dre_category_kind"]
          due_day?: number | null
          id?: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          dre_kind?: Database["public"]["Enums"]["dre_category_kind"]
          due_day?: number | null
          id?: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          created_task_id: string | null
          date: string
          id: string
          notes: string
          status: Database["public"]["Enums"]["follow_up_status"]
          time: string | null
          type: Database["public"]["Enums"]["follow_up_type"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          created_task_id?: string | null
          date: string
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["follow_up_status"]
          time?: string | null
          type?: Database["public"]["Enums"]["follow_up_type"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          created_task_id?: string | null
          date?: string
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["follow_up_status"]
          time?: string | null
          type?: Database["public"]["Enums"]["follow_up_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_incomes: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          notes: string | null
          received_at: string
          source: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          received_at?: string
          source?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          received_at?: string
          source?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id: string | null
          client_name: string
          created_at: string
          due_date: string | null
          estimated_value: number
          id: string
          lost_note: string | null
          lost_reason: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id: string | null
          stage: Database["public"]["Enums"]["kanban_stage"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id?: string | null
          client_name: string
          created_at?: string
          due_date?: string | null
          estimated_value?: number
          id?: string
          lost_note?: string | null
          lost_reason?: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id?: string | null
          stage?: Database["public"]["Enums"]["kanban_stage"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          branch?: Database["public"]["Enums"]["branch"]
          client_id?: string | null
          client_name?: string
          created_at?: string
          due_date?: string | null
          estimated_value?: number
          id?: string
          lost_note?: string | null
          lost_reason?: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id?: string | null
          stage?: Database["public"]["Enums"]["kanban_stage"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          agenciamento_schedule: number[] | null
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id: string
          comissao_liquida: boolean
          commission_installments: number | null
          commission_pct: number | null
          commission_scheme:
            | Database["public"]["Enums"]["commission_scheme"]
            | null
          consortium_group: string | null
          consortium_quota: string | null
          consortium_type: string | null
          created_at: string
          end_date: string | null
          health_anniversary: string | null
          health_category: string | null
          health_coparticipation: boolean | null
          health_initial_value: number | null
          id: string
          insurer: Database["public"]["Enums"]["insurer"]
          number: string
          premium: number
          recorrencia_pct: number | null
          renewed_from_id: string | null
          renewed_to_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
          taxa_imposto: number
          updated_at: string
        }
        Insert: {
          agenciamento_schedule?: number[] | null
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id: string
          comissao_liquida?: boolean
          commission_installments?: number | null
          commission_pct?: number | null
          commission_scheme?:
            | Database["public"]["Enums"]["commission_scheme"]
            | null
          consortium_group?: string | null
          consortium_quota?: string | null
          consortium_type?: string | null
          created_at?: string
          end_date?: string | null
          health_anniversary?: string | null
          health_category?: string | null
          health_coparticipation?: boolean | null
          health_initial_value?: number | null
          id?: string
          insurer: Database["public"]["Enums"]["insurer"]
          number: string
          premium?: number
          recorrencia_pct?: number | null
          renewed_from_id?: string | null
          renewed_to_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["policy_status"]
          taxa_imposto?: number
          updated_at?: string
        }
        Update: {
          agenciamento_schedule?: number[] | null
          assignee_id?: string
          branch?: Database["public"]["Enums"]["branch"]
          client_id?: string
          comissao_liquida?: boolean
          commission_installments?: number | null
          commission_pct?: number | null
          commission_scheme?:
            | Database["public"]["Enums"]["commission_scheme"]
            | null
          consortium_group?: string | null
          consortium_quota?: string | null
          consortium_type?: string | null
          created_at?: string
          end_date?: string | null
          health_anniversary?: string | null
          health_category?: string | null
          health_coparticipation?: boolean | null
          health_initial_value?: number | null
          id?: string
          insurer?: Database["public"]["Enums"]["insurer"]
          number?: string
          premium?: number
          recorrencia_pct?: number | null
          renewed_from_id?: string | null
          renewed_to_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          taxa_imposto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_renewed_from_id_fkey"
            columns: ["renewed_from_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_renewed_to_id_fkey"
            columns: ["renewed_to_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_commission_rates: {
        Row: {
          branch: Database["public"]["Enums"]["branch"]
          id: string
          member_id: string
          pct: number
          updated_at: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch"]
          id?: string
          member_id: string
          pct?: number
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"]
          id?: string
          member_id?: string
          pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_commission_rates_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string
          seller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          seller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string
          column_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entries: {
        Row: {
          amount: number
          competence_month: number
          competence_year: number
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["tax_kind"]
          notes: string | null
          paid_at: string
        }
        Insert: {
          amount?: number
          competence_month: number
          competence_year: number
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["tax_kind"]
          notes?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number
          competence_month?: number
          competence_year?: number
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["tax_kind"]
          notes?: string | null
          paid_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "manager" | "broker"
      beneficiary_title:
        | "titular"
        | "conjuge"
        | "filho"
        | "pai_mae"
        | "irmao"
        | "parente"
        | "outro"
      branch:
        | "Auto"
        | "Vida"
        | "Residencial"
        | "Empresarial"
        | "Saúde"
        | "Consórcio"
        | "Embarcador"
        | "Transporte"
        | "Viagem"
        | "Porto RC Profissional"
        | "Tuba/Instrumento"
      client_status: "ativo" | "inativo" | "lead"
      commission_kind:
        | "agenciamento"
        | "recorrencia"
        | "esgotamento"
        | "parcela"
        | "unica"
        | "vitalicio"
      commission_product: "saude" | "auto" | "consorcio"
      commission_scheme:
        | "agenciamento"
        | "esgotamento"
        | "parcela"
        | "unica"
        | "vitalicio"
      commission_status:
        | "pago"
        | "pendente"
        | "atrasado"
        | "devolvido"
        | "cancelada"
      dre_category_kind: "fixa" | "variavel" | "pessoal" | "imposto" | "outra"
      expense_recurrence: "avulsa" | "mensal"
      follow_up_status: "agendado" | "realizado" | "cancelado" | "adiado"
      follow_up_type:
        | "ligacao"
        | "email"
        | "whatsapp"
        | "reuniao"
        | "videocall"
        | "nota"
      insurer:
        | "Porto Seguro"
        | "Bradesco"
        | "SulAmérica"
        | "Allianz"
        | "Mapfre"
        | "Suhai"
        | "Amil"
        | "Tokio Marine"
        | "Azul"
        | "Prevent Sênior"
        | "MedSênior"
        | "São Cristóvão"
        | "Transmontano"
        | "São Miguel"
        | "Itaú Seguros"
        | "NotreDame"
        | "Aliro"
      kanban_stage: "lead" | "cotacao" | "negociacao" | "fechado" | "perdido"
      lost_reason: "preco" | "cobertura" | "prazo" | "sem-retorno" | "outro"
      policy_status: "ativa" | "vencida" | "pendente" | "cancelada" | "renovada"
      tax_kind: "sobre_receita" | "sobre_lucro"
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
      app_role: ["admin", "manager", "broker"],
      beneficiary_title: [
        "titular",
        "conjuge",
        "filho",
        "pai_mae",
        "irmao",
        "parente",
        "outro",
      ],
      branch: [
        "Auto",
        "Vida",
        "Residencial",
        "Empresarial",
        "Saúde",
        "Consórcio",
        "Embarcador",
        "Transporte",
        "Viagem",
        "Porto RC Profissional",
        "Tuba/Instrumento",
      ],
      client_status: ["ativo", "inativo", "lead"],
      commission_kind: [
        "agenciamento",
        "recorrencia",
        "esgotamento",
        "parcela",
        "unica",
        "vitalicio",
      ],
      commission_product: ["saude", "auto", "consorcio"],
      commission_scheme: [
        "agenciamento",
        "esgotamento",
        "parcela",
        "unica",
        "vitalicio",
      ],
      commission_status: [
        "pago",
        "pendente",
        "atrasado",
        "devolvido",
        "cancelada",
      ],
      dre_category_kind: ["fixa", "variavel", "pessoal", "imposto", "outra"],
      expense_recurrence: ["avulsa", "mensal"],
      follow_up_status: ["agendado", "realizado", "cancelado", "adiado"],
      follow_up_type: [
        "ligacao",
        "email",
        "whatsapp",
        "reuniao",
        "videocall",
        "nota",
      ],
      insurer: [
        "Porto Seguro",
        "Bradesco",
        "SulAmérica",
        "Allianz",
        "Mapfre",
        "Suhai",
        "Amil",
        "Tokio Marine",
        "Azul",
        "Prevent Sênior",
        "MedSênior",
        "São Cristóvão",
        "Transmontano",
        "São Miguel",
        "Itaú Seguros",
        "NotreDame",
        "Aliro",
      ],
      kanban_stage: ["lead", "cotacao", "negociacao", "fechado", "perdido"],
      lost_reason: ["preco", "cobertura", "prazo", "sem-retorno", "outro"],
      policy_status: ["ativa", "vencida", "pendente", "cancelada", "renovada"],
      tax_kind: ["sobre_receita", "sobre_lucro"],
    },
  },
} as const
