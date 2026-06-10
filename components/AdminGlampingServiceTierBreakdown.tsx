'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GLAMPING_SERVICE_TIERS,
  GLAMPING_SERVICE_TIER_AGGREGATION_STEPS,
  GLAMPING_SERVICE_TIER_AMENITY_SIGNALS,
  GLAMPING_SERVICE_TIER_BASE_RULES,
  GLAMPING_SERVICE_TIER_DEFINITIONS,
  GLAMPING_SERVICE_TIER_FAST_PATHS,
  GLAMPING_SERVICE_TIER_LABELS,
  TIER_ADR_GUIDANCE,
  tierDisplayLabel,
  type GlampingServiceTier,
} from '@/lib/glamping-service-tier';

type BreakdownResponse = {
  success: boolean;
  totalProperties?: number;
  byTier?: Record<GlampingServiceTier, number>;
  unset?: number;
  manual?: number;
  auto?: number;
  error?: string;
};

const TIER_ACCENT: Record<GlampingServiceTier, string> = {
  luxury: 'bg-violet-600/85 dark:bg-violet-500/70',
  upscale: 'bg-sage-600/85 dark:bg-sage-500/70',
  midscale: 'bg-sky-600/80 dark:bg-sky-500/65',
  rustic: 'bg-amber-700/75 dark:bg-amber-600/60',
};

function formatAdrBand(tier: GlampingServiceTier): string {
  const g = TIER_ADR_GUIDANCE[tier];
  if (g.min != null && g.max != null) return `$${g.min}–$${g.max}`;
  if (g.min != null) return `$${g.min}+`;
  if (g.max != null) return `< $${g.max + 1}`;
  return '—';
}

export default function AdminGlampingServiceTierBreakdown() {
  const [counts, setCounts] = useState<BreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/sage-glamping-data/service-tier-breakdown', {
          cache: 'no-store',
        });
        const json = (await res.json()) as BreakdownResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? 'Failed to load tier breakdown');
        }
        if (!cancelled) setCounts(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tier breakdown');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = counts?.totalProperties ?? 0;
  const byTier = counts?.byTier;
  const maxTierCount = byTier
    ? Math.max(...GLAMPING_SERVICE_TIERS.map((t) => byTier[t] ?? 0), 1)
    : 1;

  return (
    <section
      className="rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-950/50 overflow-hidden"
      aria-labelledby="service-tier-breakdown-heading"
    >
      <header className="px-4 py-4 sm:px-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40">
        <h2
          id="service-tier-breakdown-heading"
          className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
        >
          Glamping service tier
        </h2>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 max-w-3xl">
          Property-level experience classification from amenities and max site ADR. Distinct from{' '}
          <span className="font-mono text-[11px]">rate_category</span> (price buckets) and comps-v2
          quality tiers. Stored on{' '}
          <span className="font-mono text-[11px]">all_sage_data</span>; editable in{' '}
          <Link
            href="/admin/sage-data"
            className="text-sage-600 dark:text-sage-400 hover:underline"
          >
            Sage Data
          </Link>
          .
        </p>
      </header>

      <div className="p-4 sm:p-5 space-y-6">
        {loading ? (
          <div className="animate-pulse space-y-3" aria-hidden>
            <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
            <div className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : counts && byTier ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-500 tabular-nums">
              <span>
                {total.toLocaleString()} properties (published + in progress)
              </span>
              {(counts.unset ?? 0) > 0 && (
                <span>{counts.unset!.toLocaleString()} unset tier</span>
              )}
              <span>{counts.auto?.toLocaleString() ?? 0} auto</span>
              <span>{counts.manual?.toLocaleString() ?? 0} manual override</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Current distribution
              </h3>
              <ul className="space-y-2">
                {GLAMPING_SERVICE_TIERS.map((tier) => {
                  const n = byTier[tier] ?? 0;
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  const barPct = Math.round((n / maxTierCount) * 100);
                  return (
                    <li key={tier}>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {tierDisplayLabel(tier)}
                          <span className="ml-1.5 font-mono text-[10px] font-normal text-neutral-400">
                            {tier}
                          </span>
                        </span>
                        <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                          {n.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${TIER_ACCENT[tier]}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : null}

        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Tier definitions
          </h3>
          <div className="overflow-x-auto rounded-md border border-neutral-200/70 dark:border-neutral-800">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                    Label
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                    Max ADR band
                  </th>
                  <th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                    Definition
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
                {GLAMPING_SERVICE_TIERS.map((tier) => (
                  <tr key={tier}>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {GLAMPING_SERVICE_TIER_LABELS[tier]}
                      </span>
                      <p className="font-mono text-[10px] text-neutral-400 mt-0.5">{tier}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        {GLAMPING_SERVICE_TIER_DEFINITIONS[tier].alternates}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {formatAdrBand(tier)}
                      <p className="text-[10px] text-neutral-500 font-normal mt-1 max-w-[10rem]">
                        {TIER_ADR_GUIDANCE[tier].note}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-400">
                      {GLAMPING_SERVICE_TIER_DEFINITIONS[tier].summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Property aggregation
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              {GLAMPING_SERVICE_TIER_AGGREGATION_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Amenity score
            </h3>
            <ul className="space-y-1.5 text-xs">
              {GLAMPING_SERVICE_TIER_AMENITY_SIGNALS.map(({ signal, points }) => (
                <li
                  key={signal}
                  className="flex justify-between gap-2 text-neutral-600 dark:text-neutral-400"
                >
                  <span className="font-mono text-[11px]">{signal}</span>
                  <span className="tabular-nums font-medium text-neutral-800 dark:text-neutral-200 shrink-0">
                    {points > 0 ? `+${points}` : points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Classification rules (in order)
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
            {GLAMPING_SERVICE_TIER_FAST_PATHS.map(({ condition, tier }) => (
              <li key={condition}>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  Fast path → {tierDisplayLabel(tier)}
                </span>
                : {condition}
              </li>
            ))}
            {GLAMPING_SERVICE_TIER_BASE_RULES.map(({ tier, rule }) => (
              <li key={rule}>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {tierDisplayLabel(tier)}
                </span>
                : {rule}
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
            Implementation:{' '}
            <span className="font-mono">lib/glamping-service-tier.ts</span> · Batch:{' '}
            <span className="font-mono">scripts/classify-glamping-service-tier.ts</span> · Full
            doc:{' '}
            <span className="font-mono">docs/data/GLAMPING_SERVICE_TIER.md</span>
          </p>
        </div>
      </div>
    </section>
  );
}
