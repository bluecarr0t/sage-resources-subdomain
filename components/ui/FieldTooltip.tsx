'use client';

import { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

type FieldTooltipProps = {
  content: string;
};

export function FieldTooltip({ content }: FieldTooltipProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isOpen = hoverOpen || clickOpen;

  useEffect(() => {
    if (!clickOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setClickOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setClickOpen(false);
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
        onClick={() => setClickOpen((open) => !open)}
        onMouseEnter={() => setHoverOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
        aria-label={content}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="-m-0.5 cursor-help rounded p-0.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-1 dark:hover:bg-gray-800"
      >
        <HelpCircle className="h-4 w-4 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400" />
      </button>
      {isOpen ? (
        <div
          ref={popoverRef}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
          style={{ minWidth: '12rem' }}
        >
          {content}
        </div>
      ) : null}
    </span>
  );
}
