-- ============================================================================
-- Merge 37 flagged property-name duplicate clusters.
-- Review/Keep clusters are not touched (Charmed split, WYLDSTAY, Ecochique,
-- campus pairs, brand portfolios).
--
-- Pattern: remap complementary SKUs onto the keep property_id + name, then
-- delete empty / rejected / rollup aliases.
-- ============================================================================

BEGIN;

-- 1. The Look RV Resort — keep 90-site RV row; cabin row is extra inventory
UPDATE all_sage_data
SET property_id = '233ae5ee-0b9e-4270-b0af-ca8847f665af',
    property_name = 'The Look RV Resort',
    slug = 'the-look-rv-resort',
    city = 'Blanding',
    state = 'UT',
    country = 'United States',
    property_total_sites = 114
WHERE id IN (12982, 13241);

-- 2. Treehouse Point — same property_id; normalize name/city; drop rollup
UPDATE all_sage_data
SET property_name = 'Treehouse Point',
    city = 'Fall City',
    slug = 'treehouse-point'
WHERE property_id = 'a3178651-a97d-4c5d-8de3-fc0c05e3ce26';
DELETE FROM all_sage_data WHERE id = 31;

-- 3. Asheville River Cabins — keep typed SKUs; fix spelling; drop empty alias
UPDATE all_sage_data
SET property_name = 'Asheville River Cabins',
    slug = 'asheville-river-cabins-arden-nc'
WHERE property_id = '33c39bef-19cf-43b9-b79a-6eaedfea9ff7';
DELETE FROM all_sage_data WHERE id = 12212;

-- 4. Camp V — keep Camp V; add CampV Jupe SKU
UPDATE all_sage_data
SET property_id = '03973add-9b42-4a1d-a814-bd2d97b3f908',
    property_name = 'Camp V',
    slug = 'camp-v',
    property_total_sites = 12
WHERE id IN (10431, 10432, 10313);

-- 5. UDOSCAPE — drop same-qty alias
DELETE FROM all_sage_data WHERE id = 10676;

-- 6. Jellystone Bremen — drop rejected alias
DELETE FROM all_sage_data WHERE id = 11560;

-- 7. Lakedale — keep Lakedale SKUs; add Resort log cabins; drop overlapping yurt/tent
UPDATE all_sage_data
SET property_id = '34e99c8b-17ed-4e47-936a-21ad44e73ac1',
    property_name = 'Lakedale',
    slug = 'lakedale',
    city = 'Friday Harbor'
WHERE id = 10550;
DELETE FROM all_sage_data WHERE id IN (9839, 10408);

-- 8. Costanoa — drop empty Lodge alias
DELETE FROM all_sage_data WHERE id = 9552;

-- 9. Zion Ponderosa Ranch Resort — drop short-name / junk rows
DELETE FROM all_sage_data WHERE id IN (10071, 10665);

-- 10. Conestoga Ranch — drop in_progress rollup
DELETE FROM all_sage_data WHERE id = 13122;

-- 11. Camp Long Creek — drop rejected longer name
DELETE FROM all_sage_data WHERE id = 205;

-- 12. The Fields of Michigan — drop rejected short name + rejected tent shell
DELETE FROM all_sage_data WHERE id IN (13125, 9623);

-- 13. Boyne Mountain Resort Glamping Cabins — drop rejected parent
DELETE FROM all_sage_data WHERE id = 11468;

-- 14. The Sequoia High Sierra Camp — drop empty The-less alias
DELETE FROM all_sage_data WHERE id = 9563;

-- 15. The Resort at Paws Up — keep official name; keep Montana SKUs; drop 10-tent alias
UPDATE all_sage_data
SET property_id = 'a6bf3611-ae72-420f-a1ca-fe010defd1a2',
    property_name = 'The Resort at Paws Up',
    slug = 'the-resort-at-paws-up'
WHERE id IN (10405, 10481);
DELETE FROM all_sage_data WHERE id = 10173;

-- 16. Siwash Lake Wilderness Resort & Ranch — drop short-name cabin dup
DELETE FROM all_sage_data WHERE id = 10767;

-- 17. The Destination — drop empty longer alias
DELETE FROM all_sage_data WHERE id = 9669;

-- 18. Ventana Big Sur — drop in_progress Alila suffix
DELETE FROM all_sage_data WHERE id = 12933;

-- 19. Firelight Camps — drop empty Ithaca alias
DELETE FROM all_sage_data WHERE id = 10843;

-- 20. Clayoquot Wilderness Lodge — drop empty same-id draft + Resort rebrand
DELETE FROM all_sage_data WHERE id IN (11, 11460);

-- 21. Fforest — drop Farm alias
DELETE FROM all_sage_data WHERE id = 11265;

-- 22. Aterra — drop Eco Camping alias
DELETE FROM all_sage_data WHERE id = 11165;

-- 23. De Wije Werelt — drop Glamping-prefix alias
DELETE FROM all_sage_data WHERE id = 11112;

-- 24. Glamping Jungfrau — drop two campground drafts
DELETE FROM all_sage_data WHERE id IN (11221, 11226);

-- 25. Camping & Glamping Allweglehen — drop Resort alias
DELETE FROM all_sage_data WHERE id = 11001;

-- 26. Canonici di San Marco — drop prefix alias + Marbella copy-paste
DELETE FROM all_sage_data WHERE id IN (11049, 11172);

-- 27. Your Nature — remap treehouse SKU onto keep id
UPDATE all_sage_data
SET property_id = '19f73315-387e-4f10-af42-ccc56ca80a78',
    property_name = 'Your Nature',
    slug = 'your-nature'
WHERE id = 10975;

-- 28. Warredal — remap treehouse draft onto published cabin property
UPDATE all_sage_data
SET property_id = 'ee6d3a55-46bb-421f-ac12-8557540c48b0',
    property_name = 'Warredal',
    slug = 'warredal'
WHERE id = 10974;

-- 29. Longlands — keep Longlands; drop two safari-tent aliases
DELETE FROM all_sage_data WHERE id IN (11290, 11297);

-- 30. Monument Glamping — keep tent inventory; fix name/city; drop empty shell
UPDATE all_sage_data
SET property_id = '85c5b687-4623-48de-bd91-3e08a3cb44b7',
    property_name = 'Monument Glamping',
    slug = 'monument-glamping',
    city = 'Monument',
    state = 'CO'
WHERE id = 10670;
DELETE FROM all_sage_data WHERE id = 10794;

-- 31. Forest Days — drop Glamping-suffix alias
DELETE FROM all_sage_data WHERE id = 11169;

-- 32. Wonder Inn Resort — drop empty short name
DELETE FROM all_sage_data WHERE id = 13191;

-- 33. Nutchel Cosy Cabins — drop three drafts
DELETE FROM all_sage_data WHERE id IN (10990, 10967, 10992);

-- 34. Camping- und Ferienpark Wulfener Hals — drop glamping-village alias
DELETE FROM all_sage_data WHERE id = 11018;

-- 35. Camping De Zeeuwse Kust — drop Glamping-prefix alias
DELETE FROM all_sage_data WHERE id = 11133;

-- 36. Frost Mountain Yurts — drop The Yurt Village alias
DELETE FROM all_sage_data WHERE id = 110;

-- 37. Timberline Glamping at Lake Lanier River Forks — drop superseded draft
DELETE FROM all_sage_data WHERE id = 128;

COMMIT;
