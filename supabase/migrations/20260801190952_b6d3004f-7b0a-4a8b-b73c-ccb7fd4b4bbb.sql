DROP FUNCTION IF EXISTS public.get_client_appointments();

CREATE OR REPLACE FUNCTION public.get_client_appointments()
 RETURNS TABLE(id uuid, scheduled_at timestamp with time zone, status appointment_status, price numeric, notes text, pagamento_tipo text, club_member_id uuid, club_plano_nome text, club_creditos_restantes integer, service_id uuid, service_name text, service_price numeric, duration_minutes integer, professional_id uuid, professional_name text, professional_photo text, company_id uuid, company_name text, company_slug text, company_endereco jsonb, company_whatsapp text, company_telefone text, rating smallint, review_comment text, created_at timestamp with time zone, confirmed_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.scheduled_at, a.status, a.price, a.notes,
         a.pagamento_tipo, a.club_member_id,
         cp.nome, cm.creditos_restantes,
         a.service_id, COALESCE(a.service_name, s.name), s.price,
         COALESCE(s.duration_minutes, 30),
         a.professional_id, COALESCE(a.professional_name, p.name), p.photo_url,
         co.id, COALESCE(co.nome_fantasia, co.name), co.slug,
         co.endereco, co.whatsapp, co.telefone_comercial,
         r.rating, r.comment,
         a.created_at, a.confirmed_at, a.completed_at
  FROM public.appointment a
  JOIN public.customer c ON c.id = a.customer_id
  JOIN public.company co ON co.id = a.company_id
  LEFT JOIN public.service s ON s.id = a.service_id
  LEFT JOIN public.professional p ON p.id = a.professional_id
  LEFT JOIN public.club_member cm ON cm.id = a.club_member_id
  LEFT JOIN public.club_plan cp ON cp.id = cm.club_plan_id
  LEFT JOIN public.appointment_review r ON r.appointment_id = a.id
  WHERE c.user_id = auth.uid()
  ORDER BY a.scheduled_at DESC;
$function$;