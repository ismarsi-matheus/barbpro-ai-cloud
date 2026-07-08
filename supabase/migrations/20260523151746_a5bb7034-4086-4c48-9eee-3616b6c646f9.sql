
-- ============ DROP EXISTING ============
DROP TABLE IF EXISTS public.financial_entry CASCADE;
DROP TABLE IF EXISTS public.appointment CASCADE;
DROP TABLE IF EXISTS public.customer CASCADE;
DROP TABLE IF EXISTS public.professional CASCADE;
DROP TABLE IF EXISTS public.service CASCADE;
DROP TABLE IF EXISTS public.service_category CASCADE;
DROP TABLE IF EXISTS public.team_member CASCADE;
DROP TABLE IF EXISTS public.barbearia_user CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.company CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_companies(uuid) CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.plano_type CASCADE;
DROP TYPE IF EXISTS public.company_status CASCADE;
DROP TYPE IF EXISTS public.team_role CASCADE;
DROP TYPE IF EXISTS public.barbearia_user_role CASCADE;
DROP TYPE IF EXISTS public.customer_status CASCADE;
DROP TYPE IF EXISTS public.appointment_status CASCADE;
DROP TYPE IF EXISTS public.appointment_source CASCADE;
DROP TYPE IF EXISTS public.financial_type CASCADE;
DROP TYPE IF EXISTS public.financial_status CASCADE;

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin');
CREATE TYPE public.tenant_role AS ENUM ('owner','admin','recepcao','barbeiro','financeiro');
CREATE TYPE public.plano_type AS ENUM ('starter','pro','premium');
CREATE TYPE public.status_cobranca AS ENUM ('trial','ativo','inadimplente','suspenso','cancelado');
CREATE TYPE public.ciclo_type AS ENUM ('mensal','anual');
CREATE TYPE public.customer_status AS ENUM ('active','inactive','vip');
CREATE TYPE public.appointment_status AS ENUM ('agendado','confirmado','em_andamento','concluido','cancelado','nao_compareceu');
CREATE TYPE public.appointment_source AS ENUM ('interno','online','demo');
CREATE TYPE public.financial_type AS ENUM ('entrada','saida');
CREATE TYPE public.financial_status AS ENUM ('confirmado','pendente','cancelado');
CREATE TYPE public.invoice_status AS ENUM ('pago','pendente','vencido','cancelado');

-- ============ APP CONFIG (singleton) ============
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'BarbeiroPro AI',
  super_admin_emails text[] NOT NULL DEFAULT ARRAY['luis.bedinot@gmail.com']::text[],
  system_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ COMPANY (TENANT) ============
CREATE TABLE public.company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nome_fantasia text,
  razao_social text,
  cnpj text,
  email_contato text,
  telefone_comercial text,
  whatsapp text,
  logo_url text,
  slug text UNIQUE,
  endereco jsonb DEFAULT '{}'::jsonb,
  business_hours jsonb DEFAULT '{}'::jsonb,
  primary_color text DEFAULT '#1B3A4B',
  -- billing
  plano plano_type NOT NULL DEFAULT 'starter',
  status_cobranca status_cobranca NOT NULL DEFAULT 'trial',
  ciclo ciclo_type NOT NULL DEFAULT 'mensal',
  valor_mensal numeric(10,2) NOT NULL DEFAULT 39,
  trial_ate date DEFAULT (CURRENT_DATE + INTERVAL '14 days')::date,
  proximo_vencimento date,
  ultimo_acesso_at timestamptz,
  -- onboarding
  onboarding_concluido boolean NOT NULL DEFAULT false,
  onboarding_step smallint NOT NULL DEFAULT 0,
  -- meta
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_slug ON public.company(slug);
CREATE INDEX idx_company_status ON public.company(status_cobranca);

-- ============ USER ROLES (global super_admin) ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ============ COMPANY_USER ============
CREATE TABLE public.company_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  nome text,
  role tenant_role NOT NULL DEFAULT 'recepcao',
  ativo boolean NOT NULL DEFAULT true,
  forcar_troca_senha boolean NOT NULL DEFAULT false,
  ultimo_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
CREATE INDEX idx_company_user_user ON public.company_user(user_id);
CREATE INDEX idx_company_user_company ON public.company_user(company_id);

