-- Super admin passa a ser vinculado ao user_id (user_roles), e não apenas ao
-- e-mail do JWT. Antes, qualquer pessoa que cadastrasse primeiro um e-mail
-- presente em super_admin_emails (cadastro sem confirmação) virava super admin.

-- 1) Backfill: mantém o acesso de quem já é super admin hoje.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
JOIN public.app_config c
  ON lower(u.email) = ANY (SELECT lower(e) FROM unnest(c.super_admin_emails) AS e)
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Exige o papel no user_roles E o e-mail atual da conta ainda na lista
--    (remover o e-mail da lista revoga o acesso imediatamente).
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    JOIN auth.users u ON u.id = r.user_id
    JOIN public.app_config c
      ON lower(u.email) = ANY (SELECT lower(e) FROM unnest(c.super_admin_emails) AS e)
    WHERE r.user_id = auth.uid()
      AND r.role = 'super_admin'::public.app_role
  )
$$;
