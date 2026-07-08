-- 1. Reset super_admin_emails default to empty
ALTER TABLE public.app_config ALTER COLUMN super_admin_emails SET DEFAULT ARRAY[]::text[];
UPDATE public.app_config SET super_admin_emails = ARRAY[]::text[];

-- 2. Ensure exactly one app_config row exists
INSERT INTO public.app_config (app_name, super_admin_emails)
SELECT 'BarbeiroPro AI', ARRAY[]::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.app_config);

-- 3. RPC: claim super admin if list is empty
CREATE OR REPLACE FUNCTION public.claim_super_admin_if_empty()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _current text[];
BEGIN
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RETURN false;
  END IF;

  -- Ensure row exists
  INSERT INTO public.app_config (app_name, super_admin_emails)
  SELECT 'BarbeiroPro AI', ARRAY[]::text[]
  WHERE NOT EXISTS (SELECT 1 FROM public.app_config);

  SELECT super_admin_emails INTO _current FROM public.app_config LIMIT 1;

  IF _current IS NULL OR array_length(_current, 1) IS NULL OR array_length(_current, 1) = 0 THEN
    UPDATE public.app_config SET super_admin_emails = ARRAY[_email], updated_at = now();
    -- Also insert into user_roles for consistency
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'super_admin')
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_super_admin_if_empty() TO authenticated;