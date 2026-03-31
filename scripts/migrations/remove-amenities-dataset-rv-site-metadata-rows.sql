-- Drop dataset-only amenities rows for RV site descriptive fields (columns remain on all_glamping_properties).
DELETE FROM amenities
WHERE glamping_property_column IN (
  'rv_accommodates_slideout',
  'rv_generators_allowed',
  'rv_parking',
  'rv_surface_level',
  'rv_surface_type',
  'rv_vehicle_length',
  'rv_vehicles_class_a_rvs',
  'rv_vehicles_class_b_rvs',
  'rv_vehicles_class_c_rvs',
  'rv_vehicles_fifth_wheels',
  'rv_vehicles_toy_hauler'
);
