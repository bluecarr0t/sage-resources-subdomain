'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  EDITORIAL_LINK_CLASS,
  EDITORIAL_METRIC_COMPACT_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import MapMarketLeadCta from '@/components/map/MapMarketLeadCta';
import {
  findMapMarketPagesForFilters,
  formatMarketLabel,
} from '@/lib/map-market-pages';

type MapLeadStudyPanelProps = {
  locale: string;
  compsCount: number;
  filterState: string[];
  filterUnitType: string[];
  rateCategoryCounts: Record<string, number>;
  loading?: boolean;
};

/**
 * Shown after state / unit-type filters: comps count, ADR band framing,
 * occupancy study framing, and book-intro CTA.
 */
export default function MapLeadStudyPanel({
  locale,
  compsCount,
  filterState,
  filterUnitType,
  rateCategoryCounts,
  loading = false,
}: MapLeadStudyPanelProps) {
  const t = useTranslations('map.lead');

  const marketLabel = useMemo(() => {
    const parts: string[] = [];
    if (filterState.length > 0) parts.push(filterState.slice(0, 3).join(', '));
    if (filterUnitType.length > 0) parts.push(filterUnitType.slice(0, 2).join(', '));
    return parts.join(' · ') || t('defaultMarketLabel');
  }, [filterState, filterUnitType, t]);

  const topRateBands = useMemo(() => {
    return Object.entries(rateCategoryCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([band]) => band);
  }, [rateCategoryCounts]);

  const matchedMarkets = useMemo(
    () => findMapMarketPagesForFilters(filterState, filterUnitType).slice(0, 2),
    [filterState, filterUnitType]
  );

  return (
    <aside
      className="mt-4 space-y-3 border border-sage-200/70 bg-white/60 p-3"
      aria-label={t('studyTitle')}
    >
      <h3 className={EDITORIAL_SECTION_LABEL_CLASS}>{t('studyTitle')}</h3>
      <p className="text-xs font-light leading-relaxed text-neutral-600">
        {t('studyIntro', { market: marketLabel })}
      </p>

      <div className="flex items-baseline gap-2 border-b border-sage-200/50 pb-2">
        <span className={EDITORIAL_METRIC_COMPACT_CLASS}>
          {loading ? '…' : compsCount.toLocaleString()}
        </span>
        <span className="text-[11px] font-light uppercase tracking-widest text-neutral-500">
          {t('compsLabel')}
        </span>
      </div>

      <div className="space-y-1.5 text-xs font-light leading-relaxed text-neutral-600">
        <p>
          <span className="font-medium text-neutral-800">{t('adrLabel')}: </span>
          {topRateBands.length > 0
            ? t('adrFraming', { bands: topRateBands.join(', ') })
            : t('adrFramingFallback')}
        </p>
        <p>
          <span className="font-medium text-neutral-800">{t('occupancyLabel')}: </span>
          {t('occupancyFraming')}
        </p>
      </div>

      {matchedMarkets.length > 0 ? (
        <p className="text-[11px] font-light leading-relaxed text-neutral-500">
          {t('marketPagesHint')}{' '}
          {matchedMarkets.map((market, i) => (
            <span key={market.slug}>
              {i > 0 ? <span className="text-neutral-400"> · </span> : null}
              <Link
                href={`/${locale}/markets/${market.slug}`}
                className={EDITORIAL_LINK_CLASS}
              >
                {formatMarketLabel(market)}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <MapMarketLeadCta
        states={filterState}
        unitTypes={filterUnitType}
        marketSlug={matchedMarkets[0]?.slug}
        compact
      />
    </aside>
  );
}
