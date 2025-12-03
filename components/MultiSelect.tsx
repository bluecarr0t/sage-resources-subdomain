'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  allSelectedText?: string;
  label: string;
  id: string;
  activeColor?: 'blue' | 'purple' | 'orange' | 'green' | 'indigo';
}

export default function MultiSelect({
  options,
  selectedValues,
  onToggle,
  onClear,
  placeholder = 'Select options...',
  allSelectedText,
  label,
  id,
  activeColor = 'blue',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Don't close if clicking inside the dropdown, container, or the button
      if (
        dropdownRef.current?.contains(target) ||
        containerRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    if (isOpen) {
      // Update position after a brief delay to ensure button is fully rendered
      const positionTimeout = setTimeout(() => {
        updateDropdownPosition();
      }, 0);
      // Use a small delay to ensure the click event on checkbox completes first
      const clickTimeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
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
      setDropdownPosition({
        top: rect.bottom + 4, // Use viewport coordinates for fixed positioning
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const isActive = selectedValues.length > 0;
  const colorClasses = activeColor === 'blue' 
    ? 'border-blue-300 bg-blue-50/50' 
    : activeColor === 'orange'
    ? 'border-orange-300 bg-orange-50/50'
    : activeColor === 'green'
    ? 'border-green-300 bg-green-50/50'
    : activeColor === 'indigo'
    ? 'border-indigo-300 bg-indigo-50/50'
    : 'border-purple-300 bg-purple-50/50';

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      </div>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all text-left flex items-center justify-between cursor-pointer ${
          isActive 
            ? `${colorClasses} text-gray-900 font-medium` 
            : 'border-gray-300 text-gray-600'
        }`}
      >
        <span className="truncate flex-1">
          {selectedValues.length === 0
            ? placeholder
            : selectedValues.length === 1
            ? selectedValues[0]
            : allSelectedText && selectedValues.length === options.length
            ? allSelectedText
            : `${selectedValues.length} selected`}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && isMounted && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-auto"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 99999,
            position: 'fixed'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 space-y-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggle(option.value);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                </label>
              );
            }))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

