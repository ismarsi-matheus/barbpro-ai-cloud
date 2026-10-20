-- =====================================================================
-- Endurecimento multi-tenant (auditoria S-04, S-05, S-09, S-10)
-- =====================================================================

-- ---------------------------------------------------------------------
-- S-04: dados públicos de barbearia/profissional só por RPC com colunas
-- seguras. Antes, anon e qualquer usuário logado liam CPF/CNPJ, e-mail,
-- cobrança da barbearia e comissões dos profissionais.
-- ---------------------------------------------------------------------

-- Helper SECURITY DEFINER: as policies públicas não precisam mais ler
-- `company` com os privilégios de quem consulta.
CREATE OR REPLACE FUNCTION public.is_public_company(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = _company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  )
$$;
REVOKE ALL ON FUNCTION public.is_public_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_company(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_company(_slug text)
RETURNS TABLE (
  id uuid, name text, nome_fantasia text, slug text, logo_url text,
  primary_color text, whatsapp text, endereco jsonb, business_hours jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.nome_fantasia, c.slug, c.logo_url,
         c.primary_color, c.whatsapp, c.endereco, c.business_hours
  FROM public.company c
  WHERE c.slug = _slug
    AND c.status_cobranca <> 'cancelado'::status_cobranca
$$;
REVOKE ALL ON FUNCTION public.get_public_company(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_company(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_professionals(_company_id uuid)
RETURNS TABLE (id uuid, name text, specialty text, photo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.specialty, p.photo_url
  FROM public.professional p
  WHERE p.company_id = _company_id
    AND p.active = true
    AND public.is_public_company(_company_id)
  ORDER BY p.name
$$;
REVOKE ALL ON FUNCTION public.get_public_professionals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_professionals(uuid) TO anon, authenticated;

-- company / professional / professional_service: sem leitura pública direta.
DROP POLICY IF EXISTS "public reads company by slug" ON public.company;
DROP POLICY IF EXISTS "public reads active professionals" ON public.professional;
DROP POLICY IF EXISTS "public reads prof_service" ON public.professional_service;
REVOKE SELECT ON public.company FROM anon;
REVOKE SELECT ON public.professional FROM anon;
REVOKE SELECT ON public.professional_service FROM anon;

-- Policies públicas que continuam (serviços e agenda) passam a usar o helper.
DROP POLICY IF EXISTS "public reads active services" ON public.service;
CREATE POLICY "public reads active services" ON public.service
  FOR SELECT USING (active = true AND public.is_public_company(company_id));

DROP POLICY IF EXISTS "public reads service_category" ON public.service_category;
CREATE POLICY "public reads service_category" ON public.service_category
  FOR SELECT USING (active = true AND public.is_public_company(company_id));

DROP POLICY IF EXISTS "schedule public read" ON public.professional_schedule;
CREATE POLICY "schedule public read" ON public.professional_schedule
  FOR SELECT TO anon, authenticated USING (public.is_public_company(company_id));

DROP POLICY IF EXISTS "block public read" ON public.professional_block;
CREATE POLICY "block public read" ON public.professional_block
  FOR SELECT TO anon, authenticated USING (public.is_public_company(company_id));

-- ---------------------------------------------------------------------
-- S-05: papéis e cobrança. Antes, qualquer membro (inclusive barbeiro)
-- podia virar owner, desativar o dono e mudar plano/status de cobrança.
-- ---------------------------------------------------------------------

-- company_user: escrita direta só para super admin, para o próprio
-- usuário (campos não sensíveis, ver trigger) e para o primeiro owner
-- no onboarding. Gestão de equipe passa pelas server functions.
DROP POLICY IF EXISTS "members manage company_user" ON public.company_user;

DROP POLICY IF EXISTS "super admin manages company_user" ON public.company_user;
CREATE POLICY "super admin manages company_user" ON public.company_user
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "user updates own company_user" ON public.company_user;
CREATE POLICY "user updates own company_user" ON public.company_user
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "creator becomes first owner" ON public.company_user;
CREATE POLICY "creator becomes first owner" ON public.company_user
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = company_id AND c.created_by = auth.uid())
  );

-- SECURITY INVOKER de propósito: current_user precisa ser o papel de quem
-- chamou (authenticated = navegador; service_role/dono = servidor e RPCs).
CREATE OR REPLACE FUNCTION public.guard_company_user_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- Server functions (service_role) e funções SECURITY DEFINER não passam aqui.
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.company_user cu WHERE cu.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Esta barbearia já tem dono. Use a tela de Equipe.';
    END IF;
    NEW.ativo := true;
    RETURN NEW;
  END IF;

  -- UPDATE do próprio registro: só campos não sensíveis.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Alteração de papel ou acesso só pela tela de Equipe.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_company_user_write ON public.company_user;
CREATE TRIGGER trg_guard_company_user_write
  BEFORE INSERT OR UPDATE ON public.company_user
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_user_write();

-- company: só owner/admin editam; criação direta só para quem ainda não
-- tem barbearia; colunas de cobrança só mudam pelo servidor/super admin.
DROP POLICY IF EXISTS "owners update company" ON public.company;
CREATE POLICY "owners update company" ON public.company
  FOR UPDATE USING (public.is_super_admin() OR public.has_company_role(id, ARRAY['owner','admin']))
  WITH CHECK (public.is_super_admin() OR public.has_company_role(id, ARRAY['owner','admin']));

-- SECURITY INVOKER de propósito: current_user precisa ser o papel de quem
-- chamou (authenticated = navegador; service_role/dono = servidor e RPCs).
CREATE OR REPLACE FUNCTION public.guard_company_billing()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.company c WHERE c.created_by = auth.uid())
       OR EXISTS (SELECT 1 FROM public.company_user cu WHERE cu.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Você já tem uma barbearia cadastrada.';
    END IF;
    NEW.created_by := auth.uid();
    NEW.status_cobranca := 'trial';
    NEW.trial_ate := (CURRENT_DATE + INTERVAL '14 days')::date;
    NEW.plano := 'starter';
    NEW.valor_mensal := 39;
    NEW.proximo_vencimento := NULL;
    NEW.selected_plan_slug := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE direto do navegador: campos de cobrança ficam como estavam.
  NEW.plano := OLD.plano;
  NEW.status_cobranca := OLD.status_cobranca;
  NEW.trial_ate := OLD.trial_ate;
  NEW.valor_mensal := OLD.valor_mensal;
  NEW.proximo_vencimento := OLD.proximo_vencimento;
  NEW.selected_plan_slug := OLD.selected_plan_slug;
  NEW.ciclo := OLD.ciclo;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_company_billing ON public.company;
CREATE TRIGGER trg_guard_company_billing
  BEFORE INSERT OR UPDATE ON public.company
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_billing();

-- subscription: só servidor e super admin escrevem.
DROP POLICY IF EXISTS subscription_update_owner ON public.subscription;

-- invoice_simulated: membros só leem.
DROP POLICY IF EXISTS "members manage invoice_simulated" ON public.invoice_simulated;
DROP POLICY IF EXISTS "members read invoice_simulated" ON public.invoice_simulated;
CREATE POLICY "members read invoice_simulated" ON public.invoice_simulated
  FOR SELECT USING (public.has_company_access(company_id));
DROP POLICY IF EXISTS "super admin manages invoice_simulated" ON public.invoice_simulated;
CREATE POLICY "super admin manages invoice_simulated" ON public.invoice_simulated
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------
-- S-09: RPCs de cobrança só para o servidor (service_role).
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_stripe_customer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_active_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_subscription_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_webhook_processed(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_stripe_subscription(
  uuid, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, boolean, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trial_identity_conflict(text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_stripe_customer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_subscription_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_processed(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_stripe_subscription(
  uuid, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, boolean, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION public.trial_identity_conflict(text, text, text) TO service_role;

-- ---------------------------------------------------------------------
-- S-10: close_sale só mexe em dados da própria barbearia.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_sale(_sale_id uuid, _forma_pagamento text DEFAULT NULL, _desconto_cents integer DEFAULT NULL)
RETURNS public.sale
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.sale; _total integer := 0; _item RECORD; _pct numeric;
  _existing uuid; _amount numeric; _svc_count integer := 0;
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT * INTO s FROM public.sale WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF NOT public.has_company_access(s.company_id) THEN RAISE EXCEPTION 'Sem acesso a esta comanda'; END IF;
  IF s.status = 'fechada' THEN RETURN s; END IF;
  IF s.status = 'cancelada' THEN RAISE EXCEPTION 'Comanda cancelada'; END IF;

  IF s.appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointment a WHERE a.id = s.appointment_id AND a.company_id = s.company_id
  ) THEN
    RAISE EXCEPTION 'Agendamento não pertence a esta barbearia';
  END IF;
  IF s.customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.customer c WHERE c.id = s.customer_id AND c.company_id = s.company_id
  ) THEN
    RAISE EXCEPTION 'Cliente não pertence a esta barbearia';
  END IF;

  FOR _item IN SELECT * FROM public.sale_item WHERE sale_id = _sale_id LOOP
    IF _item.professional_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.professional p WHERE p.id = _item.professional_id AND p.company_id = s.company_id
    ) THEN
      RAISE EXCEPTION 'Profissional não pertence a esta barbearia';
    END IF;

    _pct := NULL;
    IF _item.tipo = 'servico' AND _item.professional_id IS NOT NULL AND _item.ref_id IS NOT NULL THEN
      SELECT ps.comissao_percentual INTO _pct FROM public.professional_service ps
        JOIN public.service sv ON sv.id = ps.service_id AND sv.company_id = s.company_id
        WHERE ps.professional_id = _item.professional_id AND ps.service_id = _item.ref_id;
    END IF;
    IF _pct IS NULL AND _item.professional_id IS NOT NULL THEN
      SELECT comissao_percentual INTO _pct FROM public.professional
        WHERE id = _item.professional_id AND company_id = s.company_id;
    END IF;
    _pct := COALESCE(_pct, 0);
    UPDATE public.sale_item
      SET comissao_percentual = _pct,
          comissao_cents = floor((_item.preco_cents * _item.quantidade) * _pct / 100)::int
      WHERE id = _item.id;
    _total := _total + _item.preco_cents * _item.quantidade;
    IF _item.tipo = 'produto' AND _item.ref_id IS NOT NULL THEN
      UPDATE public.product SET estoque = GREATEST(0, estoque - _item.quantidade)
        WHERE id = _item.ref_id AND company_id = s.company_id AND estoque IS NOT NULL;
    END IF;
    IF _item.tipo = 'servico' THEN _svc_count := _svc_count + _item.quantidade; END IF;
  END LOOP;

  _total := GREATEST(0, _total - COALESCE(_desconto_cents, s.desconto_cents, 0));
  UPDATE public.sale
    SET status='fechada', closed_at=now(), total_cents=_total,
        desconto_cents = COALESCE(_desconto_cents, desconto_cents),
        forma_pagamento = COALESCE(_forma_pagamento, forma_pagamento)
    WHERE id = _sale_id RETURNING * INTO s;

  SELECT id INTO _existing FROM public.financial_entry
    WHERE company_id = s.company_id AND category = 'sale:' || s.id::text LIMIT 1;
  _amount := (s.total_cents::numeric)/100;
  IF _existing IS NULL THEN
    INSERT INTO public.financial_entry (company_id, type, status, amount, date, description, category, reference_appointment_id)
      VALUES (s.company_id, 'entrada'::financial_type, 'confirmado'::financial_status, _amount, _today,
              'Comanda ' || COALESCE(s.forma_pagamento,''), 'sale:' || s.id::text, s.appointment_id);
  ELSE
    UPDATE public.financial_entry
      SET amount=_amount, date=_today,
          description='Comanda ' || COALESCE(s.forma_pagamento,''),
          reference_appointment_id = s.appointment_id WHERE id=_existing;
  END IF;

  IF s.appointment_id IS NOT NULL THEN
    UPDATE public.appointment SET status='concluido'::appointment_status, completed_at=now()
      WHERE id = s.appointment_id AND company_id = s.company_id
        AND status <> 'concluido'::appointment_status;
  END IF;

  IF s.customer_id IS NOT NULL AND _svc_count > 0 THEN
    UPDATE public.customer SET fidelidade_contador = fidelidade_contador + _svc_count
      WHERE id = s.customer_id AND company_id = s.company_id
        AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = s.company_id AND c.fidelidade_ativa);
  END IF;

  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.close_sale(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_sale(uuid, text, integer) TO authenticated;
