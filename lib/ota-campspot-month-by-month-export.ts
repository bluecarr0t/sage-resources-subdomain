import type { PoolClient } from 'pg';
import { withReadOnlyCampingClient } from '@/lib/legacy-camping-db';
import { geocodeZipForSitesExport } from '@/lib/sites-export/geocode-zip';
import { resolveGeocodeForCompsSearch } from '@/lib/geocode';
import { resolveUsStateAbbr } from '@/lib/us-state-centers';
import {
  resolveAmenityGroups,
  unitTypeLikePatterns,
} from '@/lib/ota-occupancy-amenity-aliases';
import { isOtaPlaceholderRate } from '@/lib/ota-placeholder-rates';
import {
  COMPS_MONTHS,
  COMPS_MONTH_BY_MONTH_YEARS,
  COMPS_SITE_YEAR,
  computeCompsSiteHighLow,
  mapCompsPropertyRows,
  type CompsPropertyQueryRow,
  type CompsPropertyRow,
  type CompsSiteRow,
} from '@/lib/ota-comps-month-by-month-xlsx';

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;
const DB_STATEMENT_TIMEOUT_MS = 600_000;
/** Keep each Campspot query small enough to finish inside the warehouse timeout. */
const CAMPSPOT_PROPERTY_ID_CHUNK = 12;

const CAMPSPOT_RADIUS_SQL = `
        SELECT
          pd.id,
          pd.name,
          pd.city,
          pd.state,
          pd.link,
          round((ST_Distance(
            pd.coordinates::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) / 1609.344)::numeric, 1)::text as miles,
          (
            coalesce(pd.core_amenities::jsonb, '[]'::jsonb)
            || coalesce(pd.basic_amenities::jsonb, '[]'::jsonb)
          ) ? 'Waterfront' as has_waterfront,
          (
            coalesce(pd.core_amenities::jsonb, '[]'::jsonb)
            || coalesce(pd.basic_amenities::jsonb, '[]'::jsonb)
          ) ? 'Beach' as has_beach
        FROM campspot.propertydetails pd
        WHERE pd.coordinates IS NOT NULL
          AND ST_DWithin(
            pd.coordinates::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY 6::numeric
      `;

export type CampspotNameCityMatch = {
  nameIlike: string;
  cityIlike: string;
};

export type CampspotMonthByMonthExportOptions = {
  zip?: string;
  city?: string;
  state?: string;
  radiusMiles: number;
  years?: number[];
  amenities?: string[];
  unitTypes?: string[];
  propertyNameIlikes?: string[];
  nameAndCityMatches?: CampspotNameCityMatch[];
  center?: { lat: number; lon: number };
  skipSites?: boolean;
};

export type CampspotRadiusProperty = {
  id: number;
  name: string;
  city: string;
  state: string;
  link: string;
  miles: string;
  has_waterfront: boolean;
  has_beach: boolean;
};

export type CampspotMonthByMonthExportResult = {
  location_label: string;
  zip: string | null;
  city: string | null;
  state: string | null;
  center: { lat: number; lon: number };
  radius_miles: number;
  years: number[];
  radiusProperties: CampspotRadiusProperty[];
  focusedProperties: CompsPropertyRow[];
  rangeProperties: CompsPropertyRow[];
  focusedSites: CompsSiteRow[];
  rangeSites: CompsSiteRow[];
  focusedNames: string[];
  unknownAmenities: string[];
};

function parseCityStateInput(cityRaw: string, stateRaw: string): { city: string; state: string } {
  const city = cityRaw.trim();
  const state = resolveUsStateAbbr(stateRaw) || stateRaw.trim().toUpperCase();
  return { city, state };
}

async function resolveExportCenter(
  options: CampspotMonthByMonthExportOptions,
): Promise<{
  lat: number;
  lon: number;
  location_label: string;
  zip: string | null;
  city: string | null;
  state: string | null;
}> {
  if (options.center) {
    const zip = options.zip?.trim() || null;
    const city = options.city?.trim() || null;
    const state = options.state ? resolveUsStateAbbr(options.state) || options.state.trim() : null;
    const location_label = [city, state, zip].filter(Boolean).join(' ') || zip || 'Market';
    return { ...options.center, location_label, zip, city, state };
  }

  const zipInput = options.zip?.trim() ?? '';
  const { city, state } = parseCityStateInput(options.city?.trim() ?? '', options.state?.trim() ?? '');
  const zip = zipInput || (US_ZIP_RE.test(city) ? city.slice(0, 5) : '');

  if (zip) {
    const center = await geocodeZipForSitesExport(zip, []);
    if (!center) throw new Error(`Could not geocode zip ${zip}`);
    return {
      lat: center.lat,
      lon: center.lng,
      location_label: [city, state, zip].filter(Boolean).join(' ') || zip,
      zip,
      city: city || null,
      state: state || null,
    };
  }

  if (city && state) {
    const center = await resolveGeocodeForCompsSearch({
      city,
      state,
      locationLine: `${city}, ${state}, USA`,
    });
    if (!center) throw new Error(`Could not geocode ${city}, ${state}`);
    return {
      lat: center.lat,
      lon: center.lng,
      location_label: `${city} ${state}`,
      zip: null,
      city,
      state,
    };
  }

  throw new Error('Provide a zip code or city and state for the export center point.');
}

function hasSiteFilter(amenities: string[], unitTypes: string[]): boolean {
  return amenities.length > 0 || unitTypes.length > 0;
}

function matchingSitesCte(): string {
  return `
        site_parent AS (
          SELECT DISTINCT ON (id, property_id) id, property_id, parent_id
          FROM campspot.sites
          WHERE property_id = ANY($1::int[])
          ORDER BY id, property_id, scraping_id DESC
        ),
        matching_sites AS (
          SELECT DISTINCT sp.id AS site_id, sp.property_id
          FROM site_parent sp
          LEFT JOIN campspot.sitedetails sd
            ON sd.id = sp.parent_id AND sd.property_id = sp.property_id
          JOIN campspot.propertydetails pd ON pd.id = sp.property_id
          WHERE (
            jsonb_array_length($3::jsonb) = 0
            OR NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements($3::jsonb) AS grp(alias_list)
              WHERE NOT (
                coalesce(sd.amenities::jsonb, '{}'::jsonb)
                  ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
                OR coalesce(pd.core_amenities::jsonb, '[]'::jsonb)
                  ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
                OR coalesce(pd.basic_amenities::jsonb, '[]'::jsonb)
                  ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
              )
            )
          )
          AND (
            cardinality($4::text[]) = 0
            OR lower(coalesce(sd.category, '')) LIKE ANY($4::text[])
          )
        ),`;
}

const AMENITY_SELECT = `
  max(CASE WHEN (sd_parent.amenities::jsonb ? 'Private Bathroom' OR sd_parent.amenities::jsonb ? 'Private Shower') THEN 'Yes' ELSE 'No' END) as amenity_private_bathroom,
  max(CASE WHEN sd_parent.amenities::jsonb ? 'Water Hook-Up' THEN 'Yes' ELSE 'No' END) as amenity_water,
  max(CASE WHEN sd_parent.amenities::jsonb ? 'Sewer Hook-Up' THEN 'Yes' ELSE 'No' END) as amenity_sewer,
  max(CASE WHEN (sd_parent.amenities::jsonb ? 'Water Hook-Up' AND sd_parent.amenities::jsonb ? 'Sewer Hook-Up' AND (sd_parent.amenities::jsonb ? '30-Amp' OR sd_parent.amenities::jsonb ? '50-Amp')) THEN 'Yes' ELSE 'No' END) as amenity_full_hookup,
  max(CASE WHEN sd_parent.amenities::jsonb ? '50-Amp' THEN 'Yes' ELSE 'No' END) as amenity_50amp,
  max(CASE WHEN sd_parent.amenities::jsonb ? '30-Amp' THEN 'Yes' ELSE 'No' END) as amenity_30amp,
  max(CASE WHEN sd_parent.amenities::jsonb ? '20-Amp' THEN 'Yes' ELSE 'No' END) as amenity_20amp,
  max(CASE WHEN (sd_parent.amenities::jsonb ? 'Pull-Through' OR sd_parent.amenities::jsonb ? 'Pull-Through Site') THEN 'Yes' ELSE 'No' END) as amenity_pull_through,
  max(CASE WHEN (sd_parent.amenities::jsonb ? 'Back-In' OR sd_parent.amenities::jsonb ? 'Back-In Site') THEN 'Yes' ELSE 'No' END) as amenity_back_in
`;

function propertySql(filtered: boolean): string {
  const matchingCte = filtered ? matchingSitesCte() : '';
  const matchingJoin = filtered
    ? 'JOIN matching_sites ms ON ms.site_id = sma.site_id AND ms.property_id = sma.property_id'
    : '';
  const siteIdParam = filtered ? '$5' : '$3';
  return `
        WITH ${matchingCte}
        property_monthly AS (
          SELECT sma.property_id, sma.year, sma.month, sma.month_name, avg(sma.avg_occupancy::float) as occ
          FROM campspot.site_monthly_analytics sma
          ${matchingJoin}
          WHERE sma.year::int = ANY($2::int[]) AND sma.property_id = ANY($1::int[])
            AND (cardinality(${siteIdParam}::int[]) = 0 OR sma.site_id = ANY(${siteIdParam}::int[]))
          GROUP BY sma.property_id, sma.year, sma.month, sma.month_name
        ),
        open_months AS (SELECT * FROM property_monthly WHERE occ > 5),
        property_peaks AS (
          SELECT property_id, year,
            (array_agg(month_name ORDER BY occ DESC))[1] as high_month,
            (array_agg(month_name ORDER BY occ ASC))[1] as low_month
          FROM open_months
          GROUP BY property_id, year
        )
        SELECT
          pd.name,
          pd.link,
          pd.city,
          pd.state,
          sma.year,
          sma.month,
          sma.month_name,
          round(avg(sma.avg_occupancy::numeric), 2)::text as avg_occupancy_rate_pct,
          round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5))::numeric, 2)::text as median_retail_daily_rate,
          round(avg(sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5), 2)::text as mean_retail_daily_rate,
          round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.revpar::numeric))::numeric, 2)::text as revpar,
          round(min(sma.min_price) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as min_price,
          round(percentile_cont(0.95) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as max_price,
          count(DISTINCT sma.site_id)::text as site_count,
          count(DISTINCT sma.site_id) FILTER (WHERE sma.avg_occupancy::float > 5)::text as sites_with_occ_above_5,
          pp.high_month,
          pp.low_month
        FROM campspot.site_monthly_analytics sma
        ${matchingJoin}
        JOIN campspot.propertydetails pd ON pd.id = sma.property_id
        LEFT JOIN property_peaks pp ON pp.property_id = sma.property_id AND pp.year = sma.year
          WHERE sma.year::int = ANY($2::int[]) AND sma.property_id = ANY($1::int[])
            AND (cardinality(${siteIdParam}::int[]) = 0 OR sma.site_id = ANY(${siteIdParam}::int[]))
        GROUP BY pd.id, pd.name, pd.link, pd.city, pd.state, sma.year, sma.month, sma.month_name, pp.high_month, pp.low_month
        ORDER BY pd.name, sma.year::int, sma.month::int
      `;
}

async function fetchCampspotPropertyMonthsChunk(
  client: PoolClient,
  ids: number[],
  years: number[],
  filtered: boolean,
  amenityGroups: string[][],
  unitPatterns: string[],
  siteIds: number[],
): Promise<CompsPropertyRow[]> {
  const out: CompsPropertyRow[] = [];
  for (const year of years) {
    const params: unknown[] = filtered
      ? [ids, [year], JSON.stringify(amenityGroups), unitPatterns, siteIds]
      : [ids, [year], siteIds];
    const { rows } = await client.query<CompsPropertyQueryRow>(propertySql(filtered), params);
    out.push(...mapCompsPropertyRows(rows));
  }
  return out;
}

export async function fetchCampspotPropertyMonths(
  client: PoolClient,
  ids: number[],
  years: number[],
  filtered: boolean,
  amenityGroups: string[][],
  unitPatterns: string[],
  siteIds: number[] = [],
): Promise<CompsPropertyRow[]> {
  if (ids.length === 0) return [];
  const out: CompsPropertyRow[] = [];
  for (let i = 0; i < ids.length; i += CAMPSPOT_PROPERTY_ID_CHUNK) {
    out.push(
      ...(await fetchCampspotPropertyMonthsChunk(
        client,
        ids.slice(i, i + CAMPSPOT_PROPERTY_ID_CHUNK),
        years,
        filtered,
        amenityGroups,
        unitPatterns,
        siteIds,
      )),
    );
  }
  return out;
}

async function fetchCampspotSitesChunk(
  client: PoolClient,
  ids: number[],
  filtered: boolean,
  amenityGroups: string[][],
  unitPatterns: string[],
): Promise<CompsSiteRow[]> {
  const rateCols = COMPS_MONTHS.map(
    (m) =>
      `CASE WHEN max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::float END) > 5 THEN round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_price::numeric END), 2)::text END as rate_${m.name}`,
  ).join(',\n        ');
  const occCols = COMPS_MONTHS.map(
    (m) =>
      `round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::numeric END), 2)::text as occupancy_${m.name}`,
  ).join(',\n        ');

  const { rows } = await client.query<Record<string, string>>(
    `
          WITH site_parent AS (
            SELECT DISTINCT ON (id, property_id) id, property_id, parent_id
            FROM campspot.sites
            WHERE property_id = ANY($1::int[])
            ORDER BY id, property_id, scraping_id DESC
          )
          SELECT
            pd.name as property_name,
            pd.link as property_link,
            pd.city,
            pd.state,
            sma.property_id,
            sma.site_id,
            sd_parent.category as unit_type,
            sd_parent.name as site_name,
            ${AMENITY_SELECT},
            ${rateCols},
            ${occCols}
          FROM campspot.site_monthly_analytics sma
          JOIN campspot.propertydetails pd ON pd.id = sma.property_id
          LEFT JOIN site_parent sp ON sp.id = sma.site_id AND sp.property_id = sma.property_id
          LEFT JOIN campspot.sitedetails sd_parent ON sd_parent.id = sp.parent_id AND sd_parent.property_id = sma.property_id
          WHERE sma.year = $2 AND sma.property_id = ANY($1::int[])
            AND (
              NOT $3
              OR (
                (
                  jsonb_array_length($4::jsonb) = 0
                  OR NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements($4::jsonb) AS grp(alias_list)
                    WHERE NOT (
                      coalesce(sd_parent.amenities::jsonb, '{}'::jsonb)
                        ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
                      OR coalesce(pd.core_amenities::jsonb, '[]'::jsonb)
                        ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
                      OR coalesce(pd.basic_amenities::jsonb, '[]'::jsonb)
                        ?| ARRAY(SELECT jsonb_array_elements_text(alias_list))
                    )
                  )
                )
                AND (
                  cardinality($5::text[]) = 0
                  OR lower(coalesce(sd_parent.category, '')) LIKE ANY($5::text[])
                )
              )
            )
          GROUP BY pd.name, pd.link, pd.city, pd.state, sma.property_id, sma.site_id, sd_parent.category, sd_parent.name
          ORDER BY pd.name, sma.site_id
        `,
    [ids, COMPS_SITE_YEAR, filtered, JSON.stringify(amenityGroups), unitPatterns],
  );

  return rows.map((row) => {
    for (const m of COMPS_MONTHS) {
      const key = `rate_${m.name}`;
      if (isOtaPlaceholderRate(row[key])) row[key] = '';
    }
    row.site_url = row.property_link || '';
    Object.assign(row, computeCompsSiteHighLow(row, COMPS_MONTHS.map((m) => parseInt(m.num, 10))));
    return row;
  });
}

export async function fetchCampspotSites(
  client: PoolClient,
  ids: number[],
  filtered: boolean,
  amenityGroups: string[][],
  unitPatterns: string[],
): Promise<CompsSiteRow[]> {
  if (ids.length === 0) return [];
  const out: CompsSiteRow[] = [];
  for (let i = 0; i < ids.length; i += CAMPSPOT_PROPERTY_ID_CHUNK) {
    out.push(
      ...(await fetchCampspotSitesChunk(
        client,
        ids.slice(i, i + CAMPSPOT_PROPERTY_ID_CHUNK),
        filtered,
        amenityGroups,
        unitPatterns,
      )),
    );
  }
  return out;
}

export type CampspotListedRvSite = {
  property_name: string;
  site_id: string;
  site_name: string;
  unit_type: string;
  amenity_full_hookup: string;
  amenity_water: string;
  amenity_sewer: string;
  amenity_50amp: string;
  amenity_30amp: string;
};

async function fetchCampspotListedRvSitesChunk(
  client: PoolClient,
  ids: number[],
  unitPatterns: string[],
): Promise<CampspotListedRvSite[]> {
  const { rows } = await client.query<CampspotListedRvSite>(
    `
      WITH site_parent AS (
        SELECT DISTINCT ON (id, property_id) id, property_id, parent_id
        FROM campspot.sites
        WHERE property_id = ANY($1::int[])
        ORDER BY id, property_id, scraping_id DESC
      )
      SELECT
        pd.name as property_name,
        sp.id::text as site_id,
        coalesce(sd.name, '') as site_name,
        coalesce(sd.category, '') as unit_type,
        CASE WHEN (sd.amenities::jsonb ? 'Water Hook-Up' AND sd.amenities::jsonb ? 'Sewer Hook-Up' AND (sd.amenities::jsonb ? '30-Amp' OR sd.amenities::jsonb ? '50-Amp')) THEN 'Yes' ELSE 'No' END as amenity_full_hookup,
        CASE WHEN sd.amenities::jsonb ? 'Water Hook-Up' THEN 'Yes' ELSE 'No' END as amenity_water,
        CASE WHEN sd.amenities::jsonb ? 'Sewer Hook-Up' THEN 'Yes' ELSE 'No' END as amenity_sewer,
        CASE WHEN sd.amenities::jsonb ? '50-Amp' THEN 'Yes' ELSE 'No' END as amenity_50amp,
        CASE WHEN sd.amenities::jsonb ? '30-Amp' THEN 'Yes' ELSE 'No' END as amenity_30amp
      FROM site_parent sp
      JOIN campspot.propertydetails pd ON pd.id = sp.property_id
      LEFT JOIN campspot.sitedetails sd ON sd.id = sp.parent_id AND sd.property_id = sp.property_id
      WHERE cardinality($2::text[]) = 0
        OR lower(coalesce(sd.category, '')) LIKE ANY($2::text[])
      ORDER BY pd.name, sp.id
    `,
    [ids, unitPatterns],
  );
  return rows;
}

/** Listed RV inventory (not only sites present in 2025 monthly analytics). Used to size analog sets. */
export async function fetchCampspotListedRvSites(
  client: PoolClient,
  ids: number[],
  unitPatterns: string[],
): Promise<CampspotListedRvSite[]> {
  if (ids.length === 0) return [];
  const out: CampspotListedRvSite[] = [];
  for (let i = 0; i < ids.length; i += CAMPSPOT_PROPERTY_ID_CHUNK) {
    out.push(
      ...(await fetchCampspotListedRvSitesChunk(
        client,
        ids.slice(i, i + CAMPSPOT_PROPERTY_ID_CHUNK),
        unitPatterns,
      )),
    );
  }
  return out;
}

export function focusedCompSetLabel(
  amenities: string[],
  unitTypes: string[],
  radiusMiles: number,
  namedSet: boolean,
): string {
  const parts: string[] = [];
  if (unitTypes.some((t) => t.toLowerCase().includes('rv'))) parts.push('RV');
  for (const raw of amenities) {
    const token = raw.trim().toLowerCase().replace(/[_\s]+/g, '-');
    switch (token) {
      case 'wifi':
        parts.push('Wi-Fi');
        break;
      case 'waterfront':
        parts.push('Waterfront');
        break;
      case 'hot-tub':
      case 'hot-tubs':
        parts.push('Hot tub');
        break;
      case 'pool':
        parts.push('Pool');
        break;
      case 'pets':
        parts.push('Pets');
        break;
      case 'full-hookup':
        parts.push('Full hookup');
        break;
      case '50-amp':
        parts.push('50-Amp');
        break;
      case 'private-bathroom':
        parts.push('Private bathroom');
        break;
      default:
        parts.push(raw.trim());
        break;
    }
  }
  if (parts.length === 0) parts.push(namedSet ? 'Named set' : 'Filtered');
  return `${parts.join(' + ')} (${radiusMiles} mi)`;
}

export async function fetchCampspotRadiusProperties(
  lon: number,
  lat: number,
  radiusMiles: number,
): Promise<CampspotRadiusProperty[]> {
  const radiusMeters = radiusMiles * 1609.344;
  return withReadOnlyCampingClient(async (client) => {
    await client.query(`SET LOCAL statement_timeout = '${DB_STATEMENT_TIMEOUT_MS}'`);
    const { rows } = await client.query<CampspotRadiusProperty>(CAMPSPOT_RADIUS_SQL, [
      lon,
      lat,
      radiusMeters,
    ]);
    return rows;
  });
}

export async function exportCampspotMonthByMonth(
  options: CampspotMonthByMonthExportOptions,
): Promise<CampspotMonthByMonthExportResult> {
  const years = options.years?.length ? [...options.years] : [...COMPS_MONTH_BY_MONTH_YEARS];
  const amenities = options.amenities ?? [];
  const unitTypes = options.unitTypes ?? [];
  const amenityResolved = resolveAmenityGroups(amenities, 'campspot');
  const unitPatterns = unitTypeLikePatterns(unitTypes);
  const filtered = hasSiteFilter(amenities, unitTypes);
  const center = await resolveExportCenter(options);
  const radiusMeters = options.radiusMiles * 1609.344;

  return withReadOnlyCampingClient(async (client) => {
    await client.query(`SET LOCAL statement_timeout = '${DB_STATEMENT_TIMEOUT_MS}'`);

    const { rows: radiusRows } = await client.query<CampspotRadiusProperty>(
      CAMPSPOT_RADIUS_SQL,
      [center.lon, center.lat, radiusMeters],
    );

    const allIds = radiusRows.map((r) => r.id);
    let focusedIds = allIds;
    const nameIlikes = options.propertyNameIlikes ?? [];
    const nameAndCity = options.nameAndCityMatches ?? [];
    if (nameIlikes.length > 0 || nameAndCity.length > 0) {
      const { rows: focusedRows } = await client.query<{ id: number; name: string }>(
        `
        SELECT pd.id, pd.name
        FROM campspot.propertydetails pd
        WHERE pd.id = ANY($1::int[])
          AND (
            (
              cardinality($2::text[]) > 0
              AND pd.name ILIKE ANY($2::text[])
            )
            OR EXISTS (
              SELECT 1
              FROM unnest($3::text[], $4::text[]) AS m(name_ilike, city_ilike)
              WHERE pd.name ILIKE m.name_ilike AND pd.city ILIKE m.city_ilike
            )
          )
        ORDER BY pd.name
      `,
        [
          allIds,
          nameIlikes,
          nameAndCity.map((m) => m.nameIlike),
          nameAndCity.map((m) => m.cityIlike),
        ],
      );
      focusedIds = focusedRows.map((r) => r.id);
    }

    const focusedProperties = await fetchCampspotPropertyMonths(
      client,
      focusedIds,
      years,
      filtered,
      amenityResolved.groups,
      unitPatterns,
    );
    const rangeProperties = await fetchCampspotPropertyMonths(client, allIds, years, false, [], []);
    const focusedSites = options.skipSites
      ? []
      : await fetchCampspotSites(client, focusedIds, filtered, amenityResolved.groups, unitPatterns);
    const rangeSites = options.skipSites
      ? []
      : await fetchCampspotSites(client, allIds, false, [], []);

    return {
      location_label: center.location_label,
      zip: center.zip,
      city: center.city,
      state: center.state,
      center: { lat: center.lat, lon: center.lon },
      radius_miles: options.radiusMiles,
      years,
      radiusProperties: radiusRows,
      focusedProperties,
      rangeProperties,
      focusedSites,
      rangeSites,
      focusedNames: [...new Set(focusedProperties.map((r) => r.property_name))],
      unknownAmenities: amenityResolved.unknown,
    };
  });
}
