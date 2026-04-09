/**
 * Export distinct property names from Supabase `reports` and enrich with Google Places
 * (website, business status, rating, review count, earliest review year in returned sample).
 * Writes reports-properties-open-status.csv in cwd.
 *
 * Run: npx tsx scripts/export-reports-properties-open-status-csv.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *
 * Google enrichment is applied only if the chosen place passes verification:
 * - Normalized business name equals Google display name, OR
 * - Street number + street name + city + state match Google addressComponents; street names use
 *   fuzzy suffix rules (e.g. St/Street, Ave/Avenue, Rd/Road).
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}
if (!googleApiKey) {
  console.error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

type Row = {
  property_name: string;
  city: string;
  state: string;
  location: string;
  address_1: string;
  market_type: string;
  study_id: string;
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type SearchPlace = {
  id: string;
  displayName?: { text?: string };
  addressComponents?: AddressComponent[];
};

const US_STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: 'al',
  alaska: 'ak',
  arizona: 'az',
  arkansas: 'ar',
  california: 'ca',
  colorado: 'co',
  connecticut: 'ct',
  delaware: 'de',
  'district of columbia': 'dc',
  florida: 'fl',
  georgia: 'ga',
  hawaii: 'hi',
  idaho: 'id',
  illinois: 'il',
  indiana: 'in',
  iowa: 'ia',
  kansas: 'ks',
  kentucky: 'ky',
  louisiana: 'la',
  maine: 'me',
  maryland: 'md',
  massachusetts: 'ma',
  michigan: 'mi',
  minnesota: 'mn',
  mississippi: 'ms',
  missouri: 'mo',
  montana: 'mt',
  nebraska: 'ne',
  nevada: 'nv',
  'new hampshire': 'nh',
  'new jersey': 'nj',
  'new mexico': 'nm',
  'new york': 'ny',
  'north carolina': 'nc',
  'north dakota': 'nd',
  ohio: 'oh',
  oklahoma: 'ok',
  oregon: 'or',
  pennsylvania: 'pa',
  'rhode island': 'ri',
  'south carolina': 'sc',
  'south dakota': 'sd',
  tennessee: 'tn',
  texas: 'tx',
  utah: 'ut',
  vermont: 'vt',
  virginia: 'va',
  washington: 'wa',
  'west virginia': 'wv',
  wisconsin: 'wi',
  wyoming: 'wy',
};

/** Lowercase, trim, collapse spaces, strip periods (helps US Hwy vs U.S. Hwy). */
function normalizeComparable(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

function normalizeStateToAbbr(s: string): string {
  const n = normalizeComparable(s);
  if (!n) return '';
  if (/^[a-z]{2}$/.test(n)) return n;
  return US_STATE_NAME_TO_ABBR[n] || '';
}

/**
 * Canonicalize trailing street-type tokens so "Main St", "Main St.", "Main Street" compare equal.
 * Applied after normalizeComparable (case/spacing/periods already normalized).
 */
function fuzzyNormalizeStreetRoute(route: string): string {
  let x = normalizeComparable(route);
  if (!x) return x;

  // Longer / compound suffixes first; each line maps synonyms to one canonical ending.
  const steps: Array<[RegExp, string]> = [
    [/\s+frontage\s+(rd|road)\s*$/i, ' frontage road'],
    [/\s+(mountain|mtn)\s+(rd|road)\s*$/i, ' mountain road'],
    [/\s+(boulevard|blvd)\s*$/i, ' boulevard'],
    [/\s+(avenue|ave)\s*$/i, ' avenue'],
    [/\s+(street|st)\s*$/i, ' street'],
    [/\s+(terrace|ter)\s*$/i, ' terrace'],
    [/\s+(parkway|pkwy)\s*$/i, ' parkway'],
    [/\s+(highway|hwy)\s*$/i, ' highway'],
    [/\s+(route|rte)\s*$/i, ' route'],
    [/\s+(drive|dr)\s*$/i, ' drive'],
    [/\s+(lane|ln)\s*$/i, ' lane'],
    [/\s+(court|ct)\s*$/i, ' court'],
    [/\s+(circle|cir)\s*$/i, ' circle'],
    [/\s+(place|pl)\s*$/i, ' place'],
    [/\s+(trail|trl)\s*$/i, ' trail'],
    [/\s+(square|sq)\s*$/i, ' square'],
    [/\s+(way)\s*$/i, ' way'],
    [/\s+(road|rd)\s*$/i, ' road'],
  ];
  for (const [re, rep] of steps) {
    x = x.replace(re, rep).trim();
  }
  return x;
}

function pickAddressText(components: AddressComponent[], type: string): string {
  const c = components.find((x) => x.types?.includes(type));
  return (c?.longText || c?.shortText || '').trim();
}

function pickStateFromComponents(components: AddressComponent[]): string {
  const c = components.find((x) => x.types?.includes('administrative_area_level_1'));
  return (c?.shortText || c?.longText || '').trim();
}

/** Leading street number + remainder as street name; null if not a typical street line. */
function parseStreetFromLine(line: string): { number: string; street: string } | null {
  const t = line.trim();
  const m = t.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
  if (!m) return null;
  return { number: m[1], street: normalizeComparable(m[2]) };
}

type ParsedAddress = {
  streetNumber: string;
  streetName: string;
  cityNorm: string;
  stateAbbr: string;
};

/** "City, ST ..." or "City, State ..." from tail of a comma-separated address string. */
function parseCityStateFromTail(segments: string[]): { cityNorm: string; stateAbbr: string } | null {
  if (segments.length < 2) return null;
  const cityNorm = normalizeComparable(segments[segments.length - 2] || '');
  const last = (segments[segments.length - 1] || '').trim();
  const stateToken = last.split(/\s+/)[0] || '';
  const stateAbbr = normalizeStateToAbbr(stateToken);
  if (!cityNorm || !stateAbbr) return null;
  return { cityNorm, stateAbbr };
}

function parseAddressFromReport(row: Row): ParsedAddress | null {
  const a1 = row.address_1?.trim() || '';
  const loc = row.location?.trim() || '';

  if (a1) {
    const st = parseStreetFromLine(a1);
    if (!st) return null;
    let cityNorm = normalizeComparable(row.city || '');
    let stateAbbr = row.state ? normalizeStateToAbbr(row.state) : '';
    if (!cityNorm || !stateAbbr) {
      const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
      const tail = parseCityStateFromTail(parts);
      if (tail) {
        if (!cityNorm) cityNorm = tail.cityNorm;
        if (!stateAbbr) stateAbbr = tail.stateAbbr;
      }
    }
    if (!cityNorm || !stateAbbr) return null;
    return {
      streetNumber: normalizeComparable(st.number),
      streetName: st.street,
      cityNorm,
      stateAbbr,
    };
  }

  if (!loc) return null;
  const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const st = parseStreetFromLine(parts[0]);
  if (!st) return null;
  const tail = parseCityStateFromTail(parts);
  if (!tail) return null;
  return {
    streetNumber: normalizeComparable(st.number),
    streetName: st.street,
    cityNorm: tail.cityNorm,
    stateAbbr: tail.stateAbbr,
  };
}

function googleDisplayName(place: SearchPlace): string {
  const t = place.displayName?.text;
  return typeof t === 'string' ? t : '';
}

function nameMatchesReport(propertyName: string, place: SearchPlace): boolean {
  const g = googleDisplayName(place);
  if (!g) return false;
  return normalizeComparable(propertyName) === normalizeComparable(g);
}

function addressMatchesReport(parsed: ParsedAddress, components: AddressComponent[]): boolean {
  const gNum = pickAddressText(components, 'street_number');
  const gRouteRaw = pickAddressText(components, 'route');
  const gLoc = normalizeComparable(
    pickAddressText(components, 'locality') ||
      pickAddressText(components, 'sublocality_level_1')
  );
  const gState = normalizeStateToAbbr(pickStateFromComponents(components));
  if (!gNum || !gRouteRaw || !gLoc || !gState) return false;
  const gRouteFuzz = fuzzyNormalizeStreetRoute(gRouteRaw);
  const reportRouteFuzz = fuzzyNormalizeStreetRoute(parsed.streetName);
  return (
    normalizeComparable(gNum) === parsed.streetNumber &&
    gRouteFuzz === reportRouteFuzz &&
    gLoc === parsed.cityNorm &&
    gState === parsed.stateAbbr
  );
}

/** When Text Search omits address components, fetch minimal fields for verification. */
async function fetchPlaceForVerification(placeId: string): Promise<SearchPlace | null> {
  const id = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey!,
      'X-Goog-FieldMask': 'id,displayName,addressComponents',
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as SearchPlace;
}

async function pickVerifiedPlace(
  propertyName: string,
  row: Row,
  places: SearchPlace[]
): Promise<SearchPlace | null> {
  const parsedAddr = parseAddressFromReport(row);
  for (const p of places) {
    let candidate = p;
    const comps = candidate.addressComponents || [];
    if (!comps.length && parsedAddr) {
      await sleep(180);
      const enriched = await fetchPlaceForVerification(p.id);
      if (enriched?.addressComponents?.length) candidate = enriched;
    }
    const finalComps = candidate.addressComponents || [];
    if (nameMatchesReport(propertyName, candidate)) return candidate;
    if (parsedAddr && addressMatchesReport(parsedAddr, finalComps)) return candidate;
  }
  return null;
}

function resortCategory(marketType: string): string {
  switch (marketType) {
    case 'rv':
      return 'RV Resort';
    case 'glamping':
      return 'Glamping resort';
    case 'rv_glamping':
      return 'RV Resort & Glamping';
    case 'outdoor_hospitality':
      return 'Other';
    default:
      return 'Other';
  }
}

function shouldSkipGoogleLookup(propertyName: string): boolean {
  const n = propertyName.trim();
  if (n.length < 3) return true;
  const patterns = [
    /^23-\d|^25-\d/,
    /^term\. In particular/i,
    /^development$/i,
    /^development\./i,
    /^in a natural setting/i,
    /^in a world/i,
    /^with access to ATV/i,
    /^with proximity to Joshua/i,
    /^are its remote/i,
    /^deemed to be feasible/i,
    /^industry is positive/i,
    /^Type$/i,
    /^vending area$/i,
    /^SummaryResort Name/i,
    /^ARG\t/i,
    /^To Be Determined$/i,
    /^TBD-/i,
    /^TBH-/i,
    /^Confidential$/i,
    /^CCF Bank$/i,
    /^Gulf Coast Bank$/i,
    /^Sterling Federal Bank$/i,
    /^Dart Appraisal/i,
    /^Dan Clancy$/i,
    /^Mike Sullivan$/i,
    /^Jeff Pfiel$/i,
    /^Johnny Duda$/i,
    /^Justin Highland/i,
    /^Marty And /i,
    /^Mary Simmons/i,
    /^Scott Toboy$/i,
    /^Wesley Weidermann$/i,
    /^Harper Price$/i,
    /^Update 50 Prospect/i,
    /^Rights Appraised$/i,
    /^Glamping Feasibility Study/i,
    /^Simmons Bluff Road/i,
    /^Sky Diamonds/i,
  ];
  return patterns.some((re) => re.test(n));
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const SEARCH_MAX_RESULTS = 10;

async function textSearchCandidates(
  propertyName: string,
  city: string,
  state: string,
  loc: string
): Promise<SearchPlace[]> {
  const parts: string[] = [propertyName];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (!city && !state && loc.trim()) parts.push(loc.trim());
  const q = parts.join(' ');
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: SEARCH_MAX_RESULTS }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: SearchPlace[] };
  return data.places ?? [];
}

