-- Create report_embeddings table for RAG over past studies
-- Requires pgvector extension: enable via Database > Extensions in Supabase Dashboard
-- Run: CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS report_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_embeddings_report_section ON report_embeddings(report_id, section);
CREATE INDEX IF NOT EXISTS idx_report_embeddings_report_id ON report_embeddings(report_id);
CREATE INDEX IF NOT EXISTS idx_report_embeddings_section ON report_embeddings(section);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_report_embeddings_embedding ON report_embeddings
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE report_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: managed users can read (for RAG retrieval)
CREATE POLICY "Allow read for authenticated users"
  ON report_embeddings FOR SELECT
  USING (true);

COMMENT ON TABLE report_embeddings IS 'Embeddings of report executive summaries for RAG retrieval over past studies';

-- RPC for similarity search
CREATE OR REPLACE FUNCTION match_report_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  report_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.report_id,
    re.content,
    1 - (re.embedding <=> query_embedding)::float as similarity
  FROM report_embeddings re
  WHERE re.embedding IS NOT NULL
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
