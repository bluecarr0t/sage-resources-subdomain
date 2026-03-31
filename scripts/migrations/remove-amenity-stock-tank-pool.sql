-- Remove retired Site Builder catalog row (superseded by cold-plunge for plunge-pool line items).
DELETE FROM amenities WHERE slug = 'stock-tank-pool';
