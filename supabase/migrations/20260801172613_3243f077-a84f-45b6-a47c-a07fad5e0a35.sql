
CREATE OR REPLACE FUNCTION public.apply_subscription_to_company(_company_id uuid, _status text, _period_end timestamptz, _trial_end timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _company_id IS NULL THEN RETURN; END IF;

  IF _status IN ('active','trialing') THEN
    UPDATE public.company
       SET status_cobranca = CASE WHEN _status = 'trialing' THEN 'trial'::status_cobranca ELSE 'ativo'::status_cobranca END,
           trial_ate = CASE WHEN _status = 'trialing' THEN COALESCE(_trial_end::date, trial_ate) ELSE trial_ate END,
           proximo_vencimento = COALESCE(_period_end::date, proximo_vencimento),
           updated_at = now()
     WHERE id = _company_id;
  ELSIF _status IN ('past_due','unpaid') THEN
    UPDATE public.company SET status_cobranca = 'inadimplente'::status_cobranca, updated_at = now() WHERE id = _company_id;
  ELSIF _status IN ('canceled','incomplete_expired') THEN
    UPDATE public.company SET status_cobranca = 'cancelado'::status_cobranca, updated_at = now() WHERE id = _company_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(_company_id uuid, _stripe_customer_id text, _customer_email text, _stripe_subscription_id text, _stripe_price_id text, _stripe_product_id text, _status text, _current_period_start timestamptz, _current_period_end timestamptz, _trial_start timestamptz, _trial_end timestamptz, _cancel_at timestamptz, _canceled_at timestamptz, _cancel_at_period_end boolean, _metadata jsonb, _plan_id uuid DEFAULT NULL::uuid)
RETURNS subscription
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _sub public.subscription;
BEGIN
  INSERT INTO public.stripe_customer (company_id, stripe_customer_id, email)
  VALUES (_company_id, _stripe_customer_id, _customer_email)
  ON CONFLICT (company_id) DO UPDATE
    SET stripe_customer_id = EXCLUDED.stripe_customer_id,
        email              = COALESCE(EXCLUDED.email, public.stripe_customer.email),
        updated_at         = now();

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

  PERFORM public.apply_subscription_to_company(_company_id, _status, _current_period_end, _trial_end);

  RETURN _sub;
END $function$;

CREATE OR REPLACE FUNCTION public.update_subscription_status(_stripe_subscription_id text, _status text)
RETURNS subscription
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row public.subscription;
BEGIN
  UPDATE public.subscription
     SET status = _status,
         updated_at = now()
   WHERE external_subscription_id = _stripe_subscription_id
   RETURNING * INTO _row;

  IF _row.id IS NOT NULL THEN
    PERFORM public.apply_subscription_to_company(_row.company_id, _status, _row.current_period_end, _row.trial_ends_at);
  END IF;

  RETURN _row;
END $function$;

-- Reconciliar empresas que já possuem assinatura ativa mas ficaram presas em trial expirado
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT company_id, status, current_period_end, trial_ends_at FROM public.subscription LOOP
    PERFORM public.apply_subscription_to_company(r.company_id, r.status, r.current_period_end, r.trial_ends_at);
  END LOOP;
END $$;
