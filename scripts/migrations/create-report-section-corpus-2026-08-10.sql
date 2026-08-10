-- Style corpus for Claude Opus 5 few-shot conditioning (Report Builder).
-- Requires pgvector: CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS report_section_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  section TEXT NOT NULL,
  market_type TEXT,
  raw_text TEXT NOT NULL,
  redacted_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  is_holdout BOOLEAN NOT NULL DEFAULT false,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_section_corpus_report_section
  ON report_section_corpus (report_id, section);

CREATE INDEX IF NOT EXISTS idx_report_section_corpus_section
  ON report_section_corpus (section);

CREATE INDEX IF NOT EXISTS idx_report_section_corpus_market_type
  ON report_section_corpus (market_type);

CREATE INDEX IF NOT EXISTS idx_report_section_corpus_holdout
  ON report_section_corpus (is_holdout);

CREATE INDEX IF NOT EXISTS idx_report_section_corpus_embedding
  ON report_section_corpus
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE report_section_corpus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow managed users read report_section_corpus" ON report_section_corpus;
CREATE POLICY "Allow managed users read report_section_corpus"
  ON report_section_corpus FOR SELECT
  TO authenticated
  USING (public.is_active_managed_user());

GRANT SELECT ON TABLE public.report_section_corpus TO authenticated;
GRANT ALL ON TABLE public.report_section_corpus TO service_role;
REVOKE ALL ON TABLE public.report_section_corpus FROM anon;

COMMENT ON TABLE report_section_corpus IS
  'Redacted past-report section exemplars for RAG style conditioning (never use holdout rows as few-shots)';

CREATE OR REPLACE FUNCTION match_report_section_corpus(
  query_embedding vector(1536),
  match_section text DEFAULT NULL,
  match_market_type text DEFAULT NULL,
  exclude_holdout boolean DEFAULT true,
  match_threshold float DEFAULT 0.45,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  report_id uuid,
  study_id text,
  section text,
  market_type text,
  redacted_text text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.report_id,
    c.study_id,
    c.section,
    c.market_type,
    c.redacted_text,
    1 - (c.embedding <=> query_embedding)::float AS similarity
  FROM report_section_corpus c
  WHERE c.embedding IS NOT NULL
    AND (match_section IS NULL OR c.section = match_section)
    AND (
      match_market_type IS NULL
      OR c.market_type IS NULL
      OR lower(c.market_type) = lower(match_market_type)
      OR (
        lower(match_market_type) IN ('rv', 'rv_glamping')
        AND lower(coalesce(c.market_type, '')) IN ('rv', 'rv_glamping')
      )
    )
    AND (NOT exclude_holdout OR c.is_holdout = false)
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_report_section_corpus(
  vector, text, text, boolean, float, int
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_report_section_corpus(
  vector, text, text, boolean, float, int
) TO authenticated, service_role;
