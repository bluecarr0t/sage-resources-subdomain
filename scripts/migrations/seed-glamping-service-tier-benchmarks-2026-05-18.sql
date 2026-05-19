-- Manual service-tier overrides for cited benchmark properties (after auto-classify).

UPDATE public.all_glamping_properties AS agp
SET
  glamping_service_tier = v.tier,
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = v.note,
  date_updated = to_char(CURRENT_DATE, 'YYYY-MM-DD')
FROM (
  VALUES
    ('%paws up%', 'luxury', 'Benchmark: ultra-luxury ranch glamping'),
    ('%ranch at rock creek%', 'luxury', 'Benchmark: luxury ranch resort'),
    ('%ambiente%', 'luxury', 'Benchmark: landscape hotel / Airstream luxury'),
    ('%mustang monument%', 'luxury', 'Benchmark: all-inclusive safari lodge'),
    ('%terramor%', 'upscale', 'Benchmark: destination upscale glamping'),
    ('%under canvas%', 'upscale', 'Benchmark: premium tented resort brand'),
    ('%postcard cabins%', 'midscale', 'Benchmark: comfort / core glamping'),
    ('%timberline glamping%', 'rustic', 'Benchmark: essential / budget glamping'),
    ('%el cosmico%', 'rustic', 'Benchmark: essential / BYO glamping')
) AS v(pattern, tier, note)
WHERE agp.property_name ILIKE v.pattern
  AND agp.is_glamping_property = 'Yes';
