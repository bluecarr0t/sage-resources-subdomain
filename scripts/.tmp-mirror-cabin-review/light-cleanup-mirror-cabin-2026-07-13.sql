-- Light Mirror Cabin cleanup (2026-07-13)

-- Two Capes: delete duplicate id 9565, keep 10326
DELETE FROM public.all_sage_data WHERE id = 9565;
UPDATE public.all_sage_data SET notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: deleted duplicate Mirror Cabin row id 9565 (generic site_name Mirror Cabin). Kept South Cape Mirror Cabin as sole Mirror Cabin SKU (qty 4).', date_updated = '2026-07-13' WHERE id = 10326;

UPDATE public.all_sage_data SET notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: leave unit_type Cabin. Site markets view-glass wall cabins (8×16 / 16-ft glass), not mirrored cladding / ÖÖD. Do not map to Mirror Cabin.', date_updated = '2026-07-13' WHERE id = 10490;
UPDATE public.all_sage_data SET notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: leave unit_type Cabin. Site markets view-glass wall cabins (8×16 / 16-ft glass), not mirrored cladding / ÖÖD. Do not map to Mirror Cabin.', date_updated = '2026-07-13' WHERE id = 10491;
UPDATE public.all_sage_data SET notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: leave unit_type Cabin. Site markets view-glass wall cabins (8×16 / 16-ft glass), not mirrored cladding / ÖÖD. Do not map to Mirror Cabin.', date_updated = '2026-07-13' WHERE id = 11600;
UPDATE public.all_sage_data SET lat = 30.567919, lon = -95.0551909, date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: geocoded 360 England Ln, Coldspring TX 77331 → 30.567919, -95.0551909.' WHERE id = 13089;
UPDATE public.all_sage_data SET address = '44 Roden Mill Road', zip_code = '72032', lat = 35.1049594, lon = -92.3143764, date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Light cleanup: set address 44 Roden Mill Road, Conway AR 72032; geocoded → 35.1049594, -92.3143764.' WHERE id = 13096;
