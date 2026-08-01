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
          club_member_id: string | null
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
          pagamento_tipo: string
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
          club_member_id?: string | null
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
          pagamento_tipo?: string
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
          club_member_id?: string | null
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
          pagamento_tipo?: string
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
            foreignKeyName: "appointment_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "club_member"
            referencedColumns: ["id"]
          },
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
      appointment_review: {
        Row: {
          appointment_id: string
          comment: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          id: string
          photos: Json
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          photos?: Json
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          photos?: Json
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_review_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_review_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_review_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
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
      client_payment: {
        Row: {
          amount_cents: number
          card_brand: string | null
          card_last4: string | null
          club_member_id: string | null
          company_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          descricao: string
          external_id: string | null
          id: string
          metodo: string | null
          paid_at: string | null
          provider: string
          receipt_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          card_brand?: string | null
          card_last4?: string | null
          club_member_id?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          descricao?: string
          external_id?: string | null
          id?: string
          metodo?: string | null
          paid_at?: string | null
          provider?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          card_brand?: string | null
          card_last4?: string | null
          club_member_id?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          descricao?: string
          external_id?: string | null
          id?: string
          metodo?: string | null
          paid_at?: string | null
          provider?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "club_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profile: {
        Row: {
          birthdate: string | null
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          favorite_company_id: string | null
          favorite_professional_id: string | null
          favorite_service_id: string | null
          full_name: string
          locale: string
          notifications: Json
          phone: string | null
          photo_url: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthdate?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          favorite_company_id?: string | null
          favorite_professional_id?: string | null
          favorite_service_id?: string | null
          full_name?: string
          locale?: string
          notifications?: Json
          phone?: string | null
          photo_url?: string | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthdate?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          favorite_company_id?: string | null
          favorite_professional_id?: string | null
          favorite_service_id?: string | null
          full_name?: string
          locale?: string
          notifications?: Json
          phone?: string | null
          photo_url?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profile_favorite_company_id_fkey"
            columns: ["favorite_company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profile_favorite_professional_id_fkey"
            columns: ["favorite_professional_id"]
            isOneToOne: false
            referencedRelation: "professional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profile_favorite_service_id_fkey"
            columns: ["favorite_service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      club_benefit_usage: {
        Row: {
          appointment_id: string | null
          club_member_id: string
          company_id: string
          created_at: string
          id: string
          movimento: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          club_member_id: string
          company_id: string
          created_at?: string
          id?: string
          movimento?: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          club_member_id?: string
          company_id?: string
          created_at?: string
          id?: string
          movimento?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_benefit_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_benefit_usage_club_member_id_fkey"
            columns: ["club_member_id"]
            isOneToOne: false
            referencedRelation: "club_member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_benefit_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member: {
        Row: {
          beneficios_utilizados: number
          cancel_at_period_end: boolean
          club_plan_id: string
          company_id: string
          created_at: string
          creditos_restantes: number
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          id: string
          last_provisioned_period: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          beneficios_utilizados?: number
          cancel_at_period_end?: boolean
          club_plan_id: string
          company_id: string
          created_at?: string
          creditos_restantes?: number
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          id?: string
          last_provisioned_period?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          beneficios_utilizados?: number
          cancel_at_period_end?: boolean
          club_plan_id?: string
          company_id?: string
          created_at?: string
          creditos_restantes?: number
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          id?: string
          last_provisioned_period?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
          creditos_mensais: number
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
          creditos_mensais?: number
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
          creditos_mensais?: number
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      stripe_customer: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          metadata: Json
          stripe_customer_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          stripe_customer_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          stripe_customer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customer_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_event: {
        Row: {
          api_version: string | null
          attempts: number
          created_at: string
          error: string | null
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          stripe_event_id: string
          type: string
          updated_at: string
        }
        Insert: {
          api_version?: string | null
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id: string
          type: string
          updated_at?: string
        }
        Update: {
          api_version?: string | null
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription: {
        Row: {
          buyer_email: string | null
          cancel_at: string | null
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
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_ends_at: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          cancel_at?: string | null
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
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_ends_at?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          cancel_at?: string | null
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
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_ends_at?: string | null
          trial_start?: string | null
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
      apply_subscription_to_company: {
        Args: {
          _company_id: string
          _period_end: string
          _status: string
          _trial_end: string
        }
        Returns: undefined
      }
      cancel_appointment_by_token: {
        Args: { _token: string }
        Returns: boolean
      }
      cancel_client_appointment: {
        Args: { _appointment_id: string }
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
      get_active_subscription: {
        Args: { _company_id: string }
        Returns: {
          buyer_email: string | null
          cancel_at: string | null
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
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_ends_at: string | null
          trial_start: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      get_client_appointments: {
        Args: never
        Returns: {
          club_creditos_restantes: number
          club_member_id: string
          club_plano_nome: string
          company_endereco: Json
          company_id: string
          company_name: string
          company_slug: string
          company_telefone: string
          company_whatsapp: string
          completed_at: string
          confirmed_at: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string
          pagamento_tipo: string
          price: number
          professional_id: string
          professional_name: string
          professional_photo: string
          rating: number
          review_comment: string
          scheduled_at: string
          service_id: string
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      get_client_dashboard: { Args: never; Returns: Json }
      get_current_plan_slug: { Args: { _company_id: string }; Returns: string }
      get_customer_insights: { Args: { _customer_id: string }; Returns: Json }
      get_my_club_memberships: {
        Args: { _company_id: string }
        Returns: {
          beneficios_utilizados: number
          cancel_at_period_end: boolean
          club_plan_id: string
          company_id: string
          creditos_mensais: number
          creditos_restantes: number
          current_period_end: string
          id: string
          plano_nome: string
          status: string
        }[]
      }
      get_my_club_usage: {
        Args: { _club_member_id?: string }
        Returns: {
          appointment_at: string
          appointment_id: string
          club_member_id: string
          company_name: string
          created_at: string
          id: string
          movimento: string
          plano_nome: string
          quantidade: number
          service_name: string
        }[]
      }
      get_my_payments: {
        Args: never
        Returns: {
          amount_cents: number
          card_brand: string
          card_last4: string
          company_name: string
          created_at: string
          descricao: string
          id: string
          metodo: string
          paid_at: string
          receipt_url: string
          status: string
        }[]
      }
      get_public_club_plans: {
        Args: { _company_id: string }
        Returns: {
          beneficios: Json
          creditos_mensais: number
          id: string
          nome: string
          preco_cents: number
        }[]
      }
      get_stripe_customer: {
        Args: { _company_id: string }
        Returns: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          metadata: Json
          stripe_customer_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_customer"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_company_access: { Args: { _company_id: string }; Returns: boolean }
      has_company_role: {
        Args: { _company_id: string; _roles: string[] }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      mark_webhook_processed: {
        Args: { _error?: string; _stripe_event_id: string }
        Returns: undefined
      }
      redeem_club_benefit: {
        Args: { _appointment_id: string; _club_member_id: string }
        Returns: boolean
      }
      reschedule_client_appointment: {
        Args: { _appointment_id: string; _new_at: string }
        Returns: boolean
      }
      sync_stripe_subscription: {
        Args: {
          _cancel_at: string
          _cancel_at_period_end: boolean
          _canceled_at: string
          _company_id: string
          _current_period_end: string
          _current_period_start: string
          _customer_email: string
          _metadata: Json
          _plan_id?: string
          _status: string
          _stripe_customer_id: string
          _stripe_price_id: string
          _stripe_product_id: string
          _stripe_subscription_id: string
          _trial_end: string
          _trial_start: string
        }
        Returns: {
          buyer_email: string | null
          cancel_at: string | null
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
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_ends_at: string | null
          trial_start: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trial_identity_conflict: {
        Args: { _cpf: string; _email: string; _phone: string }
        Returns: string
      }
      update_subscription_status: {
        Args: { _status: string; _stripe_subscription_id: string }
        Returns: {
          buyer_email: string | null
          cancel_at: string | null
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
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_ends_at: string | null
          trial_start: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscription"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_customer_for_user: {
        Args: {
          _company_id: string
          _email?: string
          _name: string
          _phone: string
        }
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
