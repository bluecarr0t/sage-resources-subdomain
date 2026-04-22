/**
 * Sage AI — location/proximity tools.
 *
 * These are factored out of `tools.ts` to keep that file focused on the
 * read-only table queries. They are registered by `createSageAiTools` when
 * `SAGE_AI_GEO_TOOLS` is enabled.
 *
 * Backed by the `property_geocode` cache table and the
 * `nearest_attractions_v1` / `properties_within_radius` RPCs
 * (see `scripts/migrations/sage-ai-property-geocode.sql`).
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforceDailyQuota } from '@/lib/upstash';
import { fetchWithTimeout } from '@/lib/sage-ai/fetch-with-timeout';

/** Cap any single Google call (find-place / geocode) at 8s. */
const GOOGLE_TIMEOUT_MS = 8_000;

const GEOCODE_CACHE_TTL_DAYS = Number(
  process.env.SAGE_AI_GEOCODE_TTL_DAYS ?? 180
);

const GEOCODE_QUOTA = Number(process.env.SAGE_AI_QUOTA_GEOCODE ?? 300);

const ATTRACTION_TYPES = ['national_park', 'ski_resort', 'property'] as const;

interface GeocodeRow {
  property_id: number;
  latitude: number;
  longitude: number;
  source: 'db' | 'google_places' | 'google_geocoding' | 'manual';
  confidence: number | null;
  place_id: string | null;
  formatted_address: string | null;
  fetched_at: string;
  stale_after: string;
}

async function quotaGate(
  toolName: string,
  userId: string | undefined,
  quota: number
): Promise<{ error: string; data: null } | null> {
  // geocode_property hits Google Places/Geocoding when there is no DB or
  // cached lat/lon hit. Require an attributable user.
  if (!userId) {
    return {
      error: `${toolName} requires an authenticated user to enforce daily quota.`,
      data: null,
    };
  }
  const { allowed, used } = await enforceDailyQuota(toolName, userId, quota);
  if (!allowed) {
    return {
      error: `Daily quota exceeded for ${toolName} (used ${used} of ${quota}). Try again tomorrow or ask an admin to raise the limit.`,
      data: null,
    };
  }
  return null;
}

async function readCachedGeocode(
  supabase: SupabaseClient,
  propertyId: number
): Promise<GeocodeRow | null> {
  const { data, error } = await supabase
    .from('property_geocode')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as GeocodeRow;
  if (new Date(row.stale_after).getTime() < Date.now()) return null;
  return row;
}

async function writeCachedGeocode(
  supabase: SupabaseClient,
  row: {
    property_id: number;
    latitude: number;
    longitude: number;
    source: GeocodeRow['source'];
    confidence: number;
    place_id?: string | null;
    formatted_address?: string | null;
  }
): Promise<void> {
  const stale = new Date(
    Date.now() + GEOCODE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase.from('property_geocode').upsert({
    property_id: row.property_id,
    latitude: row.latitude,
    longitude: row.longitude,
    source: row.source,
    confidence: row.confidence,
    place_id: row.place_id ?? null,
    formatted_address: row.formatted_address ?? null,
    fetched_at: new Date().toISOString(),
    stale_after: stale,
  });
  if (error) {
    console.warn('[sage-ai/geocode] upsert failed', error.message);
  }
}

interface PropertyRow {
  id: number;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
}

async function fetchPropertyForGeocode(
  supabase: SupabaseClient,
  propertyId: number
): Promise<PropertyRow | null> {
  const { data, error } = await supabase
    .from('all_glamping_properties')
    .select('id, property_name, address, city, state, zip_code, country, lat, lon')
    .eq('id', propertyId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PropertyRow;
}

function composeAddress(p: PropertyRow): string | null {
  const parts = [p.address, p.city, p.state, p.zip_code, p.country]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

interface GooglePlacesFindResult {
  place_id: string;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
}

async function googleFindPlace(
  apiKey: string,
  query: string,
  parentSignal?: AbortSignal
): Promise<GooglePlacesFindResult | null> {
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id,formatted_address,geometry',
    key: apiKey,
  });
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`,
      { timeoutMs: GOOGLE_TIMEOUT_MS, parentSignal }
    );
  } catch {
    // Swallow timeouts/abort here — caller falls back to geocoding.
    return null;
  }
  if (!response.ok) return null;
  const result = (await response.json()) as {
    status: string;
    candidates?: Array<{
      place_id: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    }>;
  };
  if (result.status !== 'OK' || !result.candidates?.length) return null;
  const c = result.candidates[0];
  if (!c.geometry?.location) return null;
  return {
    place_id: c.place_id,
    formatted_address: c.formatted_address ?? null,
    latitude: c.geometry.location.lat,
    longitude: c.geometry.location.lng,
  };
}

async function googleGeocodeAddress(
  apiKey: string,
  address: string,
  parentSignal?: AbortSignal
): Promise<GooglePlacesFindResult | null> {
  const params = new URLSearchParams({ address, key: apiKey });
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      { timeoutMs: GOOGLE_TIMEOUT_MS, parentSignal }
    );
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const result = (await response.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    }>;
  };
  if (result.status !== 'OK' || !result.results?.length) return null;
  const c = result.results[0];
  if (!c.geometry?.location) return null;
  return {
    place_id: c.place_id,
    formatted_address: c.formatted_address ?? null,
    latitude: c.geometry.location.lat,
    longitude: c.geometry.location.lng,
  };
}

export function createGeoTools(
  supabase: SupabaseClient,
  userId: string | undefined
) {
  return {
    geocode_property: tool({
      description: `Resolve latitude/longitude for a Sage glamping property. Caches results in property_geocode so subsequent queries (nearest_attractions, query_properties with near) are instant.

Tries in order: 1) cache, 2) existing lat/lon columns, 3) Google Places lookup by "property_name, city, state", 4) Google Geocoding API on the full address. Returns the first hit.

