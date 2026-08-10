'use client';

import AttributedRootContactLink from '@/components/AttributedRootContactLink';
import { EDITORIAL_BUTTON_PRIMARY_CLASS } from '@/components/editorial/EditorialPageShell';
import { buildMapLeadAttributionPath } from '@/lib/map-market-pages';
import { useTranslations } from 'next-intl';

type MapMarketLeadCtaProps = {
  states?: string[];
  unitTypes?: string[];
  marketSlug?: string;
  /** Compact for sticky sidebar footers */
  compact?: boolean;
  className?: string;
};

/**
 * Persistent map → contact CTA with resources UTMs (utm_content from market path).
 */
export default function MapMarketLeadCta({
  states = [],
  unitTypes = [],
  marketSlug,
  compact = false,
  className = '',
}: MapMarketLeadCtaProps) {
  const t = useTranslations('map.lead');
  const attributionPath = buildMapLeadAttributionPath({
    states,
    unitTypes,
    marketSlug,
  });

  return (
    <div className={className}>
      {!compact ? (
        <p className="mb-2 text-[11px] font-light leading-relaxed text-neutral-500">
          {t('ctaHint')}
        </p>
      ) : null}
      <AttributedRootContactLink
        attributionPath={attributionPath}
        ctaLocation="map_market_feasibility_cta"
        className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} w-full justify-center px-3 py-2 text-center text-[10px] leading-snug tracking-wider`}
      >
        {t('ctaLabel')}
      </AttributedRootContactLink>
    </div>
  );
}
