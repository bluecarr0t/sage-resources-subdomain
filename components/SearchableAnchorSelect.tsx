'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';

interface AnchorOption {
  anchor_id?: number;
  anchor_name: string;
  anchor_slug?: string;
  property_count_15_mi?: number;
  units_count_15_mi?: number;
}

interface SearchableAnchorSelectProps {
  anchors: AnchorOption[];
  anchorType: 'ski' | 'national-parks' | 'wineries';
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  'aria-label'?: string;
  /** When set, queries this after `remoteSearchMinChars` characters (merges with local filter). */
  onRemoteSearch?: (query: string) => Promise<AnchorOption[]>;
  remoteSearchMinChars?: number;
}

export default function SearchableAnchorSelect({
  anchors,
  anchorType,
  value,
  onChange,
  allLabel,
  placeholder = 'Search...',
  searchPlaceholder = 'Search...',
  className = '',
  'aria-label': ariaLabel,
  onRemoteSearch,
  remoteSearchMinChars = 2,
}: SearchableAnchorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<AnchorOption[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredLocal = anchors
    .filter(
      (a) =>
        (anchorType === 'national-parks' && a.anchor_slug) ||
        ((anchorType === 'ski' || anchorType === 'wineries') && a.anchor_id != null)
    )
    .filter(
      (a) =>
        !searchQuery.trim() ||
        a.anchor_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.anchor_name.localeCompare(b.anchor_name, undefined, { sensitivity: 'base' }));

  useEffect(() => {
    if (!onRemoteSearch || !isOpen) {
      setRemoteResults([]);
      setRemoteLoading(false);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < remoteSearchMinChars) {
      setRemoteResults([]);
      setRemoteLoading(false);
      return;
    }
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setRemoteLoading(true);
      void onRemoteSearch(q)
        .then((results) => {
          if (!ac.signal.aborted) setRemoteResults(results);
        })
        .catch(() => {
          if (!ac.signal.aborted) setRemoteResults([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setRemoteLoading(false);
        });
    }, 280);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [searchQuery, onRemoteSearch, remoteSearchMinChars, isOpen]);

  const useRemoteList =
    Boolean(onRemoteSearch) && searchQuery.trim().length >= remoteSearchMinChars;

  const filtered = useMemo(() => {
    if (useRemoteList) return remoteResults;
    return filteredLocal;
  }, [useRemoteList, remoteResults, filteredLocal]);

  const findAnchor = useCallback(
    (opts: AnchorOption[]) =>
      value
        ? opts.find(
            (a) =>
              (value.startsWith('id:') && a.anchor_id === parseInt(value.slice(3), 10)) ||
              (value.startsWith('slug:') && a.anchor_slug === value.slice(5))
          )
        : null,
    [value]
  );

  const selectedAnchor = findAnchor(anchors) ?? findAnchor(remoteResults);

  const displayCount = (a: AnchorOption) => a.units_count_15_mi ?? a.property_count_15_mi ?? 0;
  const displayLabel = selectedAnchor
    ? `${selectedAnchor.anchor_name} (${displayCount(selectedAnchor)})`
    : allLabel;

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center justify-between w-full min-w-[200px] px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent text-left"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[240px] max-h-[320px] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                aria-label={searchPlaceholder}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[260px] py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                !value ? 'bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
              role="option"
              aria-selected={!value}
            >
              {allLabel}
            </button>
            {filtered.map((a) => {
              const optValue =
                anchorType === 'national-parks' && a.anchor_slug
                  ? `slug:${a.anchor_slug}`
                  : a.anchor_id != null
                    ? `id:${a.anchor_id}`
                    : '';
              if (!optValue) return null;
              const isSelected = value === optValue;
              return (
                <button
                  key={a.anchor_id ?? a.anchor_slug ?? a.anchor_name}
                  type="button"
                  onClick={() => handleSelect(optValue)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isSelected ? 'bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  {a.anchor_name}
                  {displayCount(a) > 0 ? ` (${displayCount(a)})` : ''}
                </button>
              );
            })}
            {remoteLoading && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching…
              </div>
            )}
            {!remoteLoading && filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
