/**
 * Default amenity unit costs for Site Builder seed data (USD, per site/unit add-on).
 * Values are mid-market U.S. typical installed or turnkey add-on estimates for outdoor hospitality.
 * Feasibility study sync overwrites cost_per_unit when real line items exist; basis columns persist.
 */

export interface AmenityResearchRow {
  slug: string;
  name: string;
  cost_per_unit: number;
  applies_to: 'glamping' | 'rv' | 'both';
  /** Author-visible basis (not legal/financial advice). */
  default_cost_basis: string;
  default_cost_source_url?: string;
}

/** All slugs referenced by feasibility-amenity-sync patterns must appear here so seed does not delete synced rows. */
export const SITE_BUILDER_AMENITY_RESEARCH_ROWS: AmenityResearchRow[] = [
  {
    slug: 'deck-patio',
    name: 'Deck / patio',
    cost_per_unit: 6500,
    applies_to: 'both',
    default_cost_basis:
      'Typical pressure-treated or composite deck/patio pad per site (≈10–16 ft), materials + labor; not full structure shell.',
    default_cost_source_url: 'https://www.homeadvisor.com/cost/decks/',
  },
  {
    slug: 'fire-pit',
    name: 'Fire pit',
    cost_per_unit: 400,
    applies_to: 'both',
    default_cost_basis: 'Installed gas or wood fire feature with basic surround (mid kit + labor).',
  },
  {
    slug: 'fire-ring',
    name: 'Fire ring',
    cost_per_unit: 300,
    applies_to: 'rv',
    default_cost_basis: 'Steel ring + minimal seating pad / gravel (campground-style).',
  },
  {
    slug: 'patio-furniture',
    name: 'Patio furniture',
    cost_per_unit: 750,
    applies_to: 'both',
    default_cost_basis: 'Outdoor table + chair set rated for commercial/resort use.',
  },
  {
    slug: 'shade-structure',
    name: 'Shade structure / pergola',
    cost_per_unit: 500,
    applies_to: 'both',
    default_cost_basis: 'Small shade sail or entry pergola add; larger covered structures cost more.',
  },
  {
    slug: 'picnic-table',
    name: 'Picnic table',
    cost_per_unit: 350,
    applies_to: 'both',
    default_cost_basis: 'Commercial-grade picnic table delivered/installed.',
  },
  {
    slug: 'outdoor-kitchen',
    name: 'Outdoor kitchen / grill',
    cost_per_unit: 8500,
    applies_to: 'glamping',
    default_cost_basis: 'Compact outdoor kitchen island with grill + counter (mid spec, not full chef build).',
  },
  {
    slug: 'private-bathroom',
    name: 'Private bathroom',
    cost_per_unit: 25000,
    applies_to: 'glamping',
    default_cost_basis: 'Bathroom build-out per unit (fixtures, MEP tie-in share varies by site).',
  },
  {
    slug: 'private-hot-tub',
    name: 'Private hot tub',
    cost_per_unit: 12000,
    applies_to: 'glamping',
    default_cost_basis: 'Installed 4–6 person spa + basic pad/electrical (not luxury swim spa).',
  },
  {
    slug: 'outdoor-shower',
    name: 'Outdoor shower',
    cost_per_unit: 3500,
    applies_to: 'glamping',
    default_cost_basis: 'Enclosed outdoor shower with plumbing to shared or dedicated lines.',
  },
  {
    slug: 'wood-fired-sauna',
    name: 'Wood-fired sauna',
    cost_per_unit: 8000,
    applies_to: 'glamping',
    default_cost_basis: 'Small barrel / kit sauna delivered and set (stove + chimney).',
  },
  {
    slug: 'hammock',
    name: 'Hammock',
    cost_per_unit: 200,
    applies_to: 'glamping',
    default_cost_basis: 'Stand + hammock hardware suitable for guest use.',
  },
  {
    slug: 'ac-mini-split',
    name: 'AC / mini-split',
    cost_per_unit: 4500,
    applies_to: 'glamping',
    default_cost_basis: 'Single-zone mini-split installed for a small unit (equipment + labor band).',
  },
  {
    slug: 'cold-plunge',
    name: 'Cold plunge / plunge pool',
    cost_per_unit: 6000,
    applies_to: 'glamping',
    default_cost_basis: 'Cold plunge tub + chiller + basic pad (not full pool).',
  },
  {
    slug: 'concrete-pad',
    name: 'Concrete pad',
    cost_per_unit: 2500,
    applies_to: 'rv',
    default_cost_basis: 'Typical RV parking pad (≈10×40 ft class), flatwork + prep mid market.',
  },
  {
    slug: 'water-hookup',
    name: 'Water hookup',
    cost_per_unit: 1500,
    applies_to: 'rv',
    default_cost_basis: 'Trench, riser, metered or dedicated connection per site (varies with distance).',
  },
  {
    slug: 'sewer-hookup',
    name: 'Sewer hookup',
    cost_per_unit: 2000,
    applies_to: 'rv',
    default_cost_basis: 'Sewer lateral to main; highly site-dependent—use as starting point.',
  },
  {
    slug: '30-amp-electrical',
    name: '30-amp electrical',
    cost_per_unit: 1200,
    applies_to: 'rv',
    default_cost_basis: 'Pedestal + branch from loop; excludes long utility runs.',
  },
  {
    slug: '50-amp-upgrade',
    name: '50-amp electrical upgrade',
    cost_per_unit: 2500,
    applies_to: 'rv',
    default_cost_basis: 'Heavier gauge run + 50A pedestal vs 30A baseline (incremental estimate).',
  },
  {
    slug: 'cable-tv',
    name: 'Cable TV',
    cost_per_unit: 400,
    applies_to: 'rv',
    default_cost_basis: 'Drop + outlet per site when provider infrastructure present.',
  },
  {
    slug: 'storage-shed',
    name: 'Storage shed',
    cost_per_unit: 3500,
    applies_to: 'rv',
    default_cost_basis: 'Small secure shed (8×10 class) delivered/anchored.',
  },
  {
    slug: 'wifi',
    name: 'WiFi access',
    cost_per_unit: 500,
    applies_to: 'both',
    default_cost_basis: 'Amortized CPE / AP allocation per site for a property-wide network (rough).',
  },
  {
    slug: 'pet-station',
    name: 'Pet station / dog run',
    cost_per_unit: 800,
    applies_to: 'both',
    default_cost_basis: 'Fencing panel kit + gate + waste station materials.',
  },
  {
    slug: 'outdoor-lighting',
    name: 'Outdoor lighting',
    cost_per_unit: 600,
    applies_to: 'both',
    default_cost_basis: 'Path/step lighting and bollard allowance per site.',
  },
  {
    slug: 'bike-rack',
    name: 'Bike rack',
    cost_per_unit: 450,
    applies_to: 'both',
    default_cost_basis: 'Commercial bike rack hardware + install.',
  },
  {
    slug: 'ev-charging',
    name: 'EV charging (Level 2)',
    cost_per_unit: 3800,
    applies_to: 'both',
    default_cost_basis:
      'Share of Level 2 EVSE, dedicated circuit, and trenching to a site loop (varies widely with distance and utility capacity).',
  },
  {
    slug: 'gazebo',
    name: 'Gazebo / pavilion',
    cost_per_unit: 4500,
    applies_to: 'both',
    default_cost_basis: 'Small hardtop or wood kit gazebo with slab/anchors—larger pavilions cost more.',
  },
  {
    slug: 'outdoor-fireplace',
    name: 'Outdoor fireplace',
    cost_per_unit: 9500,
    applies_to: 'glamping',
    default_cost_basis: 'Masonry or prefab outdoor fireplace with chimney and non-combustible pad (not a simple fire pit).',
  },
  {
    slug: 'privacy-landscaping',
    name: 'Privacy screening / landscaping',
    cost_per_unit: 1400,
    applies_to: 'glamping',
    default_cost_basis: 'Buffer planting, screens, or split-rail + evergreen mix allocated per unit (site size dependent).',
  },
  {
    slug: 'outdoor-tv',
    name: 'Outdoor TV (weather enclosure)',
    cost_per_unit: 2800,
    applies_to: 'glamping',
    default_cost_basis: 'Weather-rated TV + protective enclosure or cabinet + basic mount and outlet.',
  },
  {
    slug: 'patio-heater',
    name: 'Patio heater',
    cost_per_unit: 400,
    applies_to: 'both',
    default_cost_basis: 'Freestanding propane patio heater (commercial grade) with tank cage—rental parks often amortize several sites.',
  },
  {
    slug: 'outdoor-rug-mat',
    name: 'Outdoor rug / deck mat',
    cost_per_unit: 250,
    applies_to: 'glamping',
    default_cost_basis: 'Large UV-stable outdoor rug or woven mat sized for a small deck.',
  },
  {
    slug: 'string-lights-site',
    name: 'String lights (bistro)',
    cost_per_unit: 350,
    applies_to: 'both',
    default_cost_basis: 'Commercial string lighting kit + guided install and GFCI hookup per site.',
  },
  {
    slug: 'gravel-pad',
    name: 'Gravel / aggregate pad',
    cost_per_unit: 1800,
    applies_to: 'rv',
    default_cost_basis: 'Compacted gravel or crushed stone parking surface with edging (vs full concrete pour).',
  },
  {
    slug: 'synthetic-turf-patio',
    name: 'Synthetic turf patio strip',
    cost_per_unit: 900,
    applies_to: 'rv',
    default_cost_basis: 'Small turf mat or strip at patio end of pad for mud-free seating (not full lawn).',
  },
  {
    slug: 'sewer-rinse-hookup',
    name: 'Sewer rinse / black tank flush',
    cost_per_unit: 450,
    applies_to: 'rv',
    default_cost_basis: 'Rinse connection at pedestal tied to sewer lateral where code allows.',
  },
  {
    slug: 'propane-outlet-site',
    name: 'Propane quick-connect at site',
    cost_per_unit: 550,
    applies_to: 'rv',
    default_cost_basis: 'Exterior quick-connect with line to manifold or centralized LP (excludes tank fill policy).',
  },
  {
    slug: 'oversized-rv-pad',
    name: 'Oversized RV pad (big rig)',
    cost_per_unit: 4200,
    applies_to: 'rv',
    default_cost_basis: 'Incremental cost vs standard pad: extra SF of concrete or base for 45+ ft / super-slide sites.',
  },
  {
    slug: 'fiber-internet-drop',
    name: 'Fiber / high-speed internet drop',
    cost_per_unit: 650,
    applies_to: 'rv',
    default_cost_basis: 'Dedicated drop or ONT/CPE allocation when backbone exists (monthly service not included).',
  },
  {
    slug: 'covered-picnic-shelter',
    name: 'Covered picnic shelter',
    cost_per_unit: 2200,
    applies_to: 'rv',
    default_cost_basis: 'Small metal or wood roof shelter over picnic area at site (not full cabin).',
  },
  {
    slug: 'outdoor-dining-set',
    name: 'Outdoor dining set (6+)',
    cost_per_unit: 1100,
    applies_to: 'glamping',
    default_cost_basis: 'Larger dining-height table and seating set vs basic patio furniture row.',
  },
];
