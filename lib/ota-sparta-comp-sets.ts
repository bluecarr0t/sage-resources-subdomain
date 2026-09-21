import type { PoolClient } from 'pg';
import {
  fetchCampspotListedRvSites,
  fetchCampspotPropertyMonths,
  type CampspotRadiusProperty,
} from '@/lib/ota-campspot-month-by-month-export';
import {
  COMPS_MONTH_BY_MONTH_YEARS,
  mapCompsPropertyRows,
  stampCompSet,
  type CompsPropertyQueryRow,
  type CompsPropertyRow,
  type CompsSiteRow,
} from '@/lib/ota-comps-month-by-month-xlsx';
import {
  COMPS_SET_DESTINATION,
  COMPS_SET_FHU,
  COMPS_SET_LOCAL,
  COMPS_SET_MARKET_RV,
  COMPS_SET_WATERFRONT,
  hasParkWaterfrontAccess,
  isDestinationParkName,
  isFhuQualityAnalog,
  isHipcampBellTentSku,
  isLocalCorePark,
  isSiteFullHookup,
  isWaterfrontSiteName,
} from '@/lib/ota-comps-set-rules';
import { unitTypeLikePatterns } from '@/lib/ota-occupancy-amenity-aliases';

const RV_PATTERNS = unitTypeLikePatterns(['rv']);

function milesByProperty(radius: CampspotRadiusProperty[]): Map<string, string> {
  return new Map(radius.map((row) => [row.name, row.miles]));
}

function siteId(row: { site_id: string }): number {
  return parseInt(row.site_id, 10);
}

function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id)))];
}

function propertyIdsForNames(
  radius: CampspotRadiusProperty[],
  names: Set<string>,
): number[] {
  return radius.filter((row) => names.has(row.name)).map((row) => row.id);
}

export type SpartaLabeledSets = {
  focusedProperties: CompsPropertyRow[];
  focusedSites: CompsSiteRow[];
  destinationProperties: CompsPropertyRow[];
  rangeProperties: CompsPropertyRow[];
  rangeSites: CompsSiteRow[];
  localNames: string[];
  waterfrontNames: string[];
  fhuNames: string[];
  destinationNames: string[];
};

export async function buildSpartaLabeledSets(opts: {
  client: PoolClient;
  years: number[];
  radiusProperties: CampspotRadiusProperty[];
  skipSites?: boolean;
}): Promise<SpartaLabeledSets> {
  const years = opts.years.length ? opts.years : [...COMPS_MONTH_BY_MONTH_YEARS];
  const ids = opts.radiusProperties.map((row) => row.id);
  const miles = milesByProperty(opts.radiusProperties);
  const listedSites = opts.skipSites
    ? []
    : await fetchCampspotListedRvSites(opts.client, ids, RV_PATTERNS);
  console.log(`Listed Campspot RV inventory in radius: ${listedSites.length} sites.`);

  const sitesByPark = new Map<string, typeof listedSites>();
  for (const site of listedSites) {
    const list = sitesByPark.get(site.property_name) ?? [];
    list.push(site);
    sitesByPark.set(site.property_name, list);
  }

  const localNames = new Set<string>();
  const fhuNames = new Set<string>();
  const destinationNames = new Set<string>();
  const waterfrontSiteIds: number[] = [];
  const localSiteIds: number[] = [];
  const fhuSiteIds: number[] = [];
  const destinationSiteIds: number[] = [];
  const waterfrontNames = new Set<string>();
  const droppedInland: string[] = [];

  for (const park of opts.radiusProperties) {
    const sites = sitesByPark.get(park.name) ?? [];
    const rvCount = sites.length;
    const fhuCount = sites.filter((site) => isSiteFullHookup(site)).length;
    const milesNum = parseFloat(park.miles);
    const waterfrontPark = hasParkWaterfrontAccess({
      hasWaterfrontAmenity: park.has_waterfront,
      hasBeachAmenity: park.has_beach,
      siteNames: sites.map((site) => site.site_name ?? ''),
    });
    const localCore = isLocalCorePark({
      miles: milesNum,
      rvSiteCount: rvCount,
      propertyName: park.name,
    });
    const fhuAnalog = isFhuQualityAnalog({ fhuSiteCount: fhuCount, propertyName: park.name });
    if (isDestinationParkName(park.name) && rvCount > 0) {
      destinationNames.add(park.name);
      destinationSiteIds.push(...sites.map(siteId));
      continue;
    }
    if (!waterfrontPark && (localCore || fhuAnalog)) {
      droppedInland.push(park.name);
    }
    if (waterfrontPark && localCore) {
      localNames.add(park.name);
      localSiteIds.push(...sites.map(siteId));
    }
    if (waterfrontPark && fhuAnalog) {
      fhuNames.add(park.name);
      fhuSiteIds.push(
        ...sites.filter((site) => isSiteFullHookup(site)).map(siteId),
      );
    }
    for (const site of sites) {
      if (!isWaterfrontSiteName(site.site_name ?? '')) continue;
      waterfrontNames.add(park.name);
      waterfrontSiteIds.push(siteId(site));
    }
  }

  const nearby = opts.radiusProperties
    .filter((park) => parseFloat(park.miles) <= 25)
    .map((park) => {
      const sites = sitesByPark.get(park.name) ?? [];
      return `${park.name} (${park.miles} mi, ${sites.length} RV)`;
    });
  if (nearby.length) {
    console.log(`Parks within 25 miles:\n  ${nearby.join('\n  ')}`);
  }
  if (droppedInland.length) {
    console.log(
      `Dropped from Comp (no waterfront views/access):\n  ${droppedInland.join('\n  ')}`,
    );
  }
  console.log(
    `Sets: local ${localNames.size}, waterfront ${waterfrontNames.size}, FHU ${fhuNames.size}, destination ${destinationNames.size}. Pulling property-months…`,
  );

  const localMonths = await fetchCampspotPropertyMonths(
    opts.client,
    propertyIdsForNames(opts.radiusProperties, localNames),
    years,
    false,
    [],
    [],
    uniqueIds(localSiteIds),
  );
  const waterfrontMonths = await fetchCampspotPropertyMonths(
    opts.client,
    propertyIdsForNames(opts.radiusProperties, waterfrontNames),
    years,
    false,
    [],
    [],
    uniqueIds(waterfrontSiteIds),
  );
  const fhuMonths = await fetchCampspotPropertyMonths(
    opts.client,
    propertyIdsForNames(opts.radiusProperties, fhuNames),
    years,
    false,
    [],
    [],
    uniqueIds(fhuSiteIds),
  );
  const destinationMonths = await fetchCampspotPropertyMonths(
    opts.client,
    propertyIdsForNames(opts.radiusProperties, destinationNames),
    years,
    false,
    [],
    [],
    uniqueIds(destinationSiteIds),
  );
  const rangeMonths = await fetchCampspotPropertyMonths(
    opts.client,
    ids,
    years,
    true,
    [],
    RV_PATTERNS,
  );

  const focusedProperties = [
    ...stampCompSet(localMonths, COMPS_SET_LOCAL, miles),
    ...stampCompSet(waterfrontMonths, COMPS_SET_WATERFRONT, miles),
    ...stampCompSet(fhuMonths, COMPS_SET_FHU, miles),
  ];

  return {
    focusedProperties,
    focusedSites: [],
    destinationProperties: stampCompSet(destinationMonths, COMPS_SET_DESTINATION, miles),
    rangeProperties: stampCompSet(rangeMonths, COMPS_SET_MARKET_RV, miles),
    rangeSites: [],
    localNames: [...localNames],
    waterfrontNames: [...waterfrontNames],
    fhuNames: [...fhuNames],
    destinationNames: [...destinationNames],
  };
}

export async function fetchHipcampBellTentMonths(opts: {
  client: PoolClient;
  lon: number;
  lat: number;
  radiusMiles: number;
  years: number[];
}): Promise<CompsPropertyRow[]> {
  const radiusMeters = opts.radiusMiles * 1609.344;
  const { rows: parks } = await opts.client.query<{
    id: string;
    name: string;
    miles: string;
  }>(
    `
      SELECT pd.id::text as id, pd.name,
        round((ST_Distance(
          pd.coordinates::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1609.344)::numeric, 1)::text as miles
      FROM hipcamp.propertydetails pd
      WHERE pd.coordinates IS NOT NULL
        AND ST_DWithin(
          pd.coordinates::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
    `,
    [opts.lon, opts.lat, radiusMeters],
  );
  if (parks.length === 0) return [];

  const { rows: sites } = await opts.client.query<{
    site_id: string;
    property_id: string;
    category: string | null;
    category_list: string | null;
    site_name: string | null;
  }>(
    `
      SELECT sd.id::text as site_id, sd.property_id::text as property_id,
        sd.category, sd.category_list::text as category_list, sd.name as site_name
      FROM hipcamp.sitedetails sd
      WHERE sd.property_id::text = ANY($1::text[])
    `,
    [parks.map((park) => park.id)],
  );

  const matchingSiteIds = sites
    .filter((site) =>
      isHipcampBellTentSku({
        category: site.category,
        categoryList: site.category_list,
        siteName: site.site_name,
      }),
    )
    .map((site) => site.site_id);
  if (matchingSiteIds.length === 0) return [];

  const miles = new Map(parks.map((park) => [park.name, park.miles]));
  const out: CompsPropertyRow[] = [];
  for (const year of opts.years) {
    const { rows } = await opts.client.query<CompsPropertyQueryRow>(
      `
        SELECT
          pd.name,
          pd.link,
          pd.city,
          pd.state,
          sma.year::text as year,
          sma.month::text as month,
          sma.month_name,
          round(avg(sma.avg_occupancy::numeric), 2)::text as avg_occupancy_rate_pct,
          round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5))::numeric, 2)::text as median_retail_daily_rate,
          round(avg(sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5), 2)::text as mean_retail_daily_rate,
          '0'::text as revpar,
          round(min(sma.min_price) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as min_price,
          round(percentile_cont(0.95) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as max_price,
          count(DISTINCT sma.site_id)::text as site_count,
          count(DISTINCT sma.site_id) FILTER (WHERE sma.avg_occupancy::float > 5)::text as sites_with_occ_above_5,
          ''::text as high_month,
          ''::text as low_month
        FROM hipcamp.site_monthly_analytics sma
        JOIN hipcamp.propertydetails pd ON pd.id::text = sma.property_id::text
        WHERE sma.year::int = $2 AND sma.site_id::text = ANY($1::text[])
        GROUP BY pd.id, pd.name, pd.link, pd.city, pd.state, sma.year, sma.month, sma.month_name
        ORDER BY pd.name, sma.month::int
      `,
      [matchingSiteIds, year],
    );
    out.push(...stampCompSet(mapCompsPropertyRows(rows), 'Hipcamp bell/safari/canvas', miles));
  }
  return out;
}
