GRANT INSERT ON public.appointment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment TO authenticated;
GRANT ALL ON public.appointment TO service_role;

-- upsert_customer_public é SECURITY DEFINER; garantir EXECUTE ao anon
GRANT EXECUTE ON FUNCTION public.upsert_customer_public(uuid, text, text) TO anon, authenticated;

-- Cliente também precisa de INSERT para o fallback (o RPC é SECURITY DEFINER, mas garantimos consistência)
GRANT SELECT ON public.company TO anon;