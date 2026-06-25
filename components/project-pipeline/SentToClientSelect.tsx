'use client';

import type { SelectHTMLAttributes } from 'react';
import {
  getSentToClientSelectClassName,
  normalizeProjectPipelineSentToClient,
} from '@/lib/project-pipeline/sent-to-client';

export type SentToClientSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> & {
  options: readonly string[];
};

export function SentToClientSelect({
  value,
  className = '',
  disabled,
  options,
  ...props
}: SentToClientSelectProps) {
  const normalized = normalizeProjectPipelineSentToClient(
    typeof value === 'string' ? value : ''
  );
  const pillClassName = getSentToClientSelectClassName(normalized);

  return (
    <div className={`relative w-full ${pillClassName} ${className}`}>
      <select
        {...props}
        value={normalized}
        disabled={disabled}
        className="h-full w-full cursor-pointer appearance-none bg-transparent py-0 pl-2 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:!opacity-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
