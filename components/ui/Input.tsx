'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { FieldTooltip } from '@/components/ui/FieldTooltip';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tooltip?: string;
}

const baseClasses =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, tooltip, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 whitespace-nowrap"
          >
            {label}
            {tooltip ? <FieldTooltip content={tooltip} /> : null}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${error ? 'border-red-500 dark:border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
