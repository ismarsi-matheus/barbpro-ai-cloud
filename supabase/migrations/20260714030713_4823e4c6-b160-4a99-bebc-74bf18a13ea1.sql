
-- =========================================================
-- 1) TABELA: stripe_customer (1 por empresa)
-- =========================================================
CREATE TABLE public.stripe_customer (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL UNIQUE REFERENCES public.company(id) ON DELETE CASCADE,
  stripe_customer_id  text NOT NULL UNIQUE,
  email               text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stripe_customer_stripe_id_idx ON public.stripe_customer (stripe_customer_id);
CREATE INDEX stripe_customer_email_idx     ON public.stripe_customer (lower(email));

GRANT SELECT ON public.stripe_customer TO authenticated;
GRANT ALL    ON public.stripe_customer TO service_role;

ALTER TABLE public.stripe_customer ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_customer_select ON public.stripe_customer
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.has_company_role(company_id, ARRAY['owner','admin'])
  );

CREATE TRIGGER trg_stripe_customer_updated_at
  BEFORE UPDATE ON public.stripe_customer
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) EXTENSÃO da tabela subscription (já existente)
-- =========================================================
ALTER TABLE public.subscription
  ADD COLUMN IF NOT EXISTS stripe_price_id   text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS trial_start       timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at         timestamptz;

CREATE INDEX IF NOT EXISTS subscription_stripe_price_id_idx
  ON public.subscription (stripe_price_id)
  WHERE stripe_price_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_external_subscription_id_idx
  ON public.subscription (external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_external_customer_id_idx
  ON public.subscription (external_customer_id)
  WHERE external_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_status_idx
  ON public.subscription (status);

-- =========================================================
-- 3) TABELA: stripe_webhook_event (auditoria + dedup)
-- =========================================================
CREATE TABLE public.stripe_webhook_event (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id   text NOT NULL UNIQUE,
  type              text NOT NULL,
  api_version       text,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed         boolean NOT NULL DEFAULT false,
  processed_at      timestamptz,
  error             text,
  attempts          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stripe_webhook_event_type_idx        ON public.stripe_webhook_event (type);
CREATE INDEX stripe_webhook_event_processed_idx   ON public.stripe_webhook_event (processed);
CREATE INDEX stripe_webhook_event_created_at_idx  ON public.stripe_webhook_event (created_at DESC);

GRANT SELECT ON public.stripe_webhook_event TO authenticated;
GRANT ALL    ON public.stripe_webhook_event TO service_role;

ALTER TABLE public.stripe_webhook_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_webhook_event_select_admin ON public.stripe_webhook_event
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE TRIGGER trg_stripe_webhook_event_updated_at
  BEFORE UPDATE ON public.stripe_webhook_event
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4) FUNÇÕES AUXILIARES
-- =========================================================

-- Localizar o Stripe Customer da empresa
CREATE OR REPLACE FUNCTION public.get_stripe_customer(_company_id uuid)
RETURNS public.stripe_customer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.stripe_customer WHERE company_id = _company_id LIMIT 1;
$$;

-- Localizar a assinatura ativa da empresa
-- (ativa = status em trialing/active/past_due/paused e não cancelada)
CREATE OR REPLACE FUNCTION public.get_active_subscription(_company_id uuid)
RETURNS public.subscription
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.subscription
   WHERE company_id = _company_id
     AND status IN ('trialing','active','past_due','paused')
   ORDER BY updated_at DESC
   LIMIT 1;
$$;

