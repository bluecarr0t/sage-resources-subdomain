import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { getCampspotRvOverviewPageData } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import { parseRvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';
import { resolveRvOverviewPayload } from '@/lib/rv-industry-overview/rv-overview-active-payload';
import { parseRvOverviewDataSourceFilterKey } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import {
  buildRegionalMapFallbackSvg,
  buildStateAdrChoroplethFallbackSvg,
} from '@/lib/rv-industry-overview/rv-overview-map-export-svg';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

/**
 * Server-rendered map fallback (PNG) when browser html2canvas capture fails.
 * GET ?chart=regional|choropleth&unit=rv&source=all|campspot
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const chart = searchParams.get('chart')?.trim().toLowerCase() ?? 'regional';
    const unitFilter = parseRvOverviewUnitFilterKey(searchParams.get('unit'));
    const sourceFilter = parseRvOverviewDataSourceFilterKey(searchParams.get('source'));

    const pageData = await getCampspotRvOverviewPageData();
    const resolved = resolveRvOverviewPayload(pageData, unitFilter, sourceFilter);
    const mapResult = resolved.unitSlice.mapResult;

    if (mapResult.error) {
      return NextResponse.json({ error: 'Map data is not available' }, { status: 404 });
    }

    const title =
      chart === 'choropleth'
        ? 'State ADR choropleth (fallback)'
        : 'Regional ARDR and occupancy (fallback)';

    const svg =
      chart === 'choropleth'
        ? buildStateAdrChoroplethFallbackSvg(mapResult.stateAdrChoropleth, title)
        : buildRegionalMapFallbackSvg(mapResult.byRegion, title);

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('[rv-industry-overview/map-export]', err);
    return NextResponse.json(
      { error: rvOverviewApiDisplayError(err) },
      { status: 500 }
    );
  }
}
