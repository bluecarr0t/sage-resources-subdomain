'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Link2, Loader2, Search, Unlink, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ReportAddSagePropertyTrigger } from '@/components/admin/ReportAddSagePropertyModal';
import type { ReportSagePropertyPrefill } from '@/lib/admin/report-sage-property-prefill';
import type { LinkedSageProperty } from '@/lib/admin/resolve-sage-data-anchor-id';
import { formatGlampingIsOpenPublicLabel } from '@/lib/glamping-is-open';

type SagePropertySearchRow = LinkedSageProperty;

function formatLocation(row: Pick<SagePropertySearchRow, 'city' | 'state' | 'zip_code'>): string {
  return [row.city, row.state, row.zip_code].filter(Boolean).join(', ');
}

function isOpenBadgeClasses(isOpen: string | null | undefined): string {
  const v = (isOpen ?? '').trim().toLowerCase();
  if (v === 'yes') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (v === 'under construction') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  if (v === 'proposed development') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  if (v === 'cancelled' || v === 'closed' || v === 'temporarily closed') {
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function formatResearchStatus(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  return v
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function PropertyResultRow({
  row,
  onSelect,
  disabled,
}: {
  row: SagePropertySearchRow;
  onSelect: (id: number) => void;
  disabled?: boolean;
}) {
  const location = formatLocation(row);
  const openLabel = formatGlampingIsOpenPublicLabel(row.is_open);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(row.id)}
      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 last:border-b-0 disabled:opacity-50"
    >
      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
        {row.property_name || 'Untitled property'}
      </div>
      {row.address && (
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{row.address}</div>
      )}
      {location && (
        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">{location}</div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {openLabel && (
          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${isOpenBadgeClasses(row.is_open)}`}>
            {openLabel}
          </span>
        )}
        {row.research_status && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatResearchStatus(row.research_status)}
          </span>
        )}
      </div>
    </button>
  );
}

export type ReportSagePropertyLinkerProps = {
  studyId: string;
  sageDataAnchorId: number | null | undefined;
  sageProperty: LinkedSageProperty | null | undefined;
  suggestQuery?: string | null;
  suggestCity?: string | null;
  suggestState?: string | null;
  reportPrefill: ReportSagePropertyPrefill;
  onLinked: () => void | Promise<void>;
};

function buildSearchParams(options: {
  q?: string | null;
  city?: string | null;
  state?: string | null;
  limit: string;
}): URLSearchParams {
  const params = new URLSearchParams({ limit: options.limit });
  const q = (options.q ?? '').trim();
  const city = (options.city ?? '').trim();
  const state = (options.state ?? '').trim();
  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (state) params.set('state', state);
  return params;
}

export default function ReportSagePropertyLinker({
  studyId,
  sageDataAnchorId,
  sageProperty,
  suggestQuery,
  suggestCity,
  suggestState,
  reportPrefill,
  onLinked,
}: ReportSagePropertyLinkerProps) {
  const [mode, setMode] = useState<'view' | 'search'>('view');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SagePropertySearchRow[]>([]);
  const [suggestions, setSuggestions] = useState<SagePropertySearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = sageDataAnchorId != null && sageProperty != null;

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const params = buildSearchParams({
        q: trimmed,
        city: suggestCity,
        state: suggestState,
        limit: '20',
      });
      const res = await fetch(`/api/admin/reports/sage-property-search?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Search failed');
        setResults([]);
        return;
      }
      setResults((data.rows ?? []) as SagePropertySearchRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [suggestCity, suggestState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (mode !== 'search') return;
    void runSearch(searchQuery);
  }, [mode, searchQuery, runSearch]);

  useEffect(() => {
    if (isLinked || mode === 'search') return;

    const city = (suggestCity ?? '').trim();
    const state = (suggestState ?? '').trim();
    const nameQuery = (suggestQuery ?? '').trim();
    if (!nameQuery && !city && !state) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setSuggesting(true);
      try {
        const fetchSuggestions = async (q: string) => {
          const params = buildSearchParams({
            q: q || undefined,
            city,
            state,
            limit: '5',
          });
          const res = await fetch(`/api/admin/reports/sage-property-search?${params}`);
          const data = await res.json();
          if (!res.ok || !data.success) return [] as SagePropertySearchRow[];
          return (data.rows ?? []) as SagePropertySearchRow[];
        };

        let rows = await fetchSuggestions(nameQuery);
        if (rows.length === 0 && (city || state)) {
          rows = await fetchSuggestions('');
        }
        if (!cancelled) setSuggestions(rows);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggesting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLinked, mode, suggestQuery, suggestCity, suggestState]);

  const patchLink = async (anchorId: number | null) => {
    setError(null);
    const res = await fetch(`/api/admin/reports/study/${studyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sage_data_anchor_id: anchorId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update link');
    }
    setMode('view');
    setSearchInput('');
    setResults([]);
    await onLinked();
  };

  const handleSelect = async (id: number) => {
    setLinking(true);
    setError(null);
    try {
      await patchLink(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link property');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    setError(null);
    try {
      await patchLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink property');
    } finally {
      setUnlinking(false);
    }
  };

  if (isLinked && mode === 'view') {
    const location = formatLocation(sageProperty);
    const openLabel = formatGlampingIsOpenPublicLabel(sageProperty.is_open);
    const sageDataUrl = sageProperty.property_name
      ? `/admin/sage-data/editor?q=${encodeURIComponent(sageProperty.property_name)}`
      : '/admin/sage-data/editor';

    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Linked Sage Property
          </h3>
        </div>
        <div className="rounded-lg border border-sage-200 dark:border-sage-800 bg-sage-50/50 dark:bg-sage-900/20 p-3 space-y-2">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {sageProperty.property_name || 'Untitled property'}
          </div>
          {sageProperty.address && (
            <p className="text-xs text-gray-600 dark:text-gray-400">{sageProperty.address}</p>
          )}
          {location && (
            <p className="text-xs text-gray-500 dark:text-gray-500">{location}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {openLabel && (
              <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${isOpenBadgeClasses(sageProperty.is_open)}`}>
                {openLabel}
              </span>
            )}
            {sageProperty.research_status && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatResearchStatus(sageProperty.research_status)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={sageDataUrl}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                View in Sage Data
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setMode('search')}
              disabled={unlinking}
            >
              Change link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-600 dark:text-red-400 hover:text-red-700"
              onClick={() => void handleUnlink()}
              disabled={unlinking}
            >
              {unlinking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
              <span className="ml-1">Unlink</span>
            </Button>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
        )}
        <ReportAddSagePropertyTrigger
          prefill={reportPrefill}
          onCreated={(id) => handleSelect(id)}
          disabled={linking || unlinking}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Link Sage Property
        </h3>
        {isLinked && (
          <button
            type="button"
            onClick={() => {
              setMode('view');
              setSearchInput('');
              setResults([]);
              setError(null);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!isLinked && suggestions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            Suggested matches
            {(suggestCity || suggestState) && (
              <span className="text-gray-400">
                {' '}
                near {[suggestCity, suggestState].filter(Boolean).join(', ')}
              </span>
            )}
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
            {suggestions.map((row) => (
              <PropertyResultRow
                key={row.id}
                row={row}
                onSelect={(id) => void handleSelect(id)}
                disabled={linking}
              />
            ))}
          </div>
          {suggesting && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading suggestions…
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by property name or address…"
          className="pl-9 text-sm"
          disabled={linking}
        />
      </div>

      {(searching || linking) && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {linking ? 'Linking…' : 'Searching…'}
        </p>
      )}

      {!searching && searchQuery && results.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No properties found.</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-64 overflow-y-auto bg-white dark:bg-gray-900">
          {results.map((row) => (
            <PropertyResultRow
              key={row.id}
              row={row}
              onSelect={(id) => void handleSelect(id)}
              disabled={linking}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}

      <ReportAddSagePropertyTrigger
        prefill={reportPrefill}
        onCreated={(id) => handleSelect(id)}
        disabled={linking}
      />
    </div>
  );
}
