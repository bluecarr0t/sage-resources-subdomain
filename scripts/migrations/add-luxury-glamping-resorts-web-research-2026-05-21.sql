-- Luxury glamping resorts (May 2026 web research).
-- Sources: AFAR "The World's Best Glamping Retreats" (Apr 2026), Modern Campground, operator sites.
-- discovery_source = web_research_2026_05_luxury_glamping
-- research_status = in_progress
--
-- Dedupe (skip insert when any match exists in all_glamping_properties):
--   1) slug (exact, case-insensitive)
--   2) normalized property_name + unit_type + country + state
--   3) sage_property_dedupe_key_for_aggregation + unit_type + site_name
-- Safe to re-run: unmatched rows only.

-- Normalized name key for web-research dedupe (alphanumeric, lowercased).
CREATE OR REPLACE FUNCTION public.sage_normalize_property_name_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(btrim(COALESCE(p_name, '')), '[^a-z0-9]', '', 'g'));
$$;

INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
  site_name,
  slug,
  property_type,
  unit_type,
  source,
  discovery_source,
  country,
  state,
  city,
  address,
  lat,
  lon,
  url,
  description,
  notes,
  date_added,
  date_updated,
  land_operator_category,
  glamping_service_tier,
  glamping_service_tier_source,
  glamping_service_tier_notes
)
SELECT
  v.research_status,
  v.is_glamping_property,
  v.is_open,
  v.property_name,
  v.site_name,
  v.slug,
  v.property_type,
  v.unit_type,
  v.source,
  v.discovery_source,
  v.country,
  v.state,
  v.city,
  v.address,
  v.lat,
  v.lon,
  v.url,
  v.description,
  v.notes,
  v.date_added,
  v.date_updated,
  v.land_operator_category,
  v.glamping_service_tier,
  v.glamping_service_tier_source,
  v.glamping_service_tier_notes
FROM (
  VALUES
  (
    'in_progress', 'Yes', 'Yes',
    'East Zion Resort', 'Safari Tent',
    'east-zion-resort-glamping-tent-orderville-ut',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'United States', 'UT', 'Orderville',
    '490 E State St, Orderville, UT 84758',
    37.280::numeric, -112.638::numeric,
    'https://www.eastzionresort.com/glamping-tents',
    $$Luxury glamping resort between Bryce Canyon and Zion: canvas glamping tents plus yurts, treehouses, mirror houses, stargazer cabins, Airstreams, and lodge amenities (pools, pickleball, rock climbing, FareHarbor adventure desk). Marketed as a gateway resort with central access to both parks; verify live inventory and seasonal rates on Guesty bookings.$$,
    $$Sources: eastzionresort.com + Tin Roof / Moab Times luxury glamping press (May 2026 web research). Primary glamping tent product line.$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Multi-structure luxury resort; AFAR-adjacent Utah corridor comp set (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'East Zion Resort', 'Yurt',
    'east-zion-resort-yurt-orderville-ut',
    'Glamping Resort', 'Yurt',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'United States', 'UT', 'Orderville',
    '490 E State St, Orderville, UT 84758',
    37.280::numeric, -112.638::numeric,
    'https://www.eastzionresort.com/yurts',
    $$East Zion Resort yurt inventory on the same Orderville campus as glamping tents and adventure programming—positioned as upscale outdoor lodging near Zion/Bryce with resort pools and guided experiences.$$,
    $$Sources: eastzionresort.com lodging menu (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Distinct yurt product at East Zion Resort (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Savannah Sunset Resort and Spa', NULL,
    'savannah-sunset-resort-and-spa-jackson-nj',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'United States', 'NJ', 'Jackson',
    'Six Flags Wild Safari, 1 Six Flags Blvd, Jackson, NJ 08527',
    40.138::numeric, -74.440::numeric,
    'https://www.sixflags.com/greatadventure/savannahsunset',
    $$Six Flags Great Adventure luxury glamping within the 350-acre Wild Safari: private-suite glamping with en suite baths, restaurant/bar, spa, fire pits, and safari/animal encounter packages (2-night minimum often cited from ~$1,025). Season typically May–November; verify 2026 inventory on reservations.sixflags.com.$$,
    $$Sources: sixflags.com/savannahsunset + Modern Campground NJ luxury glamping reopening (Feb 2025, May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Theme-park-embedded luxury safari glamping; premium package pricing (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Al Maha, a Luxury Collection Desert Resort & Spa', NULL,
    'al-maha-luxury-collection-dubai-ae',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'United Arab Emirates', NULL, 'Dubai Desert Conservation Reserve',
    'Dubai Desert Conservation Reserve, Dubai, UAE',
    24.850::numeric, 55.550::numeric,
    'https://www.marriott.com/en-us/hotels/dxbam-al-maha-a-luxury-collection-desert-resort-and-spa-dubai/overview/',
    $$Bedouin-inspired luxury tented suites in the Dubai Desert Conservation Reserve (42 units) with Arabian oryx and gazelle on site; spa, fine dining, and conservation programming. AFAR cites rates from ~$500; verify Marriott Luxury Collection availability and desert activity bundles.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); Marriott Al Maha overview (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; desert conservation reserve setting (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'andBeyond Punakha River Lodge', NULL,
    'andbeyond-punakha-river-lodge-punakha-bt',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Bhutan', NULL, 'Punakha',
    'Mo Chhu River, Punakha Valley, Bhutan',
    27.590::numeric, 89.860::numeric,
    'https://www.andbeyond.com/our-lodges/asia/bhutan/punakha/andbeyond-punakha-river-lodge/',
    $$andBeyond's first Asia lodge: six riverfront tented suites plus one- and two-bedroom villas on the Mo Chhu with hardwood floors, brass soaking tubs, spa, and valley excursions (dzongs, rafting, village culture). AFAR cites rates from ~$890; verify seasonal opening and I Prefer benefits.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); andBeyond lodge page (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; six tented suites in Bhutan (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Capella Ubud', 'Keliki Valley Tent',
    'capella-ubud-keliki-valley-tent-bali-id',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Indonesia', NULL, 'Keliki',
    'Keliki Village, Ubud area, Bali, Indonesia',
    -8.450::numeric, 115.280::numeric,
    'https://capellahotels.com/en/capella-ubud',
    $$Bill Bensley-designed rainforest retreat with 23 teak-floored tented suites (no trees felled), private plunge pools, saltwater pool, and artisan-carved interiors ~4.5 miles from central Ubud. AFAR cites rates from ~$650; verify Capella booking and temple-transfer logistics.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); Capella Ubud site (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; tented suites in Bali (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Four Seasons Tented Camp Golden Triangle', NULL,
    'four-seasons-tented-camp-golden-triangle-chiang-rai-th',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Thailand', NULL, 'Chiang Rai',
    'Ruak River, Chiang Rai (Golden Triangle), Thailand',
    20.350::numeric, 100.080::numeric,
    'https://www.fourseasons.com/goldentriangle/',
    $$Canvas-and-teak safari tents on raised platforms in bamboo forest where Thailand, Laos, and Myanmar meet; each tent unique with clawfoot tubs, outdoor showers, elephant encounters, and destination dining. AFAR cites rates from ~$2,655; verify longtail boat transfer and FHR benefits.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); Four Seasons Golden Triangle (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Golden Triangle elephant camp (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Longitude 131°', NULL,
    'longitude-131-uluru-nt-au',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Australia', 'NT', 'Yulara',
    'Near Uluṟu-Kata Tjuṯa National Park, Northern Territory, Australia',
    -25.240::numeric, 131.050::numeric,
    'https://longitude131.com.au/',
    $$Sixteen luxury tented pavilions overlooking Uluṟu and Kata Tjuṯa with floor-to-ceiling desert views, outdoor star beds, and Indigenous-led astronomy programming. AFAR cites rates from ~$3,161; verify Dune Pavilion inventory and park pass requirements.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); longitude131.com.au (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Uluru luxury tented camp (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Naviva, a Four Seasons Resort', NULL,
    'naviva-four-seasons-resort-punta-mita-mx',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Mexico', 'Nayarit', 'Punta de Mita',
    'Punta Mita, Riviera Nayarit, Mexico',
    20.790::numeric, -105.520::numeric,
    'https://www.fourseasons.com/naviva/',
    $$Adults-only Four Seasons jungle camp with 15 tented bungalows under monarch-butterfly-inspired canopies, plunge pools, outdoor showers, and proximity to Punta Mita beaches. AFAR cites rates from ~$3,861; verify adults-only policy and FS reservation links.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); Four Seasons Naviva (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Four Seasons tented bungalows Mexico (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Nayara Tented Camp', NULL,
    'nayara-tented-camp-la-fortuna-cr',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Costa Rica', NULL, 'La Fortuna',
    'Arenal Natura Ecological Park, La Fortuna, Costa Rica',
    10.470::numeric, -84.700::numeric,
    'https://nayaratentedcamp.com/',
    $$37 safari-style tents on a 62-acre rewilded estate facing Arenal volcano with hot-spring-fed private pools, butler service, and family multi-bedroom units; sister to Nayara Gardens/Springs. AFAR cites rates from ~$1,221; verify LHW Leaders Club and sloth-habitat tours.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); nayaratentedcamp.com (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Arenal volcano tented camp (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Sal Salis', NULL,
    'sal-salis-exmouth-wa-au',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Australia', 'WA', 'Exmouth',
    'Cape Range National Park, Ningaloo Reef, Western Australia',
    -21.930::numeric, 113.980::numeric,
    'https://www.salsalis.com.au/',
    $$Fifteen wilderness tents on Ningaloo Reef dunes with reef-snorkeling from camp, included kayaking/hiking, and seasonal whale-shark encounters; meals and guided activities bundled. AFAR cites rates from ~$750; verify seasonal closures and flight access via Exmouth/Learmonth.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); salsalis.com.au (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Ningaloo Reef eco-luxe tents (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Shinta Mani Wild', NULL,
    'shinta-mani-wild-koh-kong-kh',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Cambodia', NULL, 'Koh Kong',
    'South Cardamom rainforest, Koh Kong Province, Cambodia',
    11.580::numeric, 103.880::numeric,
    'https://shintamani.com/wild/',
    $$Bill Bensley-designed conservation camp: 15 bespoke tents on 865 acres purchased from a logging auction, with zip-line, river kayaking, Wildlife Alliance patrols, and open-air bathtubs. AFAR cites rates from ~$1,900; verify all-inclusive inclusions and transfer from Phnom Penh/Siem Reap.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); shintamani.com/wild (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Cardamom rainforest tents (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Suján Jawai', NULL,
    'sujan-jawai-pali-rj-in',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'India', 'RJ', 'Jawai',
    'Aravalli Hills, Pali District, Rajasthan, India',
    25.080::numeric, 73.680::numeric,
    'https://thesujanlife.com/sujan-camps/sujan-jawai',
    $$Ten luxury tents in leopard country of Rajasthan with conservation-led village coexistence, Marwari horse rides, pool, and cocktail/fireside dining. AFAR cites rates from ~$1,100; verify Suján Life booking and seasonal wildlife activity calendar.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); thesujanlife.com Jawai (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Jawai leopard camp (May 2026 web research).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Three Camel Lodge', NULL,
    'three-camel-lodge-gobi-mn',
    'Glamping Resort', 'Yurt',
    'Sage', 'web_research_2026_05_luxury_glamping',
    'Mongolia', NULL, 'Gobi Desert',
    'Gobi Altai Mountains, South Gobi, Mongolia',
    43.730::numeric, 103.430::numeric,
    'https://www.threecamellodge.com/',
    $$40 luxury ger tents with wool carpets, wood stoves, and en suite stone bathrooms in the Gobi; excursions to Khongoryn Els dunes and Flaming Cliffs dinosaur sites. AFAR cites bundled rates from ~$2,425/person for two nights; verify seasonal ger inventory and flight routing via Ulaanbaatar.$$,
    $$Sources: AFAR Hotels We Love glamping list (Apr 2026); threecamellodge.com (May 2026 web research). Unit type = luxury ger (yurt class).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'AFAR global luxury glamping pick; Gobi luxury ger camp (May 2026 web research).'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.all_glamping_properties p
  WHERE lower(btrim(COALESCE(p.slug, ''))) = lower(btrim(v.slug))
     OR (
       public.sage_normalize_property_name_key(p.property_name)
         = public.sage_normalize_property_name_key(v.property_name)
       AND lower(btrim(COALESCE(p.unit_type, ''))) = lower(btrim(COALESCE(v.unit_type, '')))
       AND lower(btrim(COALESCE(p.country, ''))) = lower(btrim(COALESCE(v.country, '')))
       AND COALESCE(upper(btrim(p.state)), '') = COALESCE(upper(btrim(v.state)), '')
     )
     OR (
       public.sage_property_dedupe_key_for_aggregation(
         p.address, p.property_name, p.city, p.state, p.country
       ) = public.sage_property_dedupe_key_for_aggregation(
         v.address, v.property_name, v.city, v.state, v.country
       )
       AND lower(btrim(COALESCE(p.unit_type, ''))) = lower(btrim(COALESCE(v.unit_type, '')))
       AND COALESCE(lower(btrim(p.site_name)), '') = COALESCE(lower(btrim(v.site_name)), '')
     )
);
