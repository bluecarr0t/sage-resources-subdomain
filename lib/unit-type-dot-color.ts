import {
  normalizeGlampingUnitTypeForStorage,
  primaryGlampingUnitTypeSegment,
} from '@/lib/glamping-unit-type-normalize';

const UNKNOWN = '#a8a29e';

/** Earthy dot colors per canonical unit_type display label. */
export const UNIT_TYPE_DOT_COLORS: Record<string, string> = {
  'Safari Tent': '#b8864b',
  Tent: '#c4a574',
  'Bell Tent': '#c9a96a',
  'Cabin Tent': '#c4a574',
  'Canvas Cabin': '#b8956a',
  'Canvas Tent': '#c4a574',
  'Glamping Tent': '#c4a574',
  'Luxury Tent': '#d4b896',
  'Wall Tent': '#b8864b',
  'Lodge Tent': '#a89068',
  'Floating Tent': '#8eb4c4',
  'Bubble Tent': '#8eb4c4',
  Dome: '#7a8fa8',
  Yurt: '#9e6b55',
  Treehouse: '#5a7352',
  'Tree Tent': '#5a7352',
  Cabin: '#8b6f4e',
  'Beach Cabin': '#7d9a8f',
  'Eco Cabin': '#5c8a72',
  'Cube Cabin': '#8b6f4e',
  Cottage: '#9a8268',
  'Eco Cottage': '#5c8a72',
  'Canvas Cottage': '#c4a574',
  'Tiny House': '#9a8268',
  'Tiny Home': '#9a8268',
  Pod: '#6d8a6a',
  'Glamping Pod': '#6d8a6a',
  'Eco-pod': '#5c8a72',
  Lodge: '#4a624a',
  'Beach Lodge': '#4d7a72',
  Villa: '#8a8078',
  Bungalow: '#8a8078',
  Chalet: '#8a8078',
  'Luxury Room': '#8a8078',
  'Open-air Room': '#9cae88',
  Airstream: '#6b7d8a',
  'RV Site': '#6b7d8a',
  'Mobile Home': '#6b7d8a',
  'Covered Wagon': '#a67c52',
  Wagonette: '#a67c52',
  Tipi: '#9c6848',
  Teepee: '#9c6848',
  Igloo: '#8eb4c4',
  Hut: '#7d6b58',
  "Shepherd's Hut": '#7d6b58',
  Roulotte: '#8b7355',
  'Tent Site': '#b8956a',
  'Eco-suite': '#5c8a72',
  'Eco-house': '#5c8a72',
  'Beach House': '#7d9a8f',
  'Cave Room': '#6e6560',
  'Cave House': '#6e6560',
  'A-Frame': '#8b7355',
  'Mixed Glamping': '#5c7a5c',
  'Other Glamping': '#5c7a5c',
};

function colorFromKeyword(lower: string): string | null {
  if (lower.includes('safari') && lower.includes('tent')) return UNIT_TYPE_DOT_COLORS['Safari Tent'];
  if (lower.includes('treehouse') || lower.includes('tree house')) return UNIT_TYPE_DOT_COLORS.Treehouse;
  if (lower.includes('tree tent')) return UNIT_TYPE_DOT_COLORS['Tree Tent'];
  if (lower.includes('yurt')) return UNIT_TYPE_DOT_COLORS.Yurt;
  if (lower.includes('dome') || lower.includes('geodome')) return UNIT_TYPE_DOT_COLORS.Dome;
  if (lower.includes('airstream') || /\brv\b/.test(lower)) return UNIT_TYPE_DOT_COLORS['RV Site'];
  if (lower.includes('wagon')) return UNIT_TYPE_DOT_COLORS['Covered Wagon'];
  if (lower.includes('tipi') || lower.includes('teepee')) return UNIT_TYPE_DOT_COLORS.Tipi;
  if (lower.includes('igloo') || lower.includes('bubble')) return UNIT_TYPE_DOT_COLORS.Igloo;
  if (lower.includes('pod')) return UNIT_TYPE_DOT_COLORS.Pod;
  if (lower.includes('cabin')) return UNIT_TYPE_DOT_COLORS.Cabin;
  if (lower.includes('cottage')) return UNIT_TYPE_DOT_COLORS.Cottage;
  if (lower.includes('tiny')) return UNIT_TYPE_DOT_COLORS['Tiny House'];
  if (lower.includes('lodge')) return UNIT_TYPE_DOT_COLORS.Lodge;
  if (lower.includes('villa') || lower.includes('bungalow') || lower.includes('chalet')) {
    return UNIT_TYPE_DOT_COLORS.Villa;
  }
  if (lower.includes('tent')) return UNIT_TYPE_DOT_COLORS.Tent;
  if (lower.includes('hut')) return UNIT_TYPE_DOT_COLORS.Hut;
  if (lower.includes('cave')) return UNIT_TYPE_DOT_COLORS['Cave Room'];
  if (lower.includes('beach')) return UNIT_TYPE_DOT_COLORS['Beach House'];
  if (lower.includes('eco')) return UNIT_TYPE_DOT_COLORS['Eco-pod'];
  if (lower.includes('a-frame') || lower.includes('a frame')) return UNIT_TYPE_DOT_COLORS['A-Frame'];
  return null;
}

/**
 * Resolve dot color for a unit_type label (canonical, compound, or legacy free text).
 */
export function getUnitTypeDotColor(unitType: string | null | undefined): string {
  const raw = (unitType ?? '').trim();
  if (!raw) return UNKNOWN;

  const primary = primaryGlampingUnitTypeSegment(raw);
  const normalized = normalizeGlampingUnitTypeForStorage(primary) ?? primary;

  if (UNIT_TYPE_DOT_COLORS[normalized]) {
    return UNIT_TYPE_DOT_COLORS[normalized];
  }

  const fromRaw = colorFromKeyword(raw.toLowerCase());
  if (fromRaw) return fromRaw;

  const fromNormalized = colorFromKeyword(normalized.toLowerCase());
  if (fromNormalized) return fromNormalized;

  return UNKNOWN;
}
