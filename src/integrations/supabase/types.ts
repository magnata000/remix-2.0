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
      access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          justificativa: string | null
          name: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["access_request_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          justificativa?: string | null
          name: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          justificativa?: string | null
          name?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
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
      branches: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          assignee_id: string
          birth_date: string | null
          created_at: string
          document: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string
          sequence_number: number
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
          is_active?: boolean
          name: string
          phone?: string
          sequence_number?: number
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
          is_active?: boolean
          name?: string
          phone?: string
          sequence_number?: number
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
      commission_config: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          insurer_id: string
          modelo_pagamento: Database["public"]["Enums"]["payment_model"]
          percentual_padrao: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          insurer_id: string
          modelo_pagamento: Database["public"]["Enums"]["payment_model"]
          percentual_padrao: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          insurer_id?: string
          modelo_pagamento?: Database["public"]["Enums"]["payment_model"]
          percentual_padrao?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_config_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
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
      commission_events: {
        Row: {
          commission_id: string
          criado_em: string
          criado_por: string | null
          documento_referencia: string | null
          id: string
          installment_id: string | null
          motivo: string | null
          observacao: string | null
          tipo: Database["public"]["Enums"]["commission_event_type"]
          valor: number
        }
        Insert: {
          commission_id: string
          criado_em?: string
          criado_por?: string | null
          documento_referencia?: string | null
          id?: string
          installment_id?: string | null
          motivo?: string | null
          observacao?: string | null
          tipo: Database["public"]["Enums"]["commission_event_type"]
          valor: number
        }
        Update: {
          commission_id?: string
          criado_em?: string
          criado_por?: string | null
          documento_referencia?: string | null
          id?: string
          installment_id?: string | null
          motivo?: string | null
          observacao?: string | null
          tipo?: Database["public"]["Enums"]["commission_event_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_events_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_events_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_events_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "commission_installments"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_installments: {
        Row: {
          commission_id: string
          competencia: string
          created_at: string
          id: string
          numero_parcela: number
          status: Database["public"]["Enums"]["commission_status"]
          valor_previsto: number
        }
        Insert: {
          commission_id: string
          competencia: string
          created_at?: string
          id?: string
          numero_parcela: number
          status?: Database["public"]["Enums"]["commission_status"]
          valor_previsto: number
        }
        Update: {
          commission_id?: string
          competencia?: string
          created_at?: string
          id?: string
          numero_parcela?: number
          status?: Database["public"]["Enums"]["commission_status"]
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_installments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payout_payments: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          payout_id: string
          usuario_responsavel: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          payout_id: string
          usuario_responsavel?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          payout_id?: string
          usuario_responsavel?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_payout_payments_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "commission_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payout_payments_usuario_responsavel_fkey"
            columns: ["usuario_responsavel"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          commission_id: string
          created_at: string
          id: string
          percentual_repasse: number
          updated_at: string
          user_id: string
          valor_devido: number
          valor_pago: number
        }
        Insert: {
          commission_id: string
          created_at?: string
          id?: string
          percentual_repasse: number
          updated_at?: string
          user_id: string
          valor_devido?: number
          valor_pago?: number
        }
        Update: {
          commission_id?: string
          created_at?: string
          id?: string
          percentual_repasse?: number
          updated_at?: string
          user_id?: string
          valor_devido?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          base_calculo: number | null
          client_id: string | null
          client_name: string
          competencia: string | null
          created_at: string
          due_date: string
          id: string
          installment_index: number | null
          installment_total: number | null
          insurer: Database["public"]["Enums"]["insurer"]
          insurer_id: string | null
          kind: Database["public"]["Enums"]["commission_kind"] | null
          modelo_pagamento: Database["public"]["Enums"]["payment_model"] | null
          paid_at: string | null
          percentual: number | null
          policy_id: string
          policy_number: string
          refund_reason: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
          valor_previsto: number | null
        }
        Insert: {
          amount: number
          base_calculo?: number | null
          client_id?: string | null
          client_name: string
          competencia?: string | null
          created_at?: string
          due_date: string
          id?: string
          installment_index?: number | null
          installment_total?: number | null
          insurer: Database["public"]["Enums"]["insurer"]
          insurer_id?: string | null
          kind?: Database["public"]["Enums"]["commission_kind"] | null
          modelo_pagamento?: Database["public"]["Enums"]["payment_model"] | null
          paid_at?: string | null
          percentual?: number | null
          policy_id: string
          policy_number: string
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          valor_previsto?: number | null
        }
        Update: {
          amount?: number
          base_calculo?: number | null
          client_id?: string | null
          client_name?: string
          competencia?: string | null
          created_at?: string
          due_date?: string
          id?: string
          installment_index?: number | null
          installment_total?: number | null
          insurer?: Database["public"]["Enums"]["insurer"]
          insurer_id?: string | null
          kind?: Database["public"]["Enums"]["commission_kind"] | null
          modelo_pagamento?: Database["public"]["Enums"]["payment_model"] | null
          paid_at?: string | null
          percentual?: number | null
          policy_id?: string
          policy_number?: string
          refund_reason?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
          description: string
          dre_classification: Database["public"]["Enums"]["dre_classification"]
          dre_kind: Database["public"]["Enums"]["dre_category_kind"]
          due_date: string | null
          due_day: number | null
          id: string
          notes: string | null
          paid_at: string | null
          recurrence: Database["public"]["Enums"]["expense_recurrence"]
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          dre_classification?: Database["public"]["Enums"]["dre_classification"]
          dre_kind?: Database["public"]["Enums"]["dre_category_kind"]
          due_date?: string | null
          due_day?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          dre_classification?: Database["public"]["Enums"]["dre_classification"]
          dre_kind?: Database["public"]["Enums"]["dre_category_kind"]
          due_date?: string | null
          due_day?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
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
      insurers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_actionable: boolean
          read_at: string | null
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_actionable?: boolean
          read_at?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_actionable?: boolean
          read_at?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id: string | null
          client_name: string
          closed_at: string | null
          created_at: string
          due_date: string | null
          estimated_value: number
          id: string
          lost_note: string | null
          lost_reason: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id: string | null
          sla_due_at: string | null
          sla_hours: number | null
          sla_paused_at: string | null
          stage: Database["public"]["Enums"]["kanban_stage"]
          stage_history: Json
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"]
          client_id?: string | null
          client_name: string
          closed_at?: string | null
          created_at?: string
          due_date?: string | null
          estimated_value?: number
          id?: string
          lost_note?: string | null
          lost_reason?: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id?: string | null
          sla_due_at?: string | null
          sla_hours?: number | null
          sla_paused_at?: string | null
          stage?: Database["public"]["Enums"]["kanban_stage"]
          stage_history?: Json
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          branch?: Database["public"]["Enums"]["branch"]
          client_id?: string | null
          client_name?: string
          closed_at?: string | null
          created_at?: string
          due_date?: string | null
          estimated_value?: number
          id?: string
          lost_note?: string | null
          lost_reason?: Database["public"]["Enums"]["lost_reason"] | null
          quote_group_id?: string | null
          sla_due_at?: string | null
          sla_hours?: number | null
          sla_paused_at?: string | null
          stage?: Database["public"]["Enums"]["kanban_stage"]
          stage_history?: Json
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
      opportunity_attachments: {
        Row: {
          comment_id: string | null
          id: string
          mime: string
          name: string
          opportunity_id: string
          size_bytes: number
          storage_path: string | null
          uploaded_at: string
        }
        Insert: {
          comment_id?: string | null
          id?: string
          mime?: string
          name: string
          opportunity_id: string
          size_bytes?: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Update: {
          comment_id?: string | null
          id?: string
          mime?: string
          name?: string
          opportunity_id?: string
          size_bytes?: number
          storage_path?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "opportunity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_attachments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          opportunity_id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          opportunity_id: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          opportunity_id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_comments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_timeline: {
        Row: {
          actor_id: string
          at: string
          attachment_id: string | null
          comment_id: string | null
          from_label: string | null
          id: string
          kind: string
          opportunity_id: string
          to_label: string | null
        }
        Insert: {
          actor_id: string
          at?: string
          attachment_id?: string | null
          comment_id?: string | null
          from_label?: string | null
          id?: string
          kind: string
          opportunity_id: string
          to_label?: string | null
        }
        Update: {
          actor_id?: string
          at?: string
          attachment_id?: string | null
          comment_id?: string | null
          from_label?: string | null
          id?: string
          kind?: string
          opportunity_id?: string
          to_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_timeline_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "opportunity_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_timeline_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "opportunity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_timeline_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          agenciamento_schedule: number[] | null
          assignee_id: string
          branch: Database["public"]["Enums"]["branch"] | null
          branch_id: string | null
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
          contract_sequence: number | null
          created_at: string
          end_date: string | null
          health_anniversary: string | null
          health_category: string | null
          health_coparticipation: boolean | null
          health_initial_value: number | null
          id: string
          insurer: Database["public"]["Enums"]["insurer"]
          insurer_id: string | null
          number: string
          premio_liquido: number | null
          premio_total: number | null
          premium: number
          premium_periodicity: Database["public"]["Enums"]["premium_periodicity"]
          recorrencia_pct: number | null
          renewal_sequence: number
          renewed_from_id: string | null
          renewed_to_id: string | null
          root_policy_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
          taxa_imposto: number
          updated_at: string
        }
        Insert: {
          agenciamento_schedule?: number[] | null
          assignee_id: string
          branch?: Database["public"]["Enums"]["branch"] | null
          branch_id?: string | null
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
          contract_sequence?: number | null
          created_at?: string
          end_date?: string | null
          health_anniversary?: string | null
          health_category?: string | null
          health_coparticipation?: boolean | null
          health_initial_value?: number | null
          id?: string
          insurer: Database["public"]["Enums"]["insurer"]
          insurer_id?: string | null
          number: string
          premio_liquido?: number | null
          premio_total?: number | null
          premium?: number
          premium_periodicity?: Database["public"]["Enums"]["premium_periodicity"]
          recorrencia_pct?: number | null
          renewal_sequence?: number
          renewed_from_id?: string | null
          renewed_to_id?: string | null
          root_policy_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["policy_status"]
          taxa_imposto?: number
          updated_at?: string
        }
        Update: {
          agenciamento_schedule?: number[] | null
          assignee_id?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          branch_id?: string | null
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
          contract_sequence?: number | null
          created_at?: string
          end_date?: string | null
          health_anniversary?: string | null
          health_category?: string | null
          health_coparticipation?: boolean | null
          health_initial_value?: number | null
          id?: string
          insurer?: Database["public"]["Enums"]["insurer"]
          insurer_id?: string | null
          number?: string
          premio_liquido?: number | null
          premio_total?: number | null
          premium?: number
          premium_periodicity?: Database["public"]["Enums"]["premium_periodicity"]
          recorrencia_pct?: number | null
          renewal_sequence?: number
          renewed_from_id?: string | null
          renewed_to_id?: string | null
          root_policy_id?: string | null
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
            foreignKeyName: "policies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
            foreignKeyName: "policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
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
          {
            foreignKeyName: "policies_root_policy_id_fkey"
            columns: ["root_policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["timeline_entity"]
          event_type: Database["public"]["Enums"]["timeline_event"]
          id: string
          payload: Json | null
          related_entity_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["timeline_entity"]
          event_type: Database["public"]["Enums"]["timeline_event"]
          id?: string
          payload?: Json | null
          related_entity_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["timeline_entity"]
          event_type?: Database["public"]["Enums"]["timeline_event"]
          id?: string
          payload?: Json | null
          related_entity_id?: string | null
        }
        Relationships: []
      }
      scheduled_tasks: {
        Row: {
          assignee_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          kind: Database["public"]["Enums"]["scheduled_kind"]
          period: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence: Json | null
          start_date: string | null
          title: string
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          assignee_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["scheduled_kind"]
          period?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence?: Json | null
          start_date?: string | null
          title: string
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          assignee_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["scheduled_kind"]
          period?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence?: Json | null
          start_date?: string | null
          title?: string
          updated_at?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
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
      task_attachments: {
        Row: {
          comment_id: string | null
          id: string
          mime: string
          name: string
          size_bytes: number
          storage_path: string | null
          task_id: string
          uploaded_at: string
        }
        Insert: {
          comment_id?: string | null
          id?: string
          mime?: string
          name: string
          size_bytes?: number
          storage_path?: string | null
          task_id: string
          uploaded_at?: string
        }
        Update: {
          comment_id?: string | null
          id?: string
          mime?: string
          name?: string
          size_bytes?: number
          storage_path?: string | null
          task_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_columns: {
        Row: {
          color: string
          created_at: string
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          pinned: boolean
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          pinned?: boolean
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          pinned?: boolean
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_timeline: {
        Row: {
          actor_id: string
          at: string
          attachment_id: string | null
          comment_id: string | null
          from_label: string | null
          id: string
          kind: string
          task_id: string
          to_label: string | null
        }
        Insert: {
          actor_id: string
          at?: string
          attachment_id?: string | null
          comment_id?: string | null
          from_label?: string | null
          id?: string
          kind: string
          task_id: string
          to_label?: string | null
        }
        Update: {
          actor_id?: string
          at?: string
          attachment_id?: string | null
          comment_id?: string | null
          from_label?: string | null
          id?: string
          kind?: string
          task_id?: string
          to_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_timeline_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string
          client_name: string | null
          column_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          order_index: number
          priority: Database["public"]["Enums"]["task_priority"]
          sla_due_at: string | null
          sla_hours: number | null
          sla_paused_at: string | null
          source_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          client_name?: string | null
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          sla_due_at?: string | null
          sla_hours?: number | null
          sla_paused_at?: string | null
          source_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          client_name?: string | null
          column_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order_index?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          sla_due_at?: string | null
          sla_hours?: number | null
          sla_paused_at?: string | null
          source_key?: string | null
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
          can_view_all_opportunities: boolean
          created_at: string
          email: string
          id: string
          name: string
          role: string
          role_label: Database["public"]["Enums"]["role_label"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          can_view_all_opportunities?: boolean
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
          role_label?: Database["public"]["Enums"]["role_label"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          can_view_all_opportunities?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          role_label?: Database["public"]["Enums"]["role_label"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          page_key: Database["public"]["Enums"]["page_key"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_key: Database["public"]["Enums"]["page_key"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          page_key?: Database["public"]["Enums"]["page_key"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
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
      add_commission_event: {
        Args: {
          _commission_id: string
          _documento?: string
          _installment_id?: string
          _motivo?: string
          _observacao?: string
          _tipo: Database["public"]["Enums"]["commission_event_type"]
          _valor: number
        }
        Returns: string
      }
      assert_finance: { Args: never; Returns: undefined }
      branch_code_base: { Args: { _name: string }; Returns: string }
      can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_policy: {
        Args: { _policy_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_all: { Args: { _user_id: string }; Returns: boolean }
      can_view_all_opportunities: {
        Args: { _user_id: string }
        Returns: boolean
      }
      cancel_policy: {
        Args: {
          _categoria: string
          _motivo: string
          _observacoes: string
          _policy_id: string
        }
        Returns: undefined
      }
      commission_recognized: {
        Args: { _commission_id: string }
        Returns: number
      }
      create_policy_commission: {
        Args: {
          _base_calculo: number
          _modelo: Database["public"]["Enums"]["payment_model"]
          _parcelas?: number
          _percentual: number
          _policy_id: string
          _repasse_pct?: number
          _repasse_user?: string
        }
        Returns: string
      }
      ensure_client_root: { Args: { _client_id: string }; Returns: string }
      ensure_policy_folders: {
        Args: { _policy_id: string }
        Returns: undefined
      }
      has_page_access: {
        Args: {
          _page: Database["public"]["Enums"]["page_key"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
      log_policy_event: {
        Args: {
          _description: string
          _event: Database["public"]["Enums"]["timeline_event"]
          _payload?: Json
          _policy: Database["public"]["Tables"]["policies"]["Row"]
          _related?: string
        }
        Returns: undefined
      }
      my_payout_events: {
        Args: never
        Returns: {
          commission_id: string
          criado_em: string
          tipo: Database["public"]["Enums"]["commission_event_type"]
          valor: number
        }[]
      }
      my_payouts: {
        Args: never
        Returns: {
          client_name: string
          commission_id: string
          competencia: string
          payout_id: string
          percentual_repasse: number
          policy_number: string
          status: Database["public"]["Enums"]["commission_status"]
          valor_devido: number
          valor_pago: number
        }[]
      }
      pay_commission_payout: {
        Args: {
          _data?: string
          _observacao?: string
          _payout_id: string
          _valor: number
        }
        Returns: string
      }
      pay_expense: {
        Args: { _expense_id: string; _paid_at?: string }
        Returns: undefined
      }
      reactivate_client: { Args: { _client_id: string }; Returns: undefined }
      reconcile_commission: {
        Args: {
          _commission_id: string
          _installment_id?: string
          _motivo?: string
          _observacao?: string
          _tipo_diferenca?: Database["public"]["Enums"]["commission_event_type"]
          _valor_recebido: number
        }
        Returns: Database["public"]["Enums"]["commission_status"]
      }
      refresh_expense_statuses: { Args: { _today: string }; Returns: number }
      refresh_policy_statuses: { Args: { _today: string }; Returns: number }
      register_policy_reason: {
        Args: {
          _categoria: string
          _motivo: string
          _observacoes: string
          _policy_id: string
        }
        Returns: undefined
      }
      remove_client: { Args: { _client_id: string }; Returns: string }
      set_commission_payout: {
        Args: { _commission_id: string; _pct: number; _user_id: string }
        Returns: string
      }
      upsert_doc_folder: {
        Args: {
          _client_id: string
          _name: string
          _parent_id: string
          _policy_id: string
        }
        Returns: string
      }
    }
    Enums: {
      access_request_status: "pendente" | "aprovado" | "recusado"
      app_role: "admin" | "pos_venda" | "vendedor"
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
      commission_event_type:
        | "comissao"
        | "bonificacao"
        | "imposto"
        | "estorno_integral"
        | "estorno_parcial"
        | "ajuste_positivo"
        | "ajuste_negativo"
        | "pagamento"
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
        | "conciliada"
        | "parcial"
        | "divergente"
        | "estornada"
        | "ajustada"
      dre_category_kind: "fixa" | "variavel" | "pessoal" | "imposto" | "outra"
      dre_classification:
        | "custo_operacional"
        | "despesa_operacional"
        | "imposto_sobre_lucro"
        | "outro"
      expense_recurrence: "avulsa" | "mensal"
      expense_status: "aguardando" | "paga" | "vencida"
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
      notification_type: "access_request" | "policy_not_renewed_pending_reason"
      page_key:
        | "carteira"
        | "kanban_pipeline"
        | "kanban_tarefas"
        | "financeiro_comissoes"
        | "financeiro_despesas"
        | "financeiro_relatorios"
        | "configuracoes"
        | "dashboard"
      payment_model:
        | "adiantamento"
        | "parcelado"
        | "parcela_vitalicio"
        | "parcelado_vitalicio"
      policy_status:
        | "ativa"
        | "vencida"
        | "pendente"
        | "cancelada"
        | "renovada"
        | "a_vencer"
        | "nao_renovada"
      premium_periodicity:
        | "mensal"
        | "anual"
        | "unico"
        | "distribuido_na_vigencia"
      role_label: "admin" | "pos_venda" | "comercial"
      scheduled_kind: "data" | "semana" | "recorrente"
      task_priority: "alta" | "media" | "baixa"
      tax_kind: "sobre_receita" | "sobre_lucro"
      timeline_entity: "client" | "policy"
      timeline_event:
        | "apolice_criada"
        | "apolice_alterada"
        | "apolice_cancelada"
        | "apolice_vencida"
        | "apolice_renovada"
        | "apolice_nao_renovada"
        | "motivo_registrado"
        | "follow_up_registrado"
        | "cliente_inativado"
        | "cliente_reativado"
        | "outro"
      user_status: "convidado" | "ativo" | "bloqueado"
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
      access_request_status: ["pendente", "aprovado", "recusado"],
      app_role: ["admin", "pos_venda", "vendedor"],
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
      commission_event_type: [
        "comissao",
        "bonificacao",
        "imposto",
        "estorno_integral",
        "estorno_parcial",
        "ajuste_positivo",
        "ajuste_negativo",
        "pagamento",
      ],
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
        "conciliada",
        "parcial",
        "divergente",
        "estornada",
        "ajustada",
      ],
      dre_category_kind: ["fixa", "variavel", "pessoal", "imposto", "outra"],
      dre_classification: [
        "custo_operacional",
        "despesa_operacional",
        "imposto_sobre_lucro",
        "outro",
      ],
      expense_recurrence: ["avulsa", "mensal"],
      expense_status: ["aguardando", "paga", "vencida"],
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
      notification_type: [
        "access_request",
        "policy_not_renewed_pending_reason",
      ],
      page_key: [
        "carteira",
        "kanban_pipeline",
        "kanban_tarefas",
        "financeiro_comissoes",
        "financeiro_despesas",
        "financeiro_relatorios",
        "configuracoes",
        "dashboard",
      ],
      payment_model: [
        "adiantamento",
        "parcelado",
        "parcela_vitalicio",
        "parcelado_vitalicio",
      ],
      policy_status: [
        "ativa",
        "vencida",
        "pendente",
        "cancelada",
        "renovada",
        "a_vencer",
        "nao_renovada",
      ],
      premium_periodicity: [
        "mensal",
        "anual",
        "unico",
        "distribuido_na_vigencia",
      ],
      role_label: ["admin", "pos_venda", "comercial"],
      scheduled_kind: ["data", "semana", "recorrente"],
      task_priority: ["alta", "media", "baixa"],
      tax_kind: ["sobre_receita", "sobre_lucro"],
      timeline_entity: ["client", "policy"],
      timeline_event: [
        "apolice_criada",
        "apolice_alterada",
        "apolice_cancelada",
        "apolice_vencida",
        "apolice_renovada",
        "apolice_nao_renovada",
        "motivo_registrado",
        "follow_up_registrado",
        "cliente_inativado",
        "cliente_reativado",
        "outro",
      ],
      user_status: ["convidado", "ativo", "bloqueado"],
    },
  },
} as const
