import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { requireGlampingIndustryOverviewPageData } from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import { resolveGlampingOverviewPayload } from '@/lib/glamping-industry-overview/glamping-overview-active-payload';
import { parseGlampingOverviewDataSourceFilterKey } from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import {
  buildRegionalMapFallbackSvg,
  buildStateAdrChoroplethFallbackSvg,
} from '@/lib/rv-industry-overview/rv-overview-map-export-svg';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

/** GET ?chart=regional|choropleth&source=all|hipcamp */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const chart = searchParams.get('chart')?.trim().toLowerCase() ?? 'regional';
    const sourceFilter = parseGlampingOverviewDataSourceFilterKey(searchParams.get('source'));

    const pageData = await requireGlampingIndustryOverviewPageData();
    const resolved = resolveGlampingOverviewPayload(pageData, sourceFilter);
    const mapResult = resolved.slice.mapResult;

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
    console.error('[glamping-industry-overview/map-export]', err);
    return NextResponse.json(
      { error: rvOverviewApiDisplayError(err) },
      { status: 500 }
    );
  }
}
