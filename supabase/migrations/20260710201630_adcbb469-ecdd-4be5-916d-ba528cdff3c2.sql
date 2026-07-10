CREATE OR REPLACE FUNCTION public.check_appointment_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _blocked int;
  _wd smallint;
  _local_date date;
  _local_start time;
  _local_end time;
  _sch RECORD;
  _duration int;
BEGIN
  IF NEW.status IN ('cancelado','nao_compareceu') THEN
    RETURN NEW;
  END IF;

  _local_date := (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date;
  _wd := EXTRACT(DOW FROM (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::smallint;
  _local_start := (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::time;

  SELECT COALESCE(s.duration_minutes, 30)
    INTO _duration
    FROM public.service s
   WHERE s.id = NEW.service_id;
  _duration := COALESCE(_duration, 30);
  _local_end := ((NEW.scheduled_at + (_duration || ' minutes')::interval) AT TIME ZONE 'America/Sao_Paulo')::time;

  SELECT COUNT(*) INTO _blocked
    FROM public.professional_block b
   WHERE b.professional_id = NEW.professional_id
     AND b.company_id = NEW.company_id
     AND _local_date BETWEEN b.start_date AND b.end_date;
  IF _blocked > 0 THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Profissional indisponível nesta data';
  END IF;

  SELECT * INTO _sch
    FROM public.professional_schedule ps
   WHERE ps.professional_id = NEW.professional_id
     AND ps.company_id = NEW.company_id
     AND ps.weekday = _wd
   LIMIT 1;

  IF FOUND THEN
    IF NOT _sch.is_working THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Profissional não trabalha neste dia';
    END IF;

    IF _sch.start_time IS NOT NULL AND _local_start < _sch.start_time THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;

    IF _sch.end_time IS NOT NULL AND _local_end > _sch.end_time THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;

    IF _sch.lunch_start IS NOT NULL
       AND _sch.lunch_end IS NOT NULL
       AND _local_start < _sch.lunch_end
       AND _sch.lunch_start < _local_end THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='Horário de almoço';
    END IF;
  END IF;

  RETURN NEW;
END $$;

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
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Esse horário acabou de ser reservado, escolha outro';
  END IF;

  RETURN NEW;
END $$;