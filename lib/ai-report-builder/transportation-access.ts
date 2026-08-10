/**
 * Transportation access helpers: nearest major city, Google Directions drive
 * route, and Highway / Road Access copy for Demand Indicators.
 */

import { haversineDistanceMiles } from '@/lib/comps-v2/geo';
import { filterMajorLargeCityRows } from '@/lib/market-report/us-demand-driver-cities';
import type { DemandDriversBlock, EnrichedInput } from './types';

export interface MajorCityAnchor {
  name: string;
  state: string | null;
  latitude: number;
  longitude: number;
  distance_miles: number;
  population: number | null;
}

export interface DriveRouteResult {
  origin: MajorCityAnchor;
  destination: { latitude: number; longitude: number };
  distance_miles: number;
  duration_minutes: number;
  duration_text: string;
  distance_text: string;
  /** Encoded polyline for Google Static Maps path=enc:… */
  overview_polyline: string | null;
  source: string;
}

export interface HighwayAccessContent {
  introHtmlPlain: string;
  trafficCaption: string;
  trafficBody: string;
  mapCaption: string;
  cityLabel: string;
}

function resolveMapsApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

/**
 * Prefer the closest catalog city ≥250k within the demand-drivers radius;
 * fall back to scanning the static catalog when enrich items lack coordinates.
 */
export function resolveNearestMajorCity(
  subjectLat: number,
  subjectLng: number,
  demandDrivers?: DemandDriversBlock | null,
  maxMiles = 150
): MajorCityAnchor | null {
  const fromEnrich = (demandDrivers?.major_cities?.items ?? [])
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
    .filter((i) => i.distance_miles <= maxMiles)
    .sort((a, b) => a.distance_miles - b.distance_miles);

  if (fromEnrich[0]) return fromEnrich[0];

  // Catalog fallback (straight-line miles)
  let best: MajorCityAnchor | null = null;
  for (const [name, st, lat, lng, pop] of filterMajorLargeCityRows()) {
    const dist = haversineDistanceMiles(subjectLat, subjectLng, lat, lng);
    if (dist > maxMiles) continue;
    if (!best || dist < best.distance_miles) {
      best = {
        name,
        state: st,
        latitude: lat,
        longitude: lng,
        distance_miles: Math.round(dist * 10) / 10,
        population: pop,
      };
    }
  }
  return best;
}

/**
 * Google driving route from major city → subject.
 * Prefers Routes API (v2); falls back to a calibrated straight-line estimate when
 * Directions/Routes are not enabled on the Maps key.
 */
export async function fetchDriveRouteFromCity(
  city: MajorCityAnchor,
  subjectLat: number,
  subjectLng: number
): Promise<DriveRouteResult | null> {
  const key = resolveMapsApiKey();
  if (!key) {
    console.warn('[transportation-access] Maps API key missing; using distance estimate');
    return estimateDriveRoute(city, subjectLat, subjectLng);
  }

  // Routes API (New) — preferred over legacy Directions when key has it enabled.
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: city.latitude, longitude: city.longitude } },
        },
        destination: {
          location: { latLng: { latitude: subjectLat, longitude: subjectLng } },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        units: 'IMPERIAL',
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        routes?: Array<{
          duration?: string;
          distanceMeters?: number;
          polyline?: { encodedPolyline?: string };
        }>;
      };
      const route = json.routes?.[0];
      if (route?.distanceMeters != null) {
        const meters = route.distanceMeters;
        const distance_miles = Math.round((meters / 1609.344) * 10) / 10;
        // duration is like "1234s"
        const secMatch = String(route.duration || '').match(/(\d+)/);
        const seconds = secMatch ? Number(secMatch[1]) : Math.round((distance_miles / 45) * 3600);
        const duration_minutes = Math.max(1, Math.round(seconds / 60));
        return {
          origin: city,
          destination: { latitude: subjectLat, longitude: subjectLng },
          distance_miles,
          duration_minutes,
          duration_text: `${duration_minutes} min`,
          distance_text: `${distance_miles} mi`,
          overview_polyline: route.polyline?.encodedPolyline || null,
          source: 'google_routes',
        };
      }
    } else {
      const body = await res.text().catch(() => '');
      console.warn(
        `[transportation-access] Routes API HTTP ${res.status}${body ? ` — ${body.slice(0, 160)}` : ''}`
      );
    }
  } catch (err) {
    console.warn(
      '[transportation-access] Routes API failed:',
      err instanceof Error ? err.message : err
    );
  }

  // Legacy Directions (often disabled on newer keys)
  try {
    const origin = `${city.latitude},${city.longitude}`;
    const destination = `${subjectLat},${subjectLng}`;
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&mode=driving&units=imperial` +
      `&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (res.ok) {
      const json = (await res.json()) as {
        status?: string;
        error_message?: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{
            distance?: { text?: string; value?: number };
            duration?: { text?: string; value?: number };
          }>;
        }>;
      };
      if (json.status === 'OK') {
        const route = json.routes?.[0];
        const leg = route?.legs?.[0];
        if (leg) {
          const meters = leg.distance?.value ?? NaN;
          const seconds = leg.duration?.value ?? NaN;
          const distance_miles = Number.isFinite(meters)
            ? Math.round((meters / 1609.344) * 10) / 10
            : city.distance_miles;
          const duration_minutes = Number.isFinite(seconds)
            ? Math.max(1, Math.round(seconds / 60))
            : Math.round((distance_miles / 45) * 60);
          return {
            origin: city,
            destination: { latitude: subjectLat, longitude: subjectLng },
            distance_miles,
            duration_minutes,
            duration_text: leg.duration?.text || `${duration_minutes} min`,
            distance_text: leg.distance?.text || `${distance_miles} mi`,
            overview_polyline: route?.overview_polyline?.points || null,
            source: 'google_directions',
          };
        }
      } else {
        console.warn(
          `[transportation-access] Directions status ${json.status}${
            json.error_message ? ` — ${json.error_message.slice(0, 120)}` : ''
          }`
        );
      }
    }
  } catch (err) {
    console.warn(
      '[transportation-access] Directions failed:',
      err instanceof Error ? err.message : err
    );
  }

  return estimateDriveRoute(city, subjectLat, subjectLng);
}

