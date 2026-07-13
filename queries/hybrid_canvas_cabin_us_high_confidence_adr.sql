-- Hybrid canvas/cabin US high-confidence cohort with unit-weighted retail ADR.
-- See docs/data/HYBRID_CANVAS_CABIN_US_HIGH_CONFIDENCE.md

WITH lines AS (
  SELECT
    property_name,
    state,
    city,
    is_open,
    site_name,
    unit_type,
    quantity_of_units::int AS qty,
    rate_avg_retail_daily_rate::numeric AS adr,
    CASE
      WHEN property_name = 'AutoCamp Yosemite'
        AND site_name IN ('Luxury Tent', 'Classic Cabin Suite') THEN true
      WHEN property_name = 'Mendocino Grove' AND unit_type = 'Safari Tent' THEN true
      WHEN property_name = 'Terramor Outdoor Resort' AND unit_type = 'Safari Tent' THEN true
      WHEN property_name = 'Huttopia White Mountains'
        AND site_name IN ('Canadienne', 'Trappeur', 'Trappeur Duo') THEN true
      WHEN property_name = 'Paws Up Montana' AND site_name = 'luxury tents' THEN true
      WHEN property_name IN (
        'Camp Orenda', 'Lakedale', 'Valley Overlook', 'Cave Lakes Canyon',
        'Washington Glamping', 'Bristol Cabins', 'Moose Creek Ranch', 'Camp Dakota',
        'Battenkill Glamping Resort', 'Camp Olowalu', 'The Ranch at Rock Creek',
        'Mossquatch Resort', 'ULUM Moab', 'Dunton River Camp', 'Backland', 'Firelight Camps'
      )
      AND (
        unit_type IN ('Canvas Cabin', 'Canvas Cottage', 'Eco Cabin', 'Cube Cabin')
        OR site_name ~* '(canvas cabin|canvas cottage|tent.?cabin|cabin tent|tentalow|deluxe tent cabin|glamping cabin|canvas glamping)'
        OR site_name ~* '(suite tent|stargazer|deluxe tent|summit tent|journey\+|outlook shelter)'
        OR (
          unit_type IN ('Safari Tent', 'Canvas Tent')
          AND description ~* '(canvas camp|heated bathroom|en[ -]?suite.*bath|wood floor|hardwood floor)'
        )
      ) THEN true
      ELSE false
    END AS is_hybrid_line
  FROM all_sage_data
  WHERE property_name IN (
    'Camp Orenda', 'Lakedale', 'Valley Overlook', 'Cave Lakes Canyon',
    'Washington Glamping', 'Bristol Cabins', 'Moose Creek Ranch', 'Camp Dakota',
    'Battenkill Glamping Resort', 'Camp Olowalu', 'The Ranch at Rock Creek',
    'Mossquatch Resort', 'ULUM Moab', 'Dunton River Camp', 'Backland',
    'Firelight Camps', 'Mendocino Grove', 'Terramor Outdoor Resort',
    'Huttopia White Mountains', 'Paws Up Montana', 'AutoCamp Yosemite'
  )
  AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
)
SELECT
  property_name,
  state,
  city,
  is_open,
  COUNT(*) FILTER (WHERE is_hybrid_line) AS hybrid_lines,
  SUM(qty) FILTER (WHERE is_hybrid_line) AS hybrid_units,
  ROUND(
    SUM(adr * COALESCE(qty, 1)) FILTER (WHERE is_hybrid_line AND adr IS NOT NULL)
    / NULLIF(SUM(COALESCE(qty, 1)) FILTER (WHERE is_hybrid_line AND adr IS NOT NULL), 0),
    0
  ) AS adr_usd,
  STRING_AGG(unit_type || ' / ' || COALESCE(site_name, '?'), '; ' ORDER BY site_name)
    FILTER (WHERE is_hybrid_line) AS hybrid_inventory
FROM lines
GROUP BY property_name, state, city, is_open
ORDER BY state, property_name;
