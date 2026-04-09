-- Left-pad US ZIP codes that lost leading zeros (3- or 4-digit all-numeric values → 5 digits).
-- Scope: public.all_glamping_properties only. Idempotent for 5-digit numeric zips (predicates exclude length 5).
--
-- Excludes:
--   - Rows that are not clearly US (country must be US variants, or blank country with US state/territory)
--   - Australian states/territories by name (valid AU postcodes are 4 digits; do not pad)
--
-- Run in Supabase SQL Editor or: psql $DATABASE_URL -f this_file.sql

BEGIN;

UPDATE public.all_glamping_properties
SET
  zip_code = lpad(trim(zip_code), 5, '0'),
  updated_at = now()
WHERE trim(zip_code) ~ '^[0-9]{4}$'
  AND lower(trim(coalesce(country, ''))) IN ('usa', 'us', 'united states', 'united states of america')
  AND lower(trim(coalesce(state, ''))) NOT IN (
    'new south wales',
    'queensland',
    'victoria',
    'tasmania',
    'south australia',
    'western australia',
    'australian capital territory',
    'northern territory'
  );

UPDATE public.all_glamping_properties
SET
  zip_code = lpad(trim(zip_code), 5, '0'),
  updated_at = now()
WHERE trim(zip_code) ~ '^[0-9]{3}$'
  AND lower(trim(coalesce(country, ''))) IN ('usa', 'us', 'united states', 'united states of america')
  AND lower(trim(coalesce(state, ''))) NOT IN (
    'new south wales',
    'queensland',
    'victoria',
    'tasmania',
    'south australia',
    'western australia',
    'australian capital territory',
    'northern territory'
  );

-- Blank country but US location: 2-letter state/territory OR full state/territory name
UPDATE public.all_glamping_properties
SET
  zip_code = lpad(trim(zip_code), 5, '0'),
  updated_at = now()
WHERE trim(zip_code) ~ '^[0-9]{4}$'
  AND (country IS NULL OR trim(country) = '')
  AND lower(trim(coalesce(state, ''))) NOT IN (
    'new south wales',
    'queensland',
    'victoria',
    'tasmania',
    'south australia',
    'western australia',
    'australian capital territory',
    'northern territory'
  )
  AND (
    upper(trim(state)) IN (
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
      'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
      'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
    )
    OR lower(trim(state)) IN (
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
      'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
      'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
      'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
      'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
      'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west virginia', 'wisconsin', 'wyoming', 'district of columbia', 'puerto rico', 'guam',
      'american samoa', 'northern mariana islands', 'u.s. virgin islands', 'us virgin islands',
      'united states virgin islands', 'virgin islands'
    )
  );

UPDATE public.all_glamping_properties
SET
  zip_code = lpad(trim(zip_code), 5, '0'),
  updated_at = now()
WHERE trim(zip_code) ~ '^[0-9]{3}$'
  AND (country IS NULL OR trim(country) = '')
  AND lower(trim(coalesce(state, ''))) NOT IN (
    'new south wales',
    'queensland',
    'victoria',
    'tasmania',
    'south australia',
    'western australia',
    'australian capital territory',
    'northern territory'
  )
  AND (
    upper(trim(state)) IN (
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
      'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
      'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
    )
    OR lower(trim(state)) IN (
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
      'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
      'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
      'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
      'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
      'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west virginia', 'wisconsin', 'wyoming', 'district of columbia', 'puerto rico', 'guam',
      'american samoa', 'northern mariana islands', 'u.s. virgin islands', 'us virgin islands',
      'united states virgin islands', 'virgin islands'
    )
  );

COMMIT;
