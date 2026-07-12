
-- 1) Client profile table (one per auth user)
CREATE TABLE public.client_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  cpf text,
  birthdate date,
  cep text,
  endereco text,
  cidade text,
  estado text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profile TO authenticated;
GRANT ALL ON public.client_profile TO service_role;

ALTER TABLE public.client_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own profile"
  ON public.client_profile FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_client_profile_updated
  BEFORE UPDATE ON public.client_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Link customer records to auth users (nullable, opt-in)
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS customer_user_id_idx ON public.customer(user_id);

-- 3) Public RPC: upsert customer AND link to authenticated user when phone matches / new
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
    -- Reaproveita por telefone e faz o vínculo
    SELECT id INTO _id FROM public.customer
     WHERE company_id = _company_id AND phone = _phone
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

-- 4) Client: list own appointments across companies
CREATE OR REPLACE FUNCTION public.get_client_appointments()
RETURNS TABLE (
  id uuid,
  scheduled_at timestamptz,
  status appointment_status,
  price numeric,
  service_name text,
  professional_name text,
  company_id uuid,
  company_name text,
  company_slug text,
  duration_minutes int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.scheduled_at, a.status, a.price,
         COALESCE(a.service_name, s.name),
         COALESCE(a.professional_name, p.name),
         co.id, COALESCE(co.nome_fantasia, co.name), co.slug,
         COALESCE(s.duration_minutes, 30)
  FROM public.appointment a
  JOIN public.customer c ON c.id = a.customer_id
  JOIN public.company co ON co.id = a.company_id
  LEFT JOIN public.service s ON s.id = a.service_id
  LEFT JOIN public.professional p ON p.id = a.professional_id
  WHERE c.user_id = auth.uid()
  ORDER BY a.scheduled_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_client_appointments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_appointments() TO authenticated;

-- 5) Client: cancel own appointment
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
     AND EXISTS (
       SELECT 1 FROM public.customer c
        WHERE c.id = a.customer_id AND c.user_id = auth.uid()
     );
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END $$;

REVOKE ALL ON FUNCTION public.cancel_client_appointment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_client_appointment(uuid) TO authenticated;
