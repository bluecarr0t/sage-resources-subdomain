'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import type { BrandAssignmentAuditReport } from '@/lib/brand-assignment-audit';

export default function AdminBrandAssignmentsPage() {
  const [report, setReport] = useState<BrandAssignmentAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/sage-glamping-data/brands/audit');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to load audit');
      }
      setReport(json.report as BrandAssignmentAuditReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  async function runBackfill(dryRun: boolean) {
    setApplying(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/admin/sage-glamping-data/brands/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Backfill failed');
      }
      const r = json.result as {
        dryRun: boolean;
        updatedRowCount: number;
        byBrand: Array<{ brandSlug: string; rowCount: number }>;
      };
      setBackfillResult(
        dryRun
          ? `Dry run: would update ${r.updatedRowCount} published rows across ${r.byBrand.length} brands.`
          : `Updated ${r.updatedRowCount} published rows.`
      );
      if (!dryRun) await loadAudit();
    } catch (e) {
      setBackfillResult(e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className={adminPageHeadingMargin}>
        <Link
          href="/admin/glamping-properties"
          className="text-sm font-light text-neutral-500 hover:text-neutral-800"
        >
          ← Glamping properties
        </Link>
        <h1 className={adminPageTitle}>Brand assignments</h1>
        <p className={adminPageDescription}>
          Audit published properties missing <code className="text-xs">brand_id</code>, then bulk-assign
          from property-name chain detection. Re-run after imports or research publishes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={loadAudit} disabled={loading}>
          Refresh audit
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => runBackfill(true)}
          disabled={applying || loading}
        >
          Dry-run backfill
        </Button>
        <Button
          type="button"
          onClick={() => runBackfill(false)}
          disabled={applying || loading || !report?.backfillCandidates.length}
        >
          Apply backfill (all candidates)
        </Button>
      </div>

      {backfillResult ? (
        <p className="mb-6 text-sm font-light text-neutral-700">{backfillResult}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading audit…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : report ? (
        <div className="space-y-8">
          <Card className="p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Published coverage
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-neutral-500">Properties</dt>
                <dd className="text-2xl font-light tabular-nums">{report.published.totalAnchors}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">With brand</dt>
                <dd className="text-2xl font-light tabular-nums text-green-800">
                  {report.published.withBrand}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Missing brand</dt>
                <dd className="text-2xl font-light tabular-nums text-amber-800">
                  {report.published.missingBrand}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-neutral-500">
              CLI: <code>npx tsx scripts/audit-glamping-brand-assignments.ts</code>
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              Backfill candidates ({report.backfillCandidates.length})
            </h2>
            <p className="mt-2 text-xs font-light text-neutral-600">
              Existing brand in registry; published rows still unassigned.
            </p>
            {report.backfillCandidates.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">None — all matched chains are assigned.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200 text-sm">
                {report.backfillCandidates.map((c) => (
                  <li key={c.brandSlug} className="py-3">
                    <p className="font-medium text-neutral-900">
                      {c.brandDisplayName}{' '}
                      <span className="font-normal text-neutral-500">({c.brandSlug})</span>
                    </p>
                    <p className="text-xs text-neutral-600">
                      Chain: {c.chainKey} · {c.unassignedRowCount} unassigned / {c.totalAnchorCount}{' '}
                      anchors
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{c.samplePropertyNames.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              New brand candidates ({report.newBrandCandidates.length})
            </h2>
            <p className="mt-2 text-xs font-light text-neutral-600">
              2+ published properties, no registry match — add via migration then re-audit.
            </p>
            {report.newBrandCandidates.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">None in current published cohort.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-200 text-sm">
                {report.newBrandCandidates.slice(0, 20).map((c) => (
                  <li key={c.chainKey} className="py-3">
                    <p className="font-medium text-neutral-900">{c.chainKey}</p>
                    <p className="text-xs text-neutral-600">{c.propertyCount} properties</p>
                    <p className="mt-1 text-xs text-neutral-500">{c.samplePropertyNames.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
