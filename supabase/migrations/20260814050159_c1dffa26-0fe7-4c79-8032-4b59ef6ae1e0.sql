
-- 1) Anti-fraude: trial_identity para lock de CPF/Phone/Email
-- Já existe, vamos apenas garantir os GRANTs e Policies caso não tenham sido aplicados corretamente
GRANT SELECT ON public.trial_identity TO authenticated;
GRANT ALL ON public.trial_identity TO service_role;

-- 2) Função de conflito de trial
CREATE OR REPLACE FUNCTION public.trial_identity_conflict(_email text, _cpf text, _phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.trial_identity WHERE email = lower(_email)) THEN
        RETURN 'email';
    END IF;
    IF EXISTS (SELECT 1 FROM public.trial_identity WHERE cpf = _cpf) THEN
        RETURN 'cpf';
    END IF;
    IF EXISTS (SELECT 1 FROM public.trial_identity WHERE phone = _phone) THEN
        RETURN 'phone';
    END IF;
    RETURN NULL;
END;
$$;

-- 3) Limpeza e segurança de promoção automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- 4) Segurança de roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5) Função is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_config
    WHERE (auth.jwt() ->> 'email') = ANY(super_admin_emails)
  )
$$;

-- 6) Remover RPCs perigosas
DROP FUNCTION IF EXISTS public.claim_super_admin_if_empty();
