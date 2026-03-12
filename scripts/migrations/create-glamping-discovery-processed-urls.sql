-- Create table to track processed article URLs for glamping discovery pipeline
-- Prevents re-processing the same article on each run
-- Run this SQL in your Supabase SQL Editor before first run of discover-glamping-from-news.ts

CREATE TABLE IF NOT EXISTS glamping_discovery_processed_urls (
  url TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  properties_extracted INT
);

COMMENT ON TABLE glamping_discovery_processed_urls IS
  'Tracks article URLs already processed by the glamping discovery pipeline to avoid duplicates.';
