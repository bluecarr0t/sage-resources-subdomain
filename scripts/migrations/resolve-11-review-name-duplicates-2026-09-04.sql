-- ============================================================================
-- Resolve the 11 Review clusters from the property-name duplicate audit.
-- Researched 2026-09-04 before apply.
-- ============================================================================

BEGIN;

-- 1. Charmed Resorts — two real AB campuses sharing one property_id
UPDATE all_sage_data
SET property_id = gen_random_uuid(),
    slug = 'charmed-resorts-mulhurst-bay-ab',
    property_total_sites = 60
WHERE id = 11445;
UPDATE all_sage_data
SET property_total_sites = 60
WHERE TRIM(property_name) = 'Charmed Resorts — Crowsnest Pass';

-- 2. WYLDSTAY / Nature Nook / Starlight — three different SC businesses.
--    Nature Nook and Starlight had WYLDSTAY URL/phone/coords copied on.
UPDATE all_sage_data
SET address = '643 Pennington Rd'
WHERE id = 9761;
UPDATE all_sage_data
SET url = 'https://naturenookretreats.com/',
    address = '2325 Hampton Road',
    city = 'Wellford',
    state = 'SC',
    phone_number = NULL,
    lat = NULL,
    lon = NULL
WHERE id = 9759;
UPDATE all_sage_data
SET url = 'https://starlightglampingus.com/',
    city = 'Marietta',
    state = 'SC',
    address = NULL,
    phone_number = NULL,
    lat = NULL,
    lon = NULL
WHERE id = 9760;

-- 3. Asheville Glamping vs The Glamping Collective — two operators.
--    Asheville rows inherited Collective phone + Clyde coords.
UPDATE all_sage_data
SET phone_number = NULL,
    lat = 35.7063519,
    lon = -82.6112299,
    city = 'Alexander'
WHERE property_id = '6df0aaac-7796-457a-8c71-babd2699c838';

-- 4. Keola Retreat — Hilo Glamping Yurt is the same Naalehu dome listing
DELETE FROM all_sage_data WHERE id = 9708;

-- 5. Bel Air Resort Mont-Tremblant — 42-unit "Bel Air Tremblant" is a rollup
DELETE FROM all_sage_data WHERE id = 13056;

-- 6. The Yurtopian — two real Hill Country sites; fix DS rollup qty (16 was brand total)
UPDATE all_sage_data
SET property_name = 'The Yurtopian Dripping Springs',
    slug = 'the-yurtopian-dripping-springs',
    quantity_of_units = 10,
    property_total_sites = 10
WHERE id = 9831;

-- 7. Marmora Retreat — expansion news row is the same parcel; keep operator name
UPDATE all_sage_data
SET address = 'Marble Point Rd, Marmora and Lake, ON',
    lat = 44.484,
    lon = -77.689
WHERE id = 13080;
DELETE FROM all_sage_data WHERE id = 12003;

-- 8. Eastwind Hotel & Bar (rejected) vs Eastwind Lushna — keep separate. No change.

-- 9. Ipfun — typo listing of Long Point Eco-Adventures (same lpfun.ca + Front Rd)
UPDATE all_sage_data
SET property_id = 'd81051a4-9833-4a01-985e-65300621f1c8',
    property_name = 'Long Point Eco-Adventures Resort & Retreat Centre',
    slug = 'long-point-eco-adventures-resort-retreat-centre',
    city = 'Turkey Point',
    address = '1730 Front Rd'
WHERE id = 10770;

-- 10. Ecochique — one Westouter site; Lommel + Froidchapelle are alias cities
UPDATE all_sage_data
SET city = 'Westouter',
    address = 'Hellegatstraat 4, 8954 Westouter'
WHERE id = 10960;
DELETE FROM all_sage_data WHERE id IN (10971, 10976);

-- 11. Lake Compounce — do not merge with Lago Linda; undo copied KY fields
UPDATE all_sage_data
SET url = 'https://www.lakecompounce.com/'
WHERE id = 9900;
UPDATE all_sage_data
SET property_id = '8f95ef51-7136-4729-9a96-04e22bb62165',
    property_name = 'Lago Linda Hideaway',
    slug = 'lago-linda-hideaway',
    city = 'Beattyville',
    state = 'KY',
    address = '950 Blacks Ridge Rd',
    url = 'https://lagolinda.com/',
    phone_number = '+1 606-464-2876',
    lat = 37.6136845,
    lon = -83.7722059
WHERE id = 10471;

COMMIT;
