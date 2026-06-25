'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

type ProjectPipelineOAuthExpiryBannerProps = {
  onReconnect: () => void;
  reconnecting?: boolean;
};

export function ProjectPipelineOAuthExpiryBanner({
  onReconnect,
  reconnecting = false,
}: ProjectPipelineOAuthExpiryBannerProps) {
  const t = useTranslations('admin.projectPipeline');

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{t('oauthExpiryTitle')}</p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
            {t('oauthExpiryBody')}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        disabled={reconnecting}
        onClick={onReconnect}
      >
        {reconnecting ? t('oauthConnecting') : t('oauthExpiryReconnect')}
      </Button>
    </div>
  );
}
