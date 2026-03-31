-- Dataset amenity rows (slug IS NULL): names + default cost_per_unit (USD).
-- Matches lib/site-builder/glamping-properties-amenity-columns.ts.

-- Property
UPDATE amenities SET name = 'Laundry', cost_per_unit = 2800 WHERE glamping_property_column = 'property_laundry' AND slug IS NULL;
UPDATE amenities SET name = 'Playground', cost_per_unit = 650 WHERE glamping_property_column = 'property_playground' AND slug IS NULL;
UPDATE amenities SET name = 'Pool', cost_per_unit = 4500 WHERE glamping_property_column = 'property_pool' AND slug IS NULL;
UPDATE amenities SET name = 'Food on site', cost_per_unit = 2200 WHERE glamping_property_column = 'property_food_on_site' AND slug IS NULL;
UPDATE amenities SET name = 'Sauna', cost_per_unit = 1500 WHERE glamping_property_column = 'property_sauna' AND slug IS NULL;
UPDATE amenities SET name = 'Hot tub', cost_per_unit = 1800 WHERE glamping_property_column = 'property_hot_tub' AND slug IS NULL;
UPDATE amenities SET name = 'Restaurant', cost_per_unit = 7500 WHERE glamping_property_column = 'property_restaurant' AND slug IS NULL;
UPDATE amenities SET name = 'Dog park', cost_per_unit = 550 WHERE glamping_property_column = 'property_dog_park' AND slug IS NULL;
UPDATE amenities SET name = 'Clubhouse', cost_per_unit = 4200 WHERE glamping_property_column = 'property_clubhouse' AND slug IS NULL;
UPDATE amenities SET name = 'Alcohol available', cost_per_unit = 600 WHERE glamping_property_column = 'property_alcohol_available' AND slug IS NULL;
UPDATE amenities SET name = 'Waterpark', cost_per_unit = 12000 WHERE glamping_property_column = 'property_waterpark' AND slug IS NULL;
UPDATE amenities SET name = 'General store', cost_per_unit = 3200 WHERE glamping_property_column = 'property_general_store' AND slug IS NULL;
UPDATE amenities SET name = 'Waterfront', cost_per_unit = 800 WHERE glamping_property_column = 'property_waterfront' AND slug IS NULL;
UPDATE amenities SET name = 'Fitness room', cost_per_unit = 1800 WHERE glamping_property_column = 'property_fitness_room' AND slug IS NULL;
UPDATE amenities SET name = 'Pickleball courts', cost_per_unit = 700 WHERE glamping_property_column = 'property_pickball_courts' AND slug IS NULL;
UPDATE amenities SET name = 'Basketball', cost_per_unit = 500 WHERE glamping_property_column = 'property_basketball' AND slug IS NULL;
UPDATE amenities SET name = 'Volleyball', cost_per_unit = 250 WHERE glamping_property_column = 'property_volleyball' AND slug IS NULL;
UPDATE amenities SET name = 'Jet skiing', cost_per_unit = 900 WHERE glamping_property_column = 'property_jet_skiing' AND slug IS NULL;
UPDATE amenities SET name = 'Tennis', cost_per_unit = 900 WHERE glamping_property_column = 'property_tennis' AND slug IS NULL;

-- Unit (dataset-only rows; catalog-linked unit fields are skipped by populate script)
UPDATE amenities SET cost_per_unit = 4000 WHERE glamping_property_column = 'unit_shower' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 1200 WHERE glamping_property_column = 'unit_water' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 1800 WHERE glamping_property_column = 'unit_electricity' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 400 WHERE glamping_property_column = 'unit_pets' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 8500 WHERE glamping_property_column = 'unit_ada_accessibility' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 5000 WHERE glamping_property_column = 'unit_gas_fireplace' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 400 WHERE glamping_property_column = 'unit_charcoal_grill' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 500 WHERE glamping_property_column = 'unit_mini_fridge' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 2800 WHERE glamping_property_column = 'unit_bathtub' AND slug IS NULL;
UPDATE amenities SET cost_per_unit = 6000 WHERE glamping_property_column = 'unit_wood_burning_stove' AND slug IS NULL;
