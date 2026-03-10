'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface AnchorOption {
  anchor_id?: number;
  anchor_name: string;
  anchor_slug?: string;
  property_count_15_mi?: number;
  units_count_15_mi?: number;
}

interface SearchableAnchorSelectProps {
  anchors: AnchorOption[];
  anchorType: 'ski' | 'national-parks';
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  'aria-label'?: string;
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
}: SearchableAnchorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = anchors
    .filter(
      (a) =>
        (anchorType === 'ski' && a.anchor_id != null) ||
        (anchorType === 'national-parks' && a.anchor_slug)
    )
    .filter(
      (a) =>
        !searchQuery.trim() ||
        a.anchor_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.anchor_name.localeCompare(b.anchor_name, undefined, { sensitivity: 'base' }));

  const selectedAnchor = value
    ? anchors.find(
        (a) =>
          (value.startsWith('id:') && a.anchor_id === parseInt(value.slice(3), 10)) ||
          (value.startsWith('slug:') && a.anchor_slug === value.slice(5))
      )
    : null;

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
                anchorType === 'ski' && a.anchor_id != null
                  ? `id:${a.anchor_id}`
                  : a.anchor_slug
                    ? `slug:${a.anchor_slug}`
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
                  {a.anchor_name} ({displayCount(a)})
                </button>
              );
            })}
            {filtered.length === 0 && (
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
