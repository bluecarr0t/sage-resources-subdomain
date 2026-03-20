-- Component costs: extraction_date + replace-per-run dedupe (mirrors cce_cost_rows).
-- Run in Supabase SQL Editor before relying on extract-cce-pdf.py component replace/unique.

ALTER TABLE cce_component_costs
  ADD COLUMN IF NOT EXISTS extraction_date DATE;

UPDATE cce_component_costs
SET extraction_date = created_at::date
WHERE extraction_date IS NULL;

-- Drop duplicates keeping lowest id per logical key (same month / date)
DELETE FROM cce_component_costs a
USING cce_component_costs b
WHERE a.id > b.id
  AND COALESCE(a.section_name, '') = COALESCE(b.section_name, '')
  AND COALESCE(a.item_name, '') = COALESCE(b.item_name, '')
  AND COALESCE(a.source_page, -1) = COALESCE(b.source_page, -1)
  AND COALESCE(a.extraction_date, DATE '1970-01-01') = COALESCE(b.extraction_date, DATE '1970-01-01');

DROP INDEX IF EXISTS cce_component_costs_dedupe_idx;

CREATE UNIQUE INDEX cce_component_costs_dedupe_idx
  ON cce_component_costs (
    COALESCE(section_name, ''),
    COALESCE(item_name, ''),
    source_page,
    extraction_date
  );

CREATE INDEX IF NOT EXISTS idx_cce_component_costs_extraction_date
  ON cce_component_costs (extraction_date DESC NULLS LAST);

COMMENT ON COLUMN cce_component_costs.extraction_date IS 'PDF edition month from filename; extract replaces rows for this date before insert.';