-- ============ SERVICE CATEGORY ============
CREATE TABLE public.service_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ SERVICE ============
CREATE TABLE public.service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.service_category(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ PROFESSIONAL ============
CREATE TABLE public.professional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  photo_url text,
  commission_type text, -- 'percent' | 'fixed'
  commission_value numeric(10,2),
  work_schedule jsonb DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.professional_service (
  professional_id uuid NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.service(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

-- ============ CUSTOMER ============
CREATE TABLE public.customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  tags text[] DEFAULT '{}'::text[],
  status customer_status NOT NULL DEFAULT 'active',
  total_appointments int NOT NULL DEFAULT 0,
  last_appointment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ APPOINTMENT ============
CREATE TABLE public.appointment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
  professional_id uuid NOT NULL REFERENCES public.professional(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.service(id) ON DELETE RESTRICT,
  customer_name text,
  customer_phone text,
  service_name text,
  professional_name text,
  scheduled_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'agendado',
  source appointment_source NOT NULL DEFAULT 'interno',
  price numeric(10,2),
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointment_scheduled ON public.appointment(company_id, scheduled_at);

-- ============ FINANCIAL ENTRY ============
CREATE TABLE public.financial_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  type financial_type NOT NULL,
  category text,
  description text,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL,
  status financial_status NOT NULL DEFAULT 'confirmado',
  reference_appointment_id uuid REFERENCES public.appointment(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INVOICE SIMULATED ============
CREATE TABLE public.invoice_simulated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  reference_month date NOT NULL, -- primeiro dia do mês
  amount numeric(10,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pendente',
  due_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_company ON public.invoice_simulated(company_id, reference_month);

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1
    FROM public.app_config c, auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = ANY (SELECT lower(unnest(c.super_admin_emails)))
    LIMIT 1
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.company_user
    WHERE company_id = _company_id AND user_id = auth.uid() AND ativo = true
  ) OR EXISTS (
    SELECT 1 FROM public.company WHERE id = _company_id AND created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_user
  WHERE user_id = auth.uid() AND ativo = true
  ORDER BY created_at ASC LIMIT 1
$$;

-- triggers updated_at
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['app_config','company','company_user','service_category','service','professional','customer','appointment','financial_entry'])
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- ============ RLS ============
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_simulated ENABLE ROW LEVEL SECURITY;

-- app_config
CREATE POLICY "anyone reads app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "super admin manages app_config" ON public.app_config FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "super admin manages roles" ON public.user_roles FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- company
CREATE POLICY "members view their company" ON public.company FOR SELECT USING (public.has_company_access(id));
CREATE POLICY "public reads company by slug" ON public.company FOR SELECT USING (slug IS NOT NULL AND status_cobranca <> 'cancelado');
CREATE POLICY "authenticated create company" ON public.company FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "owners update company" ON public.company FOR UPDATE USING (public.has_company_access(id)) WITH CHECK (public.has_company_access(id));
CREATE POLICY "super admin delete company" ON public.company FOR DELETE USING (public.is_super_admin());

-- company_user
CREATE POLICY "members view company_user" ON public.company_user FOR SELECT USING (user_id = auth.uid() OR public.has_company_access(company_id));
CREATE POLICY "members manage company_user" ON public.company_user FOR ALL USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- helper generic policy for per-company tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['service_category','service','professional','customer','appointment','financial_entry','invoice_simulated'])
  LOOP
    EXECUTE format('CREATE POLICY "members manage %I" ON public.%I FOR ALL USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));', t, t);
  END LOOP;
END $$;

-- professional_service via join
CREATE POLICY "members manage prof_service" ON public.professional_service FOR ALL
USING (EXISTS (SELECT 1 FROM public.professional p WHERE p.id = professional_id AND public.has_company_access(p.company_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.professional p WHERE p.id = professional_id AND public.has_company_access(p.company_id)));

-- Public booking: anyone can read active services/professionals of any company with slug
CREATE POLICY "public reads active services" ON public.service FOR SELECT USING (
  active = true AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.slug IS NOT NULL AND c.status_cobranca <> 'cancelado')
);
CREATE POLICY "public reads active professionals" ON public.professional FOR SELECT USING (
  active = true AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.slug IS NOT NULL AND c.status_cobranca <> 'cancelado')
);
CREATE POLICY "public reads service_category" ON public.service_category FOR SELECT USING (
  active = true AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.slug IS NOT NULL AND c.status_cobranca <> 'cancelado')
);
CREATE POLICY "public reads prof_service" ON public.professional_service FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.professional p JOIN public.company c ON c.id = p.company_id WHERE p.id = professional_id AND c.slug IS NOT NULL)
);
-- Public booking can insert customer + appointment
CREATE POLICY "public creates customer for booking" ON public.customer FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.slug IS NOT NULL AND c.status_cobranca <> 'cancelado')
);
CREATE POLICY "public creates appointment for booking" ON public.appointment FOR INSERT WITH CHECK (
  source = 'online' AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.slug IS NOT NULL AND c.status_cobranca <> 'cancelado')
);

-- ============ SEED ============
INSERT INTO public.app_config (app_name, super_admin_emails)
VALUES ('BarbeiroPro AI', ARRAY['luis.bedinot@gmail.com']);
