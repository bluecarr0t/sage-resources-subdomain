/**
 * Export distinct property names from Supabase `reports` and enrich with Google Places
 * (website, business status, rating, review count, earliest review year in returned sample).
 * Writes reports-properties-open-status.csv in cwd.
 *
 * Run: npx tsx scripts/export-reports-properties-open-status-csv.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
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
  market_type: string;
  study_id: string;
};

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

async function textSearch(
  propertyName: string,
  city: string,
  state: string,
  loc: string
): Promise<string | null> {
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
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { places?: Array<{ id: string }> };
  return data.places?.[0]?.id ?? null;
}

type Details = {
  websiteUri?: string;
  businessStatus?: string;
  googleMapsUri?: string;
  displayName?: { text?: string };
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
    'websiteUri,businessStatus,googleMapsUri,displayName,rating,userRatingCount,reviews.publishTime';
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
    .select('property_name, city, state, location, market_type, study_id, created_at')
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
      const placeId = await textSearch(row.property_name, row.city, row.state, row.location);
      await sleep(180);
      if (!placeId) {
        notes = 'No Google Places match for search query';
      } else {
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
