'use client';

import { forwardRef, useState, useRef, useEffect, type InputHTMLAttributes } from 'react';
import { HelpCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tooltip?: string;
}

const baseClasses =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

function TooltipIcon({ tooltip }: { tooltip: string }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isOpen = hoverOpen || clickOpen;

  useEffect(() => {
    if (!clickOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setClickOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setClickOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [clickOpen]);

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setClickOpen((o) => !o)}
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
        aria-label={tooltip}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="cursor-help p-0.5 -m-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-1"
      >
        <HelpCircle className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
      </button>
      {isOpen && (
        <div
          ref={popoverRef}
          role="tooltip"
          className="absolute left-0 top-full mt-1 z-50 max-w-xs px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg"
          style={{ minWidth: '12rem' }}
        >
          {tooltip}
        </div>
      )}
    </span>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, tooltip, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {tooltip && <TooltipIcon tooltip={tooltip} />}
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
