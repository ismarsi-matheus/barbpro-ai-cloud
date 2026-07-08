
-- Limpa abordagem anterior (views security definer)
DROP VIEW IF EXISTS public.company_public;
DROP VIEW IF EXISTS public.professional_public;

-- =======================================================================
-- COMPANY: column-level grants para anon (oculta cobrança/contato sensível)
-- =======================================================================
REVOKE SELECT ON public.company FROM anon;
GRANT SELECT (
  id, name, nome_fantasia, slug, logo_url, primary_color,
  whatsapp, endereco, business_hours
) ON public.company TO anon;

-- authenticated continua com SELECT completo (membros via RLS)
GRANT SELECT ON public.company TO authenticated;

-- Restaura política pública (filtrada por slug + não cancelado)
DROP POLICY IF EXISTS "public reads company by slug" ON public.company;
CREATE POLICY "public reads company by slug"
ON public.company
FOR SELECT
USING (slug IS NOT NULL AND status_cobranca <> 'cancelado');

-- =======================================================================
-- PROFESSIONAL: column-level grants para anon (oculta comissão)
-- =======================================================================
REVOKE SELECT ON public.professional FROM anon;
GRANT SELECT (
  id, company_id, name, specialty, photo_url, active
) ON public.professional TO anon;

GRANT SELECT ON public.professional TO authenticated;

DROP POLICY IF EXISTS "public reads active professionals" ON public.professional;
CREATE POLICY "public reads active professionals"
ON public.professional
FOR SELECT
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM public.company c
    WHERE c.id = professional.company_id
      AND c.slug IS NOT NULL
      AND c.status_cobranca <> 'cancelado'
  )
);
