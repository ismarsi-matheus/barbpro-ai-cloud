REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.professional_schedule FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.professional_block FROM anon;
GRANT SELECT ON public.professional_schedule TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_schedule TO authenticated;
GRANT ALL ON public.professional_schedule TO service_role;
GRANT SELECT ON public.professional_block TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_block TO authenticated;
GRANT ALL ON public.professional_block TO service_role;

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
    RAISE EXCEPTION 'PROFESSIONAL_BLOCKED'
      USING ERRCODE='P0001', MESSAGE='Profissional indisponível nesta data';
  END IF;

  SELECT * INTO _sch
    FROM public.professional_schedule ps
   WHERE ps.professional_id = NEW.professional_id
     AND ps.company_id = NEW.company_id
     AND ps.weekday = _wd
   LIMIT 1;

  IF FOUND THEN
    IF NOT _sch.is_working THEN
      RAISE EXCEPTION 'PROFESSIONAL_OFF_DAY'
        USING ERRCODE='P0001', MESSAGE='Profissional não trabalha neste dia';
    END IF;

    IF _sch.start_time IS NOT NULL AND _local_start < _sch.start_time THEN
      RAISE EXCEPTION 'OUT_OF_HOURS'
        USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;

    IF _sch.end_time IS NOT NULL AND _local_end > _sch.end_time THEN
      RAISE EXCEPTION 'OUT_OF_HOURS'
        USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;

    IF _sch.lunch_start IS NOT NULL
       AND _sch.lunch_end IS NOT NULL
       AND _local_start < _sch.lunch_end
       AND _sch.lunch_start < _local_end THEN
      RAISE EXCEPTION 'LUNCH_BREAK'
        USING ERRCODE='P0001', MESSAGE='Horário de almoço';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointment_check_schedule ON public.appointment;
CREATE TRIGGER appointment_check_schedule
  BEFORE INSERT OR UPDATE OF scheduled_at, professional_id, service_id, status ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_schedule();