Use this before calling nearest_attractions or query_properties with the 'near' filter when the user refers to a property by name.`,
      inputSchema: z
        .object({
          property_id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Exact id from all_glamping_properties.'),
          property_name: z
            .string()
            .min(2)
            .max(200)
            .optional()
            .describe(
              'Property name to look up (partial match). Used when property_id is unknown.'
            ),
          address: z
            .string()
            .min(5)
            .max(500)
            .optional()
            .describe(
              'Free-form address to geocode directly. Bypasses the DB lookup; result is NOT cached in property_geocode.'
            ),
        })
        .refine(
          (v) => !!v.property_id || !!v.property_name || !!v.address,
          { message: 'Provide property_id, property_name, or address' }
        ),
      execute: async ({ property_id, property_name, address }, { abortSignal }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        // Free-form address path — no DB lookup, no cache write.
        if (address && !property_id && !property_name) {
          if (!apiKey) {
            return { error: 'Google Maps API key not configured', data: null };
          }
          const gate = await quotaGate('geocode_property', userId, GEOCODE_QUOTA);
          if (gate) return gate;
          const hit = await googleGeocodeAddress(apiKey, address, abortSignal);
          if (!hit) return { error: 'No geocode results', data: null };
          return {
            data: {
              source: 'google_geocoding' as const,
              cached: false,
              latitude: hit.latitude,
              longitude: hit.longitude,
              formatted_address: hit.formatted_address,
              place_id: hit.place_id,
            },
          };
        }

        // Resolve property_id from property_name when needed.
        let resolvedId = property_id ?? null;
        if (!resolvedId && property_name) {
          const { data: match, error: matchErr } = await supabase
            .from('all_glamping_properties')
            .select('id')
            .ilike('property_name', `%${property_name}%`)
            .limit(1)
            .maybeSingle();
          if (matchErr) return { error: matchErr.message, data: null };
          if (!match) {
            return {
              error: `No property found matching "${property_name}"`,
              data: null,
            };
          }
          resolvedId = (match as { id: number }).id;
        }

        if (!resolvedId) {
          return { error: 'Could not resolve a property_id', data: null };
        }

        // 1) Cache lookup.
        const cached = await readCachedGeocode(supabase, resolvedId);
        if (cached) {
          return {
            data: {
              property_id: resolvedId,
              source: cached.source,
              cached: true,
              latitude: Number(cached.latitude),
              longitude: Number(cached.longitude),
              confidence: cached.confidence,
              formatted_address: cached.formatted_address,
              place_id: cached.place_id,
            },
          };
        }

        // 2) DB lat/lon fall-through.
        const property = await fetchPropertyForGeocode(supabase, resolvedId);
        if (!property) {
          return {
            error: `Property ${resolvedId} not found`,
            data: null,
          };
        }
        if (
          property.lat != null &&
          property.lon != null &&
          Number.isFinite(Number(property.lat)) &&
          Number.isFinite(Number(property.lon))
        ) {
          const latitude = Number(property.lat);
          const longitude = Number(property.lon);
          await writeCachedGeocode(supabase, {
            property_id: resolvedId,
            latitude,
            longitude,
            source: 'db',
            confidence: 100,
          });
          return {
            data: {
              property_id: resolvedId,
              source: 'db' as const,
              cached: false,
              latitude,
              longitude,
              confidence: 100,
            },
          };
        }

        // 3/4) Google Places / Geocoding fallback.
        if (!apiKey) {
          return {
            error:
              'Property has no lat/lon and Google Maps API key is not configured',
            data: null,
          };
        }
        const gate = await quotaGate('geocode_property', userId, GEOCODE_QUOTA);
        if (gate) return gate;

        const namedQuery = [
          property.property_name,
          property.city,
          property.state,
        ]
          .filter(Boolean)
          .join(', ');
        let hit: GooglePlacesFindResult | null = null;
        let source: GeocodeRow['source'] = 'google_places';

        if (namedQuery.length > 0) {
          hit = await googleFindPlace(apiKey, namedQuery, abortSignal);
        }
        if (!hit) {
          const addr = composeAddress(property);
          if (addr) {
            hit = await googleGeocodeAddress(apiKey, addr, abortSignal);
            source = 'google_geocoding';
          }
        }
        if (!hit) {
          return {
            error: 'Could not geocode property via Google Places or Geocoding',
            data: null,
          };
        }

        await writeCachedGeocode(supabase, {
          property_id: resolvedId,
          latitude: hit.latitude,
          longitude: hit.longitude,
          source,
          confidence: source === 'google_places' ? 80 : 60,
          place_id: hit.place_id,
          formatted_address: hit.formatted_address,
        });

        return {
          data: {
            property_id: resolvedId,
            source,
            cached: false,
            latitude: hit.latitude,
            longitude: hit.longitude,
            confidence: source === 'google_places' ? 80 : 60,
            formatted_address: hit.formatted_address,
            place_id: hit.place_id,
          },
        };
      },
    }),

    nearest_attractions: tool({
      description: `Find the closest attractions to a point, across three sources: geocoded Sage properties, ski resorts, and national parks. Returns results ordered by distance ascending.

Use this when the user asks about proximity — e.g. "properties near Yellowstone", "ski resorts within 50 km of a property", "national parks near Austin TX". Call geocode_property first if you only have a property name/id.`,
      inputSchema: z
        .object({
          property_id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              'Anchor point using a property id (uses its cached lat/lon).'
            ),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          radius_km: z
            .number()
            .min(1)
            .max(500)
            .default(50)
            .describe('Search radius in kilometers (1-500, default 50).'),
          types: z
            .array(z.enum(ATTRACTION_TYPES))
            .min(1)
            .default([...ATTRACTION_TYPES])
            .describe(
              'Which sources to include in results. Defaults to all three.'
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .default(10)
            .describe('Max results across all types, ordered by distance.'),
        })
        .refine(
          (v) =>
            !!v.property_id ||
            (typeof v.latitude === 'number' && typeof v.longitude === 'number'),
          {
            message: 'Provide property_id or latitude+longitude',
          }
        ),
      execute: async ({
        property_id,
        latitude,
        longitude,
        radius_km,
        types,
        limit,
      }) => {
        let originLat = latitude;
        let originLng = longitude;

        if (property_id && (originLat == null || originLng == null)) {
          const cached = await readCachedGeocode(supabase, property_id);
          if (!cached) {
            return {
              error: `No cached geocode for property ${property_id}. Call geocode_property first.`,
              data: null,
            };
          }
          originLat = Number(cached.latitude);
          originLng = Number(cached.longitude);
        }

        if (originLat == null || originLng == null) {
          return { error: 'Could not determine origin lat/lng', data: null };
        }

        const { data, error } = await supabase.rpc('nearest_attractions_v1', {
          origin_lat: originLat,
          origin_lng: originLng,
          radius_km: radius_km ?? 50,
          types: types ?? [...ATTRACTION_TYPES],
          lim: limit ?? 10,
        });
        if (error) {
          return { error: error.message, data: null };
        }
        const rows = (data ?? []) as Array<{
          type: string;
          id: string;
          name: string;
          distance_km: number;
          latitude: number;
          longitude: number;
          url: string | null;
          state: string | null;
        }>;

        return {
          origin: { latitude: originLat, longitude: originLng },
          radius_km: radius_km ?? 50,
          types: types ?? [...ATTRACTION_TYPES],
          results: rows,
          returned_count: rows.length,
        };
      },
    }),
  };
}
