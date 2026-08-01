CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(_company_id uuid, _stripe_customer_id text, _customer_email text, _stripe_subscription_id text, _stripe_price_id text, _stripe_product_id text, _status text, _current_period_start timestamp with time zone, _current_period_end timestamp with time zone, _trial_start timestamp with time zone, _trial_end timestamp with time zone, _cancel_at timestamp with time zone, _canceled_at timestamp with time zone, _cancel_at_period_end boolean, _metadata jsonb, _plan_id uuid DEFAULT NULL::uuid)
RETURNS public.subscription
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sub public.subscription;
  _plan_slug text;
BEGIN
  _plan_slug := lower(NULLIF(trim(COALESCE(_metadata->>'plan_slug', '')), ''));
  IF _plan_slug NOT IN ('starter', 'pro', 'elite') THEN
    SELECT p.slug INTO _plan_slug FROM public.plan p WHERE p.id = _plan_id;
  END IF;

  INSERT INTO public.stripe_customer (company_id, stripe_customer_id, email)
  VALUES (_company_id, _stripe_customer_id, _customer_email)
  ON CONFLICT (company_id) DO UPDATE
    SET stripe_customer_id = EXCLUDED.stripe_customer_id,
        email = COALESCE(EXCLUDED.email, public.stripe_customer.email),
        updated_at = now();

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
    provider = 'stripe',
    plan_id = COALESCE(EXCLUDED.plan_id, public.subscription.plan_id),
    external_subscription_id = EXCLUDED.external_subscription_id,
    external_customer_id = EXCLUDED.external_customer_id,
    buyer_email = COALESCE(EXCLUDED.buyer_email, public.subscription.buyer_email),
    stripe_price_id = EXCLUDED.stripe_price_id,
    stripe_product_id = EXCLUDED.stripe_product_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    trial_start = EXCLUDED.trial_start,
    trial_ends_at = EXCLUDED.trial_ends_at,
    cancel_at = EXCLUDED.cancel_at,
    canceled_at = EXCLUDED.canceled_at,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING * INTO _sub;

  PERFORM public.apply_subscription_to_company(_company_id, _status, _current_period_end, _trial_end);

  IF _status IN ('active', 'trialing') AND _plan_slug IN ('starter', 'pro', 'elite') THEN
    UPDATE public.company
       SET selected_plan_slug = _plan_slug,
           plano = CASE _plan_slug
             WHEN 'starter' THEN 'starter'::public.plano_type
             WHEN 'pro' THEN 'pro'::public.plano_type
             ELSE 'premium'::public.plano_type
           END,
           updated_at = now()
     WHERE id = _company_id;
  END IF;

  RETURN _sub;
END
$function$;

CREATE OR REPLACE FUNCTION public.get_current_plan_slug(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _slug text;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_company_access(_company_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta empresa';
  END IF;

  SELECT COALESCE(p.slug, NULLIF(s.metadata->>'plan_slug', ''))
    INTO _slug
    FROM public.subscription s
    LEFT JOIN public.plan p ON p.id = s.plan_id
   WHERE s.company_id = _company_id
     AND s.status IN ('trialing', 'active', 'past_due', 'paused')
   ORDER BY s.updated_at DESC
   LIMIT 1;

  IF _slug IN ('starter', 'pro', 'elite') THEN
    RETURN _slug;
  END IF;

  SELECT COALESCE(
           NULLIF(c.selected_plan_slug, ''),
           CASE c.plano::text WHEN 'premium' THEN 'elite' ELSE c.plano::text END
         )
    INTO _slug
    FROM public.company c
   WHERE c.id = _company_id;

  RETURN _slug;
END
$function$;

REVOKE ALL ON FUNCTION public.get_current_plan_slug(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_plan_slug(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_plan_slug(uuid) TO service_role;