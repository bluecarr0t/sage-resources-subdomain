'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, X, ExternalLink } from 'lucide-react';

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
}

export default function DiscoveryCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchCandidates = async () => {
    const res = await fetch('/api/admin/sage-glamping-data/discovery-candidates');
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch');
    setCandidates(json.candidates ?? []);
  };

  useEffect(() => {
    fetchCandidates().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load')).finally(() => setLoading(false));
  }, []);

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
      await fetchCandidates();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </main>
    );
  }

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

        {candidates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No pending candidates</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {candidates.map((c) => (
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
                    {c.rejection_reason && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Reason: {c.rejection_reason}</p>
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
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(c.id, 'approve')}
                      disabled={acting === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(c.id, 'reject')}
                      disabled={acting === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
