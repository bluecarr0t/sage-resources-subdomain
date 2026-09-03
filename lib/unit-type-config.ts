/**
 * Configuration for glamping unit type discovery pages
 * Maps URL slugs to display names and database match patterns
 */

export interface UnitTypeConfig {
  slug: string;
  displayName: string;
  /** Patterns for Supabase ilike (e.g. "%yurt%") */
  matchPatterns: string[];
  /** Short sentence used as the Quick Answer / page intro. Optional override. */
  quickAnswer?: string;
  /** Primary SEO keyword (e.g. "dome glamping"). Used in title + description. */
  primaryKeyword?: string;
  /** Comma-separated secondary keywords for the <meta keywords> tag. */
  secondaryKeywords?: string[];
  /** Tailored FAQ pairs rendered on the page and emitted as FAQPage schema. */
  faqs?: Array<{ question: string; answer: string }>;
}

export const UNIT_TYPE_CONFIGS: UnitTypeConfig[] = [
  // ── Existing four ─────────────────────────────────────────────────────────
  {
    slug: 'yurts',
    displayName: 'Yurts',
    matchPatterns: ['%yurt%'],
    primaryKeyword: 'yurt glamping',
    secondaryKeywords: ['what is a yurt', 'glamping yurts', 'yurt rental', 'luxury yurt'],
    quickAnswer:
      'A yurt is a circular, lattice-walled tent of Central Asian origin. In glamping, yurts are permanent or semi-permanent structures on a wood platform, furnished with real beds, climate control, and often private bathrooms. They are one of the most widely available glamping unit types in the US and Canada.',
    faqs: [
      {
        question: 'What is a yurt glamping experience like?',
        answer:
          'Yurt glamping combines the circular, open-plan interior of a traditional yurt with hotel-grade amenities — real beds, electricity, heating, and often a private bathroom or outdoor shower. Most glamping yurts are on raised wood platforms in scenic locations.',
      },
      {
        question: 'How much does yurt glamping cost per night?',
        answer:
          'Nightly rates for glamping yurts typically range from $150–$400+ depending on location, season, and amenities. Yurts with private bathrooms, hot tubs, or premium views command the higher end of that range.',
      },
      {
        question: 'Are yurts good for year-round glamping?',
        answer:
          'Yes. Many glamping yurts are insulated and climate-controlled for four-season use. Wood stoves or electric heat make winter yurt stays comfortable, though operators in cold climates often see peak demand in summer and fall.',
      },
    ],
  },
  {
    slug: 'safari-tents',
    displayName: 'Safari Tents',
    matchPatterns: ['%safari%tent%', '%safari tent%', '%wall tent%'],
    primaryKeyword: 'safari tent glamping',
    secondaryKeywords: ['luxury safari tent', 'canvas safari tent', 'wall tent glamping', 'safari glamping'],
    quickAnswer:
      'A safari tent is a canvas tent on a rigid metal or wood frame with straight vertical walls — closer to a hotel room in footprint than a traditional pole tent. Most glamping safari tents are semi-permanent on raised decks and include full beds, electricity, and often private bathrooms.',
    faqs: [
      {
        question: 'What is a glamping safari tent?',
        answer:
          'A glamping safari tent (or wall tent) has four straight walls and a peaked roof on a heavy rigid frame, offering hotel-room floor space. Unlike camping tents, they are semi-permanent structures on decks with real beds, furnishings, and often private bathrooms.',
      },
      {
        question: 'How is a safari tent different from a bell tent?',
        answer:
          'Safari tents have vertical straight walls and a peaked gabled roof — like a room. Bell tents have a single central pole and a conical shape with sloping walls that reduce usable floor area. Safari tents generally offer more livable space and are more commonly used for upscale glamping.',
      },
      {
        question: 'Are safari tents good for glamping year-round?',
        answer:
          'Safari tents can be year-round with proper insulation, wood stoves, or climate control — though most operators in northern states run them seasonally (May–October). The canvas breathes well in summer and holds heat reasonably in shoulder seasons.',
      },
    ],
  },
  {
    slug: 'a-frames',
    displayName: 'A-Frames',
    matchPatterns: ['%a-frame%', '%a frame%'],
    primaryKeyword: 'A-frame glamping',
    secondaryKeywords: ['A-frame cabin glamping', 'glamping A-frame cabin', 'triangle cabin glamping'],
    quickAnswer:
      'An A-frame is a triangular cabin with steeply angled sides that meet at the roofline. A-frames are hard-walled structures — warmer, more private, and more year-round than canvas units. They typically include a sleeping loft, full bathroom, and kitchen, and command premium nightly rates.',
    faqs: [
      {
        question: 'What is an A-frame glamping cabin?',
        answer:
          'An A-frame cabin has a distinctive triangle cross-section: two angled rooflines meet at the peak, forming the letter "A." Glamping A-frames are typically hard-walled, fully insulated structures with a sleeping loft, bathroom, and often a full kitchen and outdoor deck.',
      },
      {
        question: 'Are A-frames available year-round?',
        answer:
          'Yes. A-frames are hard structures with proper insulation and HVAC, making them well-suited for four-season use. The steep roof sheds snow efficiently, which is why A-frames are popular in mountain and ski markets.',
      },
      {
        question: 'How much does an A-frame glamping stay cost?',
        answer:
          'A-frame glamping rates typically run $200–$500+ per night. Mountain markets near ski areas command the highest rates. Properties with hot tubs, sauna, or panoramic views can exceed $600/night at peak periods.',
      },
    ],
  },
  {
    slug: 'treehouses',
    displayName: 'Treehouses',
    matchPatterns: ['%treehouse%'],
    primaryKeyword: 'treehouse glamping',
    secondaryKeywords: ['glamping treehouses', 'luxury treehouse rental', 'treetop glamping'],
    quickAnswer:
      'Glamping treehouses are elevated structures built among or around trees, offering a treetop experience with luxury amenities. They consistently command some of the highest nightly rates in glamping due to their rarity, views, and social-media appeal.',
    faqs: [
      {
        question: 'What makes treehouse glamping special?',
        answer:
          'Treehouses provide an elevated perspective — literally — with treetop views, a sense of seclusion, and strong social-media appeal that drives premium pricing. Most glamping treehouses include private bathrooms, real beds, and climate control.',
      },
      {
        question: 'How much does treehouse glamping cost?',
        answer:
          'Treehouse glamping typically runs $250–$700+ per night. Properties with engineering-grade platforms, suspension bridges, or unique forest settings can charge at the top of that range year-round.',
      },
      {
        question: 'Are glamping treehouses safe and structurally sound?',
        answer:
          'Reputable glamping operators have treehouses engineered by licensed structural engineers. Platforms are typically bolted to trees using specialized hardware (garnier limbs) that minimizes tree damage. Inspect permits and engineering documents when evaluating a treehouse glamping business.',
      },
    ],
  },

  // ── New eight ─────────────────────────────────────────────────────────────
  {
    slug: 'domes',
    displayName: 'Geodesic Domes',
    matchPatterns: ['%dome%', '%geodome%', '%geodesic%'],
    primaryKeyword: 'dome glamping',
    secondaryKeywords: ['geodesic dome glamping', 'glamping dome', 'transparent dome glamping', 'stargazing dome'],
    quickAnswer:
      'A glamping dome is a geodesic or spherical structure with a network of triangular panels — often partially transparent — that delivers panoramic views and a modern, futuristic aesthetic. Domes are highly sought after for stargazing, command premium nightly rates, and are one of the fastest-growing glamping unit types in the US.',
    faqs: [
      {
        question: 'What is dome glamping?',
        answer:
          'Dome glamping is staying overnight in a geodesic or spherical glamping structure with transparent panels, large windows, or a stargazing skylight. Domes combine modern design, structural strength, and 360-degree views of the surrounding landscape or night sky.',
      },
      {
        question: 'How much does a glamping dome cost per night?',
        answer:
          'Glamping dome rates typically range from $200–$600+ per night depending on location, season, and amenities. Transparent stargazing domes in dark-sky locations command the highest rates.',
      },
      {
        question: 'Are geodesic domes good for winter glamping?',
        answer:
          'Yes. Geodesic domes can be highly insulated and climate-controlled for year-round use. Their shape sheds wind and snow efficiently. Many operators in mountain markets run domes through winter, positioning them for ski-season and aurora-viewing demand.',
      },
    ],
  },
  {
    slug: 'cabins',
    displayName: 'Cabins',
    matchPatterns: ['%cabin%'],
    primaryKeyword: 'glamping cabins',
    secondaryKeywords: ['cabin glamping', 'luxury cabin rental', 'glamping cabin near me', 'rustic cabin glamping'],
    quickAnswer:
      'Glamping cabins are fully furnished hard-walled structures ranging from rustic wood cabins with basic amenities to luxury cabins with hot tubs, full kitchens, and premium finishes. Cabins are the most common unit type in Sage\'s database and span the widest price range of any glamping accommodation.',
    faqs: [
      {
        question: 'What is the difference between a glamping cabin and a regular cabin rental?',
        answer:
          'A glamping cabin is typically located within a curated glamping resort or outdoor hospitality property that offers additional amenities — communal fire pits, activities, on-site staff, and often a luxury feel — rather than a standalone private cabin rental. The key distinction is the resort context and bundled experience.',
      },
      {
        question: 'How much do glamping cabins cost per night?',
        answer:
          'Cabin glamping rates span the widest range of any unit type: basic wood cabins run $100–$200/night, mid-range furnished cabins $200–$350/night, and luxury cabins with hot tubs and premium finishes $350–$700+ per night.',
      },
      {
        question: 'Are glamping cabins available year-round?',
        answer:
          'Yes. Hard-walled, insulated cabins are among the most year-round-viable glamping unit types. They can be fully heated and cooled, and their structural permanence makes them operable in all seasons — unlike canvas units that often close in winter.',
      },
    ],
  },
  {
    slug: 'tiny-homes',
    displayName: 'Tiny Homes',
    matchPatterns: ['%tiny%home%', '%tiny%house%'],
    primaryKeyword: 'tiny home glamping',
    secondaryKeywords: ['what is a tiny house', 'tiny house rental', 'glamping tiny home', 'tiny house glamping'],
    quickAnswer:
      'Glamping tiny homes are compact stand-alone structures — typically under 400 square feet — that pack a full kitchen, bathroom, sleeping loft, and living area into an efficient footprint. They appeal to guests curious about the tiny-house lifestyle and to operators who want to maximize per-acre unit density.',
    faqs: [
      {
        question: 'What is a tiny home glamping experience like?',
        answer:
          'Tiny home glamping delivers full house amenities — kitchen, bathroom, bed, living space — in a compact, cleverly designed package. Guests experience the tiny-house lifestyle without committing to it permanently. Many units have sleeping lofts, fold-out furniture, and large windows to offset the small interior.',
      },
      {
        question: 'How is a glamping tiny home different from a cabin?',
        answer:
          'Tiny homes emphasize space efficiency and minimalist design and are typically 150–400 sq ft. Cabins are usually larger with a more traditional layout. Tiny homes may be mobile (on trailers), while cabins are almost always on permanent foundations.',
      },
      {
        question: 'Are tiny homes good for families?',
        answer:
          'Tiny homes work well for couples and small families with one child. Larger families often find them tight. Look for units with sleeping lofts or convertible sofa beds if bringing kids. Some glamping properties offer larger "expanded" tiny homes (400–600 sq ft) for families.',
      },
    ],
  },
  {
    slug: 'bell-tents',
    displayName: 'Bell Tents',
    matchPatterns: ['%bell%tent%', '%bell tent%'],
    primaryKeyword: 'bell tent glamping',
    secondaryKeywords: ['what is a bell tent', 'glamping bell tent', 'bell tent rental', 'canvas bell tent'],
    quickAnswer:
      'A bell tent is a circular canvas tent with a single central pole and a conical shape — the simplest and most affordable entry point for glamping operators. Bell tents are popular for boutique glamping and festival-style sites. They typically include a real bed and basic furnishings but less floor space than safari tents.',
    faqs: [
      {
        question: 'What is a bell tent?',
        answer:
          'A bell tent is a circular canvas tent supported by a single central pole, with sloping sides and a peaked top that resembles a bell from the outside. In glamping, bell tents are furnished with real beds, rugs, lighting, and sometimes wood stoves — but retain the authentic canvas tent aesthetic.',
      },
      {
        question: 'How is a bell tent different from a safari tent?',
        answer:
          'Bell tents have a central pole and conical shape with sloping walls that reduce usable floor area — more like a traditional tent. Safari tents have straight vertical walls on a rigid frame with hotel-room-style floor space. Safari tents are generally more spacious and upscale; bell tents are more entry-level and romantic.',
      },
      {
        question: 'How much does a bell tent glamping stay cost?',
        answer:
          'Bell tent glamping is typically the most affordable glamping option, running $100–$250/night. Because they are simpler structures, bell tent glamping properties often have lower startup costs and can operate seasonally with minimal infrastructure.',
      },
    ],
  },
  {
    slug: 'tipis',
    displayName: 'Tipis',
    matchPatterns: ['%tipi%', '%teepee%', '%tepee%'],
    primaryKeyword: 'tipi glamping',
    secondaryKeywords: ['glamping tipi', 'teepee glamping', 'luxury tipi rental', 'glamping teepee'],
    quickAnswer:
      'A glamping tipi is a conical canvas tent modeled on the traditional Native American structure, supported by a framework of wooden poles. In glamping settings, tipis are furnished with real beds, rugs, and often a wood stove. Their cultural resonance and distinctive silhouette make them a memorable and photogenic unit type.',
    faqs: [
      {
        question: 'What is a glamping tipi?',
        answer:
          'A glamping tipi (or teepee) is a conical canvas tent on a wooden pole framework — modeled on the traditional tipi of the Great Plains tribes. Glamping tipis are furnished with beds, rugs, lighting, and often a wood-burning stove. Many are on raised platforms with private outdoor fire pits.',
      },
      {
        question: 'Are glamping tipis cultural appropriation?',
        answer:
          'This is a genuine industry debate. Many operators incorporate Native American culture respectfully — using accurate designs, hiring Native educators, and sourcing from Indigenous artisans. Guests curious about responsible tipi glamping should look for operators with clear cultural acknowledgment and community partnerships.',
      },
      {
        question: 'How much do glamping tipis cost?',
        answer:
          'Tipi glamping rates typically run $150–$350/night. Properties with premium furnishings, private hot tubs, or scenic settings push toward the high end. Tipis are mid-tier in the glamping pricing hierarchy — above bell tents, below domes and treehouses.',
      },
    ],
  },
  {
    slug: 'airstreams',
    displayName: 'Airstreams',
    matchPatterns: ['%airstream%'],
    primaryKeyword: 'Airstream glamping',
    secondaryKeywords: ['vintage Airstream rental', 'glamping Airstream', 'Airstream accommodation', 'Airstream resort'],
    quickAnswer:
      'An Airstream is the iconic silver aluminum travel trailer — a premium unit type in glamping. Stationary Airstreams at glamping resorts are fully renovated with modern interiors, hookups, and often private outdoor living areas. Their recognizable design and retro-luxury appeal attract strong bookings and social-media engagement.',
    faqs: [
      {
        question: 'What is Airstream glamping?',
        answer:
          'Airstream glamping involves staying in a stationary Airstream aluminum trailer, typically renovated with modern furnishings, queen or king beds, full bathrooms, and kitchenettes. Airstream glamping properties position them as boutique hotel-style accommodations in scenic locations.',
      },
      {
        question: 'How much does an Airstream glamping stay cost?',
        answer:
          'Stationary Airstream glamping rates typically run $200–$500+ per night. The retro-luxury brand premium and renovation costs mean Airstream-focused properties charge at the high end of the van/trailer segment.',
      },
      {
        question: 'Are all Airstreams the same for glamping?',
        answer:
          'No. Airstream models range from 16-foot Bambi (1–2 guests) to 33-foot Classic (families). Most glamping operators choose mid-size models (22–28 feet) for the best balance of livability and siting flexibility. Interior renovation quality varies significantly between operators.',
      },
    ],
  },
  {
    slug: 'shepherds-huts',
    displayName: "Shepherd's Huts",
    matchPatterns: ["%shepherd%hut%", "%shepherd's hut%", "%shepherds hut%"],
    primaryKeyword: "shepherd's hut glamping",
    secondaryKeywords: ["shepherds hut rental", "glamping shepherd's hut", "shepherd hut accommodation"],
    quickAnswer:
      "A shepherd's hut is a compact, hard-walled mobile cabin on cast-iron wheels — a classic British design adapted for glamping. Interiors typically include a double bed, wood-burning stove, and en-suite wet room. Shepherd's huts are especially popular in the UK and increasingly appearing at boutique US glamping properties.",
    faqs: [
      {
        question: "What is a shepherd's hut in glamping?",
        answer:
          "A shepherd's hut is a small, traditionally styled cabin mounted on iron wheels with a curved or pitched metal roof. Originally used by shepherds during lambing season, glamping shepherd's huts are renovated with beds, en-suite bathrooms, and wood stoves in a cozy 120–200 sq ft footprint.",
      },
      {
        question: "How much does shepherd's hut glamping cost?",
        answer:
          "Shepherd's hut glamping typically runs $180–$400/night. UK properties are the most common; US shepherd's huts are rarer and often command a novelty premium. Huts with private hot tubs or countryside views push toward the top of the range.",
      },
      {
        question: "Are shepherd's huts available in the US?",
        answer:
          "Yes, though less common than in the UK. US glamping properties — particularly those with British or countryside themes — are increasingly installing shepherd's huts as a boutique unit type. Sage's data includes shepherd's hut properties across multiple US states.",
      },
    ],
  },
  {
    slug: 'covered-wagons',
    displayName: 'Covered Wagons',
    matchPatterns: ['%covered%wagon%', '%covered wagon%', '%wagon%'],
    primaryKeyword: 'covered wagon glamping',
    secondaryKeywords: ['glamping covered wagon', 'wagon glamping stay', 'pioneer wagon glamping'],
    quickAnswer:
      'Glamping covered wagons are historically styled canvas-covered wagons — adapted from the prairie schooner — furnished with beds and basic amenities. They deliver a uniquely American heritage experience with low capital cost per key, making them a popular specialty unit type at ranch-style glamping properties.',
    faqs: [
      {
        question: 'What is covered wagon glamping?',
        answer:
          'Covered wagon glamping lets guests sleep in a canvas-covered wagon that evokes the pioneer era. Modern glamping wagons are stationary, on stable platforms or wheels, furnished with real beds, rugs, and lantern-style lighting. They are a specialty unit most common at Western or ranch-themed glamping properties.',
      },
      {
        question: 'How much does covered wagon glamping cost?',
        answer:
          'Covered wagon glamping is one of the most affordable glamping unit types — typically $100–$200/night. Low per-unit capital cost makes them attractive for operators wanting to offer a unique experience without heavy construction investment.',
      },
      {
        question: 'Are covered wagons comfortable for glamping?',
        answer:
          'Modern glamping wagons include real mattresses and basic amenities, but they are on the simpler end of the glamping spectrum. Most do not include private bathrooms (shared facilities are standard) and are not climate-controlled beyond a canvas cover. They suit guests seeking the experience over luxury.',
      },
    ],
  },
];

export function getUnitTypeConfigBySlug(slug: string): UnitTypeConfig | null {
  const normalized = slug?.trim().toLowerCase();
  return UNIT_TYPE_CONFIGS.find((c) => c.slug === normalized) ?? null;
}

export function getAllUnitTypeSlugs(): string[] {
  return UNIT_TYPE_CONFIGS.map((c) => c.slug);
}
