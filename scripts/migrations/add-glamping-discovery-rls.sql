-- RLS policies for glamping discovery pipeline tables
-- Run in Supabase SQL Editor

ALTER TABLE glamping_discovery_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE glamping_discovery_processed_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE glamping_discovery_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON glamping_discovery_candidates;
CREATE POLICY "Allow authenticated read" ON glamping_discovery_candidates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_candidates;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_candidates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_candidates;
CREATE POLICY "Allow managed users update" ON glamping_discovery_candidates
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read" ON glamping_discovery_processed_urls;
CREATE POLICY "Allow authenticated read" ON glamping_discovery_processed_urls FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_processed_urls;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_processed_urls
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_processed_urls;
CREATE POLICY "Allow managed users update" ON glamping_discovery_processed_urls
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read" ON glamping_discovery_runs;
CREATE POLICY "Allow authenticated read" ON glamping_discovery_runs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_runs;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_runs;
CREATE POLICY "Allow managed users update" ON glamping_discovery_runs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
