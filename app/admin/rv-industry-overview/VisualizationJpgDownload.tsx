'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  captureElementAsJpeg,
  captureElementAsImageBlob,
  captureElementAsJpegBlob,
  type ImageBlobFormat,
  type JpegBlobCaptureResult,
  type JpegCaptureProfile,
  type JpegDownloadResult,
} from '@/lib/rv-industry-overview/jpeg-capture';
import type { VisualizationJpgDownloadHandle } from '@/lib/rv-industry-overview/visualization-export';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';
import { IndustryOverviewChartDetails } from '@/components/admin/industry-overview/IndustryOverviewChartDetails';

export type { VisualizationJpgDownloadHandle };

/** Matches Regional ARDR and occupancy (2025) — use for all RV overview export headings. */
export const RV_OVERVIEW_CHART_HEADING_CLASS =
  'text-center text-xl font-bold tracking-tight text-gray-900 mb-4';

type Props = {
  exportTitle: string;
  headingClassName?: string;
  exportSubtitle?: ReactNode;
  headingId?: string;
  fileStem: string;
  captionBelow?: ReactNode;
  footerBelow?: ReactNode;
  /** `map` prefetches embedded TopoJSON before capture (reliable SVG rasterization). */
  captureProfile?: JpegCaptureProfile;
  /** Rendered below the export capture area (excluded from JPEG). */
  sourceTransparency?: ReactNode;
  /** i18n namespace for collapsed chart details summary (RV vs glamping). */
  detailsMessagesNamespace?: 'admin.rvIndustryOverview' | 'admin.glampingIndustryOverview';
  children: ReactNode;
};

const VisualizationJpgDownload = forwardRef<VisualizationJpgDownloadHandle, Props>(
  function VisualizationJpgDownload(
    {
      exportTitle,
      headingClassName,
      exportSubtitle,
      headingId,
      fileStem,
      captionBelow,
      footerBelow,
      captureProfile = 'chart',
      sourceTransparency,
      detailsMessagesNamespace = 'admin.rvIndustryOverview',
      children,
    },
    ref
  ) {
    const t = useTranslations('admin.rvIndustryOverview');
    const captureRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const runCaptureBlob = useCallback(
      async (format: ImageBlobFormat = 'jpeg'): Promise<JpegBlobCaptureResult> => {
        const el = captureRef.current;
        if (!el) {
          return { ok: false, error: 'Export area is not ready' };
        }
        return captureElementAsImageBlob(el, fileStem, captureProfile, format);
      },
      [fileStem, captureProfile]
    );

    const runDownload = useCallback(async (): Promise<JpegDownloadResult> => {
      const result = await runCaptureBlob();
      if (!result.ok) {
        console.error('[VisualizationJpgDownload]', result.error);
        return { ok: false, error: result.error, blankCapture: result.blankCapture };
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(result.blob);
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      return { ok: true };
    }, [runCaptureBlob]);

    useImperativeHandle(
      ref,
      () => ({
        downloadJpeg: () => runDownload(),
        captureJpegBlob: () => runCaptureBlob('jpeg'),
        captureImageBlob: (format) => runCaptureBlob(format ?? 'jpeg'),
      }),
      [runDownload, runCaptureBlob]
    );

    const handleDownload = useCallback(async () => {
      setBusy(true);
      setLastError(null);
      try {
        const result = await runDownload();
        if (!result.ok) {
          setLastError(sanitizeAdminDisplayError(result.error, { fallback: t('downloadJpgError') }));
        }
      } finally {
        setBusy(false);
      }
    }, [runDownload]);

    return (
      <div className="space-y-3">
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={busy}
            className="inline-flex items-center gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {busy ? t('downloadJpgLoading') : t('downloadJpg')}
          </Button>
          {lastError ? (
            <p className="max-w-md text-right text-xs text-red-600 dark:text-red-400" role="alert">
              {lastError}
            </p>
          ) : null}
        </div>

        <div ref={captureRef} className="rounded-lg bg-white p-4 text-gray-900">
          <h2
            id={headingId}
            className={
              headingClassName
                ? `${RV_OVERVIEW_CHART_HEADING_CLASS} ${headingClassName}`
                : RV_OVERVIEW_CHART_HEADING_CLASS
            }
          >
            {exportTitle}
          </h2>
          {exportSubtitle ? (
            <p className="text-center text-sm font-sans text-gray-800 mb-4">{exportSubtitle}</p>
          ) : null}
          <div className="text-gray-900 [&_svg]:text-gray-900 [&_.recharts-cartesian-axis-tick_text]:fill-gray-800 [&_.rv-overview-html-legend]:text-gray-800">
            {children}
          </div>
        </div>

        {sourceTransparency || captionBelow || footerBelow ? (
          <IndustryOverviewChartDetails messagesNamespace={detailsMessagesNamespace}>
            {sourceTransparency ? <div>{sourceTransparency}</div> : null}
            {captionBelow ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">{captionBelow}</div>
            ) : null}
            {footerBelow ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">{footerBelow}</div>
            ) : null}
          </IndustryOverviewChartDetails>
        ) : null}
      </div>
    );
  }
);

VisualizationJpgDownload.displayName = 'VisualizationJpgDownload';

export default VisualizationJpgDownload;