-- Verificar plano atual (retorna slug do plan) da empresa
CREATE OR REPLACE FUNCTION public.get_current_plan_slug(_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.slug
    FROM public.subscription s
    LEFT JOIN public.plan p ON p.id = s.plan_id
   WHERE s.company_id = _company_id
     AND s.status IN ('trialing','active','past_due','paused')
   ORDER BY s.updated_at DESC
   LIMIT 1;
$$;

-- Atualizar apenas o status da assinatura (idempotente)
CREATE OR REPLACE FUNCTION public.update_subscription_status(
  _stripe_subscription_id text,
  _status text
) RETURNS public.subscription
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.subscription;
BEGIN
  UPDATE public.subscription
     SET status = _status,
         updated_at = now()
   WHERE external_subscription_id = _stripe_subscription_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;

-- Sincronizar (UPSERT) uma assinatura do Stripe para uma company
-- Faz também o upsert do stripe_customer.
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(
  _company_id              uuid,
  _stripe_customer_id      text,
  _customer_email          text,
  _stripe_subscription_id  text,
  _stripe_price_id         text,
  _stripe_product_id       text,
  _status                  text,
  _current_period_start    timestamptz,
  _current_period_end      timestamptz,
  _trial_start             timestamptz,
  _trial_end               timestamptz,
  _cancel_at               timestamptz,
  _canceled_at             timestamptz,
  _cancel_at_period_end    boolean,
  _metadata                jsonb,
  _plan_id                 uuid DEFAULT NULL
) RETURNS public.subscription
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _sub public.subscription;
BEGIN
  -- Upsert do customer
  INSERT INTO public.stripe_customer (company_id, stripe_customer_id, email)
  VALUES (_company_id, _stripe_customer_id, _customer_email)
  ON CONFLICT (company_id) DO UPDATE
    SET stripe_customer_id = EXCLUDED.stripe_customer_id,
        email              = COALESCE(EXCLUDED.email, public.stripe_customer.email),
        updated_at         = now();

  -- Upsert da subscription (uma por empresa)
  INSERT INTO public.subscription (
    company_id, provider, plan_id,
    external_subscription_id, external_customer_id, buyer_email,
    stripe_price_id, stripe_product_id, status,
    current_period_start, current_period_end,
    trial_start, trial_ends_at,
    cancel_at, canceled_at, cancel_at_period_end,
    metadata
  ) VALUES (
    _company_id, 'stripe', _plan_id,
    _stripe_subscription_id, _stripe_customer_id, _customer_email,
    _stripe_price_id, _stripe_product_id, _status,
    _current_period_start, _current_period_end,
    _trial_start, _trial_end,
    _cancel_at, _canceled_at, COALESCE(_cancel_at_period_end, false),
    COALESCE(_metadata, '{}'::jsonb)
  )
  ON CONFLICT (company_id) DO UPDATE SET
    provider                 = 'stripe',
    plan_id                  = COALESCE(EXCLUDED.plan_id, public.subscription.plan_id),
    external_subscription_id = EXCLUDED.external_subscription_id,
    external_customer_id     = EXCLUDED.external_customer_id,
    buyer_email              = COALESCE(EXCLUDED.buyer_email, public.subscription.buyer_email),
    stripe_price_id          = EXCLUDED.stripe_price_id,
    stripe_product_id        = EXCLUDED.stripe_product_id,
    status                   = EXCLUDED.status,
    current_period_start     = EXCLUDED.current_period_start,
    current_period_end       = EXCLUDED.current_period_end,
    trial_start              = EXCLUDED.trial_start,
    trial_ends_at            = EXCLUDED.trial_ends_at,
    cancel_at                = EXCLUDED.cancel_at,
    canceled_at              = EXCLUDED.canceled_at,
    cancel_at_period_end     = EXCLUDED.cancel_at_period_end,
    metadata                 = EXCLUDED.metadata,
    updated_at               = now()
  RETURNING * INTO _sub;

  RETURN _sub;
END $$;

-- Marcar evento de webhook como processado (idempotente)
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  _stripe_event_id text,
  _error text DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.stripe_webhook_event
     SET processed = (_error IS NULL),
         processed_at = now(),
         error = _error,
         attempts = attempts + 1,
         updated_at = now()
   WHERE stripe_event_id = _stripe_event_id;
$$;
