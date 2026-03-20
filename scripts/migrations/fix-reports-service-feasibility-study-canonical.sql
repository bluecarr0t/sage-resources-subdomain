-- Collapse "feasibility study" / "Feasibility Study" / "feasibility-study" into canonical feasibility_study
UPDATE public.reports
SET service = 'feasibility_study'
WHERE deleted_at IS NULL
  AND service IS NOT NULL
  AND trim(service) <> 'feasibility_study'
  AND regexp_replace(lower(trim(service)), '[\s_-]+', '_', 'g') = 'feasibility_study';
