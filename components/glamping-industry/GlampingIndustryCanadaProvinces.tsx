'use client';

import { useCallback, useMemo, useState } from 'react';
import type { GlampingCaProvinceMetricsMap } from '@/lib/fetch-glamping-industry-ca-province-metrics';
import { CA_PROVINCE_DISPLAY_NAME } from '@/lib/normalize-ca-province-key';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatUsd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = { byProvince: GlampingCaProvinceMetricsMap };

export default function GlampingIndustryCanadaProvinces({ byProvince }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return Object.entries(byProvince)
      .map(([code, m]) => ({
        code,
        name: CA_PROVINCE_DISPLAY_NAME[code] ?? code,
        ...m,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [byProvince]);

  const row = selected ? byProvince[selected] : undefined;

  const onSelect = useCallback((code: string) => {
    setSelected((prev) => (prev === code ? null : code));
  }, []);

  return (
    <div className="relative mt-10 space-y-12 lg:space-y-0 lg:pr-[calc(220px+3rem)]">
      <div className="min-w-0">
        <div className="mb-4 space-y-1 text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          <p>Canada · provinces & territories</p>
          <p className="font-light normal-case tracking-normal text-neutral-400">
            Select a region for property count, site count, and average retail daily rate.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sorted.map(({ code, name }) => {
            const isSel = selected === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className={`border px-2 py-2.5 text-left text-xs font-light transition-colors ${
                  isSel
                    ? 'border-neutral-900 bg-neutral-100 text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <span className="block leading-snug">{name}</span>
                <span className="mt-1 block tabular-nums text-[11px] text-neutral-400">
                  {formatInt(byProvince[code]?.propertyCount ?? 0)} properties
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="border-t border-neutral-200 pt-6 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:flex lg:min-h-0 lg:w-[220px] lg:flex-col lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <div className="min-h-0 flex-1 overflow-y-auto lg:min-h-0">
          {!selected ? (
            <p className="text-xs font-light leading-relaxed text-neutral-500">
              Choose a province or territory from the grid for detailed metrics.
            </p>
          ) : (
            <div className="space-y-6">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">
                {CA_PROVINCE_DISPLAY_NAME[selected] ?? selected}
              </h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Property count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.propertyCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Site count
                  </dt>
                  <dd className="mt-1 font-light tabular-nums text-2xl tracking-tight text-neutral-900">
                    {formatInt(row?.siteCount ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Avg. retail daily rate
                  </dt>
                  <dd className="mt-1 space-y-0.5 font-light tabular-nums text-lg tracking-tight text-neutral-900">
                    <div>
                      <span className="text-neutral-400">Mean</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMean ?? null)}
                    </div>
                    <div>
                      <span className="text-neutral-400">Median</span>{' '}
                      {formatUsd(row?.avgRetailDailyRateMedian ?? null)}
                    </div>
                  </dd>
                  <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
                    From operating properties with a recorded rate.
                  </p>
                </div>
              </dl>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
