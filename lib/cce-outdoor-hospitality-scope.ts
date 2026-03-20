/**
 * Filters Marshall & Swift CCE rows to those most relevant for Sage’s outdoor-hospitality
 * work: glamping resorts, RV resorts, campgrounds, marinas, and landscape / resort hotels.
 *
 * Cost tab: occupancy names are allowlisted (with exclusions for medical, institutional, etc.).
 * Component tab: section headers that are clearly institutional / industrial / specialized
 * are excluded; typical shell, MEP, and site work stays visible.
 */

/** Strong exclusions — applied before inclusion (e.g. “Hotel” inside a hospital name). */
const OCCUPANCY_EXCLUDE_SUBSTRINGS = [
  'HOSPITAL',
  'MEDICAL CENTER',
  'MEDICAL CENTRE',
  'MEDICAL OFFICE',
  'SURGICAL',
  'CLINIC',
  'NURSING HOME',
  'SKILLED NURSING',
  'ASSISTED LIVING',
  'MEMORY CARE',
  'REHABILITATION',
  'DIALYSIS',
  'MORGUE',
  'LABORATORY',
  'RESEARCH LAB',
  'PRISON',
  'JAIL',
  'DETENTION',
  'CORRECTIONAL',
  'SCHOOL',
  'UNIVERSITY',
  'COLLEGE',
  'CHURCH',
  'SYNAGOGUE',
  'TEMPLE',
  'MOSQUE',
  'WORSHIP',
  'FUNERAL',
  'MORTUARY',
  'OFFICE BUILDING',
  'HIGH-RISE OFFICE',
  'WAREHOUSE',
  'DISTRIBUTION CENTER',
  'MANUFACTURING',
  'INDUSTRIAL PLANT',
  'FACTORY',
  'POWER PLANT',
  'SUBSTATION',
  'DATA CENTER',
  'PARKING STRUCTURE',
  'PARKING GARAGE',
  'MINI WAREHOUSE',
  'SELF STORAGE',
  'STORAGE UNITS',
  'BANK ',
  ' BANK',
  'COURTHOUSE',
  'FIRE STATION',
  'POLICE',
  'POST OFFICE',
  'LIBRARY',
  'MUSEUM',
  'AIRCRAFT HANGAR',
  'HANGAR',
  'SILO',
  'GRAIN ELEVATOR',
  'BARN',
  'AGRICULTURAL',
  'GREENHOUSE',
  'KENNEL',
  'VETERINARY',
  'ANIMAL SHELTER',
] as const;

/** Multi-word or long substrings — safe as simple `includes` on uppercased name. */
const OCCUPANCY_INCLUDE_SUBSTRINGS = [
  'HOTEL',
  'MOTEL',
  'RESORT',
  'LODGE',
  'HOSTEL',
  'CABIN',
  'COTTAGE',
  'BUNGALOW',
  'SUITES',
  'SUITE',
  'BED AND BREAKFAST',
  'B & B',
  'TIMESHARE',
  'TIME SHARE',
  'CONDOMINIUM',
  'CONDO ',
  ' CONDO',
  'APARTMENT',
  'MULTI-FAMILY',
  'MULTIFAMILY',
  'MULTI FAMILY',
  'DORMITORY',
  'DORM ',
  'CAMPGROUND',
  'CAMP GROUND',
  'CAMPING',
  'TENT ',
  ' TENT',
  'RECREATIONAL VEHICLE',
  'TRAVEL TRAILER',
  'TRAILER PARK',
  'MOBILE HOME',
  'MANUFACTURED HOUSING',
  'MODULAR HOUSING',
  'MARINA',
  'BOAT ',
  ' BOAT',
  'DOCK',
  'YACHT',
  'WHARF',
  'PIER ',
  'PIER,',
  'QUAY',
  'CASINO',
  'COUNTRY CLUB',
  'GOLF CLUB',
  'YACHT CLUB',
  'BOUTIQUE',
  'EXTENDED STAY',
  'VACATION',
  'GLAMP',
  'KOA',
  'RV PARK',
  'RV RESORT',
] as const;

/** Short tokens matched with word boundaries to avoid false positives (e.g. “spinning” / “inner”). */
const OCCUPANCY_INCLUDE_WORD_REGEXES: RegExp[] = [
  /\bINN\b/i,
  /\bRV\b/i,
  /\bB&B\b/i,
];

/**
 * Returns true if this M&S occupancy name is in scope for outdoor hospitality consulting.
 */
