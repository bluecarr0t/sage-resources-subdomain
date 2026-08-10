/**
 * Most Influential Cities copy for Demand Indicators — nearest major/large
 * metros from enrich demand drivers (never template Chattanooga remnants).
 */

import { haversineDistanceMiles } from '@/lib/comps-v2/geo';
import { filterMajorLargeCityRows } from '@/lib/market-report/us-demand-driver-cities';
import type { EnrichedInput } from './types';
import { resolveNearestMajorCity, type MajorCityAnchor } from './transportation-access';

export interface InfluentialCityParagraph {
  title: string;
  body: string;
}

function formatMiles(n: number): string {
  return `${Math.round(n)} miles`;
}

function estimateDriveMinutes(straightMiles: number): number {
  return Math.max(10, Math.round((straightMiles * 1.3) / 42 * 60));
}

/**
 * Closest major/large catalog cities for the subject (by straight-line miles).
 */
export function selectInfluentialCities(
  input: EnrichedInput,
  limit = 3
): MajorCityAnchor[] {
  const lat = input.latitude;
  const lng = input.longitude;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [];
  }

  const fromEnrich = (input.demand_drivers?.major_cities?.items ?? [])
    .filter(
      (i) =>
        i.latitude != null &&
        i.longitude != null &&
        Number.isFinite(i.latitude) &&
        Number.isFinite(i.longitude)
    )
    .map((i) => ({
      name: i.name.replace(/,\s*[A-Z]{2}$/, ''),
      state: i.state,
      latitude: i.latitude as number,
      longitude: i.longitude as number,
      distance_miles: i.distance_miles,
      population: i.visitors,
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles);

  if (fromEnrich.length > 0) return fromEnrich.slice(0, limit);

  const nearest = resolveNearestMajorCity(lat, lng, input.demand_drivers, 200);
  const out: MajorCityAnchor[] = [];
  if (nearest) out.push(nearest);

  for (const [name, st, clat, clng, pop] of filterMajorLargeCityRows()) {
    if (out.some((c) => c.name === name && c.state === st)) continue;
    const dist = haversineDistanceMiles(lat, lng, clat, clng);
    if (dist > 200) continue;
    out.push({
      name,
      state: st,
      latitude: clat,
      longitude: clng,
      distance_miles: Math.round(dist * 10) / 10,
      population: pop,
    });
    out.sort((a, b) => a.distance_miles - b.distance_miles);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/**
 * Short factual paragraphs — no invented attractions from other markets.
 */
export function buildInfluentialCitiesParagraphs(
  input: EnrichedInput,
  cities: MajorCityAnchor[]
): InfluentialCityParagraph[] {
  const subject = [input.city, input.state].filter(Boolean).join(', ') || 'the subject';
  const county = input.county?.trim();

  if (cities.length === 0) {
    return [
      {
        title: 'Regional urban demand',
        body:
          `Nearest major-city demand anchors for ${subject} will be confirmed from enrich major-cities ` +
          `data and STDB market geography. Template remnant cities from other markets should not be used.`,
      },
    ];
  }

  return cities.map((city, index) => {
    const label = `${city.name}${city.state ? `, ${city.state}` : ''}`;
    const mins = estimateDriveMinutes(city.distance_miles);
    const pop =
      city.population != null && Number.isFinite(city.population)
        ? `with a city population of approximately ${Math.round(city.population).toLocaleString('en-US')}`
        : 'a major regional population center';
    const role =
      index === 0
        ? 'the primary major city influencing the subject'
        : 'an additional major city within the subject’s regional demand shed';
    const accessHint =
      (input.state || '').toUpperCase().slice(0, 2) === 'OH' && /cleveland/i.test(city.name)
        ? ' Guests typically reach the subject via Interstate 271 and connecting state routes through the Cuyahoga Valley corridor.'
        : '';

    return {
      title: `${label}:`,
      body:
        `${label} is ${role}. It is located about ${formatMiles(city.distance_miles)} ` +
        `(roughly a ${mins}-minute drive) from ${subject}` +
        `${county ? ` in ${/county/i.test(county) ? county : `${county} County`}` : ''}, ` +
        `${pop}.${accessHint} ` +
        `As a regional employment, healthcare, and leisure hub, ${city.name} supports overnight and day-trip ` +
        `demand for outdoor hospitality in the subject market.`,
    };
  });
}
