INSERT INTO site_builder_glamping_types (slug, name, default_sqft, default_diameter_ft, cce_occupancy_code, default_quality_type)
VALUES ('house-boat', 'House Boat', 450, NULL, NULL, 'Luxury')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  default_sqft = EXCLUDED.default_sqft,
  default_diameter_ft = EXCLUDED.default_diameter_ft,
  cce_occupancy_code = EXCLUDED.cce_occupancy_code,
  default_quality_type = EXCLUDED.default_quality_type;
