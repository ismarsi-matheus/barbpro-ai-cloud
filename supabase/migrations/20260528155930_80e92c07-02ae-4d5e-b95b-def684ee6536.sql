-- Permite que a RLS policy "members view their company" (que usa has_company_access)
-- seja avaliada também para usuários anônimos no fluxo público /agendar/:slug.
-- Sem isso o PostgREST retorna 401 "permission denied for function has_company_access"
-- mesmo existindo uma policy alternativa "public reads company by slug".
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO anon, authenticated;