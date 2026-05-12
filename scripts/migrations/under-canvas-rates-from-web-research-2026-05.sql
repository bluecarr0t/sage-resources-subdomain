-- ============================================================================
-- Under Canvas: refresh seasonal rate_* columns from public "starting at"
-- anchors (May 2026 web research). Same approach used for AutoCamp on the
-- prior pass. Goal: kill the spring-spike / summer-NULL / max-fallback bias
-- that made spring > summer in the data.
--
-- Sources (retrieved 2026-05-06):
--   National Park Reservations per-camp "Room Rates & Details" pages, plus
--   undercanvas.com brand pages and direct booking widget snippets when NPR
--   404'd the camp. Per-camp anchors below cite the SKU's published
--   "Starting at $X /night" tier (lead-in for that tent type).
--
-- Per-row formula (USD): a = published "starting at" anchor.
--   winter_wd / winter_we → NULL  (every Under Canvas camp is closed in
--                                  Dec/Jan/Feb per undercanvas.com/camps)
--   spring_wd = round(a * 1.00)   spring_we = round(a * 1.20)
--   summer_wd = round(a * 1.32)   summer_we = round(a * 1.55)
--   fall_wd   = round(a * 0.96)   fall_we   = round(a * 1.16)
-- This yields summer mean ≈ a*1.435 > spring/fall means → peak > avg, which
-- aligns with normal hospitality season curves and with NPR rack tables.
--
-- White Mountains is opening June 2026 (closed in spring); special-cased.
-- ============================================================================

BEGIN;

WITH anchors(id, a) AS (
  VALUES
    -- Under Canvas Acadia (NPR Acadia rooms page, $/night)
    (9736,   557),  -- Safari Tent (legacy row; treated as Deluxe lead-in)
    (10155,  737),  -- Suite with Kids Tent
    (10156,  677),  -- Stargazer with Kids Tent
    (10157,  677),  -- Suite Tent
    (10158,  617),  -- Deluxe with Kids Tent
    (10159,  617),  -- Stargazer
    (10160,  557),  -- Deluxe Tent

    -- Under Canvas Bryce Canyon (NPR Bryce Canyon rooms page)
    (10287,  475),  -- Suite Tent
    (10288,  375),  -- Deluxe Tent
    (10289,  425),  -- Stargazer Tent

    -- Under Canvas Columbia River Gorge (NPR/undercanvas.com Columbia River Gorge)
    (10628,  829),  -- Mount Hood Suite (premium named, peer of El Capitan / Angels Landing)
    (10629,  419),  -- Suite with kids tent
    (10630,  359),  -- Stargazer with kids tent
    (10631,  320),  -- Deluxe with kids tent
    (10632,  379),  -- Suite tent
    (10633,  320),  -- Stargazer tent
    (10634,  271),  -- Deluxe tent (NPR "starting at $271")

    -- Under Canvas Glacier (NPR Glacier rooms page)
    (10175,  529),  -- Suite Tent
    (10176,  429),  -- Deluxe Tent
    (10177,  229),  -- Safari Tent with 3 twin bed
    (10178,  229),  -- Safari Tent

    -- Under Canvas Grand Canyon (NPR Grand Canyon rooms page)
    (10089,  499),  -- Suite Tent
    (10090,  399),  -- Stargazer Tent
    (10091,  329),  -- Deluxe Tent
    (10092,  179),  -- Safari Tent

    -- Under Canvas Great Smoky Mountains (NPR Smokies rooms page)
    (10248,  359),  -- Stargazer Tent
    (10249,  299),  -- Deluxe Tent
    (10250,  439),  -- Suite Tent
    (10251,  139),  -- Safari Tent

    -- Under Canvas Lake Powell-Grand Staircase (NPR overview $279 starting + tier inference)
    (10290,  419),  -- Suite Tent
    (10291,  339),  -- Stargazer Tent
    (10292,  279),  -- Deluxe Tent

    -- Under Canvas Moab (peer of Grand Canyon / Lake Powell southwest market)
    (10293,  499),  -- Suite Tent
    (10294,  399),  -- Stargazer Tent
    (10295,  329),  -- Deluxe Tent
    (10296,  199),  -- Safari Tent

    -- Under Canvas Mount Rushmore (NPR Mount Rushmore rooms page)
    (10239,  384),  -- Suite Tent
    (10240,  344),  -- Stargazer Tent
    (10241,  304),  -- Deluxe Tent
    (10242,  199),  -- Safari Tent

    -- Under Canvas North Yellowstone - Paradise Valley
    (10587, 1099),  -- Yellowstone River Suite (premium named)
    (10588,  579),  -- Suite with kids tent
    (10589,  479),  -- Stargazer with kids tent
    (10590,  499),  -- Suite tent
    (10591,  429),  -- DELUXE with kids tent
    (10592,  399),  -- Stargazer tent
    (10593,  349),  -- Deluxe suite

    -- Under Canvas West Yellowstone (Suite $574 published; tiers inferred)
    (10179, 1099),  -- Madison River Suite (premium named)
    (10180,  574),  -- Suite Tent
    (10181,  509),  -- Stargazer Tent
    (10182,  449),  -- Deluxe Tent
    (10183,  269),  -- Safari Tent

    -- Under Canvas Yosemite (NPR Yosemite rooms page)
    (10567,  999),  -- El Capitan Suite (premium)
    (10568,  494),  -- Suite tent
    (10569,  394),  -- Stargazer tent
    (10570,  384),  -- Deluxe tent

    -- Under Canvas Zion (NPR Zion rooms page)
    (10297,  829),  -- Angels Landing Suite (premium)
    (10298,  379),  -- Suite Tent
    (10299,  279),  -- Stargazer
    (10300,  219)   -- Deluxe Tent
)
UPDATE all_glamping_properties g
SET
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = round(anchors.a * 1.00)::numeric,
  rate_spring_weekend = round(anchors.a * 1.20)::numeric,
  rate_summer_weekday = round(anchors.a * 1.32)::numeric,
  rate_summer_weekend = round(anchors.a * 1.55)::numeric,
  rate_fall_weekday   = round(anchors.a * 0.96)::numeric,
  rate_fall_weekend   = round(anchors.a * 1.16)::numeric
FROM anchors
WHERE g.id = anchors.id;

-- White Mountains opens Jun 4, 2026 → spring is closed; only summer + early fall.
UPDATE all_glamping_properties
SET
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = 279,
  rate_summer_weekend = round(279 * 1.20)::numeric,
  rate_fall_weekday   = round(279 * 1.05)::numeric,
  rate_fall_weekend   = round(279 * 1.20)::numeric
WHERE id = 9751;

COMMIT;
