
-- =====================================================
-- 1) FECHAR VAZAMENTO DE PII (LGPD)
-- =====================================================

-- Remover policy que permitia anon ler todos os appointments
DROP POLICY IF EXISTS "public reads appointment for conflict" ON public.appointment;

-- Revogar acesso amplo do anon e manter apenas INSERT (para criar agendamento)
REVOKE ALL ON public.appointment FROM anon;
GRANT INSERT ON public.appointment TO anon;

-- Customer: anon só pode INSERT (lookup/upsert via RPC abaixo)
REVOKE ALL ON public.customer FROM anon;
GRANT INSERT ON public.customer TO anon;

-- app_config: anon não tem nada; super admin acessa via policy (com grant authenticated)
REVOKE ALL ON public.app_config FROM anon;

-- =====================================================
-- 2) RPC pública: horários ocupados SEM PII
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_busy_slots(
  _company_id uuid,
  _professional_id uuid,
  _date date
) RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.scheduled_at,
         a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::interval
  FROM public.appointment a
  LEFT JOIN public.service s ON s.id = a.service_id
  WHERE a.company_id = _company_id
    AND a.professional_id = _professional_id
    AND a.scheduled_at >= _date::timestamptz
    AND a.scheduled_at <  (_date + 1)::timestamptz
    AND a.status NOT IN ('cancelado'::appointment_status, 'nao_compareceu'::appointment_status)
    AND EXISTS (
      SELECT 1 FROM public.company c
      WHERE c.id = _company_id
        AND c.slug IS NOT NULL
        AND c.status_cobranca <> 'cancelado'::status_cobranca
    );
$$;
REVOKE ALL ON FUNCTION public.get_busy_slots(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid, uuid, date) TO anon, authenticated;

-- =====================================================
-- 3) RPC pública: upsert de cliente para booking
-- =====================================================
CREATE OR REPLACE FUNCTION public.upsert_customer_public(
  _company_id uuid,
  _name text,
  _phone text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
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

  SELECT id INTO _id FROM public.customer
   WHERE company_id = _company_id AND phone = _phone
   ORDER BY created_at ASC LIMIT 1;

  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  INSERT INTO public.customer (company_id, name, phone)
  VALUES (_company_id, COALESCE(NULLIF(trim(_name), ''), 'Cliente'), _phone)
  RETURNING id INTO _id;

  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.upsert_customer_public(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_customer_public(uuid, text, text) TO anon, authenticated;

-- =====================================================
-- 4) is_super_admin() já é SECURITY DEFINER. Adicionar
--    is_super_admin_self() para uso direto do frontend
--    sem expor a lista de e-mails.
-- =====================================================
-- (is_super_admin() já existe e checa auth.uid())
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
