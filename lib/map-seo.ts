/**
 * Map page SEO: metadata overrides and state hub intro copy for high-impression regions.
 */

import { roundDownToStep } from '@/lib/round-down-to-step';

/** Marketing count for map index titles (floor to nearest 25, e.g. 718 → 700). */
export function mapIndexPropertyCountDisplay(rawCount: number): number {
  return roundDownToStep(rawCount, 25);
}

export function mapIndexLocationsTitle(count: number): string {
  return `Glamping Properties Map | ${count}+ Locations`;
}

export type MapStateHubContent = {
  /** Optional override for <title> (state pages only) */
  metaTitle?: string;
  metaDescription?: string;
  /** Sidebar H1 override */
  pageTitle: string;
  /** Plain-text intro shown under the title on state hub pages */
  intro: string;
  /** Optional second paragraph */
  introSecondary?: string;
};

/** Main /[locale]/map index metadata (English). */
export const MAP_INDEX_METADATA = {
  titleTemplate: (count: number) =>
    `${mapIndexLocationsTitle(count)} | Sage Outdoor Advisory`,
  descriptionTemplate: (count: number) =>
    `Interactive glamping map with ${count}+ verified resorts, yurts, domes, and safari tents across the U.S. and Canada. Filter by state, unit type, and ADR—benchmark markets for feasibility and development.`,
  keywords:
    'glamping map, glamping properties by state, glamping near me, glamping market data, outdoor hospitality map, glamping resorts USA',
} as const;

/** Slug keys match slugifyLocation(normalizeStateName(state)) */
export const STATE_MAP_HUB_CONTENT: Record<string, MapStateHubContent> = {
  california: {
    pageTitle: 'Glamping in California',
    metaTitle: 'California Glamping Map | Resorts, Domes & Safari Tents | Sage',
    metaDescription:
      'Explore California glamping on an interactive map—compare ADR, unit types, and supply near national parks, wine country, and coastal markets. Data for developers and investors.',
    intro:
      'California has one of the densest glamping markets in North America, from coastal yurts and desert domes to Sierra foothill safari tents. Use this map to benchmark competitors, average retail rates, and unit mixes before a feasibility study or acquisition.',
    introSecondary:
      'Filter by unit type (dome, yurt, A-frame, treehouse) to see how premium markets price seasonality and park-adjacent demand.',
  },
  texas: {
    pageTitle: 'Glamping in Texas',
    metaTitle: 'Texas Glamping Map | Hill Country, Desert & Lake Markets | Sage',
    metaDescription:
      'Texas glamping properties on an interactive map—Hill Country, West Texas, and lake markets with ADR and unit-type filters for outdoor hospitality research.',
    intro:
      'Texas glamping spans Hill Country retreats, West Texas stargazing domes, and lakefront safari tents. Developers use this hub to compare supply density, pricing, and distance to major metros before underwriting a new resort or RV-adjacent glamping phase.',
  },
  colorado: {
    pageTitle: 'Glamping in Colorado',
    metaTitle: 'Colorado Glamping Map | Mountain & Resort Markets | Sage',
    metaDescription:
      'Colorado glamping map with mountain resorts, domes, and tents—filter by ADR and unit type for Rocky Mountain outdoor hospitality market research.',
    intro:
      'Colorado glamping competes on access to skiing, hiking, and mountain towns. This map highlights operating properties, typical ADRs, and unit formats (domes, cabins, wagons) used in lender-ready market sections for Rocky Mountain projects.',
  },
  florida: {
    pageTitle: 'Glamping in Florida',
    metaTitle: 'Florida Glamping Map | Coastal & Everglades Markets | Sage',
    metaDescription:
      'Florida glamping properties mapped with rates and unit types—research coastal, springs, and ecotourism-oriented outdoor hospitality markets.',
    intro:
      'Florida glamping blends coastal demand, springs tourism, and year-round operating seasons. Compare properties across the peninsula to stress-test occupancy and rate assumptions in a feasibility study or appraisal.',
  },
  'north-carolina': {
    pageTitle: 'Glamping in North Carolina',
    metaTitle: 'North Carolina Glamping Map | Blue Ridge & Coastal NC | Sage',
    metaDescription:
      'North Carolina glamping map: Blue Ridge, Asheville-area, and coastal glamping supply with interactive filters for market and feasibility research.',
    intro:
      'North Carolina glamping clusters near the Blue Ridge Parkway, Asheville, and coastal corridors. Use this state view to map competitor ADR, unit diversity, and drive-time demand before developing a new glamping or RV resort concept.',
  },
  utah: {
    pageTitle: 'Glamping in Utah',
    metaTitle: 'Utah Glamping Map | National Park & Desert Glamping | Sage',
    metaDescription:
      'Utah glamping near Zion, Moab, and ski markets—interactive map of domes, tents, and unique units with pricing benchmarks.',
    intro:
      'Utah glamping is tightly linked to national park visitation and desert recreation. Benchmark Moab-, Zion-, and ski-corridor properties here when modeling seasonal demand and premium unit types such as domes and luxury tents.',
  },
  oregon: {
    pageTitle: 'Glamping in Oregon',
    metaTitle: 'Oregon Glamping Map | Coast, Wine Country & Forest Markets | Sage',
    metaDescription:
      'Oregon glamping resorts and sites on a searchable map—coastal, Willamette, and forest markets for outdoor hospitality analysis.',
    intro:
      'Oregon glamping markets mix coastal fog-season pricing, wine-country weekends, and forest retreats. Filter this map to align competitor sets with your proposed site’s drive-time market.',
  },
  arizona: {
    pageTitle: 'Glamping in Arizona',
    metaTitle: 'Arizona Glamping Map | Desert Domes & Southwest Glamping | Sage',
    metaDescription:
      'Arizona glamping map with desert domes, tents, and resort supply—compare ADR and formats for Southwest outdoor hospitality projects.',
    intro:
      'Arizona glamping emphasizes desert domes, stargazing experiences, and winter-season demand from snowbirds. Use this hub to quantify supply and rate positioning for Sonoran and high-country development sites.',
  },
  vermont: {
    pageTitle: 'Glamping in Vermont',
    metaTitle: 'Vermont Glamping Map | New England Glamping Supply | Sage',
    metaDescription:
      'Vermont glamping properties mapped for New England market research—yurts, tents, and boutique outdoor hospitality with rate filters.',
    intro:
      'Vermont glamping targets foliage season, ski weekends, and boutique farm-stay experiences. Compare New England competitor density and pricing when testing a glamping feasibility scenario in the Green Mountain state.',
  },
  tennessee: {
    pageTitle: 'Glamping in Tennessee',
    metaTitle: 'Tennessee Glamping Map | Smokies & Nashville Drive Markets | Sage',
    metaDescription:
      'Tennessee glamping near the Smokies and music-country tourism—map of properties, unit types, and ADR for Southeast market analysis.',
    intro:
      'Tennessee glamping benefits from Great Smoky Mountains visitation and Nashville weekend drive markets. This map supports competitor selection and rate benchmarks for Southeast feasibility and appraisal work.',
  },
};

export function getStateMapHubContent(locationSlug: string): MapStateHubContent | null {
  return STATE_MAP_HUB_CONTENT[locationSlug.toLowerCase()] ?? null;
}
