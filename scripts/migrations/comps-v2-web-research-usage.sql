-- Comps v2: persist web gap-fill rows (mirror all_glamping_properties) + usage runs + admin AI usage events.
-- Idempotent: safe to re-run in Supabase SQL Editor after partial or older runs.
-- Requires public.all_glamping_properties to exist.

-- ---------------------------------------------------------------------------
-- 1) Per-run usage (Tavily / Firecrawl / web geocode tallies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comps_v2_usage_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  route text NOT NULL CHECK (route IN ('search', 'gap_fill')),
  tavily_queries_planned integer NOT NULL DEFAULT 0,
  tavily_queries_completed integer NOT NULL DEFAULT 0,
  tavily_raw_rows integer NOT NULL DEFAULT 0,
  firecrawl_attempted integer NOT NULL DEFAULT 0,
  firecrawl_enriched integer NOT NULL DEFAULT 0,
  web_geocode_attempts integer NOT NULL DEFAULT 0,
  web_geocode_hits integer NOT NULL DEFAULT 0,
  google_geocode_calls integer NOT NULL DEFAULT 0,
  nominatim_geocode_calls integer NOT NULL DEFAULT 0,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Backfill columns if table was created from an older migration script.
ALTER TABLE public.comps_v2_usage_runs
  ADD COLUMN IF NOT EXISTS google_geocode_calls integer NOT NULL DEFAULT 0;
ALTER TABLE public.comps_v2_usage_runs
  ADD COLUMN IF NOT EXISTS nominatim_geocode_calls integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_comps_v2_usage_runs_created_at ON public.comps_v2_usage_runs (created_at DESC);

COMMENT ON TABLE public.comps_v2_usage_runs IS 'Comps v2 web research: per-request API tallies for admin usage panel.';

-- ---------------------------------------------------------------------------
-- 2) Web research property rows (same columns as all_glamping_properties + provenance)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = 'comps_v2_web_research_finds'
  ) THEN
    EXECUTE $ct$
      CREATE TABLE public.comps_v2_web_research_finds (
        LIKE public.all_glamping_properties INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES
      )
    $ct$;
  END IF;
END $$;

-- Ensure primary key on id (LIKE may omit PK on some Postgres builds).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.comps_v2_web_research_finds'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.comps_v2_web_research_finds
      ADD CONSTRAINT comps_v2_web_research_finds_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Drop triggers copied from source (rate/slug automation not wanted on staging rows).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.comps_v2_web_research_finds'::regclass
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.comps_v2_web_research_finds', r.tgname);
  END LOOP;
END $$;

-- Drop unique constraints (e.g. slug) so staging accepts many incomplete rows.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.comps_v2_web_research_finds'::regclass
      AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.comps_v2_web_research_finds DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Provenance columns (safe if already applied).
ALTER TABLE public.comps_v2_web_research_finds
  ADD COLUMN IF NOT EXISTS run_id uuid,
  ADD COLUMN IF NOT EXISTS comps_stable_id text,
  ADD COLUMN IF NOT EXISTS pipeline_source text,
  ADD COLUMN IF NOT EXISTS inserted_at timestamptz NOT NULL DEFAULT now();

-- Foreign key run_id → usage_runs (skip if already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.comps_v2_web_research_finds'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.comps_v2_usage_runs'::regclass
  ) THEN
    ALTER TABLE public.comps_v2_web_research_finds
      ADD CONSTRAINT comps_v2_web_finds_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES public.comps_v2_usage_runs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- CHECK pipeline_source (skip if already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.comps_v2_web_research_finds'::regclass
      AND conname = 'comps_v2_web_finds_pipeline_chk'
  ) THEN
    ALTER TABLE public.comps_v2_web_research_finds
      ADD CONSTRAINT comps_v2_web_finds_pipeline_chk CHECK (
        pipeline_source IN ('tavily_gap_fill', 'firecrawl_gap_fill')
      );
  END IF;
END $$;

-- Enforce NOT NULL on provenance columns when every row is populated (no-op if already NOT NULL).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comps_v2_web_research_finds'
      AND column_name = 'run_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM public.comps_v2_web_research_finds WHERE run_id IS NULL LIMIT 1) THEN
    ALTER TABLE public.comps_v2_web_research_finds ALTER COLUMN run_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comps_v2_web_research_finds'
      AND column_name = 'comps_stable_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM public.comps_v2_web_research_finds WHERE comps_stable_id IS NULL LIMIT 1) THEN
    ALTER TABLE public.comps_v2_web_research_finds ALTER COLUMN comps_stable_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'comps_v2_web_research_finds'
      AND column_name = 'pipeline_source'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM public.comps_v2_web_research_finds WHERE pipeline_source IS NULL LIMIT 1) THEN
    ALTER TABLE public.comps_v2_web_research_finds ALTER COLUMN pipeline_source SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comps_v2_web_finds_run_id ON public.comps_v2_web_research_finds (run_id);
CREATE INDEX IF NOT EXISTS idx_comps_v2_web_finds_inserted_at ON public.comps_v2_web_research_finds (inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_comps_v2_web_finds_stable_id ON public.comps_v2_web_research_finds (comps_stable_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comps_v2_web_finds_run_stable ON public.comps_v2_web_research_finds (run_id, comps_stable_id);

COMMENT ON TABLE public.comps_v2_web_research_finds IS 'Comps v2 web gap-fill output; columns align with all_glamping_properties for promotion/export.';

-- ---------------------------------------------------------------------------
-- 3) Admin AI usage (Site Builder Gateway, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_ai_usage_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_email text,
  feature text NOT NULL,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  raw_usage jsonb,
  request_meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_ai_usage_created_at ON public.admin_ai_usage_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_ai_usage_feature ON public.admin_ai_usage_events (feature);

COMMENT ON TABLE public.admin_ai_usage_events IS 'Admin AI calls (tokens/usage) for cost visibility.';

-- ---------------------------------------------------------------------------
-- RLS (managed users read; service role bypasses)
-- ---------------------------------------------------------------------------
ALTER TABLE public.comps_v2_usage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comps_v2_web_research_finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "managed_users_select_comps_v2_usage_runs" ON public.comps_v2_usage_runs;
CREATE POLICY "managed_users_select_comps_v2_usage_runs" ON public.comps_v2_usage_runs
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "managed_users_select_comps_v2_web_finds" ON public.comps_v2_web_research_finds;
CREATE POLICY "managed_users_select_comps_v2_web_finds" ON public.comps_v2_web_research_finds
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "managed_users_select_admin_ai_usage" ON public.admin_ai_usage_events;
CREATE POLICY "managed_users_select_admin_ai_usage" ON public.admin_ai_usage_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
