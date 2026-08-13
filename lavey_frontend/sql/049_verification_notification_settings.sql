-- 049_verification_notification_settings.sql
-- Run this ENTIRE file in Supabase SQL Editor (select all → Run).
-- Do not run fragments — starting at "USING (false)" will fail with a syntax error.

-- 1) Settings table (singleton row)
CREATE TABLE IF NOT EXISTS public.admin_verification_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notification_email text NOT NULL
    CONSTRAINT admin_verification_settings_email_check
    CHECK (notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.admin_verification_settings IS
  'Singleton row: email notified when a member submits identity verification.';

INSERT INTO public.admin_verification_settings (id, notification_email)
VALUES (1, 'clintonbonganikhoza@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- 2) RLS — block direct client access; backend uses service_role (bypasses RLS)
ALTER TABLE public.admin_verification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_verification_settings_select ON public.admin_verification_settings;
CREATE POLICY admin_verification_settings_select
ON public.admin_verification_settings
FOR SELECT
TO authenticated
USING (false);

DROP POLICY IF EXISTS admin_verification_settings_write ON public.admin_verification_settings;
CREATE POLICY admin_verification_settings_write
ON public.admin_verification_settings
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 3) Audit log
CREATE TABLE IF NOT EXISTS public.admin_verification_settings_audit (
  id bigserial PRIMARY KEY,
  previous_email text,
  new_email text NOT NULL,
  changed_by uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_verification_settings_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_verification_settings_audit_select ON public.admin_verification_settings_audit;
CREATE POLICY admin_verification_settings_audit_select
ON public.admin_verification_settings_audit
FOR SELECT
TO authenticated
USING (false);

-- 4) Helper for backend email on verification submit
CREATE OR REPLACE FUNCTION public.get_verification_notification_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT notification_email
  FROM public.admin_verification_settings
  WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_verification_notification_email() TO service_role;
