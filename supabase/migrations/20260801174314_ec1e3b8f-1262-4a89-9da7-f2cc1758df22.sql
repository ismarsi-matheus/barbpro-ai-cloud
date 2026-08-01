-- 1) Campos novos
ALTER TABLE public.club_plan ADD COLUMN IF NOT EXISTS creditos_mensais integer NOT NULL DEFAULT 0;
ALTER TABLE public.club_member ADD COLUMN IF NOT EXISTS creditos_restantes integer NOT NULL DEFAULT 0;
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS pagamento_tipo text NOT NULL DEFAULT 'normal';
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS club_member_id uuid REFERENCES public.club_member(id) ON DELETE SET NULL;

-- 2) Histórico de uso
CREATE TABLE IF NOT EXISTS public.club_benefit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  club_member_id uuid NOT NULL REFERENCES public.club_member(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointment(id) ON DELETE SET NULL,
  quantidade integer NOT NULL DEFAULT 1,
  movimento text NOT NULL DEFAULT 'uso',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_benefit_usage TO authenticated;
GRANT ALL ON public.club_benefit_usage TO service_role;

ALTER TABLE public.club_benefit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe ve uso do clube da empresa"
  ON public.club_benefit_usage FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

CREATE POLICY "Cliente ve o proprio uso do clube"
  ON public.club_benefit_usage FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.club_member m
    JOIN public.customer c ON c.id = m.customer_id
    WHERE m.id = club_benefit_usage.club_member_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Equipe gerencia uso do clube"
  ON public.club_benefit_usage FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE TRIGGER update_club_benefit_usage_updated_at
  BEFORE UPDATE ON public.club_benefit_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_club_benefit_usage_member ON public.club_benefit_usage(club_member_id);
CREATE INDEX IF NOT EXISTS idx_club_benefit_usage_company ON public.club_benefit_usage(company_id);

-- 3) Planos do clube visiveis publicamente (somente colunas seguras)
CREATE OR REPLACE FUNCTION public.get_public_club_plans(_company_id uuid)
RETURNS TABLE(id uuid, nome text, preco_cents integer, beneficios jsonb, creditos_mensais integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.nome, p.preco_cents, p.beneficios, p.creditos_mensais
  FROM public.club_plan p
  JOIN public.company c ON c.id = p.company_id
  WHERE p.company_id = _company_id
    AND p.ativo = true
    AND c.slug IS NOT NULL
    AND c.status_cobranca <> 'cancelado'::status_cobranca;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_plans(uuid) TO anon, authenticated;

-- 4) Assinaturas de clube do cliente autenticado (com saldo)
CREATE OR REPLACE FUNCTION public.get_my_club_memberships(_company_id uuid)
RETURNS TABLE(
  id uuid, company_id uuid, club_plan_id uuid, plano_nome text,
  status text, creditos_restantes integer, creditos_mensais integer,
  current_period_end timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.id, m.company_id, m.club_plan_id, p.nome, m.status,
         m.creditos_restantes, p.creditos_mensais, m.current_period_end
  FROM public.club_member m
  JOIN public.club_plan p ON p.id = m.club_plan_id
  JOIN public.customer cu ON cu.id = m.customer_id
  WHERE cu.user_id = auth.uid()
    AND (_company_id IS NULL OR m.company_id = _company_id)
    AND m.status = 'ativo';
$$;

GRANT EXECUTE ON FUNCTION public.get_my_club_memberships(uuid) TO authenticated;

-- 5) Resgate de beneficio (valida dono + saldo, decrementa e registra)
CREATE OR REPLACE FUNCTION public.redeem_club_benefit(_club_member_id uuid, _appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _m public.club_member;
  _a public.appointment;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO _m FROM public.club_member WHERE id = _club_member_id FOR UPDATE;
  IF _m.id IS NULL THEN RAISE EXCEPTION 'Assinatura do clube não encontrada'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customer c
     WHERE c.id = _m.customer_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Esta assinatura não pertence a você';
  END IF;

  IF _m.status <> 'ativo' THEN RAISE EXCEPTION 'Assinatura do clube inativa'; END IF;
  IF _m.creditos_restantes <= 0 THEN RAISE EXCEPTION 'Sem saldo disponível no clube'; END IF;

  SELECT * INTO _a FROM public.appointment WHERE id = _appointment_id;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Agendamento não encontrado'; END IF;
  IF _a.company_id <> _m.company_id THEN RAISE EXCEPTION 'Agendamento de outra barbearia'; END IF;
  IF _a.club_member_id IS NOT NULL THEN RETURN true; END IF;

  UPDATE public.club_member
     SET creditos_restantes = creditos_restantes - 1, updated_at = now()
   WHERE id = _club_member_id;

  UPDATE public.appointment
     SET club_member_id = _club_member_id, pagamento_tipo = 'clube', price = 0
   WHERE id = _appointment_id;

  INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
  VALUES (_m.company_id, _club_member_id, _appointment_id, 1, 'uso');

  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_club_benefit(uuid, uuid) TO authenticated;

-- 6) Devolucao automatica do credito ao cancelar
CREATE OR REPLACE FUNCTION public.restore_club_credit_on_cancel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.club_member_id IS NOT NULL
     AND NEW.status IN ('cancelado','nao_compareceu')
     AND OLD.status NOT IN ('cancelado','nao_compareceu') THEN
    UPDATE public.club_member
       SET creditos_restantes = creditos_restantes + 1, updated_at = now()
     WHERE id = NEW.club_member_id;

    INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
    VALUES (NEW.company_id, NEW.club_member_id, NEW.id, 1, 'devolucao');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_restore_club_credit ON public.appointment;
CREATE TRIGGER trg_restore_club_credit
  AFTER UPDATE OF status ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.restore_club_credit_on_cancel();