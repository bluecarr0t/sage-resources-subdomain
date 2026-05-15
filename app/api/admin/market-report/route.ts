import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  coalesceUsStateAbbrForComps,
  resolveGeocodeForCompsSearch,
} from "@/lib/geocode";
import {
  buildMarketReportSections,
  countPremiumCohortListings,
  sumCohortPropertyTotalSites,
} from "@/lib/market-report/aggregate";
import { countDistinctListings } from "@/lib/market-report/listing-identity";
import {
  buildMarketReportCohortCacheKey,
  cacheGetOrFetch,
  CACHE_TTL_MS,
  marketReportCohortCacheTtlMs,
  roundTo,
} from "@/lib/market-report/cache";
import { fetchCountyMetrics } from "@/lib/market-report/county-metrics";
import { fetchDemandDrivers } from "@/lib/market-report/demand-drivers";
import { buildMapPinsFromRows } from "@/lib/market-report/map-pins";
import { calculateOpportunityScore } from "@/lib/market-report/opportunity-score";
import { marketReportQueriedSources } from "@/lib/market-report/source-labels";
import {
  fetchMetaAnyHitCap,
  loadMarketReportCohort,
} from "@/lib/market-report/load-cohort";
import { checkRateLimitAsync, getRateLimitKey } from "@/lib/rate-limit";
import { withAdminAuth } from "@/lib/require-admin-auth";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
/** National RV cohort can paginate for minutes on a cold cache. */
export const maxDuration = 300;
const RATE_LIMIT = 24;
const RATE_WINDOW_MS = 60_000;

const BodySchema = z
  .object({
    scope: z.enum(["local", "national"]).default("local"),
    addressLine: z.string().max(500).trim().optional().default(""),
    radiusMiles: z.coerce.number().min(1).max(250).optional().default(50),
    segment: z.enum(["glamping", "rv_resort"]),
    adrMin: z.coerce.number().min(0).max(50_000).nullish(),
    adrMax: z.coerce.number().min(0).max(50_000).nullish(),
    /**
     * Min sites (RV resort) or units (glamping) per property after dedupe.
     * Omit to use segment defaults (3 glamping, 30 RV).
     */
    minSiteUnitCount: z.coerce.number().int().min(0).max(100_000).optional(),
    /** When true, bypasses the in-memory cache and fetches fresh data. */
    noCache: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "local" && !data.addressLine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addressLine"],
        message: "addressLine is required for local scope",
      });
    }
    if (
      data.adrMin != null &&
      data.adrMax != null &&
      data.adrMin > data.adrMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adrMin"],
        message: "adrMin must be <= adrMax",
      });
    }
  });

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const userId = auth.session.user.id;
  const rlKey = `market-report:${userId}:${getRateLimitKey(request)}`;
  const { allowed } = await checkRateLimitAsync(
    rlKey,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        code: "RATE_LIMITED",
        message: "Too many market report requests. Try again in a minute.",
      },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, code: "INVALID_JSON", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_BODY",
        message: "Invalid request",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { scope, addressLine, radiusMiles, segment, adrMin, adrMax, noCache, minSiteUnitCount } =
    parsed.data;

  const minSiteUnitResolved =
    minSiteUnitCount ?? (segment === "rv_resort" ? 30 : 3);

  const wallStartedAt = Date.now();

  try {
    let anchorLat = 0;
    let anchorLng = 0;
    let stateAbbr = "";
    let resolvedAddress =
      scope === "national" ? "United States (national)" : addressLine;

    let countyLevel2FromGeocode: string | undefined;

    if (scope === "local") {
      const coords = await resolveGeocodeForCompsSearch({
        locationLine: addressLine,
      });
      if (!coords) {
        return NextResponse.json(
          {
            success: false,
            code: "GEOCODE_FAILED",
            message:
              "Geocoding failed. Enter a place in the address field (include state when possible, e.g. Bend, OR). " +
              "If you use Google Geocoding, ensure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) is set and Geocoding API is enabled; otherwise OpenStreetMap fallback is used.",
          },
          { status: 400 },
        );
      }
      anchorLat = coords.lat;
      anchorLng = coords.lng;
      countyLevel2FromGeocode = coords.countyLevel2;
      stateAbbr = coalesceUsStateAbbrForComps("", coords, addressLine);
      if (stateAbbr.length !== 2 && segment === "rv_resort") {
        return NextResponse.json(
          {
            success: false,
            code: "RV_STATE_REQUIRED",
            message:
              "Could not determine US state for RV Resort search (needed for Campspot). Include a 2-letter state in the address (e.g. Austin, TX).",
          },
          { status: 400 },
        );
      }
    }

    const supabase = createServerClient();

    // Cache keys: include every input that affects the result. Round lat/lng to
    // collapse near-duplicate anchors and increase hit rate without degrading
    // accuracy (cohort uses 4 decimals = ~11m, drivers use 3 = ~110m).
    const cohortKey = buildMarketReportCohortCacheKey({
      segment,
      scope,
      anchorLat,
      anchorLng,
      radiusMiles,
      stateAbbr,
      adrMin,
      adrMax,
      minSiteUnitCount: minSiteUnitResolved,
    });
    const cohortTtl = marketReportCohortCacheTtlMs(segment, scope);

    const cohortLookup = await cacheGetOrFetch(
      cohortKey,
      cohortTtl,
      () =>
        loadMarketReportCohort(supabase, {
          segment,
          anchorLat,
          anchorLng,
          radiusMiles,
          stateAbbr,
          scope,
          adrFilter: { adrMin: adrMin ?? null, adrMax: adrMax ?? null },
          minSiteUnitCount: minSiteUnitResolved,
        }),
      { force: noCache },
    );
    const { rows, fetchMeta } = cohortLookup.value;

    // Demand drivers + county metrics only make sense around a real anchor.
    const driversLookup =
      scope === "local"
        ? await cacheGetOrFetch(
            `drivers|${roundTo(anchorLat, 3)},${roundTo(anchorLng, 3)}|r=${Math.round(radiusMiles)}|st=${stateAbbr || "NA"}`,
            CACHE_TTL_MS.DEMAND_DRIVERS,
            () =>
              fetchDemandDrivers(supabase, {
                anchorLat,
                anchorLng,
                marketReportRadiusMiles: radiusMiles,
                anchorStateUsAbbr: stateAbbr.length === 2 ? stateAbbr : null,
              }),
            { force: noCache },
          )
        : null;
    const demandDrivers = driversLookup?.value ?? null;

    const countyKey = `county|${stateAbbr}|${addressLine.trim().toLowerCase()}|${roundTo(anchorLat, 4)},${roundTo(anchorLng, 4)}`;
    const countyLookup =
      scope === "local"
        ? await cacheGetOrFetch(
            countyKey,
            CACHE_TTL_MS.COUNTY_METRICS,
            () =>
              fetchCountyMetrics(supabase, {
                stateAbbr,
                addressLine,
                countyHint: countyLevel2FromGeocode ?? null,
                anchorLat,
                anchorLng,
              }),
            { force: noCache },
          )
        : null;
    const countyMetrics = countyLookup?.value ?? null;

    // Aggregate freshness flags so the UI can show a "Cached" badge and the
    // oldest write timestamp across all three sources (most useful for "should
    // I refresh?" decisions).
    const lookups = [cohortLookup, driversLookup, countyLookup].filter(
      (l): l is NonNullable<typeof l> => l != null,
    );
    const cachedAtCandidates = lookups
      .map((l) => l.cachedAt)
      .filter((n): n is number => n != null);
    const cachedFlag = lookups.length > 0 && lookups.every((l) => l.cached);
    const partiallyCached = !cachedFlag && lookups.some((l) => l.cached);
    const oldestCachedAt =
      cachedAtCandidates.length > 0 ? Math.min(...cachedAtCandidates) : null;

    const opportunityScore =
      scope === "local"
        ? calculateOpportunityScore({
            cohortSize: countDistinctListings(rows),
            totalSites: sumCohortPropertyTotalSites(rows),
            premiumCohortCount: countPremiumCohortListings(rows),
            demandDrivers,
            countyMetrics,
          })
        : null;

    const sections = buildMarketReportSections(segment, radiusMiles, rows, {
      demandDrivers,
      countyMetrics,
      opportunityScore,
    });
    const fetchPossiblyIncomplete = fetchMetaAnyHitCap(fetchMeta);
    const {
      pins: mapPins,
      mapPinsTotal,
      mapPinsTruncated,
    } = buildMapPinsFromRows(rows);

    const distinctListingCount = countDistinctListings(rows);
    const durationMs = Date.now() - wallStartedAt;
    console.info("[market-report]", {
      durationMs,
      scope,
      segment,
      inventoryRows: rows.length,
      distinctListings: distinctListingCount,
      cohortCached: cohortLookup.cached,
      driversCached: driversLookup?.cached ?? null,
      countyCached: countyLookup?.cached ?? null,
    });
    return NextResponse.json(
      {
      success: true,
      meta: {
        addressLine: resolvedAddress,
        anchorLat,
        anchorLng,
        radiusMiles: scope === "national" ? 0 : radiusMiles,
        segment,
        scope,
        adrMin: adrMin ?? null,
        adrMax: adrMax ?? null,
        minSiteUnitCount: minSiteUnitResolved,
        propertyCount: rows.length,
        distinctListingCount,
        sources: marketReportQueriedSources(
          segment,
          scope === "national" || stateAbbr.length === 2,
        ),
        generatedAt: new Date().toISOString(),
        fetchPossiblyIncomplete,
        fetch: fetchMeta,
        mapPinsTotal,
        mapPinsTruncated,
        cache: {
          cached: cachedFlag,
          partiallyCached,
          oldestCachedAt:
            oldestCachedAt != null
              ? new Date(oldestCachedAt).toISOString()
              : null,
        },
      },
      sections,
      mapPins,
    },
      {
        headers: {
          "X-Market-Report-Ms": String(durationMs),
        },
      },
    );
  } catch (err) {
    console.error("[market-report]", err);
    const message =
      process.env.NODE_ENV !== "production" && err instanceof Error
        ? err.message
        : undefined;
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: message ?? "Market report generation failed.",
      },
      { status: 500 },
    );
  }
});
