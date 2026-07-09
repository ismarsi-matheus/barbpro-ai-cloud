
-- Professional weekly schedule
CREATE TABLE IF NOT EXISTS public.professional_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_working boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  lunch_start time,
  lunch_end time,
  slot_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, weekday)
);

GRANT SELECT ON public.professional_schedule TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_schedule TO authenticated;
GRANT ALL ON public.professional_schedule TO service_role;

ALTER TABLE public.professional_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule public read"
  ON public.professional_schedule FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = professional_schedule.company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  ));

CREATE POLICY "schedule manage by company"
  ON public.professional_schedule FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE TRIGGER professional_schedule_set_updated
  BEFORE UPDATE ON public.professional_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Professional blocks (vacations, leaves, etc.)
CREATE TABLE IF NOT EXISTS public.professional_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'indisponivel',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS professional_block_prof_range_idx
  ON public.professional_block (professional_id, start_date, end_date);

GRANT SELECT ON public.professional_block TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_block TO authenticated;
GRANT ALL ON public.professional_block TO service_role;

ALTER TABLE public.professional_block ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block public read"
  ON public.professional_block FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = professional_block.company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  ));

CREATE POLICY "block manage by company"
  ON public.professional_block FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE TRIGGER professional_block_set_updated
  BEFORE UPDATE ON public.professional_block
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent bookings on blocked/off-schedule times (server-side enforcement)
CREATE OR REPLACE FUNCTION public.check_appointment_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wd smallint;
  _time time;
  _sch RECORD;
  _blocked int;
BEGIN
  IF NEW.status IN ('cancelado','nao_compareceu') THEN RETURN NEW; END IF;

  -- Blocks
  SELECT COUNT(*) INTO _blocked
    FROM public.professional_block
   WHERE professional_id = NEW.professional_id
     AND NEW.scheduled_at::date BETWEEN start_date AND end_date;
  IF _blocked > 0 THEN
    RAISE EXCEPTION 'PROFESSIONAL_BLOCKED'
      USING ERRCODE='P0001',
            MESSAGE='Profissional indisponível nesta data';
  END IF;

  -- Weekly schedule (skip if none configured for this weekday)
  _wd := EXTRACT(DOW FROM NEW.scheduled_at)::smallint;
  _time := (NEW.scheduled_at AT TIME ZONE 'UTC')::time;
  SELECT * INTO _sch
    FROM public.professional_schedule
   WHERE professional_id = NEW.professional_id AND weekday = _wd
   LIMIT 1;

  IF FOUND THEN
    IF NOT _sch.is_working THEN
      RAISE EXCEPTION 'PROFESSIONAL_OFF_DAY'
        USING ERRCODE='P0001', MESSAGE='Profissional não trabalha neste dia';
    END IF;
    IF _sch.start_time IS NOT NULL AND _time < _sch.start_time THEN
      RAISE EXCEPTION 'OUT_OF_HOURS' USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;
    IF _sch.end_time IS NOT NULL AND _time >= _sch.end_time THEN
      RAISE EXCEPTION 'OUT_OF_HOURS' USING ERRCODE='P0001', MESSAGE='Fora do horário de atendimento';
    END IF;
    IF _sch.lunch_start IS NOT NULL AND _sch.lunch_end IS NOT NULL
       AND _time >= _sch.lunch_start AND _time < _sch.lunch_end THEN
      RAISE EXCEPTION 'LUNCH_BREAK' USING ERRCODE='P0001', MESSAGE='Horário de almoço';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointment_check_schedule ON public.appointment;
CREATE TRIGGER appointment_check_schedule
  BEFORE INSERT OR UPDATE ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_schedule();
