ALTER TABLE public.company_user
  ADD COLUMN IF NOT EXISTS convite_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS convite_aceito boolean NOT NULL DEFAULT false,
  ALTER COLUMN user_id DROP NOT NULL;