-- Security Advisor: RLS disabled in public (lint 0013)
-- Run in Supabase SQL Editor (or your migration runner).
--
-- Admin API routes use the anon key with the user session (createServerClientWithCookies),
-- so RLS applies. Policies match all_roverpass_data_new / all_glamping_properties:
-- active managed_users only. Service role (SUPABASE_SECRET_KEY) bypasses RLS.
--
-- spatial_ref_sys: PostGIS SRID catalog — SELECT only for managed users (no app writes).

-- Helper expression (inline per policy; Postgres has no shared RLS macro)

-- ---------------------------------------------------------------------------
-- spatial_ref_sys (PostGIS): read-only for managed users
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.spatial_ref_sys') IS NULL THEN
    RAISE NOTICE 'Skipping spatial_ref_sys (table not present)';
  ELSE
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow managed users select" ON public.spatial_ref_sys;

    CREATE POLICY "Allow managed users select"
      ON public.spatial_ref_sys
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.managed_users
          WHERE user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- CCE + Site Builder catalog tables: full CRUD for managed users
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'cce_occupancies',
    'cce_cost_rows',
    'cce_cost_percentages',
    'cce_modifiers',
    'cce_extraction_metadata',
    'cce_component_costs',
    'cce_catalog_units',
    'site_builder_glamping_types',
    'site_builder_rv_site_types',
    'site_builder_amenity_costs',
    'amenities'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'Skipping missing table: %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow managed users select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow managed users insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow managed users update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow managed users delete', t);

    EXECUTE format($p$
      CREATE POLICY "Allow managed users select"
        ON public.%I
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.managed_users
            WHERE user_id = auth.uid() AND is_active = true
          )
        )$p$, t);

    EXECUTE format($p$
      CREATE POLICY "Allow managed users insert"
        ON public.%I
        FOR INSERT
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.managed_users
            WHERE user_id = auth.uid() AND is_active = true
          )
        )$p$, t);

    EXECUTE format($p$
      CREATE POLICY "Allow managed users update"
        ON public.%I
        FOR UPDATE
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
        )$p$, t);

    EXECUTE format($p$
      CREATE POLICY "Allow managed users delete"
        ON public.%I
        FOR DELETE
        USING (
          auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.managed_users
            WHERE user_id = auth.uid() AND is_active = true
          )
        )$p$, t);
  END LOOP;
END $$;
