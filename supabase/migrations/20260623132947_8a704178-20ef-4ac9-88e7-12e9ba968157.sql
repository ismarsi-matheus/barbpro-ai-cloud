
-- 1) plan
CREATE TABLE IF NOT EXISTS public.plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco_cents int NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'BRL',
  intervalo text NOT NULL DEFAULT 'month',
  trial_days int NOT NULL DEFAULT 14,
  limite_profissionais int NOT NULL DEFAULT 3,
  limite_usuarios int NOT NULL DEFAULT 3,
  limite_clientes int NOT NULL DEFAULT 1000,
  limite_agendamentos_mes int NOT NULL DEFAULT 1000,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  destaque boolean DEFAULT false,
  ativo boolean DEFAULT true,
  ordem int DEFAULT 0,
  checkout_url text,
  provider_price_ids jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_slug_key ON public.plan(slug);

GRANT SELECT ON public.plan TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan TO authenticated;
GRANT ALL ON public.plan TO service_role;

ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_select_anon ON public.plan;
CREATE POLICY plan_select_anon ON public.plan FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS plan_select_auth ON public.plan;
CREATE POLICY plan_select_auth ON public.plan FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS plan_write_admin ON public.plan;
CREATE POLICY plan_write_admin ON public.plan FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_plan_updated_at BEFORE UPDATE ON public.plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) subscription
CREATE TABLE IF NOT EXISTS public.subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.company(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plan(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'trialing',
  provider text NOT NULL DEFAULT 'manual',
  external_subscription_id text,
  external_customer_id text,
  buyer_email text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription TO authenticated;
GRANT ALL ON public.subscription TO service_role;

ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

-- has_company_role helper
CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_user
    WHERE company_id = _company_id
      AND user_id = auth.uid()
      AND ativo = true
      AND role::text = ANY (_roles)
  );
$$;

DROP POLICY IF EXISTS subscription_select ON public.subscription;
CREATE POLICY subscription_select ON public.subscription FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS subscription_update_owner ON public.subscription;
CREATE POLICY subscription_update_owner ON public.subscription FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.has_company_role(company_id, ARRAY['owner','admin']))
  WITH CHECK (public.is_super_admin() OR public.has_company_role(company_id, ARRAY['owner','admin']));

DROP POLICY IF EXISTS subscription_write_admin ON public.subscription;
CREATE POLICY subscription_write_admin ON public.subscription FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_subscription_updated_at BEFORE UPDATE ON public.subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) billing_event_log
CREATE TABLE IF NOT EXISTS public.billing_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text,
  external_id text,
  buyer_email text,
  matched_company_id uuid,
  processed boolean DEFAULT false,
  error text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.billing_event_log TO authenticated;
GRANT ALL ON public.billing_event_log TO service_role;

ALTER TABLE public.billing_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_event_log_select_admin ON public.billing_event_log;
CREATE POLICY billing_event_log_select_admin ON public.billing_event_log FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 4) company.selected_plan_slug
ALTER TABLE public.company ADD COLUMN IF NOT EXISTS selected_plan_slug text;

-- 5) handle_new_user trigger - first user becomes super_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_admin boolean;
  _email text;
  _current text[];
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO _has_admin;
  IF _has_admin THEN
    RETURN NEW;
  END IF;

  _email := lower(NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'super_admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.app_config (app_name, super_admin_emails)
  SELECT 'BarbeiroPro AI', ARRAY[_email]
  WHERE NOT EXISTS (SELECT 1 FROM public.app_config);

  SELECT super_admin_emails INTO _current FROM public.app_config LIMIT 1;
  IF _current IS NULL OR NOT (_email = ANY (SELECT lower(unnest(_current)))) THEN
    UPDATE public.app_config
      SET super_admin_emails = COALESCE(_current, ARRAY[]::text[]) || ARRAY[_email],
          updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Seed planos
INSERT INTO public.plan (slug, nome, preco_cents, trial_days, limite_profissionais, limite_usuarios, limite_clientes, limite_agendamentos_mes, ordem, destaque, features)
SELECT 'starter','Starter',0,14,2,2,500,500,1,false,
  '["Agenda online","Clientes","Serviços"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE slug='starter');

INSERT INTO public.plan (slug, nome, preco_cents, trial_days, limite_profissionais, limite_usuarios, limite_clientes, limite_agendamentos_mes, ordem, destaque, features)
SELECT 'pro','Pro',9700,14,6,6,5000,5000,2,true,
  '["Tudo do Starter","Comissões automáticas","Financeiro","Relatórios","Fidelidade"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE slug='pro');

INSERT INTO public.plan (slug, nome, preco_cents, trial_days, limite_profissionais, limite_usuarios, limite_clientes, limite_agendamentos_mes, ordem, destaque, features)
SELECT 'business','Business',19700,14,20,20,100000,50000,3,false,
  '["Tudo do Pro","Clube de assinatura","API/Webhooks","Suporte prioritário"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.plan WHERE slug='business');
