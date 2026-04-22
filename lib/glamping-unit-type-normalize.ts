/**
 * Normalizes `unit_type` for `all_glamping_properties` storage:
 * one product label per row (first segment when lists were joined) and singular wording.
 *
 * Used by discovery inserts, admin approval flows, and batch cleanup scripts.
 */

/** Lowercased full string (after taking the primary segment) -> canonical display form. */
const PHRASE_CANONICAL: Record<string, string> = {
  // Common singles / aliases
  yurt: 'Yurt',
  yurts: 'Yurt',
  tent: 'Tent',
  tents: 'Tent',
  dome: 'Dome',
  domes: 'Dome',
  geodome: 'Geodome',
  geodomes: 'Geodome',
  cabin: 'Cabin',
  cabins: 'Cabin',
  lodge: 'Lodge',
  lodges: 'Lodge',
  villa: 'Villa',
  villas: 'Villa',
  pod: 'Pod',
  pods: 'Pod',
  bungalow: 'Bungalow',
  bungalows: 'Bungalow',
  chalet: 'Chalet',
  chalets: 'Chalet',
  cottage: 'Cottage',
  cottages: 'Cottage',
  'tiny house': 'Tiny House',
  'tiny home': 'Tiny Home',
  'tiny houses': 'Tiny House',
  'tiny homes': 'Tiny Home',
  airstream: 'Airstream',
  airstreams: 'Airstream',
  igloo: 'Igloo',
  igloos: 'Igloo',
  tipi: 'Tipi',
  tipis: 'Tipi',
  teepee: 'Teepee',
  teepees: 'Teepee',
  bothy: 'Bothy',
  bothies: 'Bothy',
  roulotte: 'Roulotte',
  roulottes: 'Roulotte',
  hut: 'Hut',
  huts: 'Hut',
  'shepherd hut': "Shepherd's Hut",
  "shepherd's hut": "Shepherd's Hut",
  'shepherd huts': "Shepherd's Hut",
  "shepherd's huts": "Shepherd's Hut",
  'glamping pod': 'Glamping Pod',
  'glamping pods': 'Glamping Pod',
  'glamping tent': 'Glamping Tent',
  'glamping tents': 'Glamping Tent',
  'bell tent': 'Bell Tent',
  'bell tents': 'Bell Tent',
  'wall tent': 'Wall Tent',
  'wall tents': 'Wall Tent',
  'floating tent': 'Floating Tent',
  'floating tents': 'Floating Tent',
  'bubble tent': 'Bubble Tent',
  'bubble tents': 'Bubble Tent',
  'luxury tent': 'Luxury Tent',
  'luxury tents': 'Luxury Tent',
  'luxury room': 'Luxury Room',
  'luxury rooms': 'Luxury Room',
  'safari tent': 'Safari Tent',
  'safari tents': 'Safari Tent',
  'canvas tent': 'Canvas Tent',
  'canvas cottage': 'Canvas Cottage',
  'canvas cottages': 'Canvas Cottage',
  'eco pod': 'Eco-pod',
  'eco-pods': 'Eco-pod',
  'eco-pod': 'Eco-pod',
  'eco suite': 'Eco-suite',
  'eco-suites': 'Eco-suite',
  'eco-suit': 'Eco-suite',
  'geodesic dome': 'Geodesic Dome',
  'geodesic domes': 'Geodesic Dome',
  treehouse: 'Treehouse',
  treehouses: 'Treehouse',
  'tree house': 'Treehouse',
  'tree houses': 'Treehouse',
  'tree tent': 'Tree Tent',
  'tree tents': 'Tree Tent',
  'a-frame': 'A-Frame',
  'a-frames': 'A-Frame',
  'a frame': 'A-Frame',
  'beach cabin': 'Beach Cabin',
  'beach cabins': 'Beach Cabin',
  'beach house': 'Beach House',
  'beach houses': 'Beach House',
  'beach lodge': 'Beach Lodge',
  'beach lodges': 'Beach Lodge',
  'cave room': 'Cave Room',
  'cave rooms': 'Cave Room',
  'cave house': 'Cave House',
  'mobile home': 'Mobile Home',
  'mobile homes': 'Mobile Home',
  'lodge tent': 'Lodge Tent',
  'lodge tents': 'Lodge Tent',
  'rv site': 'RV Site',
  'rv sites': 'RV Site',
  'tent site': 'Tent Site',
  'tent sites': 'Tent Site',
  'cube cabin': 'Cube Cabin',
  'cube cabins': 'Cube Cabin',
  'eco cabin': 'Eco Cabin',
  'eco cottage': 'Eco Cottage',
  'eco-house': 'Eco-house',
  'eco house': 'Eco-house',
  'eco-houses': 'Eco-house',
  'open-air room': 'Open-air Room',
  'open air room': 'Open-air Room',
  wagonette: 'Wagonette',
  'mixed glamping': 'Mixed Glamping',
};

