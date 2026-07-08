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

  IF NEW.status IN ('cancelado','nao_compareceu') THEN
    RETURN NEW;
  END IF;

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
    RAISE EXCEPTION 'APPOINTMENT_CONFLICT'
      USING ERRCODE = 'P0001',
            MESSAGE = 'Esse horário acabou de ser reservado, escolha outro';
  END IF;

  RETURN NEW;
END;
$$;