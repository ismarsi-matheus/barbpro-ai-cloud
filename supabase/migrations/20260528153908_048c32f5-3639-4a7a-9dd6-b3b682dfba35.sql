
-- 1) FIX: app_config public read (expõe super_admin_emails)
DROP POLICY IF EXISTS "anyone reads app_config" ON public.app_config;
-- (a política "super admin manages app_config" continua existindo)

-- 2) FIX: company billing public read
DROP POLICY IF EXISTS "public reads company by slug" ON public.company;

DROP VIEW IF EXISTS public.company_public;
CREATE VIEW public.company_public
WITH (security_barrier = true, security_invoker = false) AS
SELECT
  c.id,
  c.name,
  c.nome_fantasia,
  c.slug,
  c.logo_url,
  c.primary_color,
  c.whatsapp,
  c.endereco,
  c.business_hours
FROM public.company c
WHERE c.slug IS NOT NULL
  AND c.status_cobranca <> 'cancelado';

GRANT SELECT ON public.company_public TO anon, authenticated;

-- 3) FIX: professional commission public read
DROP POLICY IF EXISTS "public reads active professionals" ON public.professional;

DROP VIEW IF EXISTS public.professional_public;
CREATE VIEW public.professional_public
WITH (security_barrier = true, security_invoker = false) AS
SELECT
  p.id,
  p.company_id,
  p.name,
  p.specialty,
  p.photo_url,
  p.active
FROM public.professional p
JOIN public.company c ON c.id = p.company_id
WHERE p.active = true
  AND c.slug IS NOT NULL
  AND c.status_cobranca <> 'cancelado';

GRANT SELECT ON public.professional_public TO anon, authenticated;

-- 4) ANTI-CONFLITO de agendamento (server-side, contra race condition)
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
  SELECT duration_minutes INTO _duration FROM public.service WHERE id = NEW.service_id;
  IF _duration IS NULL THEN _duration := 30; END IF;
  _end := NEW.scheduled_at + (_duration || ' minutes')::interval;

  -- Não bloquear o próprio registro em UPDATE
  IF NEW.status IN ('cancelado','faltou') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _conflict
  FROM public.appointment a
  LEFT JOIN public.service s ON s.id = a.service_id
  WHERE a.professional_id = NEW.professional_id
    AND a.company_id = NEW.company_id
    AND a.status NOT IN ('cancelado','faltou')
    AND (TG_OP = 'INSERT' OR a.id <> NEW.id)
    AND tstzrange(
          a.scheduled_at,
          a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::interval,
          '[)'
        ) && tstzrange(NEW.scheduled_at, _end, '[)');

  IF _conflict > 0 THEN
    RAISE EXCEPTION 'APPOINTMENT_CONFLICT'
      USING ERRCODE = 'P0001',
            MESSAGE = 'Esse horário acabou de ser reservado, escolha outro';
  END IF;

  RETURN NEW;
END;
$$;

-- A função é chamada apenas via trigger; não deve ser executável via API
REVOKE ALL ON FUNCTION public.check_appointment_conflict() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_appointment_conflict() FROM anon;
REVOKE ALL ON FUNCTION public.check_appointment_conflict() FROM authenticated;

DROP TRIGGER IF EXISTS trg_check_appointment_conflict ON public.appointment;
CREATE TRIGGER trg_check_appointment_conflict
BEFORE INSERT OR UPDATE OF scheduled_at, professional_id, service_id, status
ON public.appointment
FOR EACH ROW EXECUTE FUNCTION public.check_appointment_conflict();
