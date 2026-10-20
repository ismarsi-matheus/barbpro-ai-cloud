-- Registro de envios de e-mail (antes as falhas só iam para o console).
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_id text,
  error text,
  appointment_id uuid REFERENCES public.appointment(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_failed ON public.email_log (created_at DESC) WHERE status = 'failed';

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_log FROM anon, authenticated;
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

DROP POLICY IF EXISTS "super admin reads email_log" ON public.email_log;
CREATE POLICY "super admin reads email_log" ON public.email_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Lembrete enviado uma única vez por agendamento.
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Reagendar libera um novo lembrete.
CREATE OR REPLACE FUNCTION public.reset_reminder_on_reschedule()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    NEW.reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reset_reminder_on_reschedule ON public.appointment;
CREATE TRIGGER trg_reset_reminder_on_reschedule
  BEFORE UPDATE OF scheduled_at ON public.appointment
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_on_reschedule();