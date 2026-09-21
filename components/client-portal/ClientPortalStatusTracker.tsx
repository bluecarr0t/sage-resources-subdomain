'use client';

import { useTranslations } from 'next-intl';
import {
  CLIENT_PORTAL_TRACKER_STEPS,
  getClientPortalTrackerStepIndex,
  isClientPortalExceptionStage,
  type ClientPortalStage,
} from '@/lib/client-portal/stages';

function stepLabel(t: ReturnType<typeof useTranslations<'clientPortal'>>, step: string): string {
  switch (step) {
    case 'Intake':
      return t('stageIntake');
    case 'In progress':
      return t('stageInProgress');
    case 'Quality review':
      return t('stageQualityReview');
    case 'Delivered':
      return t('stageDelivered');
    default:
      return step;
  }
}

export function ClientPortalStatusTracker({
  stage,
  blocked,
}: {
  stage: ClientPortalStage;
  blocked: boolean;
}) {
  const t = useTranslations('clientPortal');
  const currentIndex = getClientPortalTrackerStepIndex(stage);
  const exception = isClientPortalExceptionStage(stage);

  return (
    <div className="space-y-4">
      {blocked ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <p className="font-semibold">{t('blockedBanner')}</p>
          <p className="mt-1 text-sm">{t('blockedHint')}</p>
        </div>
      ) : null}
      {exception ? (
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {stage === 'Cancelled' ? t('cancelled') : t('onHold')}
        </p>
      ) : null}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CLIENT_PORTAL_TRACKER_STEPS.map((step, index) => {
          const complete = currentIndex > index;
          const current = currentIndex === index;
          return (
            <li
              key={step}
              className={`rounded-lg border px-3 py-3 text-sm ${
                current
                  ? 'border-sage-600 bg-sage-50 font-semibold text-sage-900 dark:border-sage-500 dark:bg-sage-950/40 dark:text-sage-100'
                  : complete
                    ? 'border-sage-200 bg-white text-sage-800 dark:border-sage-800 dark:bg-neutral-900 dark:text-sage-200'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              <span className="block text-xs uppercase tracking-wide opacity-70">
                {index + 1}
              </span>
              {stepLabel(t, step)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
