-- ============================================================================
-- Treebox (Ohio): populate rate_* columns for 9 published all_sage_data rows.
-- Fixes missing brand avg rate on /glamping-market-overview/brands (rank 10).
--
-- Sources (retrieved 2026-06-15):
--   Meraki House $1695/night — treeboxstays.com/Accommodations/merakihouse.html
--   Orchard House $419/night — treeboxstays.com/Accommodations/The-Dwell-House.html
--   Treehouse Village units — treeboxstays.com/Accommodations/Treehouse-Village.html
--     Lodge $322, Arrow $195, Box $195, Sky Loft $150, Shack $173
--   Forest Havens — treeboxstays.com/forest-havens/ + ResNexus CAB96178…DD5E
--     Ela $203, Otium $203 (ResNexus Standard Rate confirmed multi-date)
--   Shack $173 also confirmed ResNexus listing (Sep–Jan 2027 samples)
--
-- Per-row anchor `a` = published "starting at" / sample Standard Rate (USD, 2 guests).
-- Season spread (AutoCamp year-round curve, May 2026 pattern):
--   winter_wd round(a*0.88)  winter_we round(a*0.98)
--   spring_wd round(a)       spring_we round(a*1.08)
--   summer_wd round(a*1.12)  summer_we round(a*1.24)
--   fall_wd   round(a*1.04)  fall_we   round(a*1.14)
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

WITH anchors(id, a) AS (
  VALUES
    (12080, 1695),  -- Meraki House (Dover) — entire-house lead-in
    (12081,  419),  -- Orchard House (Walnut Creek)
    (12082,  322),  -- Treehouse Lodge (Winesburg)
    (12083,  195),  -- The Arrow
    (12084,  195),  -- The Box
    (12085,  150),  -- The Sky Loft
    (12086,  173),  -- The Shack — ResNexus + operator site
    (12087,  203),  -- Forest Haven - Ela
    (12088,  203)   -- Forest Haven - Otium — ResNexus + operator site
)
UPDATE public.all_sage_data g
SET
  rate_winter_weekday = round(anchors.a * 0.88)::text,
  rate_winter_weekend = round(anchors.a * 0.98)::text,
  rate_spring_weekday = round(anchors.a)::text,
  rate_spring_weekend = round(anchors.a * 1.08)::text,
  rate_summer_weekday = round(anchors.a * 1.12)::text,
  rate_summer_weekend = round(anchors.a * 1.24)::text,
  rate_fall_weekday   = round(anchors.a * 1.04)::text,
  rate_fall_weekend   = round(anchors.a * 1.14)::text,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', round(anchors.a * 0.88), 'weekend', round(anchors.a * 0.98)),
      'spring', jsonb_build_object('weekday', round(anchors.a), 'weekend', round(anchors.a * 1.08)),
      'summer', jsonb_build_object('weekday', round(anchors.a * 1.12), 'weekend', round(anchors.a * 1.24)),
      'fall', jsonb_build_object('weekday', round(anchors.a * 1.04), 'weekend', round(anchors.a * 1.14)),
      'note', 'treeboxstays.com + ResNexus web research Jun 2026; anchor = starting-at / Standard Rate'
    )
  ),
  notes = COALESCE(g.notes, '') || E'\n\nRate enrichment (Jun 2026): ResNexus CAB96178-8231-4598-84EE-69D44EEFDD5E + treeboxstays.com starting-at anchors; seasonal spread via AutoCamp year-round curve.',
  date_updated = '2026-06-15'
FROM anchors
WHERE g.id = anchors.id;

COMMIT;
