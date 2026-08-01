-- 1) Saldo nunca negativo
ALTER TABLE public.club_member
  DROP CONSTRAINT IF EXISTS club_member_creditos_nao_negativo;
ALTER TABLE public.club_member
  ADD CONSTRAINT club_member_creditos_nao_negativo CHECK (creditos_restantes >= 0);

-- 2) Benefício não pode ser usado duas vezes no mesmo agendamento
CREATE UNIQUE INDEX IF NOT EXISTS club_benefit_usage_uso_unico
  ON public.club_benefit_usage (appointment_id)
  WHERE movimento = 'uso' AND appointment_id IS NOT NULL;

-- 3) redeem com validação de vencimento
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
     SET creditos_restantes = creditos_restantes - 1, updated_at = now()
   WHERE id = _club_member_id;

  UPDATE public.appointment
     SET club_member_id = _club_member_id, pagamento_tipo = 'clube', price = 0
   WHERE id = _appointment_id;

  INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
  VALUES (_m.company_id, _club_member_id, _appointment_id, 1, 'uso');

  RETURN true;
END $function$;

-- 4) Agendamentos do cliente com dados do clube
DROP FUNCTION IF EXISTS public.get_client_appointments();
CREATE OR REPLACE FUNCTION public.get_client_appointments()
 RETURNS TABLE(id uuid, scheduled_at timestamp with time zone, status appointment_status, price numeric,
   service_name text, professional_name text, company_id uuid, company_name text, company_slug text,
   duration_minutes integer, pagamento_tipo text, club_plan_nome text, club_creditos_restantes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.scheduled_at, a.status, a.price,
         COALESCE(a.service_name, s.name),
         COALESCE(a.professional_name, p.name),
         co.id, COALESCE(co.nome_fantasia, co.name), co.slug,
         COALESCE(s.duration_minutes, 30),
         a.pagamento_tipo,
         cp.nome,
         cm.creditos_restantes
  FROM public.appointment a
  JOIN public.customer c ON c.id = a.customer_id
  JOIN public.company co ON co.id = a.company_id
  LEFT JOIN public.service s ON s.id = a.service_id
  LEFT JOIN public.professional p ON p.id = a.professional_id
  LEFT JOIN public.club_member cm ON cm.id = a.club_member_id
  LEFT JOIN public.club_plan cp ON cp.id = cm.club_plan_id
  WHERE c.user_id = auth.uid()
  ORDER BY a.scheduled_at DESC;
$function$;

-- 5) Memberships do cliente: incluir vencidas/sem saldo para exibição correta
CREATE OR REPLACE FUNCTION public.get_my_club_memberships(_company_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, club_plan_id uuid, plano_nome text, status text,
   creditos_restantes integer, creditos_mensais integer, current_period_end timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.id, m.company_id, m.club_plan_id, p.nome, m.status,
         m.creditos_restantes, p.creditos_mensais, m.current_period_end
  FROM public.club_member m
  JOIN public.club_plan p ON p.id = m.club_plan_id
  JOIN public.customer cu ON cu.id = m.customer_id
  WHERE cu.user_id = auth.uid()
    AND (_company_id IS NULL OR m.company_id = _company_id)
  ORDER BY (m.status = 'ativo') DESC, m.updated_at DESC;
$function$;