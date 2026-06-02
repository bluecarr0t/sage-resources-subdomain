'use client';

import type { useFormatter } from 'next-intl';

type SourceSplit = {
  primaryLabel: string;
  primaryCount: number;
  secondaryLabel: string;
  secondaryCount: number;
};

type Props = {
  propertyCount: number | null;
  unitSiteCount: number;
  sources: SourceSplit;
  notAvailableLabel: string;
  propertyCountLabel: string;
  unitSiteCountLabel: string;
  sourceSplitLabel: (values: Record<string, string>) => string;
  format: ReturnType<typeof useFormatter>;
};

export function IndustryOverviewSnapshotCounts({
  propertyCount,
  unitSiteCount,
  sources,
  notAvailableLabel,
  propertyCountLabel,
  unitSiteCountLabel,
  sourceSplitLabel,
  format,
}: Props) {
  const fmt = (n: number) => format.number(n, { maximumFractionDigits: 0 });

  return (
    <>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <dt className="text-neutral-500 dark:text-neutral-400">{propertyCountLabel}</dt>
        <dd className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
          {propertyCount != null ? fmt(propertyCount) : notAvailableLabel}
        </dd>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <dt className="text-neutral-500 dark:text-neutral-400">{unitSiteCountLabel}</dt>
        <dd className="tabular-nums text-neutral-700 dark:text-neutral-300">
          <span className="font-medium">{fmt(unitSiteCount)}</span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {' '}
            (
            {sourceSplitLabel({
              primary: `${sources.primaryLabel} ${fmt(sources.primaryCount)}`,
              secondary: `${sources.secondaryLabel} ${fmt(sources.secondaryCount)}`,
            })}
            )
          </span>
        </dd>
      </div>
    </>
  );
}
