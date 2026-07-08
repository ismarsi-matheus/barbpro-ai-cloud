
ALTER TABLE public.appointment
  ADD COLUMN IF NOT EXISTS confirm_token text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
UPDATE public.appointment SET confirm_token = replace(gen_random_uuid()::text, '-', '') WHERE confirm_token IS NULL;
ALTER TABLE public.appointment
  ALTER COLUMN confirm_token SET NOT NULL,
  ALTER COLUMN confirm_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_confirm_token ON public.appointment (confirm_token);

ALTER TABLE public.company
  ADD COLUMN IF NOT EXISTS fidelidade_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fidelidade_meta integer NOT NULL DEFAULT 10 CHECK (fidelidade_meta > 0),
  ADD COLUMN IF NOT EXISTS fidelidade_premio text;

ALTER TABLE public.customer
  ADD COLUMN IF NOT EXISTS fidelidade_contador integer NOT NULL DEFAULT 0 CHECK (fidelidade_contador >= 0);

CREATE TABLE IF NOT EXISTS public.club_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco_cents integer NOT NULL DEFAULT 0 CHECK (preco_cents >= 0),
  beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_plan TO authenticated;
GRANT ALL ON public.club_plan TO service_role;
ALTER TABLE public.club_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY club_plan_company_access_select ON public.club_plan
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY club_plan_company_access_modify ON public.club_plan
  FOR ALL TO authenticated USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));
CREATE INDEX IF NOT EXISTS idx_club_plan_company_ativo ON public.club_plan (company_id, ativo);
CREATE TRIGGER trg_club_plan_updated BEFORE UPDATE ON public.club_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.club_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
  club_plan_id uuid NOT NULL REFERENCES public.club_plan(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','cancelado')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_member TO authenticated;
GRANT ALL ON public.club_member TO service_role;
ALTER TABLE public.club_member ENABLE ROW LEVEL SECURITY;
CREATE POLICY club_member_company_access_select ON public.club_member
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY club_member_company_access_modify ON public.club_member
  FOR ALL TO authenticated USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));
CREATE INDEX IF NOT EXISTS idx_club_member_company_status ON public.club_member (company_id, status);
CREATE INDEX IF NOT EXISTS idx_club_member_customer ON public.club_member (customer_id);
CREATE TRIGGER trg_club_member_updated BEFORE UPDATE ON public.club_member
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_appointment_by_token(_token text)
RETURNS TABLE (
  id uuid, scheduled_at timestamptz, status appointment_status, confirmed_at timestamptz,
  service_name text, professional_name text, customer_name text,
  company_id uuid, company_nome text, company_primary_color text, company_telefone text, company_endereco text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.scheduled_at, a.status, a.confirmed_at,
         COALESCE(a.service_name, s.name),
         COALESCE(a.professional_name, p.name),
         a.customer_name,
         c.id, COALESCE(c.nome_fantasia, c.name), c.primary_color, c.telefone_comercial, c.endereco
  FROM public.appointment a
  JOIN public.company c ON c.id = a.company_id
  LEFT JOIN public.service s ON s.id = a.service_id
  LEFT JOIN public.professional p ON p.id = a.professional_id
  WHERE a.confirm_token = _token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_appointment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_appointment_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_appointment_by_token(_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _status appointment_status;
BEGIN
  SELECT id, status INTO _id, _status FROM public.appointment WHERE confirm_token = _token;
  IF _id IS NULL THEN RETURN false; END IF;
  IF _status IN ('cancelado','concluido','nao_compareceu') THEN RETURN false; END IF;
  UPDATE public.appointment SET status='confirmado', confirmed_at=now() WHERE id = _id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _status appointment_status;
BEGIN
  SELECT id, status INTO _id, _status FROM public.appointment WHERE confirm_token = _token;
  IF _id IS NULL THEN RETURN false; END IF;
  IF _status IN ('cancelado','concluido','nao_compareceu') THEN RETURN false; END IF;
  UPDATE public.appointment SET status='cancelado' WHERE id = _id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.confirm_appointment_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_appointment_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_appointment_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.close_sale(_sale_id uuid, _forma_pagamento text DEFAULT NULL, _desconto_cents integer DEFAULT NULL)
RETURNS public.sale
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.sale; _total integer := 0; _item RECORD; _pct numeric;
  _existing uuid; _amount numeric; _svc_count integer := 0;
BEGIN
  SELECT * INTO s FROM public.sale WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF NOT public.has_company_access(s.company_id) THEN RAISE EXCEPTION 'Sem acesso a esta comanda'; END IF;
  IF s.status = 'fechada' THEN RETURN s; END IF;
  IF s.status = 'cancelada' THEN RAISE EXCEPTION 'Comanda cancelada'; END IF;

  FOR _item IN SELECT * FROM public.sale_item WHERE sale_id = _sale_id LOOP
    _pct := NULL;
    IF _item.tipo = 'servico' AND _item.professional_id IS NOT NULL AND _item.ref_id IS NOT NULL THEN
      SELECT comissao_percentual INTO _pct FROM public.professional_service
        WHERE professional_id = _item.professional_id AND service_id = _item.ref_id;
    END IF;
    IF _pct IS NULL AND _item.professional_id IS NOT NULL THEN
      SELECT comissao_percentual INTO _pct FROM public.professional WHERE id = _item.professional_id;
    END IF;
    _pct := COALESCE(_pct, 0);
    UPDATE public.sale_item
      SET comissao_percentual = _pct,
          comissao_cents = floor((_item.preco_cents * _item.quantidade) * _pct / 100)::int
      WHERE id = _item.id;
    _total := _total + _item.preco_cents * _item.quantidade;
    IF _item.tipo = 'produto' AND _item.ref_id IS NOT NULL THEN
      UPDATE public.product SET estoque = GREATEST(0, estoque - _item.quantidade)
        WHERE id = _item.ref_id AND estoque IS NOT NULL;
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
      VALUES (s.company_id, 'entrada'::financial_type, 'confirmado'::financial_status, _amount, CURRENT_DATE,
              'Comanda ' || COALESCE(s.forma_pagamento,''), 'sale:' || s.id::text, s.appointment_id);
  ELSE
    UPDATE public.financial_entry
      SET amount=_amount, date=CURRENT_DATE,
          description='Comanda ' || COALESCE(s.forma_pagamento,''),
          reference_appointment_id = s.appointment_id WHERE id=_existing;
  END IF;

  IF s.appointment_id IS NOT NULL THEN
    UPDATE public.appointment SET status='concluido'::appointment_status, completed_at=now()
      WHERE id = s.appointment_id AND status <> 'concluido'::appointment_status;
  END IF;

  IF s.customer_id IS NOT NULL AND _svc_count > 0 THEN
    UPDATE public.customer SET fidelidade_contador = fidelidade_contador + _svc_count
      WHERE id = s.customer_id
        AND EXISTS (SELECT 1 FROM public.company c WHERE c.id = s.company_id AND c.fidelidade_ativa);
  END IF;

  RETURN s;
END $$;
