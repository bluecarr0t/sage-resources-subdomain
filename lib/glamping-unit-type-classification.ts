/**
 * Hierarchical taxonomy for glamping `unit_type` labels used on the public
 * classification diagram. Canonical strings align with `normalizeGlampingUnitTypeForStorage`.
 */

import {
  BELL_TENT_CLASSIFICATION_DESCRIPTION,
  CABIN_TENT_CLASSIFICATION_DESCRIPTION,
  CANVAS_CABIN_CLASSIFICATION_DESCRIPTION,
  SAFARI_TENT_CLASSIFICATION_DESCRIPTION,
  STRUCTURAL_TENT_TYPES_SUMMARY,
  TIPI_CLASSIFICATION_DESCRIPTION,
} from '@/lib/glamping-structural-tent-types';

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
    summary: STRUCTURAL_TENT_TYPES_SUMMARY,
    accent: '#b8864b',
    subtypes: [
      {
        canonical: 'Safari Tent',
        propertyTypes: ['glamping'],
        description: SAFARI_TENT_CLASSIFICATION_DESCRIPTION,
        aliases: [
          'safari tents',
          'canvas lodge tent',
          'wall tent',
          'wall tents',
          'luxury safari tent',
          'luxury safari tents',
          'safari suite',
          'safari suites',
        ],
        glossarySlug: 'safari-tent',
        inReportPicklist: true,
      },
      {
        canonical: 'Cabin Tent',
        propertyTypes: ['glamping'],
        description: CABIN_TENT_CLASSIFICATION_DESCRIPTION,
        aliases: [
          'cabin tents',
          'tent cabin',
          'tent cabins',
          'tent-cabin',
          'tent-cabins',
          'tentalow',
          'tentalows',
          'deluxe tent cabin',
        ],
        inReportPicklist: true,
      },
      {
        canonical: 'Canvas Cabin',
        propertyTypes: ['glamping'],
        description: CANVAS_CABIN_CLASSIFICATION_DESCRIPTION,
        aliases: [
          'canvas cabin',
          'canvas cabins',
          'classic canvas cabin',
          'family canvas cabin',
        ],
        inReportPicklist: true,
      },
      {
        canonical: 'Bell Tent',
        propertyTypes: ['glamping'],
        description: BELL_TENT_CLASSIFICATION_DESCRIPTION,
        aliases: ['bell tents', 'lotus belle', 'lotus tent'],
        glossarySlug: 'bell-tent',
        inReportPicklist: true,
      },
      {
        canonical: 'Tipi',
        propertyTypes: ['glamping'],
        description: TIPI_CLASSIFICATION_DESCRIPTION,
        aliases: ['tipis', 'teepee', 'teepees'],
        glossarySlug: 'tipi',
        inReportPicklist: true,
      },
      {
        canonical: 'Canvas Tent',
        propertyTypes: ['glamping'],
        description:
          'Retired catch-all label. Prefer Bell Tent, Safari Tent, Cabin Tent, Canvas Cabin, or Tipi for new inventory.',
        aliases: ['canvas tents'],
        glossarySlug: 'canvas-tent',
        inReportPicklist: false,
        excludedFromMarketSnapshot: true,
      },
      {
        canonical: 'Yurt',
        propertyTypes: ['glamping'],
        description:
          'Circular lattice-frame tent with a compression ring, usually on a platform. Permanent or seasonal glamping with more even headroom than a tipi.',
        aliases: ['yurts', 'ger'],
        glossarySlug: 'yurt',
        inReportPicklist: true,
      },
      {
        canonical: 'Tree Tent',
        propertyTypes: ['glamping'],
        description:
          'Elevated or suspended tent platform anchored to trees. Immersive canopy stay distinct from a solid treehouse.',
        aliases: ['tree tents'],
      },
      {
        canonical: 'Bubble Tent',
        propertyTypes: ['glamping'],
        description:
          'Transparent or inflatable PVC dome tent for stargazing and immersive views. Soft-shell novelty product, not a geodesic Dome.',
        aliases: ['bubble tents', 'inflatable tent'],
        glossarySlug: 'bubble-tent',
      },
      {
        canonical: 'Tent Site',
        propertyTypes: ['campground'],
        description:
          'BYO tent pad — campground inventory, not a furnished glamping unit. Ambiguous “tent” / “glamping tent” labels without structural cues should not invent a furnished type (normalize to null for storage).',
        aliases: ['tent sites'],
        excludedFromMarketSnapshot: true,
      },
      {
        canonical: 'Campsite',
        propertyTypes: ['campground'],
        description:
          'Generic campground pitch / campsite inventory — not a furnished glamping structure.',
        aliases: ['campsites', 'camping', 'camp site', 'camp sites'],
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
        description:
          'Geodesic or geodesic-style rigid dome shell, including geodome aliases. Distinctive form often used for year-round climate-controlled stays.',
        aliases: ['domes', 'geodome', 'geodesic dome', 'stargazing dome'],
        glossarySlug: 'dome',
        inReportPicklist: true,
      },
      {
        canonical: 'Pod',
        propertyTypes: ['glamping'],
        description:
          'Compact standalone pod without an eco branding modifier. Small rigid or semi-rigid overnight shell.',
        aliases: ['pods'],
      },
      {
        canonical: 'Eco-pod',
        propertyTypes: ['glamping'],
        description:
          'Sustainability-forward pod product (eco-pod / eco pod). Compact shell positioned with green or low-impact branding.',
        aliases: ['eco pod', 'eco-pods'],
      },
      {
        canonical: 'Jupe',
        propertyTypes: ['glamping'],
        description:
          'Branded modular shelter (Jupe) with a rigid frame and fabric envelope. Engineered tent/pod hybrid, often with hotel-style bedding.',
        aliases: ['jupes', 'jupe tent', 'jupe tents'],
        inReportPicklist: true,
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
        description:
          'Small fixed wooden or similar structure in a natural setting. Default solid-wall glamping cabin in comps.',
        aliases: ['cabins', 'bothy', 'bothies'],
        glossarySlug: 'cabin',
        inReportPicklist: true,
      },
      {
        canonical: 'A-Frame',
        propertyTypes: ['glamping'],
        description:
          'Triangular cabin with steep roof planes meeting at a ridge. Compact solid-wall form with a distinctive silhouette.',
        aliases: ['a-frames', 'a frame', 'lushna', 'lushna cabin', 'lushna cabins'],
        glossarySlug: 'a-frame',
        inReportPicklist: true,
      },
      {
        canonical: 'Cottage',
        propertyTypes: ['glamping'],
        description:
          'Detached cottage-style unit, often positioned as a whole-home vacation rental. Softer residential massing than a cabin.',
        aliases: ['cottages'],
      },
      {
        canonical: 'Chalet',
        propertyTypes: ['glamping'],
        description:
          'Mountain or alpine cottage styling with residential finishes. Solid-wall lodging common in ski and highland markets.',
        aliases: ['chalets'],
      },
      {
        canonical: 'Bungalow',
        propertyTypes: ['glamping'],
        description:
          'Single-story detached unit common in resort and coastal markets. Solid-wall lodging with a low, residential profile.',
        aliases: ['bungalows'],
      },
      {
        canonical: 'Lodge',
        propertyTypes: ['glamping', 'rvResort'],
        description:
          'Larger fixed lodge building, often room-forward or multi-room. Heavier structure than a single cabin unit.',
        aliases: ['lodges'],
      },
      {
        canonical: "Shepherd's Hut",
        propertyTypes: ['glamping'],
        description:
          'Curved-roof British wagon hut on wheels or skids. Compact shepherd-style overnight unit.',
        aliases: ["shepherd's huts", 'shepherd hut'],
        glossarySlug: 'shepherds-hut',
        inReportPicklist: true,
      },
      {
        canonical: 'Canvas Cottage',
        propertyTypes: ['glamping'],
        description:
          'Canvas-walled cottage hybrid with tent envelope and cabin proportions. Soft walls with a more residential layout than a safari tent.',
        aliases: ['canvas cottages'],
      },
      {
        canonical: 'Eco Cabin',
        propertyTypes: ['glamping'],
        description:
          'Sustainability-branded cabin product line. Solid-wall cabin marketed with eco or low-impact positioning.',
        aliases: ['eco cabins'],
      },
      {
        canonical: 'Cube Cabin',
        propertyTypes: ['glamping'],
        description:
          'Modern cubic modular cabin footprint. Boxy prefab form distinct from traditional log or A-frame cabins.',
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
          'Compact dwelling under about 400 sq ft on a foundation or trailer. Imports may say tiny house; Sage prefers Tiny Home for new data.',
        aliases: ['tiny homes', 'tiny house', 'tiny houses'],
        glossarySlug: 'tiny-home',
        inReportPicklist: true,
      },
      {
        canonical: 'Container Home',
        propertyTypes: ['glamping'],
        description:
          'Shipping-container conversion used as overnight inventory. Industrial modern form in the compact glamping segment.',
        aliases: ['shipping container', 'converted container'],
        glossarySlug: 'converted-container',
        inReportPicklist: true,
      },
      {
        canonical: 'Mobile Home',
        propertyTypes: ['campground', 'rvResort'],
        description:
          'Manufactured home or park model used as overnight inventory. Distinct from Tiny Home and cabin product lines.',
        aliases: ['mobile homes'],
      },
      {
        canonical: 'Roulotte',
        propertyTypes: ['glamping'],
        description:
          'European caravan or gypsy-wagon aesthetic on wheels. Compact rolling stock converted for overnight stays.',
        aliases: ['roulottes'],
      },
      {
        canonical: 'Wagonette',
        propertyTypes: ['glamping'],
        description:
          'Smaller wagon-style unit distinct from a full Covered Wagon. Compact rolling or skid-mounted overnight product.',
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
        description:
          'Iconic aluminum travel trailer, often parked as a stationary silver-bullet stay. Furnished glamping product distinct from bare RV pads.',
        aliases: ['airstreams'],
        glossarySlug: 'airstream',
        inReportPicklist: true,
      },
      {
        canonical: 'Vintage Trailer',
        propertyTypes: ['glamping', 'rvResort'],
        description:
          'Restored mid-century travel trailer used as a fixed overnight unit. Furnished vintage product, not a guest-owned RV pad.',
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
      {
        canonical: 'RV',
        propertyTypes: ['campground', 'rvResort'],
        description: 'Bare RV / guest-owned vehicle inventory — not a furnished glamping unit.',
        aliases: ['rvs'],
        excludedFromMarketSnapshot: true,
      },
      {
        canonical: 'Trailer',
        propertyTypes: ['campground', 'rvResort'],
        description:
          'Generic trailer pad or unfurnished trailer inventory — distinct from Vintage Trailer / Airstream glamping product.',
        aliases: ['trailers'],
        excludedFromMarketSnapshot: true,
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
        description:
          'Elevated structure supported by trees or stilts. Architectural canopy lodging distinct from a soft tree tent.',
        aliases: [
          'tree house',
          'treehouses',
          'luxury treehouse',
          'luxury treehouses',
          'luxury tree house',
          'luxury tree houses',
        ],
        glossarySlug: 'treehouse',
        inReportPicklist: true,
      },
      {
        canonical: 'Covered Wagon',
        propertyTypes: ['glamping'],
        description:
          'Conestoga or prairie-style wagon replica used as stationary overnight inventory. Western-themed glamping wagon on a fixed site.',
        aliases: ['wagon', 'wagons', 'conestoga wagon', 'conestoga'],
        glossarySlug: 'covered-wagon',
        inReportPicklist: true,
      },
      {
        canonical: 'Igloo',
        propertyTypes: ['glamping'],
        description:
          'Igloo or ice-lodge inspired shell, often seasonal or Nordic. Specialty climate or novelty lodging form.',
        aliases: ['igloos'],
      },
      {
        canonical: 'Hobbit House',
        propertyTypes: ['glamping'],
        description:
          'Earth-sheltered curved architecture with landscape integration. Fantasy or hobbit-style specialty lodging.',
        glossarySlug: 'hobbit-house',
        inReportPicklist: true,
      },
      {
        canonical: 'Silo',
        propertyTypes: ['glamping'],
        description:
          'Converted agricultural silo reused as overnight lodging. Vertical cylinder adaptive-reuse specialty unit.',
        inReportPicklist: true,
      },
      {
        canonical: 'Mirror Cabin',
        propertyTypes: ['glamping'],
        description:
          'Cabin clad in reflective glass or mirrored panels for landscape camouflage. High visual differentiation used in destination marketing.',
        glossarySlug: 'mirror-cabin',
        inReportPicklist: true,
      },
      {
        canonical: 'Cave House',
        propertyTypes: ['glamping'],
        description:
          'Whole cave dwelling or grotto suite carved into or built against rock. Specialty earth-integrated lodging.',
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
        canonical: 'Hotel Room',
        propertyTypes: ['rvResort'],
        description:
          'Conventional hotel room inventory co-listed with outdoor hospitality. Not a furnished glamping structure.',
        aliases: ['hotel rooms', 'cliffside room', 'cliffside rooms'],
        excludedFromMarketSnapshot: true,
      },
      {
        canonical: 'Suite',
        propertyTypes: ['rvResort'],
        description:
          'Hotel-style suite inventory, not a glamping structure. Distinct from Eco-suite product labels.',
        aliases: ['suites'],
        excludedFromMarketSnapshot: true,
      },
      {
        canonical: 'Villa',
        propertyTypes: ['rvResort'],
        description:
          'Detached premium villa unit with whole-home vacation rental positioning. Heavier residential product than a cabin.',
        aliases: ['villas'],
      },
      {
        canonical: 'Luxury Room',
        propertyTypes: ['rvResort'],
        description:
          'Single luxury room within a larger outdoor resort. Hotel-adjacent inventory at unit grain.',
        aliases: ['luxury rooms'],
      },
      {
        canonical: 'Eco-suite',
        propertyTypes: ['rvResort'],
        description:
          'Eco-branded suite product within an outdoor hospitality property. Soft-green positioning on room inventory.',
        aliases: ['eco suite', 'eco-suites'],
      },
      {
        canonical: 'Eco-house',
        propertyTypes: ['rvResort'],
        description:
          'Standalone eco-branded house unit. Whole-house lodging with sustainability marketing.',
        aliases: ['eco house', 'eco-houses'],
      },
      {
        canonical: 'Open-air Room',
        propertyTypes: ['rvResort'],
        description:
          'Partially open room or pavilion sleeping space. Semi-enclosed lodging without a full solid envelope.',
        aliases: ['open air room'],
      },
      {
        canonical: 'Beach House',
        propertyTypes: ['rvResort', 'marina'],
        description:
          'Coastal whole-house inventory tagged at unit grain. Beach or waterfront residential lodging.',
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
        description:
          'Property-level merge when multiple unit types share one row. Catch-all when a single structure type does not apply.',
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
    const subtype = family.subtypes.find(
      (s) =>
        s.canonical.toLowerCase() === key ||
        s.aliases?.some((a) => a.toLowerCase() === key)
    );
    if (subtype) return { family, subtype };
  }
  return null;
}

export function countGlampingUnitClassificationSubtypes(): number {
  return GLAMPING_UNIT_CLASSIFICATION_FAMILIES.reduce((n, f) => n + f.subtypes.length, 0);
}
