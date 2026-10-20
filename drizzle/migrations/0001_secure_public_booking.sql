-- =====================================================================
-- Agendamento público transacional (auditoria S-02 / S-03 / B-01 / B-03)
--
-- Antes: o navegador inseria direto em `appointment` e escolhia preço,
-- status, club_member_id e confirm_token. Isso permitia agendamento grátis,
-- "concluído" falso e créditos do Clube infinitos (insert + cancel).
-- Agora: o agendamento público só nasce pela RPC `create_public_booking`,
-- que deriva tudo no servidor e aplica o Clube na mesma transação.
-- =====================================================================

-- 1) Fecha o INSERT direto de anon/clientes em appointment e customer.
--    A equipe da barbearia continua inserindo pelas policies de membro.
DROP POLICY IF EXISTS "public creates appointment for booking" ON public.appointment;
DROP POLICY IF EXISTS "public creates customer for booking" ON public.customer;
REVOKE INSERT ON public.appointment FROM anon;
REVOKE INSERT ON public.customer FROM anon;

-- 2) S-03: nunca religar um cliente que já pertence a outra conta.
--    Só vincula por telefone um cadastro ainda sem dono (user_id IS NULL).
CREATE OR REPLACE FUNCTION public.upsert_customer_for_user(
  _company_id uuid,
  _name text,
  _phone text,
  _email text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = _company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  ) THEN
    RAISE EXCEPTION 'Empresa inválida';
  END IF;

  IF _phone IS NULL OR length(trim(_phone)) < 6 THEN
    RAISE EXCEPTION 'Telefone obrigatório';
  END IF;

  -- Preferir customer já vinculado a este user nesta empresa
  SELECT id INTO _id FROM public.customer
   WHERE company_id = _company_id AND user_id = _uid
   ORDER BY created_at ASC LIMIT 1;

  IF _id IS NULL THEN
    -- Reaproveita por telefone apenas cadastro sem dono
    SELECT id INTO _id FROM public.customer
     WHERE company_id = _company_id AND phone = _phone AND user_id IS NULL
     ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF _id IS NOT NULL THEN
    UPDATE public.customer
       SET user_id = _uid,
           name = COALESCE(NULLIF(trim(_name), ''), name),
           email = COALESCE(_email, email),
           phone = _phone
     WHERE id = _id;
    RETURN _id;
  END IF;

  INSERT INTO public.customer (company_id, name, phone, email, user_id)
  VALUES (_company_id, COALESCE(NULLIF(trim(_name), ''), 'Cliente'), _phone, _email, _uid)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.upsert_customer_for_user(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_customer_for_user(uuid, text, text, text) TO authenticated;

-- 3) B-01: serializa reservas por profissional para fechar a corrida entre
--    dois INSERTs simultâneos (o COUNT(*) sozinho não enxerga o outro).
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _duration int;
  _end timestamptz;
  _conflict int;
BEGIN
  IF NEW.status IN ('cancelado','nao_compareceu') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('appointment:' || NEW.professional_id::text, 0));

  SELECT duration_minutes INTO _duration FROM public.service WHERE id = NEW.service_id;
  IF _duration IS NULL THEN _duration := 30; END IF;
  _end := NEW.scheduled_at + (_duration || ' minutes')::interval;

  SELECT COUNT(*) INTO _conflict
  FROM public.appointment a
  LEFT JOIN public.service s ON s.id = a.service_id
  WHERE a.professional_id = NEW.professional_id
    AND a.company_id = NEW.company_id
    AND a.status NOT IN ('cancelado','nao_compareceu')
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id)
    AND tstzrange(
          a.scheduled_at,
          a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::interval,
          '[)'
        ) && tstzrange(NEW.scheduled_at, _end, '[)');

  IF _conflict > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Esse horário acabou de ser reservado, escolha outro';
  END IF;

  RETURN NEW;
END $$;

-- 4) Devolução de crédito do Clube só quando houve consumo real, uma única
--    vez, no período vigente, e apenas em cancelamento (falta não devolve).
CREATE OR REPLACE FUNCTION public.restore_club_credit_on_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uso_at timestamptz;
  _period_start timestamptz;
BEGIN
  IF NEW.club_member_id IS NULL
     OR NEW.status <> 'cancelado'
     OR OLD.status IN ('cancelado','nao_compareceu','concluido') THEN
    RETURN NEW;
  END IF;

  SELECT u.created_at INTO _uso_at
    FROM public.club_benefit_usage u
   WHERE u.appointment_id = NEW.id
     AND u.club_member_id = NEW.club_member_id
     AND u.movimento = 'uso'
   LIMIT 1;
  IF _uso_at IS NULL THEN
    RETURN NEW;  -- nunca consumiu crédito: nada a devolver
  END IF;

  IF EXISTS (SELECT 1 FROM public.club_benefit_usage u
              WHERE u.appointment_id = NEW.id AND u.movimento = 'devolucao') THEN
    RETURN NEW;  -- já devolvido
  END IF;

  SELECT current_period_start INTO _period_start
    FROM public.club_member WHERE id = NEW.club_member_id FOR UPDATE;
  IF _period_start IS NOT NULL AND _uso_at < _period_start THEN
    RETURN NEW;  -- crédito de período anterior; a renovação já recarregou
  END IF;

  UPDATE public.club_member
     SET creditos_restantes = creditos_restantes + 1,
         beneficios_utilizados = GREATEST(0, beneficios_utilizados - 1),
         updated_at = now()
   WHERE id = NEW.club_member_id;

  INSERT INTO public.club_benefit_usage (company_id, club_member_id, appointment_id, quantidade, movimento)
  VALUES (NEW.company_id, NEW.club_member_id, NEW.id, 1, 'devolucao');
  RETURN NEW;
