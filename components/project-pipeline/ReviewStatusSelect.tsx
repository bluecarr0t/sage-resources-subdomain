'use client';

import { useState, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  getReviewStatusDropdownLabel,
  getReviewStatusSelectClassName,
  getShortReviewStatusLabel,
  normalizeProjectPipelineReviewStatus,
  PROJECT_PIPELINE_REVIEW_STATUSES,
} from '@/lib/project-pipeline/review-status';

export type ReviewStatusSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> & {
  emptyOptionLabel?: string;
  showEmptyOption?: boolean;
  label?: string;
  showChevron?: boolean;
  /** When set, only these statuses appear in the dropdown (plus legacy value if needed). */
  statuses?: readonly string[];
};

export function ReviewStatusSelect({
  value,
  className = '',
  emptyOptionLabel = '—',
  showEmptyOption = true,
  label,
  id,
  showChevron = false,
  statuses,
  title,
  disabled,
  onFocus,
  onBlur,
  ...props
}: ReviewStatusSelectProps) {
  const [focused, setFocused] = useState(false);
  const stringValue = normalizeProjectPipelineReviewStatus(
    typeof value === 'string' ? value : ''
  );
  const statusStyle = getReviewStatusSelectClassName(stringValue);
  const displayLabel = stringValue
    ? getShortReviewStatusLabel(stringValue)
    : emptyOptionLabel;
  const availableStatuses = statuses ?? PROJECT_PIPELINE_REVIEW_STATUSES;
  const isLegacyValue =
    Boolean(stringValue) &&
    !(availableStatuses as readonly string[]).includes(stringValue);
  const fullTitle = title ?? (stringValue || undefined);
  const selectId =
    id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const selectPadding = showChevron ? 'py-2 pl-4 pr-10' : 'py-0 pl-2 pr-7';

  const field = (
    <div className={`relative w-full ${statusStyle} ${className}`}>
      <select
        {...props}
        id={selectId}
        value={stringValue}
        disabled={disabled}
        title={fullTitle}
        className={`w-full cursor-pointer appearance-none bg-transparent focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:!opacity-100 ${selectPadding} ${
          focused ? '' : 'text-transparent'
        }`}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      >
        {showEmptyOption ? <option value="">{emptyOptionLabel}</option> : null}
        {isLegacyValue ? (
          <option value={stringValue}>{getReviewStatusDropdownLabel(stringValue)}</option>
        ) : null}
        {availableStatuses.map((status) => (
          <option key={status} value={status}>
            {getReviewStatusDropdownLabel(status)}
          </option>
        ))}
      </select>
      {!focused && displayLabel ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-2 right-7 flex items-center truncate font-semibold"
          aria-hidden
        >
          {displayLabel}
        </span>
      ) : null}
      {showChevron ? (
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
          aria-hidden
        />
      ) : null}
    </div>
  );

  if (!label) {
    return field;
  }

  return (
    <div className="w-full">
      <label
        htmlFor={selectId}
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      {field}
    </div>
  );
}