export function isOutdoorHospitalityOccupancyName(name: string | null | undefined): boolean {
  if (name == null || !name.trim()) return false;
  const upper = name.toUpperCase();
  for (const ex of OCCUPANCY_EXCLUDE_SUBSTRINGS) {
    if (upper.includes(ex)) return false;
  }
  for (const inc of OCCUPANCY_INCLUDE_SUBSTRINGS) {
    if (upper.includes(inc)) return true;
  }
  for (const re of OCCUPANCY_INCLUDE_WORD_REGEXES) {
    if (re.test(name)) return true;
  }
  return false;
}

/** Exclude component cost sections that are rarely relevant for resorts / campgrounds / marinas. */
const COMPONENT_SECTION_EXCLUDE_SUBSTRINGS = [
  'HOSPITAL',
  'MEDICAL',
  'SURGICAL',
  'PRISON',
  'JAIL',
  'DETENTION',
  'CORRECTIONAL',
  'LABORATORY',
  'RADIOLOGY',
  'PATHOLOGY',
  'CLEAN ROOM',
  'NURSING',
  'MORGUE',
  'DATA CENTER',
  'SERVER ROOM',
  'MANUFACTURING',
  'INDUSTRIAL PLANT',
  'FACTORY',
  'WAREHOUSE',
  'DISTRIBUTION CENTER',
  'SILO',
  'GRAIN ELEVATOR',
  'POWER PLANT',
  'SUBSTATION',
  'HANGAR',
  'AIRCRAFT',
  'CHURCH',
  'SYNAGOGUE',
  'TEMPLE',
  'MOSQUE',
  'SCHOOL',
  'CLASSROOM',
  'UNIVERSITY',
  'STADIUM',
  'ARENA',
  'AUDITORIUM',
  'LIFE EXPECTANCY',
  'FUNERAL',
  'MORTUARY',
  'VETERINARY',
  'KENNEL',
  'ANIMAL SHELTER',
  // Pond/lagoon treatment — not typical resort structure costing
  'AERATOR',
  // Large commercial VAV / terminal HVAC
  'AIR TERMINAL',
  // Truncated headers from PDF (e.g. "…SCHOOLS AND PUBLIC BUILDINGS" → "AND PUBLIC BUILDINGS")
  'PUBLIC BUILDINGS',
  'AND SCHOOL',
  'AND HOSPITAL',
  'AND INDUSTRIAL',
  'AND COMMERCIAL',
  'AND INSTITUTIONAL',
  // Segregated / index noise from CCE PDF
  'SEGREGATED COST',
  // Utilities, process, central plant (phase 1 / 2)
  'WASTEWATER',
  'SEWAGE',
  'WATER TREATMENT',
  'SANITARY SEWER',
  'DIGESTER',
  'CLARIFIER',
  'AERATION BASIN',
  'PUMP STATION',
  'LIFT STATION',
  'COOLING TOWER',
  'CHILLER',
  'BOILER',
  'BOILER PLANT',
  'STEAM PLANT',
  'REFINERY',
  'SMELT',
  'TANK FARM',
  'CONVEYOR',
  'PRODUCTION LINE',
  'HIGH VOLTAGE',
  'PSYCHIATRIC',
  'NUCLEAR',
  'RADIOACTIVE',
  'CRANE',
  'BRIDGE',
  'TUNNEL',
  'DAM ',
  ' DAM',
] as const;

/**
 * Exclude component line items that are institutional / public-building equipment, often
 * found under malformed section names after extraction.
 */
const COMPONENT_ITEM_EXCLUDE_SUBSTRINGS = [
  'HOSPITAL EQUIPMENT',
  'DENTAL CLINIC',
  'VETERINARY HOSPITAL',
  'BANK EQUIPMENT',
  'JAIL EQUIPMENT',
  'LIBRARY EQUIPMENT',
  'PUBLIC LIBRAR',
  'POLICE STATION',
  'BOOKSTACK',
  'BOOK STACK',
  'CELL BLOCK',
  'VAULT DOOR',
  'LOCKING DEVICES',
  'COURTHOUSE',
  'FIRE STATION',
  'POST OFFICE',
  // Process / MEP-heavy lines often under generic sections (phase 1 / 2)
  'WASTEWATER',
  'SEWAGE',
  'DIGESTER',
  'CLARIFIER',
  'AERATION BASIN',
  'LIFT STATION',
  'PUMP STATION',
  'BOILER PLANT',
  'CHILLER',
  'COOLING TOWER',
  'HIGH VOLTAGE',
  'CONVEYOR',
  'PRODUCTION LINE',
  'REFINERY',
  'SMELT',
  'TANK FARM',
  'STEAM BOILER',
  'CENTRIFUGE',
  'COMPRESSOR STATION',
  'TRANSFORMER',
  'SWITCHGEAR',
  'SUBSTATION',
] as const;

/**
 * Strict tier: section_name must match at least one fragment (shell, finishes, light MEP, sitework).
 * Edition-specific — revisit after major M&S PDF updates.
 */
