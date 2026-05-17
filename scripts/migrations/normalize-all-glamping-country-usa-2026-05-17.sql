-- Normalize legacy US country label "USA" (any case / optional dots) → "United States"
-- on public.all_glamping_properties. Idempotent.
-- See lib/all-glamping-properties-country.ts and .cursor/rules/all-glamping-properties-country.mdc.

UPDATE public.all_glamping_properties
SET country = 'United States',
    date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE country IS NOT NULL
  AND UPPER(REPLACE(BTRIM(country), '.', '')) = 'USA';
