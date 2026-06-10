import { parseAnchorPointAnchorType } from '@/lib/anchor-point-insights/anchor-type';
import type { AnchorType } from './types';

type Translate = (key: string) => string;

export function parseProximityAnchorType(value: string | null | undefined): AnchorType {
  return parseAnchorPointAnchorType(value);
}

export function anchorTypePluralLabel(type: AnchorType, t: Translate): string {
  if (type === 'national-parks') return t('nationalParks');
  if (type === 'wineries') return t('wineries');
  return t('skiResorts');
}

export function anchorTypeSingularLabel(type: AnchorType, t: Translate): string {
  if (type === 'national-parks') return t('nationalPark');
  if (type === 'wineries') return t('winery');
  return t('skiResort');
}

export function anchorTypeWithinMiLabel(type: AnchorType, t: Translate): string {
  if (type === 'national-parks') return t('parks');
  if (type === 'wineries') return t('wineryLabel');
  return t('ski');
}

export function anchorSearchPlaceholder(type: AnchorType, t: Translate): string {
  if (type === 'national-parks') return t('searchParks');
  if (type === 'wineries') return t('searchWineries');
  return t('searchAnchors');
}

export function anchorUsesYearAvgCharts(type: AnchorType): boolean {
  return type !== 'ski';
}

type SummaryLike = {
  avg_winter_rate?: number | null;
  avg_rate?: number | null;
  uses_blended_seasonal_rate?: boolean;
};

export function summaryAvgRateValue(summary: SummaryLike): number | null {
  if (summary.uses_blended_seasonal_rate) return summary.avg_rate ?? null;
  return summary.avg_winter_rate ?? summary.avg_rate ?? null;
}

export function summaryAvgRateLabel(type: AnchorType, t: Translate): string {
  return anchorUsesYearAvgCharts(type) ? t('avgRate') : t('avgWinterRate');
}
