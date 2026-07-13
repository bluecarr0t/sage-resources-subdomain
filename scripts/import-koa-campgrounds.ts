#!/usr/bin/env npx tsx
/**
 * Import all KOA campgrounds from koa.com sitemap into all_glamping_properties
 * as property_type = 'Campground', is_glamping_property = 'No'.
 * unit_type is left null (parks are multi-SKU: RV pads / cabins / tent sites) —
 * do not write "Mixed"; split into sibling unit rows later from KOA unit pages if needed.
 *
 * Enrichment: Google Places Find Place (name, address, lat/lon).
 * Source: https://koa.com/sitemaps/campground-pages-sitemap.xml (May 2026).
 *
 * Usage:
 *   npx tsx scripts/import-koa-campgrounds.ts
 *   npx tsx scripts/import-koa-campgrounds.ts --dry-run
 *   npx tsx scripts/import-koa-campgrounds.ts --limit 10
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { slugifyPropertyName } from '../lib/property-slug';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const googleKey =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}
if (!googleKey) {
  console.error('Missing GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
})();
const CACHE_PATH = resolve(process.cwd(), 'scripts/.tmp-koa-places-cache.json');
const SITEMAP_PATH = resolve(process.cwd(), '.firecrawl/koa-campgrounds-sitemap.xml');
const DISCOVERY_SOURCE = 'koa_directory_sitemap_2026_05';
const KOA_BRAND_SLUG = 'koa';
const KOA_LOCATIONS = 471;

const US_STATE_ABBREV: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
};

const CA_PROVINCE_ABBREV: Record<string, string> = {
  Alberta: 'AB',
  'British Columbia': 'BC',
  Manitoba: 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  Ontario: 'ON',
  'Prince Edward Island': 'PE',
  Quebec: 'QC',
  Saskatchewan: 'SK',
  'Northwest Territories': 'NT',
  Nunavut: 'NU',
  Yukon: 'YT',
};

type PlaceCache = Record<
  string,
  {
    name: string;
    formatted_address: string | null;
    lat: number | null;
    lon: number | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
  }
>;

type CampgroundRef = { slug: string; url: string };

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function parseCampgroundsFromSitemap(xml: string): CampgroundRef[] {
  const seen = new Set<string>();
  const out: CampgroundRef[] = [];
  const re = /https:\/\/koa\.com\/campgrounds\/([^/]+)\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, url: `https://koa.com/campgrounds/${slug}/` });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseAddressParts(formatted: string | null): {
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
} {
  if (!formatted) {
    return { city: null, state: null, zip_code: null, country: null };
  }
  const parts = formatted.split(',').map((p) => p.trim());
  const countryRaw = parts[parts.length - 1] ?? '';
  const country =
    countryRaw === 'United States'
      ? 'United States'
      : countryRaw === 'Canada'
        ? 'Canada'
        : countryRaw || null;

  let state: string | null = null;
  let city: string | null = null;
  let zip_code: string | null = null;

  if (parts.length >= 2) {
    const stateZip = parts[parts.length - 2];
    const m = stateZip.match(/^([A-Za-z .]+?)\s+([A-Z0-9][A-Z0-9 -]{1,9})$/);
    if (m) {
      const regionName = m[1].trim();
      zip_code = m[2].trim();
      if (country === 'United States' && US_STATE_ABBREV[regionName]) {
        state = US_STATE_ABBREV[regionName];
      } else if (country === 'Canada' && CA_PROVINCE_ABBREV[regionName]) {
        state = CA_PROVINCE_ABBREV[regionName];
      } else if (/^[A-Z]{2}$/.test(regionName)) {
        state = regionName;
      } else {
        state = regionName;
      }
    } else if (/^[A-Z]{2}$/.test(stateZip)) {
      state = stateZip;
    }
  }
  if (parts.length >= 3) {
    city = parts[parts.length - 3];
  }

  return { city, state, zip_code, country };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function findPlace(query: string): Promise<PlaceCache[string] | null> {
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'name,formatted_address,geometry',
    key: googleKey!,
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    candidates?: Array<{
      name?: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    }>;
  };
  if (data.status !== 'OK' || !data.candidates?.length) return null;
  const c = data.candidates[0];
  const name = c.name?.trim();
  if (!name || !/\bkoa\b/i.test(name)) return null;
  const formatted_address = c.formatted_address ?? null;
  const lat = c.geometry?.location.lat ?? null;
  const lon = c.geometry?.location.lng ?? null;
  const { city, state, zip_code, country } = parseAddressParts(formatted_address);
  return { name, formatted_address, lat, lon, city, state, zip_code, country };
}

function isValidKoaPlace(place: PlaceCache[string] | null): boolean {
  return Boolean(place?.name && /\bkoa\b/i.test(place.name));
}

async function resolvePlace(slug: string, cache: PlaceCache): Promise<PlaceCache[string] | null> {
  if (cache[slug] && isValidKoaPlace(cache[slug])) return cache[slug];
  if (cache[slug]) delete cache[slug];
  const title = slugToTitle(slug);
  let place =
    (await findPlace(`${title} KOA`)) ??
    (await findPlace(`koa.com campground ${slug}`));
  if (!place) {
    await sleep(150);
    place = await findPlace(`${title} KOA campground`);
  }
  if (place) cache[slug] = place;
  await sleep(120);
  return place;
}

function buildDescription(name: string): string {
  return `${name} — Kampgrounds of America (KOA) campground offering RV sites, tent camping, and upgraded lodging including deluxe cabins, premium glamping tents, restored cabooses, and Conestoga wagons. National network known for family amenities (pools, playgrounds, KOA Paw Pen™ dog parks, laundry) and road-trip planning at koa.com.`;
}

function buildNotes(slug: string, url: string): string {
  return `Sources: KOA official directory (koa.com sitemap, May 2026). Listing: ${url}. Brand tier: KOA Journey / Holiday / Resort per property.`;
}

async function main() {
  let xml: string;
  try {
    xml = readFileSync(SITEMAP_PATH, 'utf8');
  } catch {
    console.error(`Missing ${SITEMAP_PATH} — run: curl -sL -A "Mozilla/5.0" "https://koa.com/sitemaps/campground-pages-sitemap.xml" -o .firecrawl/koa-campgrounds-sitemap.xml`);
    process.exit(1);
  }

  const campgrounds = parseCampgroundsFromSitemap(xml);
  const toProcess = LIMIT ? campgrounds.slice(0, LIMIT) : campgrounds;
  console.log(
    `${DRY_RUN ? 'DRY RUN' : 'LIVE'} — ${toProcess.length} KOA campgrounds (${campgrounds.length} in sitemap)\n`
  );

  const { data: brandRow } = await supabase
    .from('glamping_brands')
    .select('id')
    .eq('slug', KOA_BRAND_SLUG)
    .maybeSingle();
  const brandId = brandRow?.id ?? null;
  if (!brandId) {
    console.warn('Warning: glamping_brands slug=koa not found; rows will insert without brand_id');
  }

  const { data: existingRows } = await supabase
    .from(TABLE)
    .select('url')
    .or('url.ilike.%koa.com/campgrounds/%,property_name.ilike.%KOA%');

  const existingUrls = new Set(
    (existingRows ?? [])
      .map((r) => (r.url as string | null)?.replace(/\/$/, ''))
      .filter(Boolean)
  );

  const cache: PlaceCache = existsSync(CACHE_PATH)
    ? (JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as PlaceCache)
    : {};

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, url } of toProcess) {
    const normUrl = url.replace(/\/$/, '');
    if (existingUrls.has(normUrl)) {
      skipped += 1;
      continue;
    }

    let place = await resolvePlace(slug, cache);
    if (!place) {
      const fallbackName = `${slugToTitle(slug)} KOA`;
      console.warn(`No Places match for ${slug}; using fallback name "${fallbackName}"`);
      place = {
        name: fallbackName,
        formatted_address: null,
        lat: null,
        lon: null,
        city: null,
        state: null,
        zip_code: null,
        country: 'United States',
      };
    }

    const property_name = place.name;
    const slugBase = slugifyPropertyName(property_name);
    const statePart = place.state ? slugifyPropertyName(place.state) : slug;
    const rowSlug = `${slugBase}-${statePart}`.slice(0, 120);

    const row = {
      research_status: 'published',
      is_glamping_property: 'No',
      is_open: 'Yes',
      property_name,
      site_name: property_name,
      slug: rowSlug,
      property_type: 'Campground',
      /** Multi-product parks — leave null until sibling unit rows exist. */
      unit_type: null,
      source: 'Sage',
      discovery_source: DISCOVERY_SOURCE,
      country: place.country ?? 'United States',
      state: place.state,
      city: place.city,
      zip_code: place.zip_code,
      address: place.formatted_address,
      lat: place.lat,
      lon: place.lon,
      url,
      description: buildDescription(property_name),
      notes: buildNotes(slug, url),
      date_added: TODAY,
      date_updated: TODAY,
      land_operator_category: 'private_commercial',
      brand_id: brandId,
      number_of_locations: KOA_LOCATIONS,
    };

    if (DRY_RUN) {
      console.log(`Would insert: ${property_name} (${place.city}, ${place.state})`);
      inserted += 1;
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        skipped += 1;
        continue;
      }
      console.error(`Insert failed ${property_name}: ${error.message}`);
      failed += 1;
      continue;
    }
    existingUrls.add(normUrl);
    inserted += 1;
    if (inserted % 25 === 0) {
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      console.log(`… ${inserted} inserted`);
    }
  }

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  if (!DRY_RUN && brandId) {
    await supabase
      .from('glamping_brands')
      .update({
        website_url: 'https://koa.com/',
        notes:
          'Kampgrounds of America (KOA) — ~471 North American campgrounds (May 2026 sitemap). Network tiers: Journey, Holiday, Resort. Lodging includes deluxe cabins, premium glamping tents, cabooses, and Conestoga wagons; family amenities and road-trip booking at koa.com.',
        updated_at: new Date().toISOString(),
      })
      .eq('slug', KOA_BRAND_SLUG);
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}, failed ${failed}.`);
  console.log(`Places cache: ${CACHE_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
