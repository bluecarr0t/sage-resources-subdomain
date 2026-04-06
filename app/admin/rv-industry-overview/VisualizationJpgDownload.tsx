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

export type VisualizationJpgDownloadHandle = {
  /** Capture and trigger download without toggling this block’s button loading state. */
  downloadJpeg: () => Promise<void>;
};

type Props = {
  /** Shown in the JPEG and as the visible heading above the visualization */
  exportTitle: string;
  /** Extra classes for the capture heading (e.g. font-serif) */
  headingClassName?: string;
  /** Optional subtitle below the title (included in JPEG) */
  exportSubtitle?: ReactNode;
  /** Optional id for the title heading (e.g. section aria-labelledby) */
  headingId?: string;
  /** Filename without extension */
  fileStem: string;
  /** Page-only copy below the export area (not included in JPEG) */
  captionBelow?: ReactNode;
  /** e.g. rows scanned, not included in JPEG */
  footerBelow?: ReactNode;
  children: ReactNode;
};

const VisualizationJpgDownload = forwardRef<VisualizationJpgDownloadHandle, Props>(
  function VisualizationJpgDownload(
    { exportTitle, headingClassName, exportSubtitle, headingId, fileStem, captionBelow, footerBelow, children },
    ref
  ) {
    const t = useTranslations('admin.rvIndustryOverview');
    const captureRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);

    const runDownload = useCallback(async () => {
      const el = captureRef.current;
      if (!el) return;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      const safe = fileStem.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'chart';
      link.download = `${safe}.jpg`;
      link.click();
    }, [fileStem]);

    useImperativeHandle(
      ref,
      () => ({
        downloadJpeg: () => runDownload(),
      }),
      [runDownload]
    );

    const handleDownload = useCallback(async () => {
      setBusy(true);
      try {
        await runDownload();
      } catch (err) {
        console.error('[VisualizationJpgDownload]', err);
      } finally {
        setBusy(false);
      }
    }, [runDownload]);

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
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
        </div>

        <div
          ref={captureRef}
          className="rounded-lg bg-white p-4 text-gray-900"
        >
          <h2
            id={headingId}
            className={
              headingClassName
                ? `text-center font-bold tracking-tight text-gray-900 mb-4 ${headingClassName}`
                : 'text-center text-xl font-bold tracking-tight text-gray-900 mb-4'
            }
          >
            {exportTitle}
          </h2>
          {exportSubtitle ? (
            <p className="text-center text-sm font-sans text-gray-800 mb-4">{exportSubtitle}</p>
          ) : null}
          <div className="text-gray-900 [&_svg]:text-gray-900 [&_.recharts-cartesian-axis-tick_text]:fill-gray-800 [&_.recharts-legend-item-text]:!text-gray-800">
            {children}
          </div>
        </div>

        {captionBelow ? <div className="text-sm text-gray-600 dark:text-gray-400">{captionBelow}</div> : null}
        {footerBelow ? <div className="text-xs text-gray-500 dark:text-gray-400">{footerBelow}</div> : null}
      </div>
    );
  }
);

VisualizationJpgDownload.displayName = 'VisualizationJpgDownload';

export default VisualizationJpgDownload;
