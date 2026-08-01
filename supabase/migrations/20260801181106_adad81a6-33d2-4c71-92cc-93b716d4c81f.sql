-- ============================================================
-- ÁREA DO CLIENTE — infraestrutura completa
-- ============================================================

-- 1) Preferências no perfil do cliente
ALTER TABLE public.client_profile
  ADD COLUMN IF NOT EXISTS favorite_company_id uuid REFERENCES public.company(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_professional_id uuid REFERENCES public.professional(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_service_id uuid REFERENCES public.service(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notifications jsonb NOT NULL DEFAULT '{"email":true,"whatsapp":true,"lembretes":true,"promocoes":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'pt-BR';

-- 2) Avaliações de atendimento
CREATE TABLE IF NOT EXISTS public.appointment_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointment(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_review_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT appointment_review_unique UNIQUE (appointment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_review TO authenticated;
GRANT ALL ON public.appointment_review TO service_role;

ALTER TABLE public.appointment_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente gerencia suas avaliacoes"
  ON public.appointment_review FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Barbearia le avaliacoes da empresa"
  ON public.appointment_review FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

CREATE TRIGGER update_appointment_review_updated_at
  BEFORE UPDATE ON public.appointment_review
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Pagamentos do cliente (Clube / assinaturas / cobranças)
CREATE TABLE IF NOT EXISTS public.client_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.company(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
  club_member_id uuid REFERENCES public.club_member(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'stripe',
  external_id text,
  descricao text NOT NULL DEFAULT 'Cobrança',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'processando',
  metodo text,
  card_brand text,
  card_last4 text,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_payment_status_check
    CHECK (status IN ('pago','falhou','estornado','processando'))
);

GRANT SELECT ON public.client_payment TO authenticated;
GRANT ALL ON public.client_payment TO service_role;

ALTER TABLE public.client_payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente le seus pagamentos"
  ON public.client_payment FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Barbearia le pagamentos da empresa"
  ON public.client_payment FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE TRIGGER update_client_payment_updated_at
  BEFORE UPDATE ON public.client_payment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_customer_user_id ON public.customer(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_customer_sched ON public.appointment(customer_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_company_sched ON public.appointment(company_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_member_customer ON public.club_member(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_club_benefit_usage_member ON public.club_benefit_usage(club_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_payment_user ON public.client_payment(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_review_company ON public.appointment_review(company_id, created_at DESC);

-- 5) Agendamentos do cliente (versão completa)
DROP FUNCTION IF EXISTS public.get_client_appointments();
CREATE OR REPLACE FUNCTION public.get_client_appointments()
RETURNS TABLE(
  id uuid,
  scheduled_at timestamptz,
  status appointment_status,
  price numeric,
  notes text,
  pagamento_tipo text,
  club_member_id uuid,
  club_plano_nome text,
  club_creditos_restantes integer,
  service_id uuid,
  service_name text,
  duration_minutes integer,
  professional_id uuid,
  professional_name text,
  company_id uuid,
  company_name text,
  company_slug text,
  company_endereco jsonb,
  company_whatsapp text,
  company_telefone text,
  rating smallint,
  review_comment text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.id, a.scheduled_at, a.status, a.price, a.notes,
         a.pagamento_tipo, a.club_member_id,
         cp.nome, cm.creditos_restantes,
         a.service_id, COALESCE(a.service_name, s.name), COALESCE(s.duration_minutes, 30),
         a.professional_id, COALESCE(a.professional_name, p.name),
         co.id, COALESCE(co.nome_fantasia, co.name), co.slug,
         co.endereco, co.whatsapp, co.telefone_comercial,
         r.rating, r.comment
  FROM public.appointment a
  JOIN public.customer c ON c.id = a.customer_id
  JOIN public.company co ON co.id = a.company_id
  LEFT JOIN public.service s ON s.id = a.service_id
  LEFT JOIN public.professional p ON p.id = a.professional_id
  LEFT JOIN public.club_member cm ON cm.id = a.club_member_id
  LEFT JOIN public.club_plan cp ON cp.id = cm.club_plan_id
  LEFT JOIN public.appointment_review r ON r.appointment_id = a.id
  WHERE c.user_id = auth.uid()
  ORDER BY a.scheduled_at DESC;
$$;

-- 6) Painel do cliente (resumo)
CREATE OR REPLACE FUNCTION public.get_client_dashboard()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _next jsonb;
  _last jsonb;
  _clubs jsonb;
  _payment jsonb;
  _stats jsonb;
  _profile jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT to_jsonb(x) INTO _next FROM (
    SELECT a.id, a.scheduled_at, a.status, a.price, a.pagamento_tipo,
           COALESCE(a.service_name, s.name) AS service_name,
           COALESCE(a.professional_name, p.name) AS professional_name,
           COALESCE(co.nome_fantasia, co.name) AS company_name,
           co.slug AS company_slug, co.endereco AS company_endereco,
           co.whatsapp AS company_whatsapp
      FROM public.appointment a
      JOIN public.customer c ON c.id = a.customer_id
      JOIN public.company co ON co.id = a.company_id
      LEFT JOIN public.service s ON s.id = a.service_id
      LEFT JOIN public.professional p ON p.id = a.professional_id
     WHERE c.user_id = _uid
       AND a.scheduled_at >= now()
       AND a.status NOT IN ('cancelado','nao_compareceu','concluido')
     ORDER BY a.scheduled_at ASC LIMIT 1
  ) x;

  SELECT to_jsonb(x) INTO _last FROM (
    SELECT a.id, a.scheduled_at,
           COALESCE(a.professional_name, p.name) AS professional_name,
           COALESCE(a.service_name, s.name) AS service_name,
           COALESCE(co.nome_fantasia, co.name) AS company_name
      FROM public.appointment a
      JOIN public.customer c ON c.id = a.customer_id
      JOIN public.company co ON co.id = a.company_id
      LEFT JOIN public.service s ON s.id = a.service_id
      LEFT JOIN public.professional p ON p.id = a.professional_id
     WHERE c.user_id = _uid AND a.status = 'concluido'
     ORDER BY a.scheduled_at DESC LIMIT 1
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO _clubs FROM (
    SELECT m.id, m.status, m.creditos_restantes, m.current_period_end,
           cp.nome AS plano_nome, cp.creditos_mensais, cp.preco_cents,
           m.company_id, COALESCE(co.nome_fantasia, co.name) AS company_name
      FROM public.club_member m
      JOIN public.customer c ON c.id = m.customer_id
      JOIN public.club_plan cp ON cp.id = m.club_plan_id
      JOIN public.company co ON co.id = m.company_id
     WHERE c.user_id = _uid
     ORDER BY (m.status = 'ativo') DESC, m.updated_at DESC
  ) x;

  SELECT to_jsonb(x) INTO _payment FROM (
    SELECT p.id, p.descricao, p.amount_cents, p.status, p.metodo,
           p.card_brand, p.card_last4, p.receipt_url, p.paid_at, p.created_at
      FROM public.client_payment p
     WHERE p.user_id = _uid
     ORDER BY COALESCE(p.paid_at, p.created_at) DESC LIMIT 1
  ) x;

  SELECT to_jsonb(x) INTO _stats FROM (
    SELECT COUNT(*) FILTER (WHERE a.status = 'concluido') AS visitas,
           COALESCE(SUM(a.price) FILTER (WHERE a.status = 'concluido'), 0) AS total_gasto
      FROM public.appointment a
      JOIN public.customer c ON c.id = a.customer_id
     WHERE c.user_id = _uid
  ) x;

  SELECT to_jsonb(x) INTO _profile FROM (
    SELECT cpf.full_name, cpf.photo_url, cpf.phone, cpf.email,
           cpf.favorite_company_id, cpf.favorite_professional_id, cpf.favorite_service_id,
           COALESCE(fc.nome_fantasia, fc.name) AS favorite_company_name,
           fc.slug AS favorite_company_slug,
           fp.name AS favorite_professional_name
      FROM public.client_profile cpf
      LEFT JOIN public.company fc ON fc.id = cpf.favorite_company_id
      LEFT JOIN public.professional fp ON fp.id = cpf.favorite_professional_id
     WHERE cpf.user_id = _uid
  ) x;

  RETURN jsonb_build_object(
    'profile', COALESCE(_profile, 'null'::jsonb),
    'next_appointment', COALESCE(_next, 'null'::jsonb),
    'last_appointment', COALESCE(_last, 'null'::jsonb),
    'club_memberships', _clubs,
    'last_payment', COALESCE(_payment, 'null'::jsonb),
    'stats', COALESCE(_stats, '{}'::jsonb)
  );
END $$;

-- 7) Extrato de uso do Clube
CREATE OR REPLACE FUNCTION public.get_my_club_usage(_club_member_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, created_at timestamptz, movimento text, quantidade integer,
  club_member_id uuid, plano_nome text, company_name text,
  appointment_id uuid, appointment_at timestamptz, service_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.id, u.created_at, u.movimento, u.quantidade,
         u.club_member_id, cp.nome, COALESCE(co.nome_fantasia, co.name),
         u.appointment_id, a.scheduled_at, COALESCE(a.service_name, s.name)
    FROM public.club_benefit_usage u
    JOIN public.club_member m ON m.id = u.club_member_id
    JOIN public.customer c ON c.id = m.customer_id
    JOIN public.club_plan cp ON cp.id = m.club_plan_id
    JOIN public.company co ON co.id = u.company_id
    LEFT JOIN public.appointment a ON a.id = u.appointment_id
    LEFT JOIN public.service s ON s.id = a.service_id
   WHERE c.user_id = auth.uid()
     AND (_club_member_id IS NULL OR u.club_member_id = _club_member_id)
   ORDER BY u.created_at DESC;
$$;

-- 8) Pagamentos do cliente
CREATE OR REPLACE FUNCTION public.get_my_payments()
RETURNS TABLE(
  id uuid, descricao text, amount_cents integer, status text, metodo text,
  card_brand text, card_last4 text, receipt_url text,
  paid_at timestamptz, created_at timestamptz, company_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.descricao, p.amount_cents, p.status, p.metodo,
         p.card_brand, p.card_last4, p.receipt_url, p.paid_at, p.created_at,
         COALESCE(co.nome_fantasia, co.name)
    FROM public.client_payment p
    LEFT JOIN public.company co ON co.id = p.company_id
   WHERE p.user_id = auth.uid()
   ORDER BY COALESCE(p.paid_at, p.created_at) DESC;
$$;

-- 9) Reagendamento pelo cliente
CREATE OR REPLACE FUNCTION public.reschedule_client_appointment(_appointment_id uuid, _new_at timestamptz)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _new_at <= now() THEN RAISE EXCEPTION 'Escolha um horário futuro'; END IF;

  UPDATE public.appointment a
     SET scheduled_at = _new_at,
         status = 'agendado'::appointment_status,
         confirmed_at = NULL
   WHERE a.id = _appointment_id
     AND a.status NOT IN ('cancelado','concluido','nao_compareceu')
     AND EXISTS (SELECT 1 FROM public.customer c WHERE c.id = a.customer_id AND c.user_id = auth.uid());

  GET DIAGNOSTICS _ok = ROW_COUNT;
  IF NOT _ok THEN RAISE EXCEPTION 'Agendamento não encontrado ou não pode ser reagendado'; END IF;
  RETURN true;
END $$;

-- 10) Insights do cliente para o painel da barbearia
CREATE OR REPLACE FUNCTION public.get_customer_insights(_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid;
  _res jsonb;
BEGIN
  SELECT company_id INTO _cid FROM public.customer WHERE id = _customer_id;
  IF _cid IS NULL THEN RETURN 'null'::jsonb; END IF;
  IF NOT public.has_company_access(_cid) THEN RAISE EXCEPTION 'Sem acesso a este cliente'; END IF;

  SELECT jsonb_build_object(
    'customer_id', _customer_id,
    'visitas', (SELECT COUNT(*) FROM public.appointment a WHERE a.customer_id = _customer_id AND a.status = 'concluido'),
    'agendamentos_total', (SELECT COUNT(*) FROM public.appointment a WHERE a.customer_id = _customer_id),
    'cancelamentos', (SELECT COUNT(*) FROM public.appointment a WHERE a.customer_id = _customer_id AND a.status IN ('cancelado','nao_compareceu')),
    'total_gasto', (SELECT COALESCE(SUM(s.total_cents),0)/100.0 FROM public.sale s WHERE s.customer_id = _customer_id AND s.status = 'fechada'),
    'ticket_medio', (SELECT COALESCE(AVG(s.total_cents),0)/100.0 FROM public.sale s WHERE s.customer_id = _customer_id AND s.status = 'fechada'),
    'ultimo_atendimento', (SELECT MAX(a.scheduled_at) FROM public.appointment a WHERE a.customer_id = _customer_id AND a.status = 'concluido'),
    'primeiro_atendimento', (SELECT MIN(a.scheduled_at) FROM public.appointment a WHERE a.customer_id = _customer_id AND a.status = 'concluido'),
    'club', (
      SELECT to_jsonb(y) FROM (
        SELECT m.id, m.status, m.creditos_restantes, m.current_period_end,
               p.nome AS plano_nome, p.creditos_mensais, p.preco_cents
          FROM public.club_member m
          JOIN public.club_plan p ON p.id = m.club_plan_id
         WHERE m.customer_id = _customer_id
         ORDER BY (m.status = 'ativo') DESC, m.updated_at DESC LIMIT 1
      ) y
    ),
    'historico', (
      SELECT COALESCE(jsonb_agg(to_jsonb(z)), '[]'::jsonb) FROM (
        SELECT a.id, a.scheduled_at, a.status, a.price, a.pagamento_tipo,
               COALESCE(a.service_name, sv.name) AS service_name,
               COALESCE(a.professional_name, pr.name) AS professional_name
          FROM public.appointment a
          LEFT JOIN public.service sv ON sv.id = a.service_id
          LEFT JOIN public.professional pr ON pr.id = a.professional_id
         WHERE a.customer_id = _customer_id
         ORDER BY a.scheduled_at DESC LIMIT 20
      ) z
    )
  ) INTO _res;

  RETURN _res;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_client_dashboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_club_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_payments() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reschedule_client_appointment(uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_insights(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_client_appointments() FROM anon;