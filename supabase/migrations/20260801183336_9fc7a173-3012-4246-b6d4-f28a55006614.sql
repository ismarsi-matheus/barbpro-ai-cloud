ALTER TABLE public.club_member
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS club_member_stripe_subscription_key
  ON public.club_member (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

DROP POLICY IF EXISTS "club_member_owner_select" ON public.club_member;
CREATE POLICY "club_member_owner_select" ON public.club_member
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer c
     WHERE c.id = club_member.customer_id AND c.user_id = auth.uid()
  ));