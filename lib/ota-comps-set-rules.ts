export const COMPS_SET_LOCAL = 'Local 0-25mi RV';
export const COMPS_SET_WATERFRONT = 'Waterfront SKUs';
export const COMPS_SET_FHU = '25-80 site FHU';
export const COMPS_SET_DESTINATION = 'Destination appendix';
export const COMPS_SET_MARKET_RV = '100mi RV';

export const LOCAL_MAX_MILES = 25;
export const LOCAL_MIN_RV_SITES = 15;
export const LOCAL_MAX_RV_SITES = 80;
export const FHU_MIN_SITES = 25;
export const FHU_MAX_SITES = 80;

const WATERFRONT_INCLUDE =
  /\bwater[-\s]?front\b|\blakefront\b|\blake front\b|\bon[-\s]river\b|\bon the river\b|\briverfront\b|\bcreekfront\b|\blakeside\b|\briverside\b|\bcreekside\b|\bon the lake\b|\bon the creek\b|\blake view\b|\briver view\b|\bcreek view\b|\bwater view\b|\bwaterfront view\b|\bwater access\b|\blake access\b|\briver access\b|\bcreek access\b/i;
const WATERFRONT_EXCLUDE =
  /\bnon[-\s]?water[-\s]?front\b|\binland\b|\boff[-\s]?(water|river)\b|\bboondock/i;
const VAN_TENT_ONLY = /\b(van|pop[-\s]?up|popup|tent)\b/i;
const RV_TOKEN = /\brv\b/i;

export function isWaterfrontSiteName(siteName: string): boolean {
  const name = siteName.trim();
  if (!name) return false;
  if (WATERFRONT_EXCLUDE.test(name)) return false;
  if (!WATERFRONT_INCLUDE.test(name)) return false;
  if (VAN_TENT_ONLY.test(name) && !RV_TOKEN.test(name)) return false;
  return true;
}

export function hasParkWaterfrontAccess(opts: {
  hasWaterfrontAmenity?: boolean | string | null;
  hasBeachAmenity?: boolean | string | null;
  siteNames?: readonly string[];
}): boolean {
  if (isTrueFlag(opts.hasWaterfrontAmenity)) return true;
  if (isTrueFlag(opts.hasBeachAmenity)) return true;
  return (opts.siteNames ?? []).some((name) => isWaterfrontSiteName(name));
}

function isTrueFlag(value: boolean | string | null | undefined): boolean {
  return value === true || value === 't' || value === 'true';
}

export function isMobileHomeParkName(propertyName: string): boolean {
  return /mobile\s*home/i.test(propertyName);
}

export function isDestinationParkName(propertyName: string): boolean {
  return /elm hill/i.test(propertyName) || /watts bar/i.test(propertyName);
}

export function isSparseCoverageParkName(propertyName: string): boolean {
  return /full throttle/i.test(propertyName);
}

export function isLocalCorePark(opts: {
  miles: number;
  rvSiteCount: number;
  propertyName: string;
}): boolean {
  if (isDestinationParkName(opts.propertyName)) return false;
  if (isMobileHomeParkName(opts.propertyName)) return false;
  if (opts.miles > LOCAL_MAX_MILES) return false;
  return opts.rvSiteCount >= LOCAL_MIN_RV_SITES && opts.rvSiteCount <= LOCAL_MAX_RV_SITES;
}

export function isFhuQualityAnalog(opts: {
  fhuSiteCount: number;
  propertyName: string;
}): boolean {
  if (isDestinationParkName(opts.propertyName)) return false;
  return opts.fhuSiteCount >= FHU_MIN_SITES && opts.fhuSiteCount <= FHU_MAX_SITES;
}

export function isSiteFullHookup(row: {
  amenity_full_hookup?: string;
  amenity_water?: string;
  amenity_sewer?: string;
  amenity_50amp?: string;
  amenity_30amp?: string;
}): boolean {
  if (row.amenity_full_hookup === 'Yes') return true;
  const water = row.amenity_water === 'Yes';
  const sewer = row.amenity_sewer === 'Yes';
  const amp = row.amenity_50amp === 'Yes' || row.amenity_30amp === 'Yes';
  return water && sewer && amp;
}

export function primarySetHeatmapPriority(compSet: string): number {
  switch (compSet) {
    case COMPS_SET_LOCAL:
      return 0;
    case COMPS_SET_FHU:
      return 1;
    case COMPS_SET_WATERFRONT:
      return 2;
    default:
      return 9;
  }
}

export function isHipcampBellTentSku(opts: {
  category?: string | null;
  categoryList?: string | null;
  siteName?: string | null;
}): boolean {
  const category = (opts.category ?? '').toLowerCase();
  const list = (opts.categoryList ?? '').toLowerCase();
  const siteName = (opts.siteName ?? '').toLowerCase();
  const hay = `${category} ${list} ${siteName}`;
  if (/\bbell[-\s]?tent\b/.test(hay) || category === 'bell-tent') return true;
  if (/\bsafari\b/.test(hay) && /\b(tent|glamp)/.test(hay)) return true;
  if (category === 'safari-tent' || list.includes('safari-tent')) return true;
  if (category === 'canvas-tent' || /\bcanvas[-\s]?tent\b/.test(hay)) return true;
  return false;
}
