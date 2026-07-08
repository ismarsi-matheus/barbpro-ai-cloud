-- Public read for booking page (RLS still filters rows)
GRANT SELECT ON public.company TO anon, authenticated;
GRANT SELECT ON public.service TO anon, authenticated;
GRANT SELECT ON public.service_category TO anon, authenticated;
GRANT SELECT ON public.professional TO anon, authenticated;
GRANT SELECT ON public.professional_service TO anon, authenticated;
GRANT SELECT, INSERT ON public.appointment TO anon;
GRANT SELECT, INSERT ON public.customer TO anon;

-- Full CRUD for authenticated members (RLS scopes by has_company_access)
GRANT INSERT, UPDATE, DELETE ON public.company TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_category TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.professional_service TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.appointment TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.customer TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_simulated TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_user TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;

GRANT ALL ON public.company, public.service, public.service_category, public.professional,
  public.professional_service, public.appointment, public.customer, public.financial_entry,
  public.invoice_simulated, public.company_user, public.user_roles, public.app_config TO service_role;

-- Helper functions used inside RLS policies must be callable by both roles
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO anon, authenticated;

-- Allow anon SELECT on appointment for conflict checks (RLS restricts to valid company slug)
DROP POLICY IF EXISTS "public reads appointment for conflict" ON public.appointment;
CREATE POLICY "public reads appointment for conflict"
ON public.appointment FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = appointment.company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  )
);