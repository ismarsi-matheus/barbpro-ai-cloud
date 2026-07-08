
CREATE OR REPLACE FUNCTION public.close_sale(_sale_id uuid, _forma_pagamento text DEFAULT NULL, _desconto_cents integer DEFAULT NULL)
RETURNS public.sale
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.sale;
  _total integer := 0;
  _item RECORD;
  _pct numeric;
  _existing uuid;
  _amount numeric;
BEGIN
  SELECT * INTO s FROM public.sale WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF NOT public.has_company_access(s.company_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta comanda';
  END IF;
  IF s.status = 'fechada' THEN RETURN s; END IF;
  IF s.status = 'cancelada' THEN RAISE EXCEPTION 'Comanda cancelada'; END IF;

  FOR _item IN SELECT * FROM public.sale_item WHERE sale_id = _sale_id LOOP
    _pct := NULL;
    IF _item.tipo = 'servico' AND _item.professional_id IS NOT NULL AND _item.ref_id IS NOT NULL THEN
      SELECT comissao_percentual INTO _pct
        FROM public.professional_service
        WHERE professional_id = _item.professional_id AND service_id = _item.ref_id;
    END IF;
    IF _pct IS NULL AND _item.professional_id IS NOT NULL THEN
      SELECT comissao_percentual INTO _pct
        FROM public.professional WHERE id = _item.professional_id;
    END IF;
    _pct := COALESCE(_pct, 0);

    UPDATE public.sale_item
      SET comissao_percentual = _pct,
          comissao_cents = floor((_item.preco_cents * _item.quantidade) * _pct / 100)::int
      WHERE id = _item.id;

    _total := _total + _item.preco_cents * _item.quantidade;

    IF _item.tipo = 'produto' AND _item.ref_id IS NOT NULL THEN
      UPDATE public.product
        SET estoque = GREATEST(0, estoque - _item.quantidade)
        WHERE id = _item.ref_id AND estoque IS NOT NULL;
    END IF;
  END LOOP;

  _total := GREATEST(0, _total - COALESCE(_desconto_cents, s.desconto_cents, 0));

  UPDATE public.sale
    SET status = 'fechada',
        closed_at = now(),
        total_cents = _total,
        desconto_cents = COALESCE(_desconto_cents, desconto_cents),
        forma_pagamento = COALESCE(_forma_pagamento, forma_pagamento)
    WHERE id = _sale_id
    RETURNING * INTO s;

  SELECT id INTO _existing FROM public.financial_entry
    WHERE company_id = s.company_id AND category = 'sale:' || s.id::text LIMIT 1;
  _amount := (s.total_cents::numeric) / 100;
  IF _existing IS NULL THEN
    INSERT INTO public.financial_entry (company_id, type, status, amount, date, description, category, reference_appointment_id)
      VALUES (s.company_id, 'entrada'::financial_type, 'confirmado'::financial_status, _amount, CURRENT_DATE,
              'Comanda ' || COALESCE(s.forma_pagamento,''), 'sale:' || s.id::text, s.appointment_id);
  ELSE
    UPDATE public.financial_entry
      SET amount = _amount, date = CURRENT_DATE,
          description = 'Comanda ' || COALESCE(s.forma_pagamento,''),
          reference_appointment_id = s.appointment_id
      WHERE id = _existing;
  END IF;

  IF s.appointment_id IS NOT NULL THEN
    UPDATE public.appointment
      SET status = 'concluido'::appointment_status, completed_at = now()
      WHERE id = s.appointment_id AND status <> 'concluido'::appointment_status;
  END IF;

  RETURN s;
END;
$$;
