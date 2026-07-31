'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { EDITORIAL_INPUT_CLASS } from '@/components/editorial/EditorialPageShell';

export interface DropdownSelectOption {
  value: string;
  label: string;
}

export interface DropdownSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly DropdownSelectOption[];
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Match editorial form fields (gate, content pages). */
  variant?: 'default' | 'editorial';
}

const DEFAULT_TRIGGER_CLASS =
  'relative flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 pr-9 text-left text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

const EDITORIAL_TRIGGER_CLASS = `${EDITORIAL_INPUT_CLASS} relative flex items-center justify-between pr-10 text-left disabled:cursor-not-allowed disabled:opacity-50`;

const DEFAULT_LIST_CLASS =
  'absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700';

const EDITORIAL_LIST_CLASS =
  'absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full min-w-full overflow-auto border border-sage-200/90 bg-white py-1 shadow-md';

export function DropdownSelect({
  value,
  onChange,
  options,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  placeholder = 'Select…',
  className = '',
  disabled = false,
  variant = 'default',
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel =
    selectedIndex >= 0 ? options[selectedIndex]!.label : null;
  const isEditorial = variant === 'editorial';

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const selectOption = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
      close();
      // Return focus to the trigger after choosing (listbox pattern).
      queueMicrotask(() => triggerRef.current?.focus());
    },
    [onChange, close]
  );

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
      case 'Home':
      case 'End': {
        event.preventDefault();
        if (!open) {
          openList();
          if (event.key === 'Home') setActiveIndex(0);
          else if (event.key === 'End') setActiveIndex(options.length - 1);
          else if (event.key === 'ArrowUp' && selectedIndex < 0) {
            setActiveIndex(options.length - 1);
          }
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          const option = options[activeIndex];
          if (option) selectOption(option.value);
          return;
        }
        if (event.key === 'Home') {
          setActiveIndex(0);
          return;
        }
        if (event.key === 'End') {
          setActiveIndex(options.length - 1);
          return;
        }
        setActiveIndex((prev) => {
          const start = prev < 0 ? (selectedIndex >= 0 ? selectedIndex : -1) : prev;
          if (event.key === 'ArrowDown') {
            return Math.min(options.length - 1, start + 1);
          }
          return Math.max(0, start < 0 ? options.length - 1 : start - 1);
        });
        return;
      }
      case 'Escape': {
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      }
      case 'Tab': {
        if (open) close();
        return;
      }
      default:
        return;
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Options are buttons; keep arrows on the trigger via roving activeIndex.
    // Still handle Escape here if focus somehow lands in the list.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
    }
  };

  const triggerClass = isEditorial
    ? EDITORIAL_TRIGGER_CLASS
    : DEFAULT_TRIGGER_CLASS;
  const listClass = isEditorial ? EDITORIAL_LIST_CLASS : DEFAULT_LIST_CLASS;
  const invalidClass =
    ariaInvalid && isEditorial
      ? ' border-red-400 focus:border-red-400 focus:ring-red-200'
      : ariaInvalid
        ? ' border-red-500'
        : '';
  const openClass =
    open && isEditorial
      ? ' border-sage-400 ring-1 ring-sage-300'
      : open
        ? ' ring-2 ring-sage-600'
        : '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        aria-required={ariaRequired || undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        className={`${triggerClass}${invalidClass}${openClass}`}
      >
        <span
          className={`truncate ${
            selectedLabel
              ? isEditorial
                ? 'text-neutral-900'
                : 'text-gray-900 dark:text-gray-100'
              : isEditorial
                ? 'text-neutral-400'
                : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          } ${isEditorial ? 'text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className={listClass}
        >
          {options.map((option, index) => {
            const selected = value === option.value;
            const active = index === activeIndex;

            return (
              <button
                key={option.value || `__empty-${index}`}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.value)}
                className={
                  isEditorial
                    ? `flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-light transition-colors ${
                        active
                          ? 'bg-sage-100 text-neutral-900'
                          : selected
                            ? 'bg-sage-50/80 text-neutral-900'
                            : 'text-neutral-700 hover:bg-sage-50'
                      }`
                    : `flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-gray-600 ${
                        selected
                          ? 'font-medium text-gray-900 dark:text-gray-100'
                          : 'text-gray-700 dark:text-gray-300'
                      } ${active ? 'bg-neutral-100 dark:bg-gray-600' : ''}`
                }
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected ? (
                    <Check
                      className={`h-4 w-4 ${isEditorial ? 'text-sage-700' : ''}`}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