/** Lowercased single token (may include hyphens) -> singular lower form. */
const TOKEN_PLURAL_TO_SINGULAR: Record<string, string> = {
  yurts: 'yurt',
  tents: 'tent',
  domes: 'dome',
  geodomes: 'geodome',
  cabins: 'cabin',
  lodges: 'lodge',
  treehouses: 'treehouse',
  bungalows: 'bungalow',
  chalets: 'chalet',
  cottages: 'cottage',
  villas: 'villa',
  suites: 'suite',
  rooms: 'room',
  pods: 'pod',
  huts: 'hut',
  homes: 'home',
  houses: 'house',
  sites: 'site',
  igloos: 'igloo',
  tipis: 'tipi',
  airstreams: 'airstream',
  bothies: 'bothy',
  roulottes: 'roulotte',
  wagons: 'wagon',
  'a-frames': 'a-frame',
  'eco-lodges': 'eco-lodge',
  'eco-pods': 'eco-pod',
  'eco-suites': 'eco-suite',
};

const KEEP_TRAILING_S = new Set(
  [
    'glass',
    'class',
    'grass',
    'canvas',
    'pass',
    'news',
    'miss',
    'series',
    'species',
    'cosmos',
    'gas',
    'bris',
  ].map((s) => s.toLowerCase())
);

/**
 * First non-empty product segment when legacy rows joined many labels with
 * commas, "and", semicolons, or slashes.
 */
export function primaryGlampingUnitTypeSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const parts = t
    .split(/\s*(?:,|;|(?:\s+and\s+)|(?:\s*\/\s*))\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] ?? t;
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function singularizeTokenLower(token: string): string {
  const lower = token.toLowerCase();
  if (lower.includes("'")) return lower;
  if (Object.prototype.hasOwnProperty.call(TOKEN_PLURAL_TO_SINGULAR, lower)) {
    return TOKEN_PLURAL_TO_SINGULAR[lower]!;
  }
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map((p) => singularizeTokenLower(p))
      .join('-');
  }
  if (lower.length > 4 && lower.endsWith('ies') && !['series', 'species'].includes(lower)) {
    return lower.slice(0, -3) + 'y';
  }
  if (
    lower.length >= 5 &&
    lower.endsWith('s') &&
    !lower.endsWith('ss') &&
    !KEEP_TRAILING_S.has(lower)
  ) {
    return lower.slice(0, -1);
  }
  return lower;
}

function titleCaseToken(rawLower: string): string {
  const l = rawLower.toLowerCase();
  if (l === 'rv') return 'RV';
  if (l === 'a-frame') return 'A-Frame';

  const possessive = l.match(/^([a-z]+)('s)$/);
  if (possessive && possessive[1]) {
    const base = possessive[1];
    return base.charAt(0).toUpperCase() + base.slice(1) + "'s";
  }

  if (l.includes('-')) {
    return l
      .split('-')
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
      .join('-');
  }
  if (!l) return l;
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function titleCaseWords(lowerPhrase: string): string {
  return lowerPhrase
    .split(/\s+/)
    .map((w) => titleCaseToken(singularizeTokenLower(w)))
    .join(' ');
}

/**
 * Returns a display-ready `unit_type` with one product label, singular, Title Case
 * (with hyphens and possessives handled). Null/blank in → null out.
 */
export function normalizeGlampingUnitTypeForStorage(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const primary = primaryGlampingUnitTypeSegment(String(raw));
  if (!primary) return null;

  const collapsed = collapseSpaces(primary);
  const key = collapsed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PHRASE_CANONICAL, key)) {
    return PHRASE_CANONICAL[key]!;
  }

  return titleCaseWords(key);
}
