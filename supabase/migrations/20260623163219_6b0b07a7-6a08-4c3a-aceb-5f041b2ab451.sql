
-- 1) Remover RPC perigosa que promovia o primeiro signin a super admin
DROP FUNCTION IF EXISTS public.claim_super_admin_if_empty();

-- 2) Hardening do handle_new_user: NUNCA promover ninguém automaticamente
-- (super admin é semeado manualmente; novos usuários nunca viram super admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Garantir que app_config exista (sem promover ninguém)
  INSERT INTO public.app_config (app_name, super_admin_emails)
  SELECT 'BarbeiroPro AI', ARRAY[]::text[]
  WHERE NOT EXISTS (SELECT 1 FROM public.app_config);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3) Tabela anti-fraude: bloqueia mesma identidade (cpf/phone/email) em novas contas trial
CREATE TABLE IF NOT EXISTS public.trial_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.company(id) ON DELETE CASCADE,
  email text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trial_identity TO authenticated;
GRANT ALL ON public.trial_identity TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS trial_identity_email_uq ON public.trial_identity (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS trial_identity_cpf_uq ON public.trial_identity (cpf);
CREATE UNIQUE INDEX IF NOT EXISTS trial_identity_phone_uq ON public.trial_identity (phone);

ALTER TABLE public.trial_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own trial identity" ON public.trial_identity
  FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

-- 4) RPC pública (server-side via service role) — checagem rápida, sem expor lista
CREATE OR REPLACE FUNCTION public.trial_identity_conflict(_email text, _cpf text, _phone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.trial_identity WHERE lower(email) = lower(_email)) THEN 'email'
    WHEN EXISTS (SELECT 1 FROM public.trial_identity WHERE cpf = _cpf) THEN 'cpf'
    WHEN EXISTS (SELECT 1 FROM public.trial_identity WHERE phone = _phone) THEN 'phone'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.trial_identity_conflict(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trial_identity_conflict(text, text, text) TO service_role;

-- 5) Garantir que cpf existe em company (pra associar ao registro)
ALTER TABLE public.company ADD COLUMN IF NOT EXISTS cpf_responsavel text;
