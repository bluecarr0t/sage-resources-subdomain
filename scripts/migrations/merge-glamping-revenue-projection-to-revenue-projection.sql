-- Retire glamping_revenue_projection; use revenue_projection (Past Reports "Revenue Projection")
UPDATE public.reports
SET service = 'revenue_projection'
WHERE deleted_at IS NULL
  AND lower(trim(service)) = 'glamping_revenue_projection';
