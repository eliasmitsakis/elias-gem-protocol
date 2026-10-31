-- EMERGENCY ROLLBACK ONLY: THIS RE-OPENS RECORDS TO THE PUBLIC.
-- Never run during normal operation. Use only if service recovery requires
-- reverting the privacy migration, then immediately restore owner-only access.
BEGIN;
DROP POLICY IF EXISTS "Owner can view own records" ON public.akashic_records;
DROP POLICY IF EXISTS "Owner can update execution output" ON public.akashic_records;
GRANT ALL ON TABLE public.akashic_records TO anon, authenticated;
CREATE POLICY "Allow public insert access" ON public.akashic_records FOR INSERT TO PUBLIC WITH CHECK (true);
CREATE POLICY "Anyone can read records" ON public.akashic_records FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Public records are viewable by everyone." ON public.akashic_records FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Only authenticated users can insert" ON public.akashic_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
UPDATE storage.buckets SET public=true WHERE id='akashic_visions';
ALTER FUNCTION public.handle_new_user() RESET search_path;
ALTER FUNCTION public.handle_updated_at() RESET search_path;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
COMMIT;
