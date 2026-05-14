import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { coalesceUsStateAbbrForComps, resolveGeocodeForCompsSearch } from '@/lib/geocode';
import {
  buildMarketReportCohortCacheKey,
  cacheGetOrFetch,
  marketReportCohortCacheTtlMs,
} from '@/lib/market-report/cache';
import { buildCohortXlsxBuffer, cohortXlsxFilename } from '@/lib/market-report/cohort-csv';
import { loadMarketReportCohort } from '@/lib/market-report/load-cohort';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

const BodySchema = z
  .object({
    scope: z.enum(['local', 'national']).default('local'),
    addressLine: z.string().max(500).trim().optional().default(''),
    radiusMiles: z.coerce.number().min(1).max(250).optional().default(50),
    segment: z.enum(['glamping', 'rv_resort']),
    adrMin: z.coerce.number().min(0).max(50_000).nullish(),
    adrMax: z.coerce.number().min(0).max(50_000).nullish(),
    minSiteUnitCount: z.coerce.number().int().min(0).max(100_000).optional(),
    wide: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'local' && !data.addressLine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['addressLine'],
        message: 'addressLine is required for local scope',
      });
    }
    if (data.adrMin != null && data.adrMax != null && data.adrMin > data.adrMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['adrMin'],
        message: 'adrMin must be <= adrMax',
      });
    }
  });

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const userId = auth.session.user.id;
  const rlKey = `market-report-cohort-xlsx:${userId}:${getRateLimitKey(request)}`;
  const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { success: false, code: 'RATE_LIMITED', message: 'Too many cohort export requests.' },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, code: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: 'INVALID_BODY', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { scope, addressLine, radiusMiles, segment, adrMin, adrMax, minSiteUnitCount, wide } =
    parsed.data;
  const minSiteUnitResolved =
    minSiteUnitCount ?? (segment === 'rv_resort' ? 30 : 3);

  let anchorLat = 0;
  let anchorLng = 0;
  let stateAbbr = '';

  if (scope === 'local') {
    const coords = await resolveGeocodeForCompsSearch({ locationLine: addressLine });
    if (!coords) {
      return NextResponse.json(
        { success: false, code: 'GEOCODE_FAILED', message: 'Geocoding failed.' },
        { status: 400 }
      );
    }
    anchorLat = coords.lat;
    anchorLng = coords.lng;
    stateAbbr = coalesceUsStateAbbrForComps('', coords, addressLine);
    if (stateAbbr.length !== 2 && segment === 'rv_resort') {
      return NextResponse.json({ success: false, code: 'RV_STATE_REQUIRED' }, { status: 400 });
    }
  }

  const supabase = createServerClient();
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
      })
  );
  const { rows } = cohortLookup.value;

  const meta = {
    addressLine: scope === 'national' ? 'United States (national)' : addressLine,
    segment,
    scope,
    adrMin: adrMin ?? null,
    adrMax: adrMax ?? null,
    radiusMiles: scope === 'national' ? 0 : radiusMiles,
  };

  const buffer = buildCohortXlsxBuffer({ rows, meta, wide });
  const filename = cohortXlsxFilename(meta);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Cohort-Rows': String(rows.length),
      'X-Cohort-Cached': cohortLookup.cached ? '1' : '0',
      'Cache-Control': 'no-store',
    },
  });
});
