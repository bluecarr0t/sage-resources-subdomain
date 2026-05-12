-- ============================================================================
-- Sage data: rebrand Getaway House (getaway.house) → Postcard Cabins
-- Apply in Supabase SQL editor after backup, or: psql $DATABASE_URL -f this file
--
-- Only touches rows whose property_name maps to chain keys "getaway" or
-- "getaway house" via sage_chain_label_from_property_name (not unrelated
-- names like "Treehouse Getaway").
-- ============================================================================

UPDATE all_glamping_properties g
SET
  property_name =
    CASE
      WHEN g.property_name ~* '^getaway house[[:space:]]' THEN
        'Postcard Cabins ' || trim(regexp_replace(g.property_name, '^[Gg]etaway [Hh]ouse[[:space:]]+', ''))
      WHEN g.property_name ~* '^getaway[[:space:]]' THEN
        'Postcard Cabins ' || trim(regexp_replace(g.property_name, '^[Gg]etaway[[:space:]]+', ''))
      ELSE g.property_name
    END,
  slug =
    regexp_replace(
      regexp_replace(g.slug, '^getaway-house-', 'postcard-cabins-', 'i'),
      '^getaway-', 'postcard-cabins-', 'i'
    ),
  date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE public.sage_chain_label_from_property_name(g.property_name) IN ('getaway', 'getaway house');
