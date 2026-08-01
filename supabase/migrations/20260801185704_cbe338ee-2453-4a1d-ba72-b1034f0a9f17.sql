ALTER TABLE public.club_member
  ADD COLUMN IF NOT EXISTS beneficios_utilizados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_provisioned_period timestamptz;

ALTER TABLE public.club_member DROP CONSTRAINT IF EXISTS club_member_status_check;
ALTER TABLE public.club_member ADD CONSTRAINT club_member_status_check
  CHECK (status = ANY (ARRAY['ativo'::text,'cancelado'::text,'expirado'::text]));

ALTER TABLE public.club_member DROP CONSTRAINT IF EXISTS club_member_utilizados_nao_negativo;
ALTER TABLE public.club_member ADD CONSTRAINT club_member_utilizados_nao_negativo
  CHECK (beneficios_utilizados >= 0);

CREATE OR REPLACE FUNCTION public.redeem_club_benefit(_club_member_id uuid, _appointment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF _m.current_period_end IS NOT NULL AND _m.current_period_end < now() THEN
    RAISE EXCEPTION 'Assinatura do clube vencida';
  END IF;
  IF _m.creditos_restantes <= 0 THEN RAISE EXCEPTION 'Sem saldo disponível no clube'; END IF;

  SELECT * INTO _a FROM public.appointment WHERE id = _appointment_id;
  IF _a.id IS NULL THEN RAISE EXCEPTION 'Agendamento não encontrado'; END IF;
  IF _a.company_id <> _m.company_id THEN RAISE EXCEPTION 'Agendamento de outra barbearia'; END IF;
  IF _a.club_member_id IS NOT NULL AND _a.pagamento_tipo = 'clube'
     AND EXISTS (SELECT 1 FROM public.club_benefit_usage u
                  WHERE u.appointment_id = _appointment_id AND u.movimento = 'uso') THEN
    RETURN true;
  END IF;

  UPDATE public.club_member
     SET creditos_restantes = creditos_restantes - 1,
         beneficios_utilizados = beneficios_utilizados + 1,
         updated_at = now()
   WHERE id = _club_member_id;

  UPDATE public.appointment
     SET club_member_id = _club_member_id, pagamento_tipo = 'clube', price = 0
   WHERE id = _appointment_id;

  INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
  VALUES (_m.company_id, _club_member_id, _appointment_id, 1, 'uso');

  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.restore_club_credit_on_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.club_member_id IS NOT NULL
     AND NEW.status IN ('cancelado','nao_compareceu')
     AND OLD.status NOT IN ('cancelado','nao_compareceu') THEN
    UPDATE public.club_member
       SET creditos_restantes = creditos_restantes + 1,
           beneficios_utilizados = GREATEST(0, beneficios_utilizados - 1),
           updated_at = now()
     WHERE id = NEW.club_member_id;

    INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
    VALUES (NEW.company_id, NEW.club_member_id, NEW.id, 1, 'devolucao');
  END IF;
  RETURN NEW;
END $function$;

DROP FUNCTION IF EXISTS public.get_my_club_memberships(uuid);
CREATE FUNCTION public.get_my_club_memberships(_company_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, club_plan_id uuid, plano_nome text, status text, creditos_restantes integer, creditos_mensais integer, beneficios_utilizados integer, cancel_at_period_end boolean, current_period_end timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.company_id, m.club_plan_id, p.nome, m.status,
         m.creditos_restantes, p.creditos_mensais, m.beneficios_utilizados,
         m.cancel_at_period_end, m.current_period_end
  FROM public.club_member m
  JOIN public.club_plan p ON p.id = m.club_plan_id
  JOIN public.customer cu ON cu.id = m.customer_id
  WHERE cu.user_id = auth.uid()
    AND (_company_id IS NULL OR m.company_id = _company_id)
  ORDER BY (m.status = 'ativo') DESC, m.updated_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
           m.beneficios_utilizados, m.cancel_at_period_end,
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
END $function$;