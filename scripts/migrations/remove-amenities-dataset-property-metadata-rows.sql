-- Drop dataset-only amenities rows (columns remain on all_glamping_properties).
DELETE FROM amenities
WHERE glamping_property_column IN (
  'property_lgbtiq_friendly',
  'property_mobile_home_community',
  'property_remote_work_friendly',
  'property_has_rentals',
  'property_age_restricted_55_plus',
  'property_extended_stay',
  'property_family_friendly',
  'property_gasoline_nearby',
  'property_golf_cart_rental'
);