END $function$;

-- 5) Cancelamento só para agendamentos futuros.
CREATE OR REPLACE FUNCTION public.cancel_client_appointment(_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.appointment a
     SET status = 'cancelado'::appointment_status
   WHERE a.id = _appointment_id
     AND a.status NOT IN ('cancelado','concluido','nao_compareceu')
     AND a.scheduled_at > now()
     AND EXISTS (
       SELECT 1 FROM public.customer c
        WHERE c.id = a.customer_id AND c.user_id = auth.uid()
     );
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END $$;

REVOKE ALL ON FUNCTION public.cancel_client_appointment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_client_appointment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _status appointment_status; _at timestamptz;
BEGIN
  SELECT id, status, scheduled_at INTO _id, _status, _at FROM public.appointment WHERE confirm_token = _token;
  IF _id IS NULL THEN RETURN false; END IF;
  IF _status IN ('cancelado','concluido','nao_compareceu') THEN RETURN false; END IF;
  IF _at <= now() THEN RETURN false; END IF;
  UPDATE public.appointment SET status='cancelado' WHERE id = _id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.cancel_appointment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_token(text) TO anon, authenticated;

-- 6) RPC única do agendamento público.
CREATE OR REPLACE FUNCTION public.create_public_booking(
  _company_id uuid,
  _service_id uuid,
  _professional_id uuid,
  _scheduled_at timestamptz,
  _name text,
  _phone text,
  _email text DEFAULT NULL,
  _club_member_id uuid DEFAULT NULL
) RETURNS TABLE (appointment_id uuid, pagamento_tipo text, club_error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _svc public.service;
  _pro public.professional;
  _customer_id uuid;
  _appointment_id uuid;
  _email_clean text := NULLIF(lower(trim(COALESCE(_email, ''))), '');
  _pagamento text := 'normal';
  _club_error text := NULL;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = _company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  ) THEN
    RAISE EXCEPTION 'Barbearia indisponível para agendamento';
  END IF;

  SELECT * INTO _svc FROM public.service
   WHERE id = _service_id AND company_id = _company_id AND active = true;
  IF _svc.id IS NULL THEN RAISE EXCEPTION 'Serviço indisponível'; END IF;

  SELECT * INTO _pro FROM public.professional
   WHERE id = _professional_id AND company_id = _company_id AND active = true;
  IF _pro.id IS NULL THEN RAISE EXCEPTION 'Profissional indisponível'; END IF;

  IF _scheduled_at IS NULL OR _scheduled_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Escolha um horário futuro';
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Informe seu nome';
  END IF;
  IF _email_clean IS NOT NULL AND _email_clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    _customer_id := public.upsert_customer_for_user(_company_id, _name, _phone, _email_clean);
  ELSE
    _customer_id := public.upsert_customer_public(_company_id, _name, _phone);
    -- Guarda o e-mail do visitante para a confirmação, sem sobrescrever um existente
    IF _email_clean IS NOT NULL THEN
      UPDATE public.customer SET email = _email_clean
       WHERE id = _customer_id AND email IS NULL;
    END IF;
  END IF;

  INSERT INTO public.appointment (
    company_id, customer_id, professional_id, service_id,
    customer_name, customer_phone, professional_name, service_name,
    price, scheduled_at, source, status, pagamento_tipo
  ) VALUES (
    _company_id, _customer_id, _pro.id, _svc.id,
    trim(_name), trim(_phone), _pro.name, _svc.name,
    _svc.price, _scheduled_at, 'online', 'agendado', 'normal'
  )
  RETURNING id INTO _appointment_id;

  IF _club_member_id IS NOT NULL THEN
    BEGIN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Entre na sua conta para usar o Clube';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.club_member m
                      WHERE m.id = _club_member_id AND m.customer_id = _customer_id) THEN
        RAISE EXCEPTION 'Esta assinatura do Clube não pertence a este cadastro';
      END IF;
      PERFORM public.redeem_club_benefit(_club_member_id, _appointment_id);
      _pagamento := 'clube';
    EXCEPTION WHEN OTHERS THEN
      -- Subtransação desfeita: o agendamento segue como pagamento normal.
      _club_error := SQLERRM;
      _pagamento := 'normal';
    END;
  END IF;

  RETURN QUERY SELECT _appointment_id, _pagamento, _club_error;
END $$;

REVOKE ALL ON FUNCTION public.create_public_booking(uuid, uuid, uuid, timestamptz, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(uuid, uuid, uuid, timestamptz, text, text, text, uuid) TO anon, authenticated;