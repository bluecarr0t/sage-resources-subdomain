'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Check, X, ExternalLink } from 'lucide-react';

function formatAddedAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface Candidate {
  id: string;
  property_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
  description: string | null;
  unit_type: string | null;
  property_type: string | null;
  number_of_units: number | null;
  article_url: string | null;
  discovery_source: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

type TabId = 'pending' | 'approved';

async function fetchCandidatesByStatus(status: TabId): Promise<Candidate[]> {
  const res = await fetch(
    `/api/admin/sage-glamping-data/discovery-candidates?status=${status}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch');
  return json.candidates ?? [];
}

export default function DiscoveryCandidatesPage() {
  const t = useTranslations('admin.discoveryCandidates');
  const [tab, setTab] = useState<TabId>('pending');
  const [pendingList, setPendingList] = useState<Candidate[]>([]);
  const [approvedList, setApprovedList] = useState<Candidate[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    const rows = await fetchCandidatesByStatus('pending');
    setPendingList(rows);
  }, []);

  const loadApproved = useCallback(async () => {
    const rows = await fetchCandidatesByStatus('approved');
    setApprovedList(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoadingPending(true);
    loadPending()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoadingPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPending]);

  useEffect(() => {
    if (tab !== 'approved') return;
    let cancelled = false;
    setError(null);
    setLoadingApproved(true);
    loadApproved()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoadingApproved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, loadApproved]);

  const handleAction = async (id: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/admin/sage-glamping-data/discovery-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectionReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const candidates = tab === 'pending' ? pendingList : approvedList;
  const listLoading = tab === 'pending' ? loadingPending : loadingApproved;

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/admin/sage-glamping-data-breakdown"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Sage Glamping Data
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Discovery candidates
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Properties excluded by inclusion criteria. Approve to add to database or reject to dismiss.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div
          className="flex gap-1 p-1 mb-6 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit"
          role="tablist"
          aria-label={t('tabsAria')}
        >
          <button
            type="button"
            role="tab"
            id="discovery-candidates-tab-pending"
            aria-selected={tab === 'pending'}
            aria-controls="discovery-candidates-panel"
            tabIndex={tab === 'pending' ? 0 : -1}
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'pending'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('tabPending')}
          </button>
          <button
            type="button"
            role="tab"
            id="discovery-candidates-tab-approved"
            aria-selected={tab === 'approved'}
            aria-controls="discovery-candidates-panel"
            tabIndex={tab === 'approved' ? 0 : -1}
            onClick={() => setTab('approved')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'approved'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('tabApproved')}
          </button>
        </div>

        <div id="discovery-candidates-panel" role="tabpanel" aria-labelledby={`discovery-candidates-tab-${tab}`}>
          {listLoading ? (
            <div className="animate-pulse space-y-4" aria-busy="true">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {tab === 'pending' ? t('emptyPending') : t('emptyApproved')}
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {candidates.map((c) => {
                const addedAtLabel = formatAddedAt(c.created_at);
                const approvedAtLabel = formatAddedAt(c.reviewed_at);
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.property_name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {[c.city, c.state, c.country].filter(Boolean).join(', ') || 'No location'}
                        </p>
                        {addedAtLabel && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('addedOn', { date: addedAtLabel })}
                          </p>
                        )}
                        {tab === 'approved' && approvedAtLabel && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('approvedOn', { date: approvedAtLabel })}
                          </p>
                        )}
                        {c.rejection_reason && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Reason: {c.rejection_reason}
                          </p>
                        )}
                        {c.article_url && (
                          <a
                            href={c.article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sage-600 dark:text-sage-400 mt-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Source article
                          </a>
                        )}
                      </div>
                      {tab === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAction(c.id, 'approve')}
                            disabled={acting === c.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAction(c.id, 'reject')}
                            disabled={acting === c.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
