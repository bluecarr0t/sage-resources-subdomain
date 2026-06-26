'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  formatAppraiserConsultantValues,
  parseAppraiserConsultantValues,
} from '@/lib/project-pipeline/appraiser-consultant-display';

type PipelineConsultantMultiSelectProps = {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function PipelineConsultantMultiSelect({
  id,
  label,
  value,
  options,
  disabled = false,
  onChange,
}: PipelineConsultantMultiSelectProps) {
  const t = useTranslations('admin.projectPipeline');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseAppraiserConsultantValues(value), [value]);
  const selectedKeys = useMemo(
    () => new Set(selected.map((name) => name.toLowerCase())),
    [selected]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggleOption = (name: string) => {
    const key = name.toLowerCase();
    const next = selectedKeys.has(key)
      ? selected.filter((entry) => entry.toLowerCase() !== key)
      : [...selected, name];
    onChange(formatAppraiserConsultantValues(next));
  };

  const summary = selected.length ? selected.join(' / ') : t('fieldEmptyOption');

  return (
    <div className="sm:col-span-2">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          id={id}
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex min-h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-left text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <span className={selected.length ? 'line-clamp-2' : 'text-neutral-500 dark:text-neutral-400'}>
            {summary}
          </span>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
            aria-hidden
          />
        </button>

        {open ? (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700"
          >
            {options.map((name) => {
              const isSelected = selectedKeys.has(name.toLowerCase());

              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(name)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-gray-600 ${
                    isSelected
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-sage-600 bg-sage-600 text-white'
                        : 'border-neutral-300 bg-white dark:border-neutral-500 dark:bg-gray-800'
                    }`}
                    aria-hidden
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
