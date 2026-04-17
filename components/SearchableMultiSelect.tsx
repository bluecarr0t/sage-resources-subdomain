'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

interface SearchableMultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  allSelectedText?: string;
  label: string;
  id: string;
  searchPlaceholder?: string;
  activeColor?: 'blue' | 'purple' | 'orange' | 'green' | 'indigo' | 'sage';
  disabled?: boolean;
  /** Shown as native tooltip when disabled (e.g. why the control is inactive). */
  disabledTitle?: string;
  /**
   * Max height of the open panel (px). The options list scrolls inside this.
   * Default 420; pass a larger value for long lists (e.g. state filters).
   */
  maxDropdownHeightPx?: number;
}

export default function SearchableMultiSelect({
  options,
  selectedValues,
  onToggle,
  placeholder = 'Select options...',
  allSelectedText,
  label,
  id,
  searchPlaceholder = 'Search...',
  activeColor = 'sage',
  disabled = false,
  disabledTitle,
  maxDropdownHeightPx = 420,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 420 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [disabled]);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        containerRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setSearchQuery('');
    }

    if (isOpen) {
      const positionTimeout = setTimeout(() => updateDropdownPosition(), 0);
      const clickTimeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => {
        clearTimeout(positionTimeout);
        clearTimeout(clickTimeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom - 4;
      const cap = maxDropdownHeightPx;
      const maxHeight = Math.max(120, Math.min(spaceBelow, cap));
      const left = Math.max(4, Math.min(rect.left, viewportWidth - rect.width - 4));
      setDropdownPosition({
        top: rect.bottom + 4,
        left,
        width: rect.width,
        maxHeight,
      });
    }
  };

  const isActive = selectedValues.length > 0;
  const colorClasses =
    activeColor === 'blue'
      ? 'border-blue-300 bg-blue-50/50'
      : activeColor === 'orange'
        ? 'border-orange-300 bg-orange-50/50'
        : activeColor === 'green'
          ? 'border-green-300 bg-green-50/50'
          : activeColor === 'indigo'
            ? 'border-indigo-300 bg-indigo-50/50'
            : activeColor === 'purple'
              ? 'border-purple-300 bg-purple-50/50'
              : 'border-sage-300 bg-sage-50/50 dark:border-sage-600 dark:bg-sage-900/30';

  const disabledClasses = disabled
    ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-500'
    : '';

  return (
    <div className={`relative ${isOpen && !disabled ? 'z-50' : 'z-auto'}`} ref={containerRef}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium mb-1 ${
          disabled
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        title={disabled && disabledTitle ? disabledTitle : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-all text-left flex items-center justify-between ${
          disabled
            ? disabledClasses
            : `cursor-pointer bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500 ${
                isActive ? `${colorClasses} font-medium` : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`
        }`}
      >
        <span className="truncate flex-1">
          {selectedValues.length === 0
            ? placeholder
            : selectedValues.length === 1
              ? options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
              : allSelectedText && selectedValues.length === options.length
                ? allSelectedText
                : `${selectedValues.length} selected`}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && isMounted && !disabled &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] overflow-hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
              zIndex: 99999,
              position: 'fixed',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div
              className="overflow-y-auto overscroll-contain p-2 space-y-0.5 [scrollbar-gutter:stable]"
              style={{
                maxHeight: Math.max(160, dropdownPosition.maxHeight - 76),
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md cursor-pointer transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(option.value)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-sage-600 border-gray-300 dark:border-gray-600 rounded focus:ring-sage-500 cursor-pointer"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
