/**
 * `property_*` amenity columns on `all_glamping_properties` used for Market Report amenity share.
 * Keep in sync with {@link SageProperty} in lib/types/sage.ts.
 */
export const GLAMPING_PROPERTY_AMENITY_COLUMNS = [
  'property_laundry',
  'property_playground',
  'property_pool',
  'property_food_on_site',
  'property_sauna',
  'property_hot_tub',
  'property_restaurant',
  'property_dog_park',
  'property_clubhouse',
  'property_alcohol_available',
  'property_golf_cart_rental',
  'property_waterpark',
  'property_general_store',
  'property_waterfront',
  'property_extended_stay',
  'property_family_friendly',
  'property_remote_work_friendly',
  'property_fitness_room',
  'property_propane_refilling_station',
  'property_pickball_courts',
  'property_age_restricted_55_plus',
  'property_has_rentals',
  'property_lgbtiq_friendly',
  'property_gasoline_nearby',
  'property_basketball',
  'property_volleyball',
  'property_jet_skiing',
  'property_mobile_home_community',
  'property_tennis',
] as const;

export type GlampingPropertyAmenityColumn = (typeof GLAMPING_PROPERTY_AMENITY_COLUMNS)[number];

/** RV / site columns on glamping table for Site–Unit analysis */
export const GLAMPING_RV_SITE_COLUMNS = [
  'rv_vehicle_length',
  'rv_parking',
  'rv_accommodates_slideout',
  'rv_surface_type',
  'rv_surface_level',
  'rv_sewer_hook_up',
  'rv_electrical_hook_up',
  'rv_water_hookup',
] as const;