type Details = {
  websiteUri?: string;
  businessStatus?: string;
  googleMapsUri?: string;
  displayName?: { text?: string };
  addressComponents?: AddressComponent[];
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{ publishTime?: string }>;
};

function displayNameText(d: Details): string {
  const dn = d.displayName;
  if (dn && typeof dn === 'object' && typeof dn.text === 'string') return dn.text;
  return '';
}

/** Earliest calendar year among review publishTime values in the API response (subset of reviews). */
function earliestReviewYearFromSample(reviews: Array<{ publishTime?: string }> | undefined): string {
  if (!reviews?.length) return '';
  let minYear = Infinity;
  for (const r of reviews) {
    const t = r.publishTime;
    if (!t || typeof t !== 'string') continue;
    const y = new Date(t).getUTCFullYear();
    if (Number.isFinite(y)) minYear = Math.min(minYear, y);
  }
  return minYear === Infinity ? '' : String(minYear);
}

function formatGoogleRating(rating: number | undefined): string {
  if (rating === undefined || rating === null || Number.isNaN(rating)) return '';
  return String(rating);
}

async function placeDetails(placeId: string): Promise<Details | null> {
  const id = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const fieldMask =
    'websiteUri,businessStatus,googleMapsUri,displayName,addressComponents,rating,userRatingCount,reviews.publishTime';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey!,
      'X-Goog-FieldMask': fieldMask,
    },
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Place details ${res.status}: ${errBody.slice(0, 200)}`);
    return null;
  }
  return (await res.json()) as Details;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl!, supabaseSecretKey!);

  const { data: rows, error } = await supabase
    .from('reports')
    .select('property_name, city, state, location, address_1, market_type, study_id, created_at')
    .is('deleted_at', null)
    .not('property_name', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const seen = new Set<string>();
  const distinct: Row[] = [];
  for (const r of rows || []) {
    const pn = String(r.property_name || '').trim();
    if (!pn) continue;
    const key = pn.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push({
      property_name: pn,
      city: (r.city as string) || '',
      state: (r.state as string) || '',
      location: (r.location as string) || '',
      address_1: (r.address_1 as string) || '',
      market_type: (r.market_type as string) || 'outdoor_hospitality',
      study_id: (r.study_id as string) || '',
    });
  }

  distinct.sort((a, b) => a.property_name.localeCompare(b.property_name));

  const header = [
    'property_name',
    'City',
    'State',
    'Job Number',
    'location_context',
    'resort_category',
    'website_url',
    'date_opened',
    'operational_status',
    'google_maps_url',
    'matched_place_name',
    'Google Review',
    'Number of Reviews',
    'Year of First Review',
    'notes',
  ];

  const out: string[] = [header.join(',')];

  let i = 0;
  for (const row of distinct) {
    i += 1;
    const locCtx = [row.city, row.state].filter(Boolean).join(', ') || row.location;
    const cat = resortCategory(row.market_type);
    let website = '';
    let dateOpened = '';
    let opStatus = '';
    let mapsUrl = '';
    let matchedName = '';
    let googleReview = '';
    let numberOfReviews = '';
    let yearOfFirstReview = '';
    let notes = '';

    if (shouldSkipGoogleLookup(row.property_name)) {
      notes = 'Skipped Google lookup — property name looks like bad import or non-property';
    } else {
      const candidates = await textSearchCandidates(row.property_name, row.city, row.state, row.location);
      await sleep(180);
      if (!candidates.length) {
        notes = 'No Google Places match for search query';
      } else {
        const verified = await pickVerifiedPlace(row.property_name, row, candidates);
        if (!verified) {
          const firstName = googleDisplayName(candidates[0]) || '(no name)';
          notes = `No Google candidate passed verification (exact business name or street number+street+city+state). Nearest result: "${firstName}"`;
          matchedName = firstName;
        } else {
          const placeId = verified.id;
          const d = await placeDetails(placeId);
          await sleep(180);
          if (d) {
            website = d.websiteUri || '';
            mapsUrl = d.googleMapsUri || '';
            matchedName = displayNameText(d);
            googleReview = formatGoogleRating(d.rating);
            if (d.userRatingCount !== undefined && d.userRatingCount !== null) {
              numberOfReviews = String(d.userRatingCount);
            }
            yearOfFirstReview = earliestReviewYearFromSample(d.reviews);
            const bs = d.businessStatus || '';
            if (bs === 'OPERATIONAL') opStatus = 'Open (OPERATIONAL)';
            else if (bs === 'CLOSED_TEMPORARILY') opStatus = 'Temporarily closed';
            else if (bs === 'CLOSED_PERMANENTLY') opStatus = 'Permanently closed';
            else opStatus = bs || 'Unknown';
          } else {
            notes = 'Place details request failed';
          }
        }
      }
    }

    const line = [
      csvEscape(row.property_name),
      csvEscape(row.city),
      csvEscape(row.state),
      csvEscape(row.study_id),
      csvEscape(locCtx),
      csvEscape(cat),
      csvEscape(website),
      csvEscape(dateOpened),
      csvEscape(opStatus),
      csvEscape(mapsUrl),
      csvEscape(matchedName),
      csvEscape(googleReview),
      csvEscape(numberOfReviews),
      csvEscape(yearOfFirstReview),
      csvEscape(notes),
    ].join(',');
    out.push(line);

    if (i % 25 === 0) console.error(`Progress ${i}/${distinct.length}`);
  }

  const outPath = path.join(process.cwd(), 'reports-properties-open-status.csv');
  fs.writeFileSync(outPath, out.join('\n'), 'utf8');
  console.error(`Wrote ${distinct.length} rows to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
