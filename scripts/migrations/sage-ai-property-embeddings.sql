-- ============================================================================
-- Sage AI: property_embeddings + semantic_search_properties_v1 RPC
--
-- Vector embeddings of all_glamping_properties.{property_name, description,
-- amenities, unit_type, property_type} for similarity search via pgvector.
-- Uses OpenAI text-embedding-3-small (1536 dims) to match the existing
-- report_embeddings convention.
--
-- Apply with:
--   psql $DATABASE_URL -f scripts/migrations/sage-ai-property-embeddings.sql
-- or via the Supabase SQL editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS property_embeddings (
  property_id   BIGINT PRIMARY KEY
    REFERENCES all_glamping_properties(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  source_fields TEXT[] NOT NULL
    DEFAULT ARRAY['property_name','description','amenities','unit_type','property_type']::text[],
  model         TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding     VECTOR(1536) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ivfflat cosine index. lists=100 is a reasonable default for <1M rows;
-- revisit once we have >500k properties. HNSW is also an option but ivfflat
-- has the smallest write amplification for a backfill pipeline that runs
-- nightly.
CREATE INDEX IF NOT EXISTS idx_property_embeddings_vector
  ON property_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_property_embeddings_content_hash
  ON property_embeddings (content_hash);

ALTER TABLE property_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "embeddings readable to authed" ON property_embeddings;
CREATE POLICY "embeddings readable to authed"
  ON property_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE property_embeddings IS
  'Vector embeddings of all_glamping_properties text content. Populated by scripts/embed-glamping-properties.ts. Used by the semantic_search_properties tool.';

-- ----------------------------------------------------------------------------
-- semantic_search_properties_v1
--   Returns the top-N properties by cosine similarity to query_embedding,
--   optionally filtered by state/country/unit_type.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.semantic_search_properties_v1(vector, integer, text, text, text, real);

CREATE FUNCTION public.semantic_search_properties_v1(
  query_embedding vector(1536),
  match_count     integer DEFAULT 10,
  filter_state    text    DEFAULT NULL,
  filter_country  text    DEFAULT NULL,
  filter_unit_type text   DEFAULT NULL,
  min_similarity  real    DEFAULT 0.0
)
RETURNS TABLE (
  id                          bigint,
  property_name               text,
  city                        text,
  state                       text,
  country                     text,
  unit_type                   text,
  property_type               text,
  url                         text,
  description                 text,
  similarity                  real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  capped integer := LEAST(GREATEST(match_count, 1), 50);
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.property_name,
    ap.city,
    ap.state,
    ap.country,
    ap.unit_type,
    ap.property_type,
    ap.url,
    ap.description,
    (1 - (pe.embedding <=> query_embedding))::real AS similarity
  FROM property_embeddings pe
  JOIN all_glamping_properties ap ON ap.id = pe.property_id
  WHERE (filter_state     IS NULL OR ap.state   ILIKE filter_state)
    AND (filter_country   IS NULL OR ap.country ILIKE '%' || filter_country || '%')
    AND (filter_unit_type IS NULL OR ap.unit_type ILIKE '%' || filter_unit_type || '%')
    AND (1 - (pe.embedding <=> query_embedding)) >= min_similarity
  ORDER BY pe.embedding <=> query_embedding ASC
  LIMIT capped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.semantic_search_properties_v1(vector, integer, text, text, text, real) TO authenticated;
