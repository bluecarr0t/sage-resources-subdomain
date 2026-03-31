'use client';

import { Button, Card } from '@/components/ui';
import CompsV2DeepEnrichProgress from '@/components/CompsV2DeepEnrichProgress';
import type { DeepEnrichResult } from '@/lib/comps-v2/deep-enrich';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;

interface CompsV2DeepEnrichSectionProps {
  t: TCompsV2;
  selectedSize: number;
  deepLoading: boolean;
  deepCancelling: boolean;
  runDeep: () => void;
  cancelDeepEnrich: () => void;
  deepRunId: number;
  deepServerComplete: boolean;
  onDeepEnrichUiFinished: () => void;
  deepResults: DeepEnrichResult[] | null;
  deepExportCandidatesLength: number;
  downloadDeepXlsx: () => Promise<void>;
  downloadDeepCsv: () => void;
}

export default function CompsV2DeepEnrichSection({
  t,
  selectedSize,
  deepLoading,
  deepCancelling,
  runDeep,
  cancelDeepEnrich,
  deepRunId,
  deepServerComplete,
  onDeepEnrichUiFinished,
  deepResults,
  deepExportCandidatesLength,
  downloadDeepXlsx,
  downloadDeepCsv,
}: CompsV2DeepEnrichSectionProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={runDeep}
          disabled={deepLoading || deepCancelling || selectedSize < 3}
        >
          {deepLoading ? t('deepRunning') : t('runDeepEnrich')}
        </Button>
        {deepLoading ? (
          <Button
            type="button"
            variant="secondary"
            onClick={cancelDeepEnrich}
            disabled={deepCancelling}
          >
            {deepCancelling ? t('deepEnrichStopping') : t('deepEnrichCancel')}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-gray-500">{t('selectForDeep')}</p>
      {deepLoading ? (
        <CompsV2DeepEnrichProgress
          runId={deepRunId}
          serverComplete={deepServerComplete}
          onComplete={onDeepEnrichUiFinished}
        />
      ) : null}
      {deepResults && deepResults.length > 0 && (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 m-0">{t('deepResults')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void downloadDeepXlsx()}
                disabled={!deepExportCandidatesLength}
              >
                {t('exportXlsx')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadDeepCsv}
                disabled={!deepExportCandidatesLength}
              >
                {t('exportCsv')}
              </Button>
            </div>
          </div>
          {deepResults.map((r, i) => (
            <div key={i} className="border rounded-md p-3 dark:border-gray-700 text-sm space-y-2">
              <p className="font-semibold">{r.property_name}</p>
              {r.error && <p className="text-red-600">{r.error}</p>}
              <p>{r.structured.summary}</p>
              {r.structured.amenities.length > 0 && (
                <ul className="list-disc list-inside">
                  {r.structured.amenities.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              )}
              <p className="text-gray-600 dark:text-gray-400">
                <strong>{t('deepRatesOverview')}</strong> {r.structured.rates_notes || '—'}
              </p>
              {r.structured.unit_type_rates && r.structured.unit_type_rates.length > 0 ? (
                <div className="text-gray-600 dark:text-gray-400">
                  <strong className="block mb-1">{t('deepUnitRates')}</strong>
                  <ul className="list-disc list-inside space-y-0.5 m-0">
                    {r.structured.unit_type_rates.map((ur, j) => (
                      <li key={j}>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{ur.unit_type}:</span>{' '}
                        {ur.rate_note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-gray-600 dark:text-gray-400">
                <strong>{t('deepReviews')}</strong> {r.structured.review_highlights || '—'}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>{t('deepGbp')}</strong> {r.structured.google_business_notes || '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
