-- Correct erroneous deck/patio rows: legacy seed typo ($40,500) or feasibility lines that were totals.
-- Target matches seed-site-builder-data.ts default (6500) for per-site amenity add-ons.
UPDATE site_builder_amenity_costs
SET cost_per_unit = 6500
WHERE slug = 'deck-patio'
  AND cost_per_unit > 12000;
