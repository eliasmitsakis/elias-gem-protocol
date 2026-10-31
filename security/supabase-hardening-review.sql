-- STAGED ONLY. Do not run against production before deploying the matching
-- authenticated API/image changes and verifying application compatibility.
-- Back up the database and bucket first. Existing public URLs and share links
-- will stop working for anyone except their authenticated owner.
BEGIN;

ALTER TABLE public.akashic_records ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: permissive policies combine with OR; ALL public policies must go.
DROP POLICY IF EXISTS "Allow public insert access" ON public.akashic_records;
DROP POLICY IF EXISTS "Anyone can read records" ON public.akashic_records;
DROP POLICY IF EXISTS "Public records are viewable by everyone." ON public.akashic_records;
DROP POLICY IF EXISTS "Only authenticated users can insert" ON public.akashic_records;
DROP POLICY IF EXISTS "Owner can view own records" ON public.akashic_records;
DROP POLICY IF EXISTS "Owner can insert own records" ON public.akashic_records;
DROP POLICY IF EXISTS "Owner can update execution output" ON public.akashic_records;

-- Grants restrict even anonymous clients before RLS evaluates.
-- No direct DELETE, TRUNCATE, or image_url UPDATE privileges.
REVOKE ALL PRIVILEGES ON TABLE public.akashic_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.akashic_records TO authenticated;
GRANT UPDATE (executionoutput) ON TABLE public.akashic_records TO authenticated;

CREATE POLICY "Owner can view own records"
  ON public.akashic_records FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Only trusted server routes create records, after credit authorization.
-- INSERT remains service-role-only: clients must not bypass the credit gate.

CREATE POLICY "Owner can update execution output"
  ON public.akashic_records FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Previously generated image files are publicly accessible today.
-- The authenticated image proxy is required before flipping this flag.
UPDATE storage.buckets SET public = false WHERE id = 'akashic_visions';

-- Harden application trigger functions (the login trigger remains SECURITY DEFINER).
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMIT;
