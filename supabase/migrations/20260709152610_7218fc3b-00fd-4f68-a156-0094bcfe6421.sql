
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
  _sch RECORD;
BEGIN
  IF NEW.status IN ('cancelado','nao_compareceu') THEN RETURN NEW; END IF;

  _local_date := (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date;
  _wd := EXTRACT(DOW FROM (NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo'))::smallint;

  SELECT COUNT(*) INTO _blocked
    FROM public.professional_block
   WHERE professional_id = NEW.professional_id
     AND _local_date BETWEEN start_date AND end_date;
  IF _blocked > 0 THEN
    RAISE EXCEPTION 'PROFESSIONAL_BLOCKED'
      USING ERRCODE='P0001', MESSAGE='Profissional indisponível nesta data';
  END IF;

  SELECT * INTO _sch FROM public.professional_schedule
   WHERE professional_id = NEW.professional_id AND weekday = _wd LIMIT 1;
  IF FOUND AND NOT _sch.is_working THEN
    RAISE EXCEPTION 'PROFESSIONAL_OFF_DAY'
      USING ERRCODE='P0001', MESSAGE='Profissional não trabalha neste dia';
  END IF;

  RETURN NEW;
END $$;
