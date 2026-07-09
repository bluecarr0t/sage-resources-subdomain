/**
 * Hierarchical taxonomy for glamping `unit_type` labels used on the public
 * classification diagram. Canonical strings align with `normalizeGlampingUnitTypeForStorage`.
 */

/** Property-type cohort lens for the public diagram (orthogonal to structural family). */
export type UnitPropertyTypeFilter = 'glamping' | 'rvResort' | 'campground' | 'marina';

export type GlampingUnitSubtype = {
  /** Sage canonical display label (DB / maps). */
  canonical: string;
  /** Property-type cohorts where this unit label typically appears (diagram filter OR logic). */
  propertyTypes: readonly UnitPropertyTypeFilter[];
  /** Short plain-language definition for the diagram panel. */
  description: string;
  /** Common aliases merged into the canonical label in data pipelines. */
  aliases?: string[];
  /** Glossary term slug under `/en/glossary/{slug}` when defined. */
  glossarySlug?: string;
  /** Listed in `docs/unit-types.json` report picklist. */
  inReportPicklist?: boolean;
  /** Excluded from public glamping market overview unit counts. */
  excludedFromMarketSnapshot?: boolean;
};

export type GlampingUnitFamily = {
  id: string;
  label: string;
  summary: string;
  /** Accent for diagram nodes (hex). */
  accent: string;
  subtypes: GlampingUnitSubtype[];
};

export const GLAMPING_UNIT_CLASSIFICATION_ROOT = {
  label: 'Outdoor Hospitality Unit Types',
  summary:
    'Physical accommodation labels stored on each Sage unit row (`unit_type`). One canonical label per inventory line; aliases normalize to these forms.',
} as const;

