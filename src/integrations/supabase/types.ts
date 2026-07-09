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
      app_config: {
        Row: {
          app_name: string
          created_at: string
          id: string
          super_admin_emails: string[]
          system_settings: Json
          updated_at: string
        }
        Insert: {
          app_name?: string
          created_at?: string
          id?: string
          super_admin_emails?: string[]
          system_settings?: Json
          updated_at?: string
        }
        Update: {
          app_name?: string
          created_at?: string
          id?: string
          super_admin_emails?: string[]
          system_settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      appointment: {
        Row: {
          company_id: string
          completed_at: string | null
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          price: number | null
          professional_id: string
          professional_name: string | null
          scheduled_at: string
          service_id: string
          service_name: string | null
          source: Database["public"]["Enums"]["appointment_source"]
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          professional_id: string
          professional_name?: string | null
          scheduled_at: string
          service_id: string
          service_name?: string | null
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          professional_id?: string
          professional_name?: string | null
          scheduled_at?: string
          service_id?: string
          service_name?: string | null
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_event_log: {
        Row: {
          buyer_email: string | null
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string | null
          id: string
          matched_company_id: string | null
          payload: Json | null
          processed: boolean | null
          provider: string
        }
        Insert: {
          buyer_email?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          matched_company_id?: string | null
          payload?: Json | null
          processed?: boolean | null
          provider: string
        }
        Update: {
          buyer_email?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          matched_company_id?: string | null
          payload?: Json | null
          processed?: boolean | null
          provider?: string
        }
        Relationships: []
      }
      club_member: {
        Row: {
          club_plan_id: string
          company_id: string
          created_at: string
          current_period_end: string | null
          customer_id: string
          id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          club_plan_id: string
          company_id: string
          created_at?: string
          current_period_end?: string | null
          customer_id: string
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_plan_id?: string
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          customer_id?: string
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_member_club_plan_id_fkey"
            columns: ["club_plan_id"]
            isOneToOne: false
            referencedRelation: "club_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      club_plan: {
        Row: {
          ativo: boolean
          beneficios: Json
          checkout_url: string | null
          company_id: string
          created_at: string
          id: string
          nome: string
          preco_cents: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          beneficios?: Json
          checkout_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          nome: string
          preco_cents?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          beneficios?: Json
          checkout_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          preco_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_plan_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company: {
        Row: {
          business_hours: Json | null
          ciclo: Database["public"]["Enums"]["ciclo_type"]
          cnpj: string | null
          cpf_responsavel: string | null
          created_at: string
          created_by: string | null
          email_contato: string | null
          endereco: Json | null
          fidelidade_ativa: boolean
          fidelidade_meta: number
          fidelidade_premio: string | null
          id: string
          logo_url: string | null
          name: string
          nome_fantasia: string | null
          onboarding_concluido: boolean
          onboarding_step: number
          plano: Database["public"]["Enums"]["plano_type"]
          primary_color: string | null
          proximo_vencimento: string | null
          razao_social: string | null
          selected_plan_slug: string | null
          slug: string | null
          status_cobranca: Database["public"]["Enums"]["status_cobranca"]
          telefone_comercial: string | null
          trial_ate: string | null
          ultimo_acesso_at: string | null
          updated_at: string
          valor_mensal: number
          whatsapp: string | null
        }
        Insert: {
          business_hours?: Json | null
          ciclo?: Database["public"]["Enums"]["ciclo_type"]
          cnpj?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          created_by?: string | null
          email_contato?: string | null
          endereco?: Json | null
          fidelidade_ativa?: boolean
          fidelidade_meta?: number
          fidelidade_premio?: string | null
          id?: string
          logo_url?: string | null
          name: string
          nome_fantasia?: string | null
          onboarding_concluido?: boolean
          onboarding_step?: number
          plano?: Database["public"]["Enums"]["plano_type"]
          primary_color?: string | null
          proximo_vencimento?: string | null
          razao_social?: string | null
          selected_plan_slug?: string | null
          slug?: string | null
          status_cobranca?: Database["public"]["Enums"]["status_cobranca"]
          telefone_comercial?: string | null
          trial_ate?: string | null
          ultimo_acesso_at?: string | null
          updated_at?: string
          valor_mensal?: number
          whatsapp?: string | null
        }
        Update: {
          business_hours?: Json | null
          ciclo?: Database["public"]["Enums"]["ciclo_type"]
          cnpj?: string | null
          cpf_responsavel?: string | null
          created_at?: string
          created_by?: string | null
          email_contato?: string | null
          endereco?: Json | null
          fidelidade_ativa?: boolean
          fidelidade_meta?: number
          fidelidade_premio?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          nome_fantasia?: string | null
          onboarding_concluido?: boolean
          onboarding_step?: number
          plano?: Database["public"]["Enums"]["plano_type"]
          primary_color?: string | null
          proximo_vencimento?: string | null
          razao_social?: string | null
          selected_plan_slug?: string | null
          slug?: string | null
          status_cobranca?: Database["public"]["Enums"]["status_cobranca"]
          telefone_comercial?: string | null
          trial_ate?: string | null
          ultimo_acesso_at?: string | null
          updated_at?: string
          valor_mensal?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_user: {
        Row: {
          ativo: boolean
          company_id: string
          convite_aceito: boolean
          convite_token: string | null
          created_at: string
          email: string
          forcar_troca_senha: boolean
          id: string
          nome: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          ultimo_login: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          company_id: string
          convite_aceito?: boolean
          convite_token?: string | null
          created_at?: string
          email: string
          forcar_troca_senha?: boolean
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          ultimo_login?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          company_id?: string
          convite_aceito?: boolean
          convite_token?: string | null
          created_at?: string
          email?: string
          forcar_troca_senha?: boolean
          id?: string
          nome?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          ultimo_login?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_user_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          fidelidade_contador: number
          id: string
          last_appointment_at: string | null
          name: string
          notes: string | null
          phone: string
          status: Database["public"]["Enums"]["customer_status"]
          tags: string[] | null
          total_appointments: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          fidelidade_contador?: number
          id?: string
          last_appointment_at?: string | null
          name: string
          notes?: string | null
          phone: string
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[] | null
          total_appointments?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          fidelidade_contador?: number
          id?: string
          last_appointment_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["customer_status"]
          tags?: string[] | null
          total_appointments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entry: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          reference_appointment_id: string | null
          status: Database["public"]["Enums"]["financial_status"]
          type: Database["public"]["Enums"]["financial_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          reference_appointment_id?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          type: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          reference_appointment_id?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          type?: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entry_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entry_reference_appointment_id_fkey"
            columns: ["reference_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_simulated: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          reference_month: string
          status: Database["public"]["Enums"]["invoice_status"]
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["invoice_status"]
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["invoice_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invoice_simulated_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      plan: {
        Row: {
          ativo: boolean | null
          checkout_url: string | null
          created_at: string
          descricao: string | null
          destaque: boolean | null
          features: Json
          id: string
          intervalo: string
          limite_agendamentos_mes: number
          limite_clientes: number
          limite_profissionais: number
          limite_usuarios: number
          moeda: string
          nome: string
          ordem: number | null
          preco_cents: number
          provider_price_ids: Json | null
          slug: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          features?: Json
          id?: string
          intervalo?: string
          limite_agendamentos_mes?: number
          limite_clientes?: number
          limite_profissionais?: number
          limite_usuarios?: number
          moeda?: string
          nome: string
          ordem?: number | null
          preco_cents?: number
          provider_price_ids?: Json | null
          slug: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean | null
          features?: Json
          id?: string
          intervalo?: string
          limite_agendamentos_mes?: number
          limite_clientes?: number
          limite_profissionais?: number
          limite_usuarios?: number
          moeda?: string
          nome?: string
          ordem?: number | null
          preco_cents?: number
          provider_price_ids?: Json | null
          slug?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      product: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          custo_cents: number
          estoque: number | null
          id: string
          nome: string
          preco_cents: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          custo_cents?: number
          estoque?: number | null
          id?: string
          nome: string
          preco_cents?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          custo_cents?: number
          estoque?: number | null
          id?: string
          nome?: string
          preco_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      professional: {
        Row: {
          active: boolean
          comissao_percentual: number
          commission_type: string | null
          commission_value: number | null
          company_id: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          specialty: string | null
          updated_at: string
          work_schedule: Json | null
        }
        Insert: {
          active?: boolean
          comissao_percentual?: number
          commission_type?: string | null
          commission_value?: number | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
          work_schedule?: Json | null
        }
        Update: {
          active?: boolean
          comissao_percentual?: number
          commission_type?: string | null
          commission_value?: number | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
          work_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_block: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          note: string | null
          professional_id: string
          reason: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          note?: string | null
          professional_id: string
          reason?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          note?: string | null
          professional_id?: string
          reason?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_block_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_block_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_schedule: {
        Row: {
          company_id: string
          created_at: string
          end_time: string | null
          id: string
          is_working: boolean
          lunch_end: string | null
          lunch_start: string | null
          professional_id: string
          slot_minutes: number
          start_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          company_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_working?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          professional_id: string
          slot_minutes?: number
          start_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          company_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_working?: boolean
          lunch_end?: string | null
          lunch_start?: string | null
          professional_id?: string
          slot_minutes?: number
          start_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_schedule_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_service: {
        Row: {
          comissao_percentual: number | null
          commission_type: string | null
          commission_value: number | null
          professional_id: string
          service_id: string
        }
        Insert: {
          comissao_percentual?: number | null
          commission_type?: string | null
          commission_value?: number | null
          professional_id: string
          service_id: string
        }
        Update: {
          comissao_percentual?: number | null
          commission_type?: string | null
          commission_value?: number | null
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_service_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_service_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      sale: {
        Row: {
          appointment_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          desconto_cents: number
          forma_pagamento: string | null
          id: string
          observacao: string | null
          professional_id: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          desconto_cents?: number
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          professional_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          desconto_cents?: number
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          professional_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_item: {
        Row: {
          comissao_cents: number
          comissao_percentual: number
          company_id: string
          created_at: string
          descricao: string
          id: string
          preco_cents: number
          professional_id: string | null
          quantidade: number
          ref_id: string | null
          sale_id: string
          tipo: string
        }
        Insert: {
          comissao_cents?: number
          comissao_percentual?: number
          company_id: string
          created_at?: string
          descricao: string
          id?: string
          preco_cents?: number
          professional_id?: string | null
          quantidade?: number
          ref_id?: string | null
          sale_id: string
          tipo: string
        }
        Update: {
          comissao_cents?: number
          comissao_percentual?: number
          company_id?: string
          created_at?: string
          descricao?: string
          id?: string
          preco_cents?: number
          professional_id?: string | null
          quantidade?: number
          ref_id?: string | null
          sale_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale"
            referencedColumns: ["id"]
          },
        ]
      }
      service: {
        Row: {
          active: boolean
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          featured: boolean
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      service_category: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_category_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription: {
        Row: {
          buyer_email: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          metadata: Json | null
          plan_id: string | null
          provider: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          provider?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          provider?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_identity: {
        Row: {
          company_id: string | null
          cpf: string
          created_at: string
          email: string
          id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          cpf: string
          created_at?: string
          email: string
          id?: string
          phone: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_identity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_appointment_by_token: {
        Args: { _token: string }
        Returns: boolean
      }
      close_sale: {
        Args: {
          _desconto_cents?: number
          _forma_pagamento?: string
          _sale_id: string
        }
        Returns: {
          appointment_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          desconto_cents: number
          forma_pagamento: string | null
          id: string
          observacao: string | null
          professional_id: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sale"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_appointment_by_token: {
        Args: { _token: string }
        Returns: boolean
      }
      current_company_id: { Args: never; Returns: string }
      get_appointment_by_token: {
        Args: { _token: string }
        Returns: {
          company_endereco: string
          company_id: string
          company_nome: string
          company_primary_color: string
          company_telefone: string
          confirmed_at: string
          customer_name: string
          id: string
          professional_name: string
          scheduled_at: string
          service_name: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      get_busy_slots: {
        Args: { _company_id: string; _date: string; _professional_id: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      has_company_access: { Args: { _company_id: string }; Returns: boolean }
      has_company_role: {
        Args: { _company_id: string; _roles: string[] }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      trial_identity_conflict: {
        Args: { _cpf: string; _email: string; _phone: string }
        Returns: string
      }
      upsert_customer_public: {
        Args: { _company_id: string; _name: string; _phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin"
      appointment_source: "interno" | "online" | "demo"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "em_andamento"
        | "concluido"
        | "cancelado"
        | "nao_compareceu"
      ciclo_type: "mensal" | "anual"
      commission_type: "percent" | "fixed"
      customer_status: "active" | "inactive" | "vip"
      financial_status: "confirmado" | "pendente" | "cancelado"
      financial_type: "entrada" | "saida"
      invoice_status: "pago" | "pendente" | "vencido" | "cancelado"
      plano_type: "starter" | "pro" | "premium"
      status_cobranca:
        | "trial"
        | "ativo"
        | "inadimplente"
        | "suspenso"
        | "cancelado"
      tenant_role: "owner" | "admin" | "recepcao" | "barbeiro" | "financeiro"
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
      app_role: ["super_admin"],
      appointment_source: ["interno", "online", "demo"],
      appointment_status: [
        "agendado",
        "confirmado",
        "em_andamento",
        "concluido",
        "cancelado",
        "nao_compareceu",
      ],
      ciclo_type: ["mensal", "anual"],
      commission_type: ["percent", "fixed"],
      customer_status: ["active", "inactive", "vip"],
      financial_status: ["confirmado", "pendente", "cancelado"],
      financial_type: ["entrada", "saida"],
      invoice_status: ["pago", "pendente", "vencido", "cancelado"],
      plano_type: ["starter", "pro", "premium"],
      status_cobranca: [
        "trial",
        "ativo",
        "inadimplente",
        "suspenso",
        "cancelado",
      ],
      tenant_role: ["owner", "admin", "recepcao", "barbeiro", "financeiro"],
    },
  },
} as const