const COMPONENT_SECTION_ALLOW_SUBSTRINGS = [
  'WALL',
  'ROOF',
  'DOOR',
  'WINDOW',
  'FLOOR',
  'CEILING',
  'STAIR',
  'PARTITION',
  'SIDING',
  'INSULATION',
  'PAINT',
  'CARPET',
  'TILE',
  'CABINET',
  'TRIM',
  'MOLDING',
  'FIREPLACE',
  'CHIMNEY',
  'FOUNDATION',
  'FOOTING',
  'SLAB',
  'FRAMING',
  'BEAM',
  'COLUMN',
  'TRUSS',
  'JOIST',
  'DECK',
  'PATIO',
  'PORCH',
  'FENCE',
  'RAILING',
  'GUTTER',
  'FLASHING',
  'SKYLIGHT',
  'SHINGLE',
  'STUCCO',
  'BRICK',
  'STONE',
  'DRYWALL',
  'PLASTER',
  'PLUMBING',
  'ELECTRICAL',
  'LIGHTING',
  'FIXTURE',
  'HEAT',
  'HVAC',
  'AIR CONDITION',
  'FURNACE',
  'FIRE SPRINKLER',
  'SPRINKLER',
  'SITE',
  'PAVING',
  'ASPHALT',
  'CONCRETE',
  'CURB',
  'SEPTIC',
  'GRADING',
  'LANDSCAP',
  'IRRIGATION',
  'EXTERIOR',
  'INTERIOR FINISH',
  'COUNTER',
  'BATH',
  'KITCHEN',
  'APPLIANCE',
] as const;

/**
 * Returns false if section_name is clearly off-scope; true for null/empty (keep row).
 */
export function isOutdoorHospitalityComponentSection(sectionName: string | null | undefined): boolean {
  if (sectionName == null || !sectionName.trim()) return true;
  const upper = sectionName.toUpperCase();
  for (const ex of COMPONENT_SECTION_EXCLUDE_SUBSTRINGS) {
    if (upper.includes(ex)) return false;
  }
  return true;
}

/** Patterns for PostgREST `.not('section_name', 'ilike', pattern)` (no user % wildcards). */
export function componentSectionExcludeIlikePatterns(): string[] {
  return COMPONENT_SECTION_EXCLUDE_SUBSTRINGS.map((s) => `%${s}%`);
}

/** PostgREST ilike patterns for item_name (outdoor hospitality scope). */
export function componentItemExcludeIlikePatterns(): string[] {
  return COMPONENT_ITEM_EXCLUDE_SUBSTRINGS.map((s) => `%${s}%`);
}

/** ilike patterns: section must match at least one for strict scope. */
export function componentSectionAllowIlikePatterns(): string[] {
  return COMPONENT_SECTION_ALLOW_SUBSTRINGS.map((s) => `%${s}%`);
}

function ilikePatternMatches(pattern: string, value: string): boolean {
  const inner = pattern.replace(/^%|%$/g, '');
  return value.toLowerCase().includes(inner.toLowerCase());
}

/**
 * Mirrors `GET /api/admin/cce-component-costs?scope=outdoor_hospitality` row visibility:
 * chained `.not('section_name'|'item_name', 'ilike', %fragment%)`. In PostgreSQL, NULL
 * fails those predicates, so rows with missing section or item are excluded.
 */
export function rowPassesOutdoorHospitalityComponentScope(
  sectionName: string | null | undefined,
  itemName: string | null | undefined
): boolean {
  if (sectionName == null || !String(sectionName).trim()) return false;
  if (itemName == null || !String(itemName).trim()) return false;
  for (const p of componentSectionExcludeIlikePatterns()) {
    if (ilikePatternMatches(p, sectionName)) return false;
  }
  for (const p of componentItemExcludeIlikePatterns()) {
    if (ilikePatternMatches(p, itemName)) return false;
  }
  return true;
}

/**
 * Strict outdoor-hospitality component scope: standard denylist + section must match an allowlist fragment.
 */
export function rowPassesOutdoorHospitalityComponentScopeStrict(
  sectionName: string | null | undefined,
  itemName: string | null | undefined
): boolean {
  if (!rowPassesOutdoorHospitalityComponentScope(sectionName, itemName)) return false;
  const s = String(sectionName);
  return componentSectionAllowIlikePatterns().some((p) => ilikePatternMatches(p, s));
}

/** Remaining watchlist for analysis script (promoted terms removed after phase 2). */
export const COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS = [
  'ELEVATOR',
  'ESCALATOR',
  'DUMB WAITER',
  'CRANE HOIST',
  'OVERHEAD DOOR INDUSTRIAL',
  'CLEAN ROOM',
  'ANECHOIC',
] as const;
