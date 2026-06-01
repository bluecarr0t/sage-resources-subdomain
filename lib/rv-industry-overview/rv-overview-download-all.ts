import type {
  JpegBlobCaptureResult,
  JpegDownloadResult,
} from '@/lib/rv-industry-overview/jpeg-capture';
import type { VisualizationJpgDownloadHandle } from '@/lib/rv-industry-overview/visualization-export';

export type RvOverviewDownloadChartKey =
  | 'regionalMap'
  | 'trends'
  | 'resortSize'
  | 'unitTypeRate'
  | 'unitTypeDistribution'
  | 'seasonRates'
  | 'surfaceRates'
  | 'amenityPropertyPct'
  | 'amenityAdr'
  | 'rvParking'
  | 'stateAdrChoropleth';

export type RvOverviewDownloadChartOutcome = {
  key: RvOverviewDownloadChartKey;
  label: string;
  status: 'exported' | 'skipped' | 'failed';
  error?: string;
};

export type RvOverviewDownloadAllSummary = {
  exported: number;
  skipped: number;
  failed: number;
  outcomes: RvOverviewDownloadChartOutcome[];
};

export async function runRvOverviewChartDownload(
  ref: VisualizationJpgDownloadHandle | null
): Promise<JpegDownloadResult> {
  if (!ref) {
    return { ok: false, error: 'Chart is not mounted' };
  }
  return ref.downloadJpeg();
}

export async function runRvOverviewChartCapture(
  ref: VisualizationJpgDownloadHandle | null,
  format: 'jpeg' | 'png' = 'png'
): Promise<JpegBlobCaptureResult> {
  if (!ref) {
    return { ok: false, error: 'Chart is not mounted' };
  }
  return ref.captureImageBlob(format);
}

export function summarizeDownloadAll(
  outcomes: RvOverviewDownloadChartOutcome[]
): RvOverviewDownloadAllSummary {
  let exported = 0;
  let skipped = 0;
  let failed = 0;
  for (const o of outcomes) {
    if (o.status === 'exported') exported++;
    else if (o.status === 'skipped') skipped++;
    else failed++;
  }
  return { exported, skipped, failed, outcomes };
}
