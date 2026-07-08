-- Grant SELECT to anon for public booking page tables
-- RLS policies already restrict which rows/contexts are visible
GRANT SELECT ON public.company TO anon;
GRANT SELECT ON public.service TO anon;
GRANT SELECT ON public.service_category TO anon;
GRANT SELECT ON public.professional TO anon;
GRANT SELECT ON public.professional_service TO anon;
GRANT SELECT, INSERT ON public.appointment TO anon;
GRANT SELECT, INSERT ON public.customer TO anon;

-- Ensure authenticated also has needed grants (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_category TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_service TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer TO authenticated;

-- Ensure helper functions are executable by anon (required by RLS policies)
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO anon, authenticated;

-- Add a policy on appointment so anon can read minimal rows for conflict detection
-- (RLS still requires this; existing policies are all has_company_access which excludes anon)
DROP POLICY IF EXISTS "public reads appointment for conflict" ON public.appointment;
CREATE POLICY "public reads appointment for conflict"
ON public.appointment
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = appointment.company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'::status_cobranca
  )
);