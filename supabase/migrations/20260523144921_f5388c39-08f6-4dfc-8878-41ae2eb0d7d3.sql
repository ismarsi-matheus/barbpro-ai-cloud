
-- ENUMS
CREATE TYPE app_role AS ENUM ('admin','owner','barbeiro','recepcao','financeiro');
CREATE TYPE plano_type AS ENUM ('starter','pro','premium');
CREATE TYPE company_status AS ENUM ('active','inactive','blocked');
CREATE TYPE barbearia_user_role AS ENUM ('owner','admin','barbeiro','recepcao');
CREATE TYPE team_role AS ENUM ('admin','recepcao','barbeiro','financeiro');
CREATE TYPE commission_type AS ENUM ('percent','fixed');
CREATE TYPE customer_status AS ENUM ('active','inactive','vip');
CREATE TYPE appointment_status AS ENUM ('agendado','confirmado','em_atendimento','concluido','cancelado');
CREATE TYPE appointment_source AS ENUM ('online','interno');
CREATE TYPE financial_type AS ENUM ('entrada','saida');
CREATE TYPE financial_status AS ENUM ('pendente','confirmado');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, company_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "users insert own roles" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- APP CONFIG
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_emails TEXT[] DEFAULT '{}',
  app_name TEXT DEFAULT 'BarbeiroPro AI',
  system_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "admins manage app_config" ON public.app_config FOR ALL USING (public.is_admin());
CREATE TRIGGER app_config_updated BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMPANY
CREATE TABLE public.company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nome_fantasia TEXT, razao_social TEXT, cnpj TEXT,
  email_contato TEXT, telefone_comercial TEXT, whatsapp TEXT,
  logo_url TEXT, slug TEXT UNIQUE,
  endereco JSONB DEFAULT '{}',
  owner_nome TEXT, owner_email TEXT, owner_telefone TEXT,
  plano plano_type NOT NULL DEFAULT 'starter',
  status company_status NOT NULL DEFAULT 'active',
  primary_color TEXT DEFAULT '#1B3A4B',
  business_hours JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER company_updated BEFORE UPDATE ON public.company FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEAM MEMBER
CREATE TABLE public.team_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'recepcao',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_member ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER team_member_updated BEFORE UPDATE ON public.team_member FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_companies helper (after team_member)
CREATE OR REPLACE FUNCTION public.user_companies(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.user_roles WHERE user_id = _user_id AND company_id IS NOT NULL
  UNION
  SELECT company_id FROM public.team_member WHERE email = (SELECT email FROM auth.users WHERE id = _user_id) AND active = true
  UNION
  SELECT id FROM public.company WHERE created_by = _user_id;
$$;

CREATE POLICY "members view their company" ON public.company FOR SELECT
  USING (id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());
CREATE POLICY "authenticated create company" ON public.company FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "owners update company" ON public.company FOR UPDATE
  USING (created_by = auth.uid() OR id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());
CREATE POLICY "owners delete company" ON public.company FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "members view team" ON public.team_member FOR SELECT
  USING (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());
CREATE POLICY "members manage team" ON public.team_member FOR ALL
  USING (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin())
  WITH CHECK (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());

-- BARBEARIA USER
CREATE TABLE public.barbearia_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  senha_hash TEXT,
  role barbearia_user_role NOT NULL DEFAULT 'recepcao',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.barbearia_user ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view barbearia_user" ON public.barbearia_user FOR SELECT
  USING (barbearia_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());
CREATE POLICY "members manage barbearia_user" ON public.barbearia_user FOR ALL
  USING (barbearia_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin())
  WITH CHECK (barbearia_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());
CREATE TRIGGER barbearia_user_updated BEFORE UPDATE ON public.barbearia_user FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROFESSIONAL
CREATE TABLE public.professional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name TEXT NOT NULL, photo_url TEXT, specialty TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  work_schedule JSONB DEFAULT '{}',
  service_ids TEXT[] DEFAULT '{}',
  commission_type commission_type, commission_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.professional ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER professional_updated BEFORE UPDATE ON public.professional FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_category ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER service_category_updated BEFORE UPDATE ON public.service_category FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_category(id) ON DELETE SET NULL,
  name TEXT NOT NULL, description TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  price NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER service_updated BEFORE UPDATE ON public.service FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
  notes TEXT, tags TEXT[] DEFAULT '{}',
  total_appointments INT NOT NULL DEFAULT 0,
  last_appointment_at TIMESTAMPTZ,
  status customer_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customer_updated BEFORE UPDATE ON public.customer FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customer(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.service(id) ON DELETE CASCADE,
  service_name TEXT, professional_name TEXT, customer_name TEXT, customer_phone TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'agendado',
  notes TEXT,
  source appointment_source NOT NULL DEFAULT 'interno',
  completed_at TIMESTAMPTZ, price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER appointment_updated BEFORE UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financial_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  type financial_type NOT NULL DEFAULT 'entrada',
  category TEXT, description TEXT,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  status financial_status NOT NULL DEFAULT 'confirmado',
  reference_appointment_id UUID REFERENCES public.appointment(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_entry ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER financial_entry_updated BEFORE UPDATE ON public.financial_entry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['professional','service_category','service','customer','appointment','financial_entry']) LOOP
    EXECUTE format('CREATE POLICY "members view %I" ON public.%I FOR SELECT USING (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());', t, t);
    EXECUTE format('CREATE POLICY "members manage %I" ON public.%I FOR ALL USING (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin()) WITH CHECK (company_id IN (SELECT public.user_companies(auth.uid())) OR public.is_admin());', t, t);
  END LOOP;
END $$;