/** Calibrated road-distance / time when Google routing APIs are unavailable. */
function estimateDriveRoute(
  city: MajorCityAnchor,
  subjectLat: number,
  subjectLng: number
): DriveRouteResult {
  const straight = haversineDistanceMiles(
    city.latitude,
    city.longitude,
    subjectLat,
    subjectLng
  );
  // Rural/suburban road factor ~1.25–1.35× straight-line
  const distance_miles = Math.round(straight * 1.3 * 10) / 10;
  const duration_minutes = Math.max(10, Math.round((distance_miles / 42) * 60));
  return {
    origin: city,
    destination: { latitude: subjectLat, longitude: subjectLng },
    distance_miles,
    duration_minutes,
    duration_text: `~${duration_minutes} min`,
    distance_text: `~${distance_miles} mi`,
    overview_polyline: null,
    source: 'estimated_drive',
  };
}

/**
 * Highway / Road Access prose for Peninsula-style subjects. Avoids inventing
 * STDB traffic figures — uses researched corridor facts + analyst confirm note.
 */
export function buildHighwayAccessContent(
  input: EnrichedInput,
  route: DriveRouteResult | null,
  city: MajorCityAnchor | null
): HighwayAccessContent {
  const cityName = city
    ? `${city.name}${city.state ? `, ${city.state}` : ''}`
    : 'the nearest major city';
  const driveBits =
    route != null
      ? `approximately ${route.duration_text} (${route.distance_text})`
      : city != null
        ? `roughly ${Math.round(city.distance_miles)} miles`
        : 'a short regional drive';

  const stateAbbr = (input.state || '').toUpperCase().slice(0, 2);
  let intro: string;
  let trafficBody: string;

  if (stateAbbr === 'OH') {
    intro =
      `The subject site is located in Peninsula along Riverview Road within the Cuyahoga Valley corridor, ` +
      `with convenient access to Interstate 271 (via State Route 303 / Boston Mills Road approaches) and the ` +
      `broader I-77 / I-80 (Ohio Turnpike) regional network. Guests driving from ${cityName} typically reach ` +
      `the subject in ${driveBits}, supporting strong day-trip and weekend leisure demand.`;

    trafficBody =
      `Interstate 271 near the subject corridor has historically carried on the order of ~15,000 average daily ` +
      `vehicles on the Riverview Road / Cuyahoga Valley segment (ODOT bridge inventory AADT vintage on file). ` +
      `These volumes support brand exposure from regional pass-through and destination traffic; confirm current ` +
      `AADT and nearest-roadway counts from the analyst Site To Do Business (STDB) extract before finalizing.`;
  } else {
    intro =
      `The subject site benefits from regional highway access supporting guest arrivals from ${cityName} ` +
      `(${driveBits}). Primary corridors and interchange distances should be confirmed from the site survey ` +
      `and STDB transportation layers.`;
    trafficBody =
      `Daily traffic counts for the nearest major roadway will be confirmed from the Site To Do Business ` +
      `(STDB) extract. Do not rely on template remnant interstate figures from other markets.`;
  }

  return {
    introHtmlPlain: intro,
    trafficCaption:
      'DAILY TRAFFIC COUNT OF NEAREST MAJOR ROADWAY TO SUBJECT (SOURCE: ODOT / SITE TO DO BUSINESS)',
    trafficBody,
    mapCaption: 'MAP OF DRIVE TIME FROM MAJOR CITY TO THE SUBJECT PROPERTY (SOURCE: GOOGLE MAPS)',
    cityLabel: cityName,
  };
}
