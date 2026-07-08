
-- Funções usadas SOMENTE dentro de policies/triggers: ninguém deve chamar via API
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_company_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- is_super_admin é usada como RPC pelo backend autenticado
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- claim_super_admin_if_empty é chamada pelo frontend autenticado (bootstrap)
REVOKE ALL ON FUNCTION public.claim_super_admin_if_empty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_super_admin_if_empty() TO authenticated;
