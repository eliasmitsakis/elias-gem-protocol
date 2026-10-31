-- Review and apply only after checking client insert flows and backups.
-- Remove the permissive INSERT policy that bypasses user ownership checks.
DROP POLICY IF EXISTS "Allow public insert access" ON public.akashic_records;

-- Keep the existing authenticated ownership INSERT policy.
-- The existing public SELECT policies intentionally expose all records;
-- review product privacy requirements before changing them.

-- Pin the search path for trigger functions.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- Prevent API roles from invoking the privileged signup trigger directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
