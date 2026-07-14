
REVOKE ALL ON FUNCTION public.get_stripe_customer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_plan_slug(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_subscription_status(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_webhook_processed(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_stripe_subscription(
  uuid, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, boolean, jsonb, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_stripe_customer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_subscription(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_plan_slug(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_subscription_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_processed(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_stripe_subscription(
  uuid, text, text, text, text, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz,
  timestamptz, timestamptz, boolean, jsonb, uuid
) TO service_role;
