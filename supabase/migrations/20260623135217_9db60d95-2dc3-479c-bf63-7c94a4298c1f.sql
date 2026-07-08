
-- 1) Comissão por profissional (e override por serviço)
ALTER TABLE public.professional
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric NOT NULL DEFAULT 0
  CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100);

-- Backfill a partir da coluna antiga commission_value quando for percentual
UPDATE public.professional
  SET comissao_percentual = LEAST(100, GREATEST(0, COALESCE(commission_value, 0)))
  WHERE (commission_type IS NULL OR commission_type = 'percent')
    AND comissao_percentual = 0
    AND commission_value IS NOT NULL;

ALTER TABLE public.professional_service
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric
  CHECK (comissao_percentual IS NULL OR (comissao_percentual >= 0 AND comissao_percentual <= 100));

UPDATE public.professional_service
  SET comissao_percentual = LEAST(100, GREATEST(0, commission_value))
  WHERE comissao_percentual IS NULL
    AND (commission_type IS NULL OR commission_type = 'percent')
    AND commission_value IS NOT NULL;

-- 2) PRODUTOS
CREATE TABLE IF NOT EXISTS public.product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  nome text NOT NULL,
  preco_cents integer NOT NULL DEFAULT 0 CHECK (preco_cents >= 0),
  custo_cents integer NOT NULL DEFAULT 0 CHECK (custo_cents >= 0),
  estoque integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product TO authenticated;
GRANT ALL ON public.product TO service_role;

ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_company_access_select" ON public.product
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY "product_company_access_modify" ON public.product
  FOR ALL TO authenticated USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_product_company_ativo ON public.product (company_id, ativo);

CREATE TRIGGER trg_product_updated BEFORE UPDATE ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) COMANDAS
CREATE TABLE IF NOT EXISTS public.sale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointment(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.professional(id) ON DELETE SET NULL,
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  desconto_cents integer NOT NULL DEFAULT 0 CHECK (desconto_cents >= 0),
  forma_pagamento text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','cancelada')),
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale TO authenticated;
GRANT ALL ON public.sale TO service_role;

ALTER TABLE public.sale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_company_access_select" ON public.sale
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY "sale_company_access_modify" ON public.sale
  FOR ALL TO authenticated USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_sale_company_status_created ON public.sale (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_appointment ON public.sale (appointment_id);

CREATE TRIGGER trg_sale_updated BEFORE UPDATE ON public.sale
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) ITENS DA COMANDA
CREATE TABLE IF NOT EXISTS public.sale_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sale(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('servico','produto')),
  ref_id uuid,
  descricao text NOT NULL,
  preco_cents integer NOT NULL DEFAULT 0 CHECK (preco_cents >= 0),
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  professional_id uuid REFERENCES public.professional(id) ON DELETE SET NULL,
  comissao_percentual numeric NOT NULL DEFAULT 0 CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100),
  comissao_cents integer NOT NULL DEFAULT 0 CHECK (comissao_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_item TO authenticated;
GRANT ALL ON public.sale_item TO service_role;

ALTER TABLE public.sale_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_item_company_access_select" ON public.sale_item
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY "sale_item_company_access_modify" ON public.sale_item
  FOR ALL TO authenticated USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE INDEX IF NOT EXISTS idx_sale_item_sale ON public.sale_item (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_company_prof ON public.sale_item (company_id, professional_id);

-- 5) Função para fechar comanda (idempotente, calcula comissões, gera financeiro, decrementa estoque)
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

  -- atualiza comissão por item conforme regra: prof_service.comissao_percentual > professional.comissao_percentual > 0
  FOR _item IN SELECT * FROM public.sale_item WHERE sale_id = _sale_id LOOP
    _pct := 0;
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

    -- decrementa estoque se for produto com estoque controlado
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

  -- lançamento financeiro idempotente (uma receita por sale)
  SELECT id INTO _existing FROM public.financial_entry
    WHERE company_id = s.company_id AND category = 'sale:' || s.id::text LIMIT 1;
  _amount := (s.total_cents::numeric) / 100;
  IF _existing IS NULL THEN
    INSERT INTO public.financial_entry (company_id, type, status, amount, date, description, category, reference_appointment_id)
      VALUES (s.company_id, 'receita', 'recebido', _amount, CURRENT_DATE,
              'Comanda ' || COALESCE(s.forma_pagamento,''), 'sale:' || s.id::text, s.appointment_id);
  ELSE
    UPDATE public.financial_entry
      SET amount = _amount, date = CURRENT_DATE,
          description = 'Comanda ' || COALESCE(s.forma_pagamento,''),
          reference_appointment_id = s.appointment_id
      WHERE id = _existing;
  END IF;

  -- marca agendamento como concluído se houver
  IF s.appointment_id IS NOT NULL THEN
    UPDATE public.appointment
      SET status = 'concluido', completed_at = now()
      WHERE id = s.appointment_id AND status <> 'concluido';
  END IF;

  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_sale(uuid, text, integer) TO authenticated;