/** Ordered families → subtypes for the interactive diagram. */
export const GLAMPING_UNIT_CLASSIFICATION_FAMILIES: GlampingUnitFamily[] = [
  {
    id: 'canvas-tented',
    label: 'Canvas & tented',
    summary: 'Fabric-forward structures where the tent envelope is the primary guest experience.',
    accent: '#b8864b',
    subtypes: [
      {
        canonical: 'Safari Tent',
        propertyTypes: ['glamping'],
        description: 'Large rectangular canvas tent with straight walls and lodge-style headroom.',
        aliases: ['safari tents', 'canvas lodge tent'],
        glossarySlug: 'safari-tent',
        inReportPicklist: true,
      },
      {
        canonical: 'Bell Tent',
        propertyTypes: ['glamping'],
        description: 'Circular canvas tent with a single center pole and airy interior volume.',
        aliases: ['bell tents', 'lotus belle'],
        glossarySlug: 'bell-tent',
        inReportPicklist: true,
      },
      {
        canonical: 'Canvas Tent',
        propertyTypes: ['glamping'],
        description: 'General canvas tent structure — used when the specific tent style is not distinguished.',
        aliases: ['canvas tents'],
        glossarySlug: 'canvas-tent',
        inReportPicklist: true,
      },
      {
        canonical: 'Tipi',
        propertyTypes: ['glamping'],
        description:
          'Conical pole tent — often marketed for cultural or prairie settings. Also spelled teepee; Sage normalizes that spelling to Tipi in new data (some legacy rows may still show Teepee).',
        aliases: ['tipis', 'teepee', 'teepees'],
        glossarySlug: 'tipi',
        inReportPicklist: true,
      },
      {
        canonical: 'Yurt',
        propertyTypes: ['glamping'],
        description: 'Circular lattice-frame tent with compression ring — permanent or seasonal platforms.',
        aliases: ['yurts', 'ger'],
        glossarySlug: 'yurt',
        inReportPicklist: true,
      },
      {
        canonical: 'Tree Tent',
        propertyTypes: ['glamping'],
        description: 'Elevated or suspended tent platform anchored to trees.',
        aliases: ['tree tents'],
      },
      {
        canonical: 'Bubble Tent',
        propertyTypes: ['glamping'],
        description: 'Transparent or inflatable PVC dome tent for stargazing and immersive views.',
        aliases: ['bubble tents', 'inflatable tent'],
        glossarySlug: 'bubble-tent',
      },
      {
        canonical: 'Tent Site',
        propertyTypes: ['campground'],
        description:
          'BYO tent pad — campground inventory, not a furnished glamping unit. Generic “tent” labels in imports usually mean this inventory class rather than a glamping structure.',
        aliases: ['tent sites', 'tent', 'tents'],
        excludedFromMarketSnapshot: true,
      },
    ],
  },
  {
    id: 'domes-pods',
    label: 'Domes & pods',
    summary: 'Rigid or semi-rigid envelopes — geodesic domes, pods, and modular eco shells.',
    accent: '#7a8fa8',
    subtypes: [
      {
        canonical: 'Dome',
        propertyTypes: ['glamping'],
        description: 'Geodesic or geodesic-style dome — includes “geodome” aliases.',
        aliases: ['domes', 'geodome', 'geodesic dome', 'stargazing dome'],
        glossarySlug: 'dome',
        inReportPicklist: true,
      },
      {
        canonical: 'Pod',
        propertyTypes: ['glamping'],
        description: 'Compact standalone pod without the “glamping” modifier.',
        aliases: ['pods'],
      },
      {
        canonical: 'Eco-pod',
        propertyTypes: ['glamping'],
        description: 'Sustainability-forward pod branding (eco-pod / eco pod).',
        aliases: ['eco pod', 'eco-pods'],
      },
    ],
  },
  {
    id: 'cabins-lodges',
    label: 'Cabins & lodges',
    summary: 'Wood or composite structures with solid walls — the dominant “cabin” corridor in comps.',
    accent: '#8b6f4e',
    subtypes: [
      {
        canonical: 'Cabin',
        propertyTypes: ['glamping'],
        description: 'Small fixed structure in a natural setting — default wooden glamping cabin.',
        aliases: ['cabins'],
        glossarySlug: 'cabin',
        inReportPicklist: true,
      },
      {
        canonical: 'A-Frame',
        propertyTypes: ['glamping'],
        description: 'Triangular A-frame cabin with steep roof planes.',
        aliases: ['a-frames', 'a frame'],
        glossarySlug: 'a-frame',
        inReportPicklist: true,
      },
      {
        canonical: 'Cottage',
        propertyTypes: ['glamping'],
        description: 'Detached cottage — often whole-unit vacation rental positioning.',
        aliases: ['cottages'],
      },
      {
        canonical: 'Chalet',
        propertyTypes: ['glamping'],
        description: 'Mountain or alpine cottage styling.',
        aliases: ['chalets'],
      },
      {
        canonical: 'Bungalow',
        propertyTypes: ['glamping'],
        description: 'Single-story detached unit — common in resort and coastal markets.',
        aliases: ['bungalows'],
      },
      {
        canonical: 'Lodge',
        propertyTypes: ['glamping', 'rvResort'],
        description: 'Larger fixed lodge building — room-forward or multi-room.',
        aliases: ['lodges'],
      },
      {
        canonical: "Shepherd's Hut",
        propertyTypes: ['glamping'],
        description: 'Curved-roof British wagon hut on wheels or skids.',
        aliases: ["shepherd's huts", 'shepherd hut'],
        glossarySlug: 'shepherds-hut',
        inReportPicklist: true,
      },
      {
        canonical: 'Canvas Cottage',
        propertyTypes: ['glamping'],
        description: 'Canvas-walled cottage hybrid — tent envelope with cabin proportions.',
        aliases: ['canvas cottages'],
      },
      {
        canonical: 'Eco Cabin',
        propertyTypes: ['glamping'],
        description: 'Sustainability-branded cabin product line.',
        aliases: ['eco cabins'],
      },
      {
        canonical: 'Cube Cabin',
        propertyTypes: ['glamping'],
        description: 'Modern cubic modular cabin footprint.',
        aliases: ['cube cabins'],
      },
    ],
  },
  {
    id: 'compact-mobile',
    label: 'Compact & mobile',
    summary: 'Small-footprint dwellings and rolling stock converted to overnight stays.',
    accent: '#9a8268',
    subtypes: [
      {
        canonical: 'Tiny Home',
        propertyTypes: ['glamping'],
        description:
          'Compact dwelling under ~400 sq ft on a foundation or trailer. Also labeled tiny house in imports; Sage prefers Tiny Home for new data (some legacy rows may still show Tiny House).',
        aliases: ['tiny homes', 'tiny house', 'tiny houses'],
        glossarySlug: 'tiny-home',
        inReportPicklist: true,
      },
      {
        canonical: 'Container Home',
        propertyTypes: ['glamping'],
        description: 'Shipping-container conversion — industrial modern glamping segment.',
        aliases: ['shipping container', 'converted container'],
        glossarySlug: 'converted-container',
        inReportPicklist: true,
      },
      {
        canonical: 'Mobile Home',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Manufactured home or park model used as overnight inventory.',
        aliases: ['mobile homes'],
      },
      {
        canonical: 'Roulotte',
        propertyTypes: ['glamping'],
        description: 'European caravan / gypsy wagon aesthetic on wheels.',
        aliases: ['roulottes'],
      },
      {
        canonical: 'Wagonette',
        propertyTypes: ['glamping'],
        description: 'Smaller wagon-style unit distinct from full covered wagon.',
        aliases: ['wagonettes'],
      },
    ],
  },
  {
    id: 'vintage-vehicles',
    label: 'Vintage',
    summary: 'Road-ready or stationary trailer conversions used as furnished glamping inventory.',
    accent: '#6b7d8a',
    subtypes: [
      {
        canonical: 'Airstream',
        propertyTypes: ['glamping', 'rvResort'],
        description: 'Aluminum travel-trailer icon — often stationary “silver bullet” glamping.',
        aliases: ['airstreams'],
        glossarySlug: 'airstream',
        inReportPicklist: true,
      },
      {
        canonical: 'Vintage Trailer',
        propertyTypes: ['glamping', 'rvResort'],
        description: 'Restored mid-century travel trailer used as a fixed glamping unit.',
        aliases: ['vintage trailers', 'retro trailer'],
        glossarySlug: 'vintage-trailer',
        inReportPicklist: true,
      },
    ],
  },
  {
    id: 'rv-site',
    label: 'RV Site',
    summary: 'Vehicle pads with hookups — guest brings an RV; distinct from furnished glamping structures.',
    accent: '#6b7d8a',
    subtypes: [
      {
        canonical: 'RV Site - General',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Report picklist: undifferentiated RV pad.',
        aliases: ['rv sites', 'motorhome site', 'RV Site'],
        excludedFromMarketSnapshot: true,
        inReportPicklist: true,
      },
      {
        canonical: 'RV Site - Pull thru',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Report picklist: pull-through RV pad.',
        excludedFromMarketSnapshot: true,
        inReportPicklist: true,
      },
      {
        canonical: 'RV Site - Back-in',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Report picklist: back-in RV pad.',
        excludedFromMarketSnapshot: true,
        inReportPicklist: true,
      },
      {
        canonical: 'RV Site - Full Hookup',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Report picklist: full-hookup RV pad.',
        excludedFromMarketSnapshot: true,
        inReportPicklist: true,
      },
    ],
  },
  {
    id: 'elevated-specialty',
    label: 'Specialty',
    summary: 'Architectural novelty and site-specific builds that anchor destination marketing.',
    accent: '#5a7352',
    subtypes: [
      {
        canonical: 'Treehouse',
        propertyTypes: ['glamping'],
        description: 'Elevated structure supported by trees or stilts.',
        aliases: ['tree house', 'treehouses'],
        glossarySlug: 'treehouse',
        inReportPicklist: true,
      },
      {
        canonical: 'Covered Wagon',
        propertyTypes: ['glamping'],
        description: 'Conestoga or prairie wagon replica — stationary glamping wagons.',
        aliases: ['wagon', 'wagons', 'conestoga wagon', 'conestoga'],
        glossarySlug: 'covered-wagon',
        inReportPicklist: true,
      },
      {
        canonical: 'Igloo',
        propertyTypes: ['glamping'],
        description: 'Igloo or ice-lodge inspired shell — often seasonal or Nordic markets.',
        aliases: ['igloos'],
      },
      {
        canonical: 'Hobbit House',
        propertyTypes: ['glamping'],
        description: 'Earth-sheltered curved architecture — fantasy / landscape integration.',
        glossarySlug: 'hobbit-house',
        inReportPicklist: true,
      },
      {
        canonical: 'Silo',
        propertyTypes: ['glamping'],
        description: 'Converted agricultural silo — vertical cylinder adaptive reuse.',
        inReportPicklist: true,
      },
      {
        canonical: 'Mirror Cabin',
        propertyTypes: ['glamping'],
        description: 'Reflective-clad cabin — high visual differentiation for social marketing.',
        glossarySlug: 'mirror-cabin',
        inReportPicklist: true,
      },
      {
        canonical: 'Cave House',
        propertyTypes: ['glamping'],
        description: 'Whole cave dwelling or grotto suite.',
        aliases: ['cave houses'],
      },
    ],
  },
  {
    id: 'rooms-suites',
    label: 'Rooms & suites',
    summary: 'Hotel-adjacent inventory still tagged at unit level in outdoor hospitality datasets.',
    accent: '#8a8078',
    subtypes: [
      {
        canonical: 'Villa',
        propertyTypes: ['rvResort'],
        description: 'Detached premium unit — whole-villa vacation rental positioning.',
        aliases: ['villas'],
      },
      {
        canonical: 'Luxury Room',
        propertyTypes: ['rvResort'],
        description: 'Single luxury room within a larger outdoor resort.',
        aliases: ['luxury rooms'],
      },
      {
        canonical: 'Eco-suite',
        propertyTypes: ['rvResort'],
        description: 'Eco-branded suite product.',
        aliases: ['eco suite', 'eco-suites'],
      },
      {
        canonical: 'Eco-house',
        propertyTypes: ['rvResort'],
        description: 'Standalone eco-branded house unit.',
        aliases: ['eco house', 'eco-houses'],
      },
      {
        canonical: 'Open-air Room',
        propertyTypes: ['rvResort'],
        description: 'Partially open room or pavilion sleeping space.',
        aliases: ['open air room'],
      },
      {
        canonical: 'Beach House',
        propertyTypes: ['rvResort', 'marina'],
        description: 'Coastal whole-house inventory at unit grain.',
        aliases: ['beach houses'],
      },
    ],
  },
  {
    id: 'mixed-other',
    label: 'Other',
    summary: 'Catch-all labels for multi-type properties or unresolved imports.',
    accent: '#5c7a5c',
    subtypes: [
      {
        canonical: 'Other Glamping',
        propertyTypes: ['glamping', 'rvResort'],
        description: 'Property-level merge when multiple unit types share one matview row.',
        aliases: ['mixed glamping', 'Mixed Glamping', 'mixed glamping units'],
      },
    ],
  },
];

export const GLAMPING_UNIT_CLASSIFICATION_FAMILY_IDS = GLAMPING_UNIT_CLASSIFICATION_FAMILIES.map(
  (f) => f.id
);

export function findGlampingUnitSubtype(canonical: string): {
  family: GlampingUnitFamily;
  subtype: GlampingUnitSubtype;
} | null {
  const key = canonical.trim().toLowerCase();
  for (const family of GLAMPING_UNIT_CLASSIFICATION_FAMILIES) {
    const subtype = family.subtypes.find((s) => s.canonical.toLowerCase() === key);
    if (subtype) return { family, subtype };
  }
  return null;
}

export function countGlampingUnitClassificationSubtypes(): number {
  return GLAMPING_UNIT_CLASSIFICATION_FAMILIES.reduce((n, f) => n + f.subtypes.length, 0);
}
