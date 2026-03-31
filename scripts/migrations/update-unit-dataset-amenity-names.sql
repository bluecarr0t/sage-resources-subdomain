-- Dataset unit rows: drop "Unit: " prefix from display name (matches glamping-properties-amenity-columns.ts).

UPDATE amenities SET name = 'Shower' WHERE glamping_property_column = 'unit_shower' AND slug IS NULL;
UPDATE amenities SET name = 'Water' WHERE glamping_property_column = 'unit_water' AND slug IS NULL;
UPDATE amenities SET name = 'Electricity' WHERE glamping_property_column = 'unit_electricity' AND slug IS NULL;
UPDATE amenities SET name = 'Picnic table' WHERE glamping_property_column = 'unit_picnic_table' AND slug IS NULL;
UPDATE amenities SET name = 'WiFi' WHERE glamping_property_column = 'unit_wifi' AND slug IS NULL;
UPDATE amenities SET name = 'Pets allowed' WHERE glamping_property_column = 'unit_pets' AND slug IS NULL;
UPDATE amenities SET name = 'Private bathroom' WHERE glamping_property_column = 'unit_private_bathroom' AND slug IS NULL;
UPDATE amenities SET name = 'Full kitchen' WHERE glamping_property_column = 'unit_full_kitchen' AND slug IS NULL;
UPDATE amenities SET name = 'Kitchenette' WHERE glamping_property_column = 'unit_kitchenette' AND slug IS NULL;
UPDATE amenities SET name = 'ADA accessibility' WHERE glamping_property_column = 'unit_ada_accessibility' AND slug IS NULL;
UPDATE amenities SET name = 'Patio / deck' WHERE glamping_property_column = 'unit_patio' AND slug IS NULL;
UPDATE amenities SET name = 'Air conditioning' WHERE glamping_property_column = 'unit_air_conditioning' AND slug IS NULL;
UPDATE amenities SET name = 'Gas fireplace' WHERE glamping_property_column = 'unit_gas_fireplace' AND slug IS NULL;
UPDATE amenities SET name = 'Hot tub or sauna' WHERE glamping_property_column = 'unit_hot_tub_or_sauna' AND slug IS NULL;
UPDATE amenities SET name = 'Hot tub' WHERE glamping_property_column = 'unit_hot_tub' AND slug IS NULL;
UPDATE amenities SET name = 'Sauna' WHERE glamping_property_column = 'unit_sauna' AND slug IS NULL;
UPDATE amenities SET name = 'Cable TV' WHERE glamping_property_column = 'unit_cable' AND slug IS NULL;
UPDATE amenities SET name = 'Campfires / fire pit' WHERE glamping_property_column = 'unit_campfires' AND slug IS NULL;
UPDATE amenities SET name = 'Charcoal grill' WHERE glamping_property_column = 'unit_charcoal_grill' AND slug IS NULL;
UPDATE amenities SET name = 'Mini fridge' WHERE glamping_property_column = 'unit_mini_fridge' AND slug IS NULL;
UPDATE amenities SET name = 'Bathtub' WHERE glamping_property_column = 'unit_bathtub' AND slug IS NULL;
UPDATE amenities SET name = 'Wood burning stove' WHERE glamping_property_column = 'unit_wood_burning_stove' AND slug IS NULL;